"""
WSGI config for api_docs project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api_docs.settings')

application = get_wsgi_application()
