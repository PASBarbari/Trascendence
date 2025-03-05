#!/bin/bash

# Define color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to show logs from pods
show_logs() {
    echo -e "${CYAN}==== Showing logs for pods ====${NC}"
    echo -e "${GREEN}1. Show logs from all pods${NC}"
    echo -e "${GREEN}2. Show logs from specific namespace${NC}"
    echo -e "${GREEN}3. Show logs from pods with issues${NC}"
    read -n 1 -r -p "Choose an option (1-3): " option
    echo
        
    case $option in
        1)
            namespaces=("login" "user" "pong" "chat" "notifications")
            for ns in "${namespaces[@]}"; do
                pods=$(kubecolor get pods -n $ns -o jsonpath='{.items[*].metadata.name}')
                for pod in $pods; do
                    echo -e "${YELLOW}==== Logs from $pod in namespace $ns ====${NC}"
                    kubecolor logs -n $ns $pod --tail=50
                    echo ""
                done
            done
            ;;
        2)
            echo -e "${CYAN}Available namespaces:${NC}"
            for i in "${!namespaces[@]}"; do
                echo -e "${GREEN}$((i+1)). ${namespaces[$i]}${NC}"
            done
            
            read -n 1 -r -p "Select namespace (1-${#namespaces[@]}): " ns_choice
			echo
            selected_ns=${namespaces[$((ns_choice-1))]}
            
            pods=$(kubecolor get pods -n $selected_ns -o jsonpath='{.items[*].metadata.name}')
            for pod in $pods; do
                echo -e "${YELLOW}==== Logs from $pod in namespace $selected_ns ====${NC}"
                kubecolor logs -n $selected_ns $pod --tail=50
                echo ""
            done
            ;;
        3)
            namespaces=("login" "user" "pong" "chat" "notifications")
            Error_pods=()
            Error_namespaces=()
            
            echo -e "${CYAN}Searching for problematic pods...${NC}"
            for ns in "${namespaces[@]}"; do
                # Get pods with various issue statuses
                error_pods_list=$(kubecolor get pods -n $ns | grep -E 'Error|CrashLoopBackOff|ImagePullBackOff|Failed|ErrImagePull|ContainerCreating|Pending' | awk '{print $1}')
                if [ ! -z "$error_pods_list" ]; then
                    for pod in $error_pods_list; do
                        Error_pods+=("$pod")
                        Error_namespaces+=("$ns")
                    done
                fi
            done
            
            if [ ${#Error_pods[@]} -gt 0 ]; then
                for i in "${!Error_pods[@]}"; do
                    pod=${Error_pods[$i]}
                    ns=${Error_namespaces[$i]}
                    echo -e "${RED}==== Logs from problematic pod $pod in namespace $ns ====${NC}"
                    kubecolor logs -n $ns $pod --tail=50 || echo -e "${YELLOW}Could not retrieve logs, trying to describe pod:${NC}"
                    # If logs fail, try to describe the pod
                    if [ $? -ne 0 ]; then
                        echo -e "${PURPLE}==== Pod description for $pod in namespace $ns ====${NC}"
                        kubecolor describe pod -n $ns $pod
                    fi
                done
                echo -e "${YELLOW}Do you want to restart these pods? (y/n)${NC}"
                read -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    for i in "${!Error_pods[@]}"; do
                        pod=${Error_pods[$i]}
                        ns=${Error_namespaces[$i]}
                        echo -e "${GREEN}Deleting pod $pod in namespace $ns${NC}"
                        kubecolor delete pod -n $ns $pod
                    done
                fi
            else
                echo -e "${GREEN}No problematic pods found${NC}"
            fi
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            ;;
    esac
}

# Function to restart pods
restart_pods() {
    echo -e "${CYAN}What would you like to restart?${NC}"
    echo -e "${GREEN}1. All deployments${NC}"
    echo -e "${GREEN}2. Specific deployment${NC}"
    echo -e "${GREEN}3. Only problematic pods${NC}"
    read -n 1 -r -p "Choose an option (1-3): " restart_option
    echo
    
    namespaces=("login" "user" "pong" "chat" "notifications")
    
    case $restart_option in
        1)
            echo -e "${CYAN}Restarting all deployments...${NC}"
            kubecolor rollout restart deployment -n login -l app=login-server
            kubecolor rollout restart deployment -n user -l app=user
            kubecolor rollout restart deployment -n pong -l app=pong
            kubecolor rollout restart deployment -n chat -l app=chat
            kubecolor rollout restart deployment -n notifications -l app=notifications-server
            ;;
        2)
            echo -e "${CYAN}Available namespaces:${NC}"
            for i in "${!namespaces[@]}"; do
                echo -e "${GREEN}$((i+1)). ${namespaces[$i]}${NC}"
            done
            
            read -n 1 -r -p "Select namespace (1-${#namespaces[@]}): " ns_choice
			echo
            selected_ns=${namespaces[$((ns_choice-1))]}
            
            echo -e "${CYAN}Deployments in $selected_ns namespace:${NC}"
            deploy_list=($(kubecolor get deployments -n $selected_ns -o custom-columns=NAME:.metadata.name --no-headers))
            
            if [ ${#deploy_list[@]} -eq 0 ]; then
                echo -e "${RED}No deployments found in namespace $selected_ns${NC}"
                return
            fi
            
            for i in "${!deploy_list[@]}"; do
                echo -e "${GREEN}$((i+1)). ${deploy_list[$i]}${NC}"
            done
            
            read -n 1 -r -p "Select deployment to restart (1-${#deploy_list[@]}): " deploy_choice
			echo
            selected_deploy=${deploy_list[$((deploy_choice-1))]}
            
            echo -e "${CYAN}Restarting deployment $selected_deploy in namespace $selected_ns...${NC}"
            kubecolor rollout restart deployment/$selected_deploy -n $selected_ns
            ;;
        3)
            Error_pods=()
            Error_namespaces=()
            
            echo -e "${CYAN}Searching for problematic pods...${NC}"
            for ns in "${namespaces[@]}"; do
                # Get pods with various issue statuses
                error_pods_list=$(kubecolor get pods -n $ns | grep -E 'Error|CrashLoopBackOff|ImagePullBackOff|Failed|ErrImagePull|ContainerCreating|Pending' | awk '{print $1}')
                if [ ! -z "$error_pods_list" ]; then
                    for pod in $error_pods_list; do
                        Error_pods+=("$pod")
                        Error_namespaces+=("$ns")
                    done
                fi
            done
            
            if [ ${#Error_pods[@]} -gt 0 ]; then
                echo -e "${YELLOW}Found ${#Error_pods[@]} problematic pods:${NC}"
                for i in "${!Error_pods[@]}"; do
                    pod=${Error_pods[$i]}
                    ns=${Error_namespaces[$i]}
                    echo -e "${RED}$((i+1)). $pod in namespace $ns${NC}"
                done
                
                echo -e "${YELLOW}Do you want to delete all problematic pods? (y/n)${NC}"
                read -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    for i in "${!Error_pods[@]}"; do
                        pod=${Error_pods[$i]}
                        ns=${Error_namespaces[$i]}
                        echo -e "${GREEN}Deleting pod $pod in namespace $ns${NC}"
                        kubecolor delete pod -n $ns $pod
                    done
                else
                    echo -e "${CYAN}Select specific pod to delete (1-${#Error_pods[@]}, 0 to cancel):${NC}"
                    read pod_choice
                    if [ "$pod_choice" -gt 0 ] && [ "$pod_choice" -le "${#Error_pods[@]}" ]; then
                        pod=${Error_pods[$((pod_choice-1))]}
                        ns=${Error_namespaces[$((pod_choice-1))]}
                        echo -e "${GREEN}Deleting pod $pod in namespace $ns${NC}"
                        kubecolor delete pod -n $ns $pod
                    else
                        echo -e "${YELLOW}No pods deleted${NC}"
                    fi
                fi
            else
                echo -e "${GREEN}No problematic pods found${NC}"
            fi
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            ;;
    esac
}

# Main menu
echo -e "${PURPLE}==== Kubernetes Management Tool ====${NC}"
echo -e "${GREEN}1. Restart pods${NC}"
echo -e "${GREEN}2. Show logs${NC}"
echo -e "${GREEN}3. Reapply manifests${NC}"
read -n 1 -r -p "Choose an option (1-3): " main_option
echo

namespaces=("login" "user" "pong" "chat" "notifications")

case $main_option in
    1)
        restart_pods
        ;;
    2)
        show_logs
        ;;
    3)
        echo -e "${CYAN}Reapplying manifests...${NC}"
        kubecolor apply -f Manifests/Notifications/notification-deployment.yaml      
        kubecolor apply -f Manifests/Chat/chat-deployment.yaml
        kubecolor apply -f Manifests/Pong/pong-deployment.yaml
        kubecolor apply -f Manifests/User/User-deployment.yaml
        kubecolor apply -f Manifests/Login/login-server-deployment.yaml
        echo -e "${GREEN}All manifests have been reapplied!${NC}"
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        ;;
esac