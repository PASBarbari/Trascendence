#!/bin/bash

# Trascendence Microservices Uniform Logging Auto-Configurator
# This script automatically applies ELK-optimized logging configuration to all Django services
# Run this before Docker builds to ensure consistent logging across all microservices

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"

echo -e "${BLUE}🔧 Trascendence Uniform Logging Configurator${NC}"
echo -e "${BLUE}================================================${NC}"

# Create shared logging configuration if it doesn't exist
SHARED_LOGGING_FILE="$BACKEND_DIR/shared_logging.py"

if [ ! -f "$SHARED_LOGGING_FILE" ]; then
    echo -e "${YELLOW}📝 Creating shared logging configuration...${NC}"
    cat > "$SHARED_LOGGING_FILE" << 'EOF'
# Shared ELK-optimized logging configuration for Trascendence microservices
# This file provides a standardized logging setup for all Django services

import os
from datetime import datetime

def get_elk_logging_config(service_name, base_dir):
    """
    Returns a standardized logging configuration optimized for ELK Stack integration.
    
    Args:
        service_name (str): Name of the microservice (e.g., 'login', 'chat', 'user', 'notifications', 'pong')
        base_dir (Path): Django BASE_DIR for the service
    
    Returns:
        dict: Complete logging configuration for Django LOGGING setting
    """
    
    # Create logs directory
    LOG_DIR = os.path.join(base_dir, 'logs')
    os.makedirs(LOG_DIR, exist_ok=True)
    
    # Get environment specifics
    ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    # Environment-based logging configuration
    USE_JSON_LOGGING = os.getenv('USE_JSON_LOGGING', 'true').lower() == 'true'
    USE_FILE_LOGGING = os.getenv('USE_FILE_LOGGING', 'false').lower() == 'true'
    
    # Log file paths (used only if USE_FILE_LOGGING is True)
    ERROR_LOG = os.path.join(LOG_DIR, f'error_{datetime.now().strftime("%Y-%m-%d")}.log')
    INFO_LOG = os.path.join(LOG_DIR, f'info_{datetime.now().strftime("%Y-%m-%d")}.log')
    
    return {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
                'style': '{',
            },
            'json_kubernetes': {
                'format': f'{{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "module": "%(module)s", "message": "%(message)s", "pathname": "%(pathname)s", "lineno": %(lineno)d, "funcName": "%(funcName)s", "process": %(process)d, "thread": %(thread)d, "service": "{service_name}"}}',
                'datefmt': '%Y-%m-%dT%H:%M:%S.%fZ',
                'style': '%',
            },
            'json_console': {
                'format': f'{{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s", "pathname": "%(pathname)s", "lineno": %(lineno)d, "funcName": "%(funcName)s", "service": "{service_name}"}}',
                'datefmt': '%Y-%m-%dT%H:%M:%S.%fZ',
                'style': '%',
            },
            'simple': {
                'format': '{levelname} {message}',
                'style': '{',
            },
        },
        'filters': {
            'require_debug_true': {
                '()': 'django.utils.log.RequireDebugTrue',
            },
            'require_debug_false': {
                '()': 'django.utils.log.RequireDebugFalse',
            },
        },
        'handlers': {
            # Primary handler for Kubernetes - all logs go to stdout as JSON
            'console_json': {
                'level': 'DEBUG',
                'class': 'logging.StreamHandler',
                'formatter': 'json_kubernetes',
            },
            # Fallback console handler for development
            'console_verbose': {
                'level': 'DEBUG',
                'class': 'logging.StreamHandler',
                'formatter': 'verbose',
            },
            # File handlers (optional in production)
            'file_error': {
                'level': 'ERROR',
                'class': 'logging.handlers.TimedRotatingFileHandler',
                'filename': ERROR_LOG,
                'when': 'midnight',
                'backupCount': 7,  # Reduced for container storage
                'formatter': 'json_kubernetes',
            } if USE_FILE_LOGGING else {
                'level': 'ERROR',
                'class': 'logging.NullHandler',
            },
            'file_info': {
                'level': 'INFO',
                'class': 'logging.handlers.TimedRotatingFileHandler',
                'filename': INFO_LOG,
                'when': 'midnight',
                'backupCount': 7,  # Reduced for container storage
                'formatter': 'json_kubernetes',
            } if USE_FILE_LOGGING else {
                'level': 'INFO',
                'class': 'logging.NullHandler',
            },
            'mail_admins': {
                'level': 'ERROR',
                'class': 'django.utils.log.AdminEmailHandler',
                'filters': ['require_debug_false'],
                'formatter': 'verbose',
            },
        },
        'loggers': {
            # Root logger - catches everything
            '': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': LOG_LEVEL,
                'propagate': False,
            },
            # Django core loggers
            'django': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': LOG_LEVEL,
                'propagate': False,
            },
            'django.request': {
                'handlers': (['console_json'] if USE_JSON_LOGGING else ['console_verbose']) + ['mail_admins'],
                'level': 'ERROR',
                'propagate': False,
            },
            'django.server': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'INFO',
                'propagate': False,
            },
            'django.db.backends': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'WARNING',  # Reduced DB query noise in production
                'propagate': False,
            },
            'django.security': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'WARNING',
                'propagate': False,
            },
            # ASGI/Daphne loggers (for services that use WebSockets)
            'daphne': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'INFO',
                'propagate': False,
            },
            'daphne.server': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'INFO',
                'propagate': False,
            },
            'daphne.ws_protocol': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'INFO',
                'propagate': False,
            },
            # Channels/WebSocket loggers (for chat service)
            'channels': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'INFO',
                'propagate': False,
            },
            'channels.worker': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'INFO',
                'propagate': False,
            },
            'websockets': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'INFO',
                'propagate': False,
            },
            # Service-specific application loggers
            f'{service_name}': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
                'propagate': False,
            },
            f'my_{service_name}': {  # For apps named like my_chat, my_login, etc.
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
                'propagate': False,
            },
            # Task/User service specific loggers
            'task_app': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
                'propagate': False,
            },
            'user_app': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
                'propagate': False,
            },
            'pong_app': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
                'propagate': False,
            },
            'my_notifications': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
                'propagate': False,
            },
            'api_docs': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
                'propagate': False,
            },
            # Third-party loggers
            'redis': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'WARNING',
                'propagate': False,
            },
            'celery': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'INFO',
                'propagate': False,
            },
            'oauth2_provider': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'INFO',
                'propagate': False,
            },
            'corsheaders': {
                'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
                'level': 'WARNING',
                'propagate': False,
            },
        },
    }

