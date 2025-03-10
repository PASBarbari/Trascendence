from django.http import HttpResponse, JsonResponse
from django.conf import settings
import jwt
from .minio_client import MinioService
import logging

logger = logging.getLogger(__name__)

def validate_jwt(request):
	"""Simple endpoint to validate JWT tokens for MinIO access"""
	logger.info(f"Full request URL: {request.build_absolute_uri()}")
	logger.info(f"Query parameters: {request.GET}")
	logger.info(f"Auth header: {request.headers.get('Authorization', 'None')}")
		
	auth_header = request.headers.get('Authorization', '')
	url_token = request.GET.get('token', '')
		
	# Prima determina quale token utilizzare
	if auth_header and auth_header.startswith('Bearer '):
		token = auth_header.split(' ')[1]
		logger.info("Using JWT token from Authorization header")
	elif url_token:
		token = url_token
		logger.info("Using JWT token from URL parameter")
	else:
		logger.warning("No valid token found in Authorization header or URL")
		return HttpResponse(status=401)
		
	try:
		# Resto del codice per validare il token
		payload = jwt.decode(
			token, 
			settings.JWT_SECRET_KEY,
			algorithms=['HS256']
		)
		try:
			bucket_name = 'user-media'  # Il bucket predefinito
			object_path = request.GET.get('path', '')
			if not object_path:
				logger.warning("No object path provided")
				return JsonResponse({"error": "No object path provided"}, status=400)
			elif not object_path.startswith('avatars/') and 'avatars' in object_path:
				# Extract the part of the path after "avatars/"
				object_path = object_path[object_path.find('avatars/'):]
				logger.info(f"Fixed object path: {object_path}")

				
			# Ottieni un'istanza del servizio MinIO
			minio_service = MinioService.get_instance()
			
			# Recupera l'oggetto da MinIO
			response_data = minio_service.get_object(bucket_name, object_path)
			
			# Determina il content-type in base all'estensione del file
			content_type = 'image/jpeg'  # Default
			if object_path.lower().endswith('.png'):
				content_type = 'image/png'
			elif object_path.lower().endswith('.gif'):
				content_type = 'image/gif'
			
			response = HttpResponse(response_data.read(), content_type=content_type)
			
			response['Cache-Control'] = 'max-age=86400'  # Cache per 24 ore
			
			return response
		
		except Exception as e:
			logger.error(f"Error retrieving object from MinIO: {str(e)}")
			return JsonResponse({"error": f"Error retrieving object: {str(e)}"}, status=500)
		
		# Create a response with user_id header
		response = HttpResponse(status=200)
		response['X-User-ID'] = str(payload.get('user_id', 'unknown'))
		logger.info(f"Valid JWT for user {payload.get('user_id', 'unknown')}")
		return response
		
	except jwt.ExpiredSignatureError:
		logger.warning("Expired JWT token")
		return HttpResponse(status=401)
	except jwt.InvalidTokenError:
		logger.warning("Invalid JWT token")
		return HttpResponse(status=401)
	except Exception as e:
		logger.error(f"Error validating JWT: {str(e)}")
		return HttpResponse(status=401)