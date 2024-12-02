from django.shortcuts import render, get_object_or_404
from rest_framework import permissions, status, generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Tasks, Progresses
from .serializer import TasksSerializer, ProgressesSerializer, ProgressManageSerializer, ProgressesReadSerializer
from user_app.models import Users
from django_filters.rest_framework import DjangoFilterBackend

class MultipleFieldLookupMixin:
	"""
	Apply this mixin to any view or viewset to get multiple field filtering
	based on a `lookup_fields` attribute, instead of the default single field filtering.
	"""
	def get_object(self):
		queryset = self.get_queryset()			 # Get the base queryset
		queryset = self.filter_queryset(queryset)  # Apply any filter backends
		filter = {}
		for field in self.lookup_fields:
			if self.kwargs.get(field): # Ignore empty fields.
				filter[field] = self.kwargs[field]
		obj = get_object_or_404(queryset, **filter)  # Lookup the object
		self.check_object_permissions(self.request, obj)
		return obj

class TaskGen(generics.ListCreateAPIView):
	permission_classes = (permissions.AllowAny,)
	serializer_class = TasksSerializer
	lookup_fields = ['author__user_id', 'category', 'duration', 'exp']

	def get_queryset(self):
		queryset = Tasks.objects.all()
		if self.request.method == 'GET':
			user_id = self.request.query_params.get('user_id')
			if user_id:
				My_progress = Progresses.objects.filter(user_id=user_id)
				queryset = queryset.exclude(id__in=[x.task.id for x in My_progress])
				return queryset
		return Tasks.objects.all()
	
				
		

class TaskManage(generics.RetrieveUpdateDestroyAPIView):
	permission_classes = (permissions.AllowAny,)
	serializer_class = TasksSerializer
	# lookup_field = 'id'
	lookup_url_kwarg = 'id'
	queryset = Tasks.objects.all()

class ProgressGen(generics.ListCreateAPIView):
	permission_classes = (permissions.AllowAny,)
	filter_backends = [DjangoFilterBackend]
	filterset_fields = ['user__user_id', 'task__id']
	queryset = Progresses.objects.all()

	def get_serializer_class(self):
		if self.request.method == 'POST':
			return ProgressesSerializer
		return ProgressesReadSerializer

	def get_queryset(self):
		queryset = super().get_queryset()
		user_id = self.request.query_params.get('user_id', None)
		if user_id is not None:
			queryset = queryset.filter(user__user_id=user_id)
		return queryset

class ProgressDelete(generics.DestroyAPIView):
	permission_classes = (permissions.AllowAny,)
	serializer_class = ProgressesSerializer
	# lookup_field = 'id'
	lookup_url_kwarg = 'id'
	queryset = Progresses.objects.all()

class ProgressManage(MultipleFieldLookupMixin, generics.RetrieveUpdateAPIView):
	permission_classes = (permissions.AllowAny,)
	serializer_class = ProgressManageSerializer
	lookup_fields = ['task', 'user']
	queryset = Progresses.objects.all()

class GetUsersByTask(APIView):
	permission_classes = (permissions.AllowAny,)
	def get(self, request):
		prog = Progresses.objects.all()
		tsk = Tasks.objects.all()
		ans = dict()
		for x in tsk:
			row = []
			for y in prog:
				if y.task.id == x.id:
					row.append(y.user.account_id)
			ans[x.id] = row
		if len(ans) < 1:
			return Response({
				'error': 'cannot provide a valid view'
			}, status=status.HTTP_400_BAD_REQUEST)
		return Response(ans)

class GetTasksByUser(APIView):
	permission_classes = (permissions.AllowAny,)
	def get(self, request):
		prog = Progresses.objects.all()
		usr = Users.objects.all()
		ans = dict()
		for x in usr:
			row = []
			for y in prog:
				if y.user.id == x.id:
					row.append(y.task.id)
			ans[x.id] = row
		if len(ans) < 1:
			return Response({
				'error': 'cannot provide a valid view'
			}, status=status.HTTP_400_BAD_REQUEST)
		return Response(ans)
