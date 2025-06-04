#!/bin/bash

# Health Check Script for ft_transcendence Microservices
# This script checks the health status of all microservices

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service configurations
declare -A SERVICES=(
    ["Login"]="localhost:8000"
    ["Chat"]="localhost:8001" 
    ["Task/User"]="localhost:8002"
    ["Notifications"]="localhost:8003"
    ["Pong"]="localhost:8004"
)

# Health check endpoints
declare -A HEALTH_ENDPOINTS=(
    ["Login"]="/health/"
    ["Chat"]="/health/"
    ["Task/User"]="/health/"
    ["Notifications"]="/health/"
    ["Pong"]="/health/"
)

echo -e "${BLUE}🏥 ft_transcendence Health Check${NC}"
echo -e "${BLUE}=================================${NC}\n"

overall_status=0

# Function to check service health
check_service_health() {
    local service_name=$1
    local host=${SERVICES[$service_name]}
    local endpoint=${HEALTH_ENDPOINTS[$service_name]}
    local url="http://${host}${endpoint}"
    
    echo -n "Checking $service_name ($host)... "
    
    # Check if service is responding
    if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Healthy${NC}"
    else
        echo -e "${RED}❌ Unhealthy${NC}"
        overall_status=1
        
        # Try to check if port is open
        if nc -z ${host/:/ } 2>/dev/null; then
            echo -e "  ${YELLOW}⚠️  Port is open but health endpoint not responding${NC}"
        else
            echo -e "  ${RED}🚫 Service not running or port closed${NC}"
        fi
    fi
}

# Check database connectivity
check_database() {
    echo -n "Checking PostgreSQL connection... "
    if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Connected${NC}"
    else
        echo -e "${RED}❌ Not connected${NC}"
        overall_status=1
    fi
}

# Check Redis connectivity  
check_redis() {
    echo -n "Checking Redis connection... "
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Connected${NC}"
    else
        echo -e "${RED}❌ Not connected${NC}"
        overall_status=1
    fi
}

# Check frontend
check_frontend() {
    echo -n "Checking Frontend (localhost:3000)... "
    if curl -s --max-time 5 "http://localhost:3000" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Running${NC}"
    else
        echo -e "${RED}❌ Not running${NC}"
        overall_status=1
    fi
}

# Main health check execution
echo -e "${YELLOW}🔧 Infrastructure Health:${NC}"
check_database
check_redis
echo ""

echo -e "${YELLOW}🚀 Microservices Health:${NC}"
for service in "${!SERVICES[@]}"; do
    check_service_health "$service"
done
echo ""

echo -e "${YELLOW}🌐 Frontend Health:${NC}"
check_frontend
echo ""

# Overall status
if [ $overall_status -eq 0 ]; then
    echo -e "${GREEN}🎉 All services are healthy!${NC}"
    exit 0
else
    echo -e "${RED}💥 Some services are unhealthy. Check the logs above.${NC}"
    echo ""
    echo -e "${YELLOW}🛠️  Troubleshooting tips:${NC}"
    echo -e "   1. Make sure PostgreSQL is running: ${BLUE}sudo systemctl start postgresql${NC}"
    echo -e "   2. Make sure Redis is running: ${BLUE}sudo systemctl start redis${NC}"
    echo -e "   3. Check service logs in Back-End/*/logs/ directories"
    echo -e "   4. Verify environment variables are set correctly"
    echo -e "   5. Run: ${BLUE}./start.sh${NC} to start all services"
    exit 1
fi
