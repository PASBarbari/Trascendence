#!/bin/bash

# Trascendence ELK Uniform Logging Configurator
# Embeds ELK-optimized logging directly into Django settings.py files
# Perfect for Docker builds - no external dependencies needed

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"

echo -e "${BLUE}🔧 Trascendence ELK Uniform Logging Configurator${NC}"
echo -e "${BLUE}================================================${NC}"

# Define the microservices and their settings.py paths
declare -A MICROSERVICES=(
    ["login"]="login/login/settings.py"
    ["chat"]="chat/chat/settings.py"
    ["task_user"]="task_user/task_user/settings.py"
    ["pongProject"]="pongProject/pongProject/settings.py"
    ["Notifications"]="Notifications/Notifications/settings.py"
    ["api-docs"]="api-docs/api_docs/settings.py"
)

# Define service name mappings
declare -A SERVICE_NAMES=(
    ["login"]="login"
    ["chat"]="chat"
    ["task_user"]="user"
    ["pongProject"]="pong"
    ["Notifications"]="notifications"
    ["api-docs"]="api-docs"
)

# Function to get the logging configuration template
get_logging_config() {
    local service_name="$1"
    cat << EOF

# ELK-Optimized Logging Configuration for $service_name service
# This configuration provides standardized logging for the ELK Stack

import os
from datetime import datetime

# Logging environment configuration
USE_JSON_LOGGING = os.getenv('USE_JSON_LOGGING', 'true').lower() == 'true'
USE_FILE_LOGGING = os.getenv('USE_FILE_LOGGING', 'false').lower() == 'true'
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# Create logs directory for file logging (if enabled)
if USE_FILE_LOGGING:
    LOG_DIR = os.path.join(BASE_DIR, 'logs')
    os.makedirs(LOG_DIR, exist_ok=True)
    ERROR_LOG = os.path.join(LOG_DIR, f'error_{datetime.now().strftime("%Y-%m-%d")}.log')
    INFO_LOG = os.path.join(LOG_DIR, f'info_{datetime.now().strftime("%Y-%m-%d")}.log')
else:
    ERROR_LOG = None
    INFO_LOG = None

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json_kubernetes': {
            'format': '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "module": "%(module)s", "message": "%(message)s", "pathname": "%(pathname)s", "lineno": %(lineno)d, "funcName": "%(funcName)s", "process": %(process)d, "thread": %(thread)d, "service": "$service_name"}',
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
        # Primary handler for Kubernetes - JSON logs to stdout
        'console_json': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'json_kubernetes',
        },
        # Development console handler
        'console_verbose': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        # Optional file handlers (controlled by USE_FILE_LOGGING)
        'file_error': {
            'level': 'ERROR',
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'filename': ERROR_LOG or '/dev/null',
            'when': 'midnight',
            'backupCount': 7,
            'formatter': 'json_kubernetes',
        } if USE_FILE_LOGGING and ERROR_LOG else {
            'level': 'ERROR',
            'class': 'logging.NullHandler',
        },
        'file_info': {
            'level': 'INFO',
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'filename': INFO_LOG or '/dev/null',
            'when': 'midnight',
            'backupCount': 7,
            'formatter': 'json_kubernetes',
        } if USE_FILE_LOGGING and INFO_LOG else {
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
        # Root logger
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
            'level': 'WARNING',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'WARNING',
            'propagate': False,
        },
        # ASGI/WebSocket loggers (for chat and pong services)
        'daphne': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'INFO',
            'propagate': False,
        },
        'channels': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'INFO',
            'propagate': False,
        },
        'websockets': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'INFO',
            'propagate': False,
        },
        # Service-specific loggers
        '$service_name': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
            'propagate': False,
        },
        'my_$service_name': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
            'propagate': False,
        },
        # Additional app-specific loggers
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
        # Third-party library loggers
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
EOF
}

# Function to check if ELK logging is already configured
has_elk_logging() {
    local settings_file="$1"
    grep -q "ELK-Optimized Logging Configuration" "$settings_file" 2>/dev/null || \
    grep -q "get_elk_logging_config" "$settings_file" 2>/dev/null
}

