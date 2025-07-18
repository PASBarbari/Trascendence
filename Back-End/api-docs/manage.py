"""
API Documentation Aggregator
Collects and displays Swagger docs from all microservices
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api_docs.settings')

application = get_wsgi_application()
