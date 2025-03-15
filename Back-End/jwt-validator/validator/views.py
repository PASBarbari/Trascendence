from django.http import HttpResponse
import jwt
import logging
from django.conf import settings
from .minio_client import MinioService
from rest_framework.views import APIView
from rest_framework.response import Response

logger = logging.getLogger(__name__)

class ProxyMinio(APIView):
    def get(self, request, obj_path):
        """Proxy endpoint to retrieve objects from MinIO"""
        logger.info(f"Retrieving object from MinIO: {obj_path}")
        
        # Ottieni il token JWT
        auth_header = request.headers.get('Authorization', '')
        url_token = request.GET.get('token', '')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        elif url_token:
            token = url_token
        else:
            logger.warning("No authorization token found")
            return Response({"error": "Unauthorized"}, status=401)
        
        try:
            # Valida il token
            payload = jwt.decode(
                token, 
                settings.JWT_SECRET_KEY,
                algorithms=['HS256']
            )
            
            # Ottieni l'oggetto da MinIO
            minio_service = MinioService.get_instance()
            
            # Se il percorso contiene spazi, gestiscili correttamente
            clean_path = obj_path.replace(' ', '%20')
            
            logger.info(f"Getting object from bucket: {settings.MINIO_STORAGE_MEDIA_BUCKET_NAME}, path: {clean_path}")
            
            try:
                # Recupera l'oggetto
                response_data = minio_service.get_object(settings.MINIO_STORAGE_MEDIA_BUCKET_NAME, obj_path)
                
                # Determina il content-type
                content_type = 'image/jpeg'  # Default
                if obj_path.lower().endswith('.png'):
                    content_type = 'image/png'
                elif obj_path.lower().endswith('.gif'):
                    content_type = 'image/gif'
                
                # IMPORTANTE: Restituisci un HttpResponse diretto per i dati binari
                # Non usare Response di DRF che causa l'errore di decodifica
                response = HttpResponse(response_data.read(), content_type=content_type)
                
                # Aggiungi header CORS
                response["Access-Control-Allow-Origin"] = "https://trascendence.42firenze.it"
                response["Access-Control-Allow-Credentials"] = "true"
                
                # Cache per migliorare le prestazioni
                response["Cache-Control"] = "max-age=86400"
                
                return response
                
            except Exception as e:
                logger.error(f"Error fetching from MinIO: {str(e)}")
                return Response({"error": f"Error fetching object: {str(e)}"}, status=404)
                
        except jwt.ExpiredSignatureError:
            logger.warning("Expired JWT token")
            return Response({"error": "Token expired"}, status=401)
        except jwt.InvalidTokenError:
            logger.warning("Invalid JWT token")
            return Response({"error": "Invalid token"}, status=401)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return Response({"error": str(e)}, status=500)


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
				# Per POST/PUT con JSON
		import json
		object_path = ""
		if request.method in ["POST", "PUT"] and request.content_type == "application/json":
			try:
				data = json.loads(request.body.decode('utf-8'))
				object_path = data.get('object_path', '')
			except:
				logger.error("Failed to parse JSON data")
		# Se c'è un object_path nell'URL, lo usiamo per recuperare l'oggetto
		if object_path:
			try:
				bucket_name = 'user-media'  # Il bucket predefinito
				
				# # Pulisci il percorso se necessario
				clean_path = object_path
				# if not clean_path.startswith('avatars/') and 'avatars' in clean_path:
				#	 clean_path = clean_path[clean_path.find('avatars/'):]
				#	 logger.info(f"Fixed object path: {clean_path}")
				
				logger.info(f"Retrieving object from MinIO: {bucket_name}/{clean_path}")
				
				# Ottieni un'istanza del servizio MinIO
				minio_service = MinioService.get_instance()
				
				# Recupera l'oggetto da MinIO
				response_data = minio_service.get_object(bucket_name, clean_path)
				
				# Determina il content-type in base all'estensione del file
				content_type = 'image/jpeg'  # Default
				if clean_path.lower().endswith('.png'):
					content_type = 'image/png'
				elif clean_path.lower().endswith('.gif'):
					content_type = 'image/gif'
				
				response = HttpResponse(response_data.read(), content_type=content_type)
				response['Cache-Control'] = 'max-age=86400'  # Cache per 24 ore
				
				# Aggiungi header CORS
				response['Access-Control-Allow-Origin'] = 'https://trascendence.42firenze.it'
				response['Access-Control-Allow-Credentials'] = 'true'
				response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
				response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
				
				return response
			
			except Exception as e:
				logger.error(f"Error retrieving object from MinIO: {str(e)}")
				return JsonResponse({"error": f"Error retrieving object: {str(e)}"}, status=500)
		
		# Se non c'è un object_path, è una semplice validazione del token
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