# Function to remove existing logging configurations
remove_existing_logging() {
    local settings_file="$1"
    local temp_file="${settings_file}.tmp"
    
    echo -e "${YELLOW}🧹 Removing existing logging configuration from $(basename "$settings_file")...${NC}"
    
    # Create a Python script to intelligently remove logging configurations
    if python3 << EOF
import re
import sys

try:
    with open('$settings_file', 'r') as f:
        content = f.read()

    # Remove various logging-related sections
    patterns_to_remove = [
        # Remove shared logging imports
        r'# Import shared logging configuration.*?\n.*?from shared_logging import.*?\n.*?LOGGING = get_elk_logging_config.*?\n',
        # Remove ELK logging configuration blocks
        r'# ELK-Optimized Logging Configuration.*?\nLOGGING = \{.*?\n\}',
        # Remove old logging variable definitions
        r'LOG_LEVEL = .*?\n',
        r'LOG_DIR = .*?\n',
        r'os\.makedirs\(LOG_DIR.*?\n',
        r'ERROR_LOG = .*?\n',
        r'INFO_LOG = .*?\n',
        r'DEBUG_LOG = .*?\n',
        r'DAPHNE_LOG = .*?\n',
        r'CHANNEL_LOG = .*?\n',
        # Remove environment-based logging configs
        r'USE_JSON_LOGGING = .*?\n',
        r'USE_FILE_LOGGING = .*?\n',
    ]

    # Apply simple pattern removals
    for pattern in patterns_to_remove:
        content = re.sub(pattern, '', content, flags=re.MULTILINE | re.DOTALL)

    # More sophisticated LOGGING dictionary removal
    lines = content.split('\n')
    new_lines = []
    skip_logging_block = False
    brace_count = 0

    for line in lines:
        if 'LOGGING = {' in line and not line.strip().startswith('#'):
            skip_logging_block = True
            brace_count = line.count('{') - line.count('}')
            continue
        elif skip_logging_block:
            brace_count += line.count('{') - line.count('}')
            if brace_count <= 0:
                skip_logging_block = False
            continue
        else:
            new_lines.append(line)

    content = '\n'.join(new_lines)

    # Clean up extra whitespace
    content = re.sub(r'\n\n\n+', '\n\n', content)
    content = content.strip() + '\n'

    with open('$temp_file', 'w') as f:
        f.write(content)
    
    print("SUCCESS")
    
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
EOF
    then
        mv "$temp_file" "$settings_file" && return 0
    else
        echo -e "${RED}❌ Failed to clean logging configuration${NC}"
        return 1
    fi
}

# Function to add ELK logging configuration
add_elk_logging() {
    local settings_file="$1"
    local service_name="$2"
    
    echo -e "${GREEN}➕ Adding ELK logging configuration to $(basename "$settings_file")...${NC}"
    
    # Append the logging configuration
    if get_logging_config "$service_name" >> "$settings_file"; then
        return 0
    else
        echo -e "${RED}❌ Failed to add logging configuration${NC}"
        return 1
    fi
}

# Main processing
echo -e "${BLUE}🔍 Processing Django microservices...${NC}"

processed_count=0
updated_count=0

for service_dir in "${!MICROSERVICES[@]}"; do
    settings_path="${MICROSERVICES[$service_dir]}"
    full_settings_path="$BACKEND_DIR/$settings_path"
    
    if [ -f "$full_settings_path" ]; then
        echo -e "${BLUE}📄 Processing: $settings_path${NC}"
        
        service_name="${SERVICE_NAMES[$service_dir]}"
        
        # Always remove existing logging and add new configuration
        if remove_existing_logging "$full_settings_path"; then
            echo -e "${YELLOW}🧹 Cleaned existing logging in $(basename "$full_settings_path")${NC}"
        fi
        
        if add_elk_logging "$full_settings_path" "$service_name"; then
            echo -e "${GREEN}✅ Updated $settings_path with $service_name logging${NC}"
            ((updated_count++))
        else
            echo -e "${RED}❌ Failed to update $settings_path${NC}"
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

if [ $updated_count -gt 0 ]; then
    echo -e "\n${GREEN}✅ ELK uniform logging configuration applied successfully!${NC}"
    echo -e "${GREEN}🐳 All services now have embedded ELK-optimized logging.${NC}"
    echo -e "${GREEN}🔗 No external dependencies - perfect for Docker builds!${NC}"
    
    echo -e "\n${BLUE}🔧 Environment Variables for Production (Kubernetes):${NC}"
    echo -e "  USE_JSON_LOGGING=true"
    echo -e "  USE_FILE_LOGGING=false"
    echo -e "  LOG_LEVEL=INFO"
    echo -e "  DEBUG=false"
    
    echo -e "\n${BLUE}🔧 Environment Variables for Development:${NC}"
    echo -e "  USE_JSON_LOGGING=false"
    echo -e "  USE_FILE_LOGGING=true"
    echo -e "  LOG_LEVEL=DEBUG"
    echo -e "  DEBUG=true"
    
    echo -e "\n${BLUE}📝 Added to each service:${NC}"
    echo -e "  ✅ ELK-optimized JSON logging format"
    echo -e "  ✅ Environment-based configuration"
    echo -e "  ✅ Service identification in logs"
    echo -e "  ✅ Comprehensive logger coverage"
    echo -e "  ✅ Container-friendly stdout logging"
    echo -e "  ✅ Optional file logging for development"
else
    echo -e "\n${YELLOW}⚠️  No files were updated.${NC}"
fi

echo -e "\n${GREEN}🎉 Trascendence ELK uniform logging setup completed!${NC}"
echo -e "${BLUE}💡 Ready for Docker builds and ELK Stack integration.${NC}"
