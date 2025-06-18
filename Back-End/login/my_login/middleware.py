from math import log
from rest_framework.permissions import BasePermission
import logging
from django.conf import settings
from django.db import connections # Added
from django.db.utils import OperationalError # Added
from django.http import JsonResponse

logger = logging.getLogger('django')

class APIKeyPermission(BasePermission):
	def has_permission(self, request, view):
		api_key = request.META.get('X-API-KEY')
		if api_key:
			return api_key == settings.API_KEY
		return False

class HealthCheckMiddleware:
	def __init__(self, get_response):
		self.get_response = get_response
		
	def __call__(self, request):
		# Allow health check endpoint regardless of host
		if request.path.endswith('/health'): # Liveness probe
			return JsonResponse({'status': 'ok'})
		elif request.path.endswith('/ready'): # Readiness probe
			db_ready = False
			try:
				# Check the default database connection
				db_conn = connections['default']
				db_conn.cursor() # Attempt to get a cursor to check connectivity
				# Optionally, you could execute a very simple query:
				# with db_conn.cursor() as cursor:
				#     cursor.execute("SELECT 1")
				#     cursor.fetchone()
				db_ready = True
			except OperationalError:
				logger.error("Readiness probe: Database connection failed.")
				# db_ready remains False

			if db_ready:
				return JsonResponse({'status': 'ready', 'database': 'ok'})
			else:
				return JsonResponse({'status': 'unready', 'database': 'unavailable'}, status=503)
			
		return self.get_response(request)
