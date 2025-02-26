import logging
from rest_framework.permissions import BasePermission
from django.core.cache import cache
from .models import ChatRoom, UserProfile, ChatMember

logger = logging.getLogger('django')

class IsAuthenticated(BasePermission):
    """
    Basic permission that requires the user to be authenticated.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

class IsChatMember(BasePermission):
    """
    Permission that checks if the user is a member of the requested chat.
    Uses caching to reduce database queries.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # For list endpoints or actions not tied to a specific chat
        if getattr(view, 'action', None) in ['list', 'create']:
            return True
            
        room_id = view.kwargs.get('room_id') or request.data.get('room_id') or request.query_params.get('room_id')
        if not room_id:
            return False
            
        # Check cache first
        cache_key = f"chat_membership_{request.user.id}_{room_id}"
        is_member = cache.get(cache_key)
        
        if is_member is not None:
            return is_member
            
        # Check database
        try:
            is_member = ChatMember.objects.filter(
                user_id=request.user.id,
                chat_room_id=room_id,
                is_active=True
            ).exists()
            
            # Cache the result for 5 minutes
            cache.set(cache_key, is_member, timeout=300)
            return is_member
        except Exception as e:
            logger.error(f"Error checking chat membership: {str(e)}")
            return False
            
    def has_object_permission(self, request, view, obj):
        # For objects with a direct reference to a chat room
        if hasattr(obj, 'chat_room_id'):
            room_id = obj.chat_room_id
        elif hasattr(obj, 'room_id'):
            room_id = obj.room_id
        else:
            # If it's a chat room itself
            room_id = getattr(obj, 'room_id', None)
            
        if not room_id:
            return False
            
        cache_key = f"chat_membership_{request.user.id}_{room_id}"
        is_member = cache.get(cache_key)
        
        if is_member is not None:
            return is_member
            
        # Check database
        try:
            is_member = ChatMember.objects.filter(
                user_id=request.user.id,
                chat_room_id=room_id,
                is_active=True
            ).exists()
            
            # Cache the result for 5 minutes
            cache.set(cache_key, is_member, timeout=300)
            return is_member
        except Exception as e:
            logger.error(f"Error checking chat object permission: {str(e)}")
            return False

class IsChatAdmin(BasePermission):
	"""
	Permission that checks if the user is an admin of the requested chat.
	Uses caching to reduce database queries.
	"""
	def has_permission(self, request, view):
		if not request.user or not request.user.is_authenticated:
			return False
			
		# For actions that should allow all admins (even with no room_id)
		if getattr(view, 'action', None) in ['list', 'create']:
			return True
			
		room_id = view.kwargs.get('room_id') or request.data.get('room_id') or request.query_params.get('room_id')
		if not room_id:
			return False
			
		# Check cache first
		cache_key = f"chat_admin_{request.user.id}_{room_id}"
		is_admin = cache.get(cache_key)
		
		if is_admin is not None:
			return is_admin
			
		# Check database
		try:
			is_admin = ChatMember.objects.filter(
				user_id=request.user.id,
				chat_room_id=room_id,
				role='admin'
			).exists()
			
			# Cache the result for 5 minutes
			cache.set(cache_key, is_admin, timeout=300)
			return is_admin
		except Exception as e:
			logger.error(f"Error checking chat admin status: {str(e)}")
			return False
			
	def has_object_permission(self, request, view, obj):
		# Similar object permission check as IsChatMember but for admin role
		if hasattr(obj, 'chat_room_id'):
			room_id = obj.chat_room_id
		elif hasattr(obj, 'room_id'):
			room_id = obj.room_id
		else:
			room_id = getattr(obj, 'room_id', None)
			
		if not room_id:
			return False
			
		cache_key = f"chat_admin_{request.user.id}_{room_id}"
		is_admin = cache.get(cache_key)
		
		if is_admin is not None:
			return is_admin
			
		try:
			is_admin = ChatMember.objects.filter(
				user_id=request.user.id,
				chat_room_id=room_id,
				role='admin'
			).exists()
			
			cache.set(cache_key, is_admin, timeout=300)
			return is_admin
		except Exception as e:
			logger.error(f"Error checking chat admin object permission: {str(e)}")
			return False
class CanSendMessage(BasePermission):
    """
    Permission to check if a user can send messages in a chat.
    Considers both membership and possible muting status.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        room_id = view.kwargs.get('room_id') or request.data.get('room_id')
        if not room_id:
            return False
            
        # Check cache first
        cache_key = f"can_send_message_{request.user.id}_{room_id}"
        can_send = cache.get(cache_key)
        
        if can_send is not None:
            return can_send
            
        # Check database - verify membership and not muted
        try:
            member = ChatMember.objects.get(
                user_id=request.user.id,
                chat_room_id=room_id
            )
            can_send = member.is_active and not member.is_muted
            
            # Cache the result for a shorter period (1 minute) as mute status may change
            cache.set(cache_key, can_send, timeout=60)
            return can_send
        except ChatMember.DoesNotExist:
            return False
        except Exception as e:
            logger.error(f"Error checking message sending permission: {str(e)}")
            return False
class ServiceAuthentication(BasePermission):
	"""
	Permission for inter-service communication.
	Verifies API keys for service-to-service calls.
	"""
	def has_permission(self, request, view):
		from django.conf import settings
		
		api_key = request.headers.get('X-API-KEY')
		service_name = request.headers.get('X-Service-Name')
		
		if not api_key or not service_name:
			logger.warning("Service call missing API key or service name")
			return False
			
		# Check if the API key matches the one in settings
		valid_key = api_key == settings.API_KEY
		
		# Optional: Check if service name is in allowed services list
		valid_service = service_name in settings.Microservices.keys()
		
		if valid_key and valid_service:
			# For security logging
			logger.info(f"Authenticated service call from {service_name}")
			return True
			
		logger.warning(f"Invalid service authentication attempt from {request.META.get('REMOTE_ADDR')}")
		return False

class ChatRoomPermissions(BasePermission):
	"""
	Combined permission class for chat room operations.
	- Admins can perform all actions
	- Members can read and send messages
	- Only admins can modify chat settings or member roles
	"""
	def has_permission(self, request, view):
		# Allow service-to-service calls
		if ServiceAuthentication().has_permission(request, view):
			return True
			
		# New user endpoint is public
		if request.path.endswith('/chat/new_user/') and request.method == 'POST':
			return True
			
		# User must be authenticated for all other operations
		if not request.user or not request.user.is_authenticated:
			return False
		
		# Different permissions based on the action
		action = getattr(view, 'action', None) or request.method
		
		# Admin-only actions
		if action in ['update', 'partial_update', 'destroy', 'add_member', 'remove_member', 'change_role']:
			return IsChatAdmin().has_permission(request, view)
			
		# Member actions (read, send message)
		if action in ['retrieve', 'list', 'send_message', 'get_messages']:
			return IsChatMember().has_permission(request, view)
			
		# Message sending requires additional checks
		if action == 'send_message':
			return CanSendMessage().has_permission(request, view)
			
		# Default to requiring admin permissions for any other actions
		return IsChatAdmin().has_permission(request, view)
		
	def has_object_permission(self, request, view, obj):
		# Similar logic for object-level permissions
		action = request.method
		
		if action in ['PUT', 'PATCH', 'DELETE']:
			return IsChatAdmin().has_object_permission(request, view, obj)
			
		if action in ['GET', 'HEAD']:
			return IsChatMember().has_object_permission(request, view, obj)
			
		return False