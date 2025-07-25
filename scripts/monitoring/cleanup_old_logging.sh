#!/bin/bash

# Cleanup script to remove Python import-based logging configurations
# Run this before applying the new bash-based uniform logging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"

echo -e "${BLUE}🧹 Cleaning up existing logging configurations${NC}"
echo -e "${BLUE}=============================================${NC}"

# Define the microservices and their settings.py paths
declare -A MICROSERVICES=(
    ["login"]="login/login/settings.py"
    ["chat"]="chat/chat/settings.py"
    ["task_user"]="task_user/task_user/settings.py"
    ["pongProject"]="pongProject/pongProject/settings.py"
    ["Notifications"]="Notifications/Notifications/settings.py"
    ["api-docs"]="api-docs/api_docs/settings.py"
)

# Function to clean up a settings file
cleanup_settings_file() {
    local settings_file="$1"
    local backup_file="${settings_file}.backup"
    
    echo -e "${YELLOW}🧹 Cleaning up $(basename "$settings_file")...${NC}"
    
    # Create backup
    cp "$settings_file" "$backup_file"
    
    # Remove import statements and logging configuration
    sed -i '/# Import shared logging configuration/,+5d' "$settings_file"
    sed -i '/^sys\.path\.append.*shared_logging/d' "$settings_file"
    sed -i '/^from shared_logging import/d' "$settings_file"
    sed -i '/^LOGGING = get_elk_logging_config/d' "$settings_file"
    
    # Clean up empty lines at the end
    sed -i ':a;N;$!ba;s/\n\n*$/\n/' "$settings_file"
    
    echo -e "${GREEN}✅ Cleaned up $(basename "$settings_file")${NC}"
}

# Process each microservice
for service_dir in "${!MICROSERVICES[@]}"; do
    settings_path="${MICROSERVICES[$service_dir]}"
    full_settings_path="$BACKEND_DIR/$settings_path"
    
    if [ -f "$full_settings_path" ]; then
        if grep -q "get_elk_logging_config" "$full_settings_path" 2>/dev/null; then
            cleanup_settings_file "$full_settings_path"
        else
            echo -e "${BLUE}ℹ️  No cleanup needed for $settings_path${NC}"
        fi
    else
        echo -e "${RED}❌ Settings file not found: $settings_path${NC}"
    fi
done

# Remove shared_logging.py if it exists
if [ -f "$BACKEND_DIR/shared_logging.py" ]; then
    echo -e "${YELLOW}🗑️  Removing shared_logging.py${NC}"
    rm "$BACKEND_DIR/shared_logging.py"
    echo -e "${GREEN}✅ Removed shared_logging.py${NC}"
fi

echo -e "\n${GREEN}🎉 Cleanup completed! Ready for bash-based logging configuration.${NC}"
