from django.http import HttpResponse
from django.conf import settings
import jwt
import logging

logger = logging.getLogger(__name__)

def validate_jwt(request):
    """Simple endpoint to validate JWT tokens for MinIO access"""
    auth_header = request.headers.get('Authorization', '')
    
    # No auth header means no access
    if not auth_header or not auth_header.startswith('Bearer '):
        logger.warning("Missing or invalid Authorization header")
        return HttpResponse(status=401)
    
    try:
        token = auth_header.split(' ')[1]
        # Use the same secret key as your main Django app
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