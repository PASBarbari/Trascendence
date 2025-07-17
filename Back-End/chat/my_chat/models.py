from django.db import models

# Create your models here.

# on block user, it should block all the incoming messages from the blocked user
class UserProfile(models.Model):
	user_id = models.IntegerField(primary_key=True)
	username = models.CharField(max_length=255, null=True)
	email = models.EmailField(max_length=255, unique=True, null=True)
	is_staff = models.BooleanField(default=False)
	blockedUsers = models.ManyToManyField(
		'self', 
		symmetrical=False, 
		related_name='blocked_by', 
		blank=True
	)
		
	@property
	def is_authenticated(self):
		return True
		
	@property
	def is_anonymous(self):
		return False

	@property
	def id(self):
		"""Provides compatibility with code that uses 'id' instead of 'user_id'"""
		return self.user_id

	def __str__(self):
		return self.username or f"User {self.user_id}"

class ChatRoom(models.Model):
	room_id = models.AutoField(primary_key=True)
	room_name = models.CharField(max_length=100)
	room_description = models.TextField()
	users = models.ManyToManyField(UserProfile, through='ChatMember', related_name='chat_rooms')
	creation_time = models.DateTimeField(auto_now_add=True)
	creator = models.ForeignKey(UserProfile, related_name='creator', on_delete=models.SET_NULL, null=True)

	def get_user_number(self):
		return self.users.count()
		
	def __str__(self):
		return self.room_name

# model to handle the many-to-many relationship with roles
class ChatMember(models.Model):
	# Roles
	ROLES = [
		('admin', 'Administrator'),
		('moderator', 'Moderator'),
		('member', 'Regular Member'),
		('guest', 'Guest'),
	]

	user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
	chat_room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE)
	role = models.CharField(max_length=20, choices=ROLES, default='member')
	joined_at = models.DateTimeField(auto_now_add=True)
	is_active = models.BooleanField(default=True)
	is_muted = models.BooleanField(default=False)
	muted_until = models.DateTimeField(null=True, blank=True)

	class Meta:
		unique_together = ('user', 'chat_room')
		
	def __str__(self):
		return f"{self.user} in {self.chat_room} as {self.get_role_display()}"

class ChatMessage(models.Model):
    MESSAGE_TYPES = [
        ('text', 'Text Message'),
        ('game_invitation', 'Game Invitation'),
        ('image', 'Image'),
        ('video', 'Video'),
        ('file', 'File'),
        ('system', 'System Message'),
    ]
    
    message_id = models.AutoField(primary_key=True)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE)
    sender = models.ForeignKey(UserProfile, on_delete=models.SET_DEFAULT, default=1)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Message type and content
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    message = models.TextField(blank=True)  # For text messages and game invitation messages
    
    # Media fields (for future use)
    image = models.ImageField(upload_to='chat_images/', null=True, blank=True)
    video = models.FileField(upload_to='chat_videos/', null=True, blank=True)
    file = models.FileField(upload_to='chat_files/', null=True, blank=True)
    
    # Metadata for any message type (flexible JSON field for future extensions)
    metadata = models.JSONField(default=dict, blank=True)
    
    def __str__(self):
        return f"{self.get_message_type_display()} {self.message_id} in {self.room}"
    
    @property
    def content(self):
        """Return appropriate content based on message type"""
        if self.message_type == 'text':
            return self.message
        elif self.message_type == 'game_invitation':
            return self.message
        elif self.message_type == 'image':
            return self.image.url if self.image else None
        elif self.message_type == 'video':
            return self.video.url if self.video else None
        elif self.message_type == 'file':
            return self.file.url if self.file else None
        return self.message
def get_user_model(user_id):
	return UserProfile.objects.get(user_id=user_id)