# Service name mappings for easy reference
SERVICE_NAMES = {
    'login': 'login',
    'chat': 'chat', 
    'task_user': 'user',
    'pongProject': 'pong',
    'Notifications': 'notifications',
    'api-docs': 'api-docs'
}
EOF
    echo -e "${GREEN}✅ Created shared_logging.py${NC}"
else
    echo -e "${GREEN}✅ Found existing shared_logging.py${NC}"
fi

# Function to detect service name from directory path
get_service_name() {
    local dir_path="$1"
    local dir_name=$(basename "$dir_path")
    
    case "$dir_name" in
        "login") echo "login" ;;
        "chat") echo "chat" ;;
        "task_user") echo "user" ;;
        "pongProject") echo "pong" ;;
        "Notifications") echo "notifications" ;;
        "api-docs") echo "api-docs" ;;
        *) echo "unknown" ;;
    esac
}

# Function to check if logging config is already applied
has_elk_logging() {
    local settings_file="$1"
    grep -q "get_elk_logging_config" "$settings_file" 2>/dev/null
}

# Function to remove old logging configurations
remove_old_logging() {
    local settings_file="$1"
    local temp_file="${settings_file}.tmp"
    
    echo -e "${YELLOW}🧹 Removing old logging configuration from $(basename "$settings_file")...${NC}"
    
    # Create a temporary file without old logging configurations
    python3 << EOF
import re

with open('$settings_file', 'r') as f:
    content = f.read()

# Remove old logging-related variables and configurations
patterns_to_remove = [
    r'# Set.*log.*\n.*LOG_LEVEL.*\n',
    r'# Set base log directory.*?\n.*LOG_DIR.*?\n.*os\.makedirs.*?\n',
    r'# Get environment specifics.*?\n.*ENVIRONMENT.*?\n.*LOG_LEVEL.*?\n',
    r'# Log file paths.*?\n(?:.*_LOG.*?\n)*',
    r'# Logging configuration.*?\nLOGGING = \{.*?\n\}',
    r'LOG_LEVEL = .*?\n',
    r'LOG_DIR = .*?\n',
    r'os\.makedirs\(LOG_DIR.*?\n',
    r'ERROR_LOG = .*?\n',
    r'INFO_LOG = .*?\n',
    r'DEBUG_LOG = .*?\n',
    r'DAPHNE_LOG = .*?\n',
    r'CHANNEL_LOG = .*?\n',
]

# Remove simple patterns first
for pattern in patterns_to_remove[:7]:
    content = re.sub(pattern, '', content, flags=re.MULTILINE)

# Remove complex LOGGING dictionary (more careful approach)
# Find LOGGING = { and its matching closing brace
import ast
lines = content.split('\n')
new_lines = []
skip_until_brace = False
brace_count = 0
in_logging_config = False

for line in lines:
    if 'LOGGING = {' in line and not line.strip().startswith('#'):
        in_logging_config = True
        skip_until_brace = True
        brace_count = line.count('{') - line.count('}')
        continue
    elif skip_until_brace:
        brace_count += line.count('{') - line.count('}')
        if brace_count <= 0:
            skip_until_brace = False
            in_logging_config = False
        continue
    else:
        new_lines.append(line)

content = '\n'.join(new_lines)

# Clean up multiple empty lines
content = re.sub(r'\n\n\n+', '\n\n', content)

with open('$temp_file', 'w') as f:
    f.write(content)
EOF

    mv "$temp_file" "$settings_file"
}

