from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import UserSerializer
from .models import User
# Create your views here.


class HelloView(APIView):
    def get(self, request):
        users = User.objects.all()
        serialized_data = UserSerializer(users, many=True)
        return Response(data=serialized_data.data, status=status.HTTP_200_OK)

    def post(self, request):
        serialized_data = UserSerializer(data=request.data)
        if serialized_data.is_valid():
            serialized_data.save()
            return Response(data=serialized_data.data, status=status.HTTP_201_CREATED)
        else:
            return Response(data=serialized_data.errors, status=status.HTTP_400_BAD_REQUEST)