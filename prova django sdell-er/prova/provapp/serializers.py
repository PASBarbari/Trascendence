from rest_framework.serializers import ModelSerializer, Serializer

from provapp.models import User

class UserSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'