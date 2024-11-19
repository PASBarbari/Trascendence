from django.shortcuts import render, get_object_or_404
from rest_framework.views import APIView
from rest_framework import permissions, status, generics, filters
from rest_framework.response import Response
from .models import *
from .serializer import *
from user_app.models import Users

class MultipleFieldLookupMixin:
    """
    Apply this mixin to any view or viewset to get multiple field filtering
    based on a `lookup_fields` attribute, instead of the default single field filtering.
    """
    def get_object(self):
        queryset = self.get_queryset()             # Get the base queryset
        queryset = self.filter_queryset(queryset)  # Apply any filter backends
        filter = {}
        for field in self.lookup_fields:
            if self.kwargs.get(field): # Ignore empty fields.
                filter[field] = self.kwargs[field]
        obj = get_object_or_404(queryset, **filter)  # Lookup the object
        self.check_object_permissions(self.request, obj)
        return obj

class AvatarGen(generics.ListCreateAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = AvatarsSerializer
    queryset = Avatars.objects.all()

class AvatarManage(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = AvatarsSerializer
    lookup_url_kwarg = 'id'
    queryset = Avatars.objects.all()

class UserGen(generics.ListCreateAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = UsersSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['id']
    queryset = Users.objects.all()

class UserManage(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = UsersSerializer
    lookup_url_kwarg = 'id'
    queryset = Users.objects.all()

class FriendList(generics.ListAPIView):
	serializer_class = FriendshipsSerializer
	filter_backends = [filters.SearchFilter]
	search_fields = ['user_1__id', 'user_2__id', 'accepted']
	queryset = Friendships.objects.all()
	# def get_queryset(self):
	# 	return Friendships.objects.filter(accepted=True)

class AddFriend(APIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = FriendshipsSerializer
    def post(self, request):
        serializer = FriendshipsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        u1 = Users.objects.get(id=serializer.data['user_1'])
        u2 = Users.objects.get(id=serializer.data['user_2'])
        if Friendships.objects.filter(user_1=u1, user_2=u2):
            if Friendships.objects.get(user_1=u1, user_2=u2).accepted:
                return Response({
                    'info': 'users are already friends'
				}, status=status.HTTP_200_OK)
            return Response({
                    'info': 'friend request is pending'
				}, status=status.HTTP_200_OK)
        if Friendships.objects.filter(user_1=u2, user_2=u1):
            if Friendships.objects.get(user_1=u2, user_2=u1).accepted:
                return Response({
                    'info': 'users are already friends'
				}, status=status.HTTP_200_OK)
            fs = Friendships.objects.get(user_1=u2, user_2=u1)
            fs.accepted = True
            fs.save()
            return Response({
                'info': 'friend request accepted'
			}, status=status.HTTP_200_OK)
        fs = Friendships.objects.create(
            user_1 = u1,
            user_2 = u2
		)
        fs.save()
        return Response({
            'info': 'friend request sent'
		}, status=status.HTTP_200_OK)