# Function to add ELK logging configuration
add_elk_logging() {
    local settings_file="$1"
    local service_name="$2"
    local service_dir="$3"
    
    echo -e "${GREEN}➕ Adding ELK logging configuration to $(basename "$settings_file")...${NC}"
    
    # Calculate relative path to shared_logging.py
    local relative_path=$(python3 -c "
import os
settings_dir = os.path.dirname('$settings_file')
backend_dir = '$BACKEND_DIR'
rel_path = os.path.relpath(backend_dir, settings_dir)
print(rel_path)
")
    
    # Add the logging configuration at the end of the file
    cat >> "$settings_file" << EOF

# Import shared logging configuration
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '$relative_path'))
from shared_logging import get_elk_logging_config

# ELK-optimized logging configuration
LOGGING = get_elk_logging_config('$service_name', BASE_DIR)
EOF
}

# Find all Django settings.py files
echo -e "${BLUE}🔍 Searching for Django settings.py files...${NC}"

# Define the microservices and their expected settings.py paths
declare -A MICROSERVICES=(
    ["login"]="login/login/settings.py"
    ["chat"]="chat/chat/settings.py"
    ["task_user"]="task_user/task_user/settings.py"
    ["pongProject"]="pongProject/pongProject/settings.py"
    ["Notifications"]="Notifications/Notifications/settings.py"
    ["api-docs"]="api-docs/api_docs/settings.py"
)

processed_count=0
updated_count=0
skipped_count=0

# Process each microservice
for service_dir in "${!MICROSERVICES[@]}"; do
    settings_path="${MICROSERVICES[$service_dir]}"
    full_settings_path="$BACKEND_DIR/$settings_path"
    
    if [ -f "$full_settings_path" ]; then
        echo -e "${BLUE}📄 Processing: $settings_path${NC}"
        
        service_name=$(get_service_name "$service_dir")
        
        if has_elk_logging "$full_settings_path"; then
            echo -e "${YELLOW}⚠️  ELK logging already configured in $settings_path, updating...${NC}"
            remove_old_logging "$full_settings_path"
            add_elk_logging "$full_settings_path" "$service_name" "$service_dir"
            ((updated_count++))
        else
            echo -e "${GREEN}🆕 Adding ELK logging to $settings_path...${NC}"
            remove_old_logging "$full_settings_path"  # Remove any old configs first
            add_elk_logging "$full_settings_path" "$service_name" "$service_dir"
            ((updated_count++))
        fi
        
        ((processed_count++))
    else
        echo -e "${RED}❌ Settings file not found: $settings_path${NC}"
    fi
done

# Summary
echo -e "\n${BLUE}📊 Summary${NC}"
echo -e "${BLUE}==========${NC}"
echo -e "📄 Settings files processed: ${GREEN}$processed_count${NC}"
echo -e "🔄 Files updated: ${GREEN}$updated_count${NC}"
echo -e "⏭️  Files skipped: ${YELLOW}$skipped_count${NC}"

if [ $updated_count -gt 0 ]; then
    echo -e "\n${GREEN}✅ Uniform logging configuration applied successfully!${NC}"
    echo -e "${GREEN}🐳 Ready for Docker builds with ELK-optimized logging.${NC}"
    
    echo -e "\n${BLUE}🔧 Environment Variables for Production:${NC}"
    echo -e "export USE_JSON_LOGGING=true"
    echo -e "export USE_FILE_LOGGING=false"
    echo -e "export LOG_LEVEL=INFO"
    echo -e "export DEBUG=false"
    
    echo -e "\n${BLUE}🔧 Environment Variables for Development:${NC}"
    echo -e "export USE_JSON_LOGGING=false"
    echo -e "export USE_FILE_LOGGING=true"
    echo -e "export LOG_LEVEL=DEBUG"
    echo -e "export DEBUG=true"
else
    echo -e "\n${YELLOW}⚠️  No files were updated. All services may already have ELK logging configured.${NC}"
fi

echo -e "\n${GREEN}🎉 Trascendence logging uniformity process completed!${NC}"
