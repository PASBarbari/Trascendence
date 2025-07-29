"""
Views for API documentation aggregator
"""
import requests
import json
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response


def index(request):
    """
    Homepage showing all available API documentation
    """
    services = list(settings.MICROSERVICES.keys())
    return render(request, 'docs/index.html', {'services': services})


def service_docs(request, service_name):
    """
    Display Swagger UI for a specific service
    """
    if service_name not in settings.MICROSERVICES:
        return HttpResponse('Service not found', status=404)
    
    service_url = settings.MICROSERVICES[service_name]
    return render(request, 'docs/swagger.html', {
        'service_name': service_name,
        'service_url': service_url,
        'swagger_json_url': f'/api/{service_name}/swagger.json'
    })


@api_view(['GET'])
def swagger_json(request, service_name):
    """
    Proxy swagger.json from microservice
    """
    if service_name not in settings.MICROSERVICES:
        return Response({'error': 'Service not found'}, status=404)
    
    service_url = settings.MICROSERVICES[service_name]
    
    try:
        # Try multiple common swagger endpoints
        swagger_endpoints = [
            f'{service_url}/swagger.json',
            f'{service_url}/api/swagger.json',
            f'{service_url}/swagger/?format=openapi',
            f'{service_url}/api/schema/',
            f'{service_url}/docs/?format=openapi'
        ]
        
        for endpoint in swagger_endpoints:
            try:
                response = requests.get(endpoint, timeout=5)
                if response.status_code == 200:
                    swagger_data = response.json()
                    
                    # Update the host and schemes in swagger data
                    if 'host' in swagger_data:
                        swagger_data['host'] = request.get_host()
                    if 'schemes' in swagger_data:
                        swagger_data['schemes'] = ['https' if request.is_secure() else 'http']
                    
                    # Update server URLs for OpenAPI 3.0
                    if 'servers' in swagger_data:
                        base_url = f"{'https' if request.is_secure() else 'http'}://{request.get_host()}"
                        swagger_data['servers'] = [{'url': f"{base_url}/proxy/{service_name}"}]
                    
                    return Response(swagger_data)
            except (requests.RequestException, ValueError):
                continue
                
        return Response({
            'error': 'Swagger documentation not available', 
            'message': f'Tried endpoints: {swagger_endpoints}'
        }, status=404)
        
    except Exception as e:
        return Response({'error': 'Service unavailable'}, status=503)


@api_view(['GET'])
def combined_docs(request):
    """
    Return combined API documentation for all services
    """
    combined_swagger = {
        "swagger": "2.0",
        "info": {
            "title": "Trascendence API Documentation",
            "description": "Combined API documentation for all microservices",
            "version": "1.0.0"
        },
        "host": request.get_host(),
        "schemes": ["https" if request.is_secure() else "http"],
        "basePath": "/",
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "paths": {},
        "definitions": {}
    }
    
    for service_name, service_url in settings.MICROSERVICES.items():
        try:
            response = requests.get(f'{service_url}/swagger.json', timeout=5)
            if response.status_code == 200:
                service_swagger = response.json()
                
                # Add service prefix to paths
                for path, methods in service_swagger.get('paths', {}).items():
                    prefixed_path = f'/api/{service_name}{path}'
                    combined_swagger['paths'][prefixed_path] = methods
                
                # Merge definitions
                for def_name, definition in service_swagger.get('definitions', {}).items():
                    combined_swagger['definitions'][f'{service_name}_{def_name}'] = definition
                    
        except requests.RequestException:
            # Service is unavailable, skip it
            continue
    
    return Response(combined_swagger)


@api_view(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
def proxy_api(request, service_name, path=''):
    """
    Proxy API requests to the appropriate microservice
    This allows testing APIs directly from the Swagger UI
    """
    if service_name not in settings.MICROSERVICES:
        return Response({'error': 'Service not found'}, status=404)
    
    service_url = settings.MICROSERVICES[service_name]
    target_url = f"{service_url}/{path.lstrip('/')}"
    
    try:
        # Forward the request with the same method, headers, and data
        headers = {}
        for key, value in request.META.items():
            if key.startswith('HTTP_'):
                # Convert Django META headers back to normal headers
                header_name = key[5:].replace('_', '-').title()
                if header_name not in ['Host', 'Content-Length']:
                    headers[header_name] = value
        
        # Add content type if present
        if hasattr(request, 'content_type') and request.content_type:
            headers['Content-Type'] = request.content_type
            
        response = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            params=request.GET,
            data=request.body if request.method in ['POST', 'PUT', 'PATCH'] else None,
            timeout=30
        )
        
        # Return the response from the microservice
        return HttpResponse(
            response.content,
            status=response.status_code,
            content_type=response.headers.get('content-type', 'application/json')
        )
        
    except requests.RequestException as e:
        return Response({'error': 'Service unavailable'}, status=503)


def service_status(request):
    """
    Check status of all microservices
    """
    services_status = {}
    
    for service_name, service_url in settings.MICROSERVICES.items():
        try:
            response = requests.get(f'{service_url}/health/', timeout=5)
            services_status[service_name] = {
                'status': 'healthy' if response.status_code == 200 else 'unhealthy',
                'url': service_url,
                'response_time': response.elapsed.total_seconds()
            }
        except requests.RequestException:
            services_status[service_name] = {
                'status': 'unreachable',
                'url': service_url,
                'response_time': None
            }
    
    return JsonResponse({'services': services_status})
