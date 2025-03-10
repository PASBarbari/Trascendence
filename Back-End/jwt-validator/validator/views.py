from django.http import HttpResponse
from django.conf import settings
import jwt
import logging

logger = logging.getLogger(__name__)

def validate_jwt(request):
    """Simple endpoint to validate JWT tokens for MinIO access"""
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