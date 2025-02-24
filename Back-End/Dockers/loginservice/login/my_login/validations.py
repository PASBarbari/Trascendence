from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
UserModel = get_user_model()

def custom_validation(data):
    email = data['email'].strip()
    username = data['username'].strip()
    password = data['password'].strip()
    ##
    if not email:
        raise ValidationError('an email is needed')
    if UserModel.objects.filter(email=email).exists():
        raise ValidationError('email already in use')
    ##
    if not password or len(password) < 8:
        raise ValidationError('weak password')
    ##
    if not username or UserModel.objects.filter(username=username).exists():
        raise ValidationError('username already in use')
    return data


def validate_email(data):
    email = data['email'].strip()
    if not email:
        raise ValidationError('an email is needed')
    return True

def validate_username(data):
    username = data['username'].strip()
    if not username:
        raise ValidationError('choose another username')
    return True

def validate_password(data):
    password = data['password'].strip()
    if not password:
        raise ValidationError('a password is needed')
    return True


from oauth2_provider.oauth2_validators import OAuth2Validator
from oauth2_provider.models import AccessToken
	
class CustomOAuth2Validator(OAuth2Validator):
	def save_bearer_token(self, token, request, *args, **kwargs):
		super().save_bearer_token(token, request, *args, **kwargs)
		if request.user:
			token['user_id'] = request.user.pk
			token['username'] = request.user.username