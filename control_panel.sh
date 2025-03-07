#!/bin/bash

# Define color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color


# Function to show menu with arrow keys
show_menu() {
    local options=("$@")
    local selected=0
    local key
    
    # Hide cursor
    tput civis
    
	while true; do
		# Clear screen
		clear
		
		# Print a header showing keys
		echo -e "${BLUE}[↑/↓/w/s: Navigate | Enter: Select | Backspace: Go Back]${NC}\n"
		
		# Print menu
		for i in "${!options[@]}"; do
			if [ $i -eq $selected ]; then
				echo -e "${GREEN}> ${options[$i]}${NC}"
			else
				echo -e "  ${options[$i]}"
			fi
		done
		# Read key
		read -s -n 1 key

		# For arrow keys (they start with escape sequence)
		if [[ $key == $'\e' ]]; then
			read -s -n 1 -t 0.1 key2
			if [[ $key2 == '[' ]]; then
				read -s -n 1 -t 0.1 key3
				key=$key$key2$key3
			else
				# If just Escape key pressed (not arrow)
				tput cnorm  # Show cursor
				return 255
			fi
		fi
		
		# Handle arrow keys and w/s keys
		if [[ $key == $'\e[A' || $key == 'w' ]]; then
			# Up arrow or 'w'
			((selected--))
			[ $selected -lt 0 ] && selected=$((${#options[@]}-1))
		elif [[ $key == $'\e[B' || $key == 's' ]]; then
			# Down arrow or 's'
			((selected++))
			[ $selected -ge ${#options[@]} ] && selected=0
		elif [[ $key == "" ]]; then
			# Enter key
			break
		elif [[ $key == $'\177' || $key == $'\b' ]]; then
			# Backspace key (127 or 8)
			tput cnorm  # Show cursor
			return 255
		elif [[ $key == $'\e' ]]; then
			# Escape key
			tput cnorm  # Show cursor
			return 254
		fi
	done
    
    # Show cursor
    tput cnorm
    
    # Return selected index
    return $selected
}

# Function to display logs with pagination
show_log_pager() {
    local logs="$1"
    local title="$2"
    
    # Save logs to a temp file
    local tmp_file=$(mktemp)
    echo -e "$logs" > "$tmp_file"
    
    # Use less to display with pagination
    echo -e "${YELLOW}$title${NC}"
    less -R "$tmp_file"
    
    # Clean up temp file
    rm "$tmp_file"
}

export LESS="-RFX"

# Set kubecolor theme - choose light or dark based on your terminal
# KUBECOLOR_THEME="--kubecolor-theme=dark"

# Function to show logs with proper colors
show_colored_logs() {
    local namespace=$1
    local pod=$2
    local tail=${3:-200}
    local title="${YELLOW}==== Logs from $pod in namespace $namespace ====${NC}"
    
    echo -e "$title"
    # Use --force-colors to ensure colors work with pipes
    kubecolor $KUBECOLOR_THEME logs -n $namespace $pod --tail=$tail --force-colors
}

# Function to describe pod with colors
describe_colored_pod() {
    local namespace=$1
    local pod=$2
    local title="${PURPLE}==== Pod description for $pod in namespace $namespace ====${NC}"
    
    echo -e "$title"
    kubecolor $KUBECOLOR_THEME describe pod -n $namespace $pod --force-colors | less -RFX
}


# Function to show logs from pods
show_logs() {
    local stay_in_logs=true
    
    while $stay_in_logs; do
        clear
        echo -e "${CYAN}==== Pod Logs Menu ====${NC}"
        
        local options=(
            "Show logs from all pods"
            "Show logs from specific namespace"
            "Show logs from pods with issues"
            "Return to main menu"
        )
        
        show_menu "${options[@]}"
        local option=$?

		if [ $option -eq 255 ]; then
            stay_in_logs=false
            return
        fi

        namespaces=("login" "user" "pong" "chat" "notifications")
        
        case $option in
            0) # All pods
                clear
                echo -e "${YELLOW}Fetching logs from all pods. This might take a while...${NC}"
                
                for ns in "${namespaces[@]}"; do
                    pods=$(kubecolor get pods -n $ns -o jsonpath='{.items[*].metadata.name}')
                    for pod in $pods; do
                        clear
                        echo -e "${YELLOW}==== Logs from $pod in namespace $ns ====${NC}"
                        show_colored_logs $ns $pod 200
                        
                        echo -e "\n${CYAN}Options:${NC}"
                        echo -e "${GREEN}1) View next pod${NC}"
                        echo -e "${GREEN}2) Return to logs menu${NC}"
                        read -n 1 -r choice
                        
                        if [[ $choice == "2" ]]; then
                            break 2  # Break out of both loops
                        fi
                    done
                done
                ;;
                
            1) # Specific namespace
                echo -e "${CYAN}Available namespaces:${NC}"
                
                show_menu "${namespaces[@]}"
                local ns_choice=$?
                selected_ns=${namespaces[$ns_choice]}
                
                while true; do
                    clear
                    echo -e "${CYAN}Pods in $selected_ns namespace:${NC}"
                    
                    pods=$(kubecolor get pods -n $selected_ns -o jsonpath='{.items[*].metadata.name}')
                    
                    # Create array of pod names
                    pod_array=("View all pods in this namespace")
                    pod_array+=("Return to logs menu")
                    for pod in $pods; do
                        pod_array+=("$pod")
                    done
                    
                    if [ ${#pod_array[@]} -le 2 ]; then
                        echo -e "${RED}No pods found in namespace $selected_ns${NC}"
                        read -n 1 -r -p "Press any key to return to logs menu..."
                        break
                    fi
                    
                    show_menu "${pod_array[@]}"
                    local pod_choice=$?
                    
                    if [ $pod_choice -eq 0 ]; then
    				# View all pods
						for pod in $pods; do
							clear
							echo -e "${YELLOW}==== Logs from $pod in namespace $selected_ns ====${NC}"
							show_colored_logs $selected_ns $pod 200  # Use $selected_ns instead of $ns
							
							echo -e "\n${CYAN}Options:${NC}"
							echo -e "${GREEN}1) View next pod${NC}"
							echo -e "${GREEN}2) Return to namespace menu${NC}"
							read -n 1 -r choice
							
							if [[ $choice == "2" ]]; then
								break  # Break pod loop
							fi
						done
                    elif [ $pod_choice -eq 1 ]; then
                        # Return to logs menu
                        break
                    else
                        # View specific pod
                        selected_pod=${pod_array[$pod_choice]}
                        
                        clear
                        echo -e "${YELLOW}==== Logs from $selected_pod in namespace $selected_ns ====${NC}"
                        kubecolor logs -n $selected_ns $selected_pod --tail=200 | less
                        
                        echo -e "\n${CYAN}Options:${NC}"
                        echo -e "${GREEN}1) Return to pod selection${NC}"
                        echo -e "${GREEN}2) Return to logs menu${NC}"
                        read -n 1 -r choice
                        
                        if [[ $choice == "2" ]]; then
                            break
                        fi
                    fi
                done
                ;;
                
            2) # Problematic pods
                while true; do
                    clear
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
                        # Create array of options for the menu
                        error_options=("View all problematic pods")
                        error_options+=("Return to logs menu")
                        for i in "${!Error_pods[@]}"; do
                            pod=${Error_pods[$i]}
                            ns=${Error_namespaces[$i]}
                            error_options+=("$pod in namespace $ns")
                        done
                        
                        echo -e "${CYAN}Select problematic pod to view:${NC}"
                        show_menu "${error_options[@]}"
                        local error_choice=$?
                        
                        if [ $error_choice -eq 0 ]; then
                            # View all problematic pods
                            for i in "${!Error_pods[@]}"; do
                                pod=${Error_pods[$i]}
                                ns=${Error_namespaces[$i]}
                                
                                clear
                                echo -e "${RED}==== Logs from problematic pod $pod in namespace $ns ====${NC}"
                                kubecolor logs -n $ns $pod --tail=200 2>/dev/null | less || {
                                    echo -e "${YELLOW}Could not retrieve logs, showing pod description:${NC}"
                                    describe_colored_pod $ns $pod
                                }
                                
                                echo -e "\n${CYAN}Options:${NC}"
                                echo -e "${GREEN}1) View next problematic pod${NC}"
                                echo -e "${GREEN}2) Delete this pod${NC}"
                                echo -e "${GREEN}3) Return to problematic pods menu${NC}"
                                read -n 1 -r choice
                                
                                if [[ $choice == "2" ]]; then
                                    echo -e "${GREEN}Deleting pod $pod in namespace $ns${NC}"
                                    kubecolor delete pod -n $ns $pod
                                    read -n 1 -r -p "Press any key to continue..."
                                    break
                                elif [[ $choice == "3" ]]; then
                                    break
                                fi
                            done
                        elif [ $error_choice -eq 1 ]; then
                            # Return to logs menu
                            break
                        else {
                            # View specific problematic pod
                            pod=${Error_pods[$((error_choice-2))]}
                            ns=${Error_namespaces[$((error_choice-2))]}
                            
                            clear
                            echo -e "${RED}==== Logs from problematic pod $pod in namespace $ns ====${NC}"
                            kubecolor logs -n $ns $pod --tail=200 2>/dev/null | less || {
                                echo -e "${YELLOW}Could not retrieve logs, showing pod description:${NC}"
                                describe_colored_pod $ns $pod
                            }
                            
                            echo -e "\n${CYAN}Options:${NC}"
                            echo -e "${GREEN}1) Return to problematic pods menu${NC}"
                            echo -e "${GREEN}2) Delete this pod${NC}"
                            echo -e "${GREEN}3) Return to logs menu${NC}"
                            read -n 1 -r choice
                            
                            if [[ $choice == "2" ]]; then
                                echo -e "${GREEN}Deleting pod $pod in namespace $ns${NC}"
                                kubecolor delete pod -n $ns $pod
                                read -n 1 -r -p "Press any key to continue..."
                            elif [[ $choice == "3" ]]; then
                                break
                            fi
                        }
                        fi
                    else {
                        echo -e "${GREEN}No problematic pods found${NC}"
                        read -n 1 -r -p "Press any key to return to logs menu..."
                        break
                    }
                    fi
                done
                ;;
                
            3) # Return to main menu
                stay_in_logs=false
                ;;
        esac
    done
}

# Function to restart pods
restart_pods() {
    local stay_in_restart=true
    
    while $stay_in_restart; do
        clear
        echo -e "${CYAN}==== Pod Restart Menu ====${NC}"
        
        local options=(
            "Restart all deployments"
            "Restart specific deployment"
            "Restart only problematic pods"
            "Return to main menu"
        )
        
        show_menu "${options[@]}"
        local restart_option=$?
        
		if [ $restart_option -eq 255 ]; then
            stay_in_restart=false
            break
        fi

        namespaces=("login" "user" "pong" "chat" "notifications")
        
        case $restart_option in
            0) # All deployments
                clear
                echo -e "${CYAN}Restarting all deployments...${NC}"
                kubecolor rollout restart deployment -n login -l app=login-server
                kubecolor rollout restart deployment -n user -l app=user
                kubecolor rollout restart deployment -n pong -l app=pong
                kubecolor rollout restart deployment -n chat -l app=chat
                kubecolor rollout restart deployment -n notifications -l app=notifications-server
                
                echo -e "\n${YELLOW}All deployments have been restarted.${NC}"
                echo -e "\n${CYAN}Options:${NC}"
                echo -e "${GREEN}1) Return to restart menu${NC}"
                echo -e "${GREEN}2) Return to main menu${NC}"
                read -n 1 -r choice
                
                if [[ $choice == "2" ]]; then
                    stay_in_restart=false
                fi
                ;;
                
            1) # Specific deployment
                while true; do
                    clear
                    echo -e "${CYAN}Select namespace:${NC}"
                    show_menu "${namespaces[@]}"
                    local ns_choice=$?
                    selected_ns=${namespaces[$ns_choice]}
                    
                    echo -e "${CYAN}Deployments in $selected_ns namespace:${NC}"
                    deploy_list=($(kubecolor get deployments -n $selected_ns -o custom-columns=NAME:.metadata.name --no-headers))
                    
                    if [ ${#deploy_list[@]} -eq 0 ]; then
                        echo -e "${RED}No deployments found in namespace $selected_ns${NC}"
                        read -n 1 -r -p "Press any key to return to restart menu..."
                        break
                    fi
                    
                    # Add a "Return to restart menu" option
                    deploy_menu=("Return to restart menu")
                    deploy_menu+=("${deploy_list[@]}")
                    
                    echo -e "${CYAN}Select deployment to restart:${NC}"
                    show_menu "${deploy_menu[@]}"
                    local deploy_choice=$?
                    
                    if [ $deploy_choice -eq 0 ]; then
                        # Return to restart menu
                        break
                    fi
                    
                    selected_deploy=${deploy_menu[$deploy_choice]}
                    
                    clear
                    echo -e "${CYAN}Restarting deployment $selected_deploy in namespace $selected_ns...${NC}"
                    kubecolor rollout restart deployment/$selected_deploy -n $selected_ns
                    
                    echo -e "\n${YELLOW}Deployment $selected_deploy has been restarted.${NC}"
                    echo -e "\n${CYAN}Options:${NC}"
                    echo -e "${GREEN}1) Restart another deployment${NC}"
                    echo -e "${GREEN}2) Return to restart menu${NC}"
                    read -n 1 -r choice
                    
                    if [[ $choice == "2" ]]; then
                        break
                    fi
                done
                ;;
                
            2) # Problematic pods
                clear
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
                    error_options=("Delete all problematic pods")
                    error_options+=("Return to restart menu")
                    for i in "${!Error_pods[@]}"; do
                        pod=${Error_pods[$i]}
                        ns=${Error_namespaces[$i]}
                        error_options+=("Delete $pod in namespace $ns")
                    done
                    
                    echo -e "${CYAN}Select option:${NC}"
                    show_menu "${error_options[@]}"
                    local pod_choice=$?
                    
                    if [ $pod_choice -eq 0 ]; then
                        # Delete all pods
                        clear
                        for i in "${!Error_pods[@]}"; do
                            pod=${Error_pods[$i]}
                            ns=${Error_namespaces[$i]}
                            echo -e "${GREEN}Deleting pod $pod in namespace $ns${NC}"
                            kubecolor delete pod -n $ns $pod
                        done
                        
                        echo -e "\n${YELLOW}All problematic pods have been deleted.${NC}"
                        echo -e "\n${CYAN}Options:${NC}"
                        echo -e "${GREEN}1) Return to restart menu${NC}"
                        echo -e "${GREEN}2) Return to main menu${NC}"
                        read -n 1 -r choice
                        
                        if [[ $choice == "2" ]]; then
                            stay_in_restart=false
                        fi
                    elif [ $pod_choice -eq 1 ]; then
                        # Return to restart menu
                        continue
                    else {
                        # Delete specific pod
                        pod=${Error_pods[$((pod_choice-2))]}
                        ns=${Error_namespaces[$((pod_choice-2))]}
                        
                        clear
                        echo -e "${GREEN}Deleting pod $pod in namespace $ns${NC}"
                        kubecolor delete pod -n $ns $pod
                        
                        echo -e "\n${YELLOW}Pod $pod has been deleted.${NC}"
                        echo -e "\n${CYAN}Options:${NC}"
                        echo -e "${GREEN}1) Delete another problematic pod${NC}"
                        echo -e "${GREEN}2) Return to restart menu${NC}"
                        read -n 1 -r choice
                        
                        if [[ $choice == "1" ]]; then
                            # Repeat this action (option 2)
                            restart_option=2
                            continue
                        fi
                    }
                    fi
                else {
                    echo -e "${GREEN}No problematic pods found${NC}"
                    echo -e "\n${CYAN}Options:${NC}"
                    echo -e "${GREEN}1) Return to restart menu${NC}"
                    echo -e "${GREEN}2) Return to main menu${NC}"
                    read -n 1 -r choice
                    
                    if [[ $choice == "2" ]]; then
                        stay_in_restart=false
                    fi
                }
                fi
                ;;
                
            3) # Return to main menu
                stay_in_restart=false
                ;;
        esac
    done
}

# Function to apply manifests
apply_manifests() {
    local stay_in_apply=true
    
    while $stay_in_apply; do
        clear
        echo -e "${CYAN}==== Apply Manifests Menu ====${NC}"
        
        local options=(
            "Apply all manifests"
            "Apply specific manifest"
            "Return to main menu"
        )
        
        show_menu "${options[@]}"
        local apply_option=$?
        
		if [ $apply_option -eq 255 ]; then
            stay_in_apply=false
            break
        fi

        case $apply_option in
            0) # Apply all
                clear
                echo -e "${CYAN}Applying all manifests...${NC}"
                echo -e "${YELLOW}Applying Notification deployment...${NC}"
                kubecolor apply -f Manifests/Notifications/notification-deployment.yaml
                
                echo -e "${YELLOW}Applying Chat deployment...${NC}"
                kubecolor apply -f Manifests/Chat/chat-deployment.yaml
                
                echo -e "${YELLOW}Applying Pong deployment...${NC}"
                kubecolor apply -f Manifests/Pong/pong-deployment.yaml
                
                echo -e "${YELLOW}Applying User deployment...${NC}"
                kubecolor apply -f Manifests/User/User-deployment.yaml
                
                echo -e "${YELLOW}Applying Login deployment...${NC}"
                kubecolor apply -f Manifests/Login/login-server-deployment.yaml

				echo -e "\n${YELLOW}Applying redis deployment...${NC}"
				kubecolor apply -f Manifests/Redis/redis-deployment.yaml
                
                echo -e "\n${GREEN}All manifests have been applied!${NC}"
                echo -e "\n${CYAN}Options:${NC}"
                echo -e "${GREEN}1) Return to apply menu${NC}"
                echo -e "${GREEN}2) Return to main menu${NC}"
                read -n 1 -r choice
                
                if [[ $choice == "2" ]]; then
                    stay_in_apply=false
                fi
                ;;
                
            1) # Apply specific
                clear
                echo -e "${CYAN}Select manifest to apply:${NC}"
                
                local manifest_options=(
                    "Return to apply menu"
                    "Notification deployment"
                    "Chat deployment"
                    "Pong deployment"
                    "User deployment"
                    "Login deployment"
                )
                
                show_menu "${manifest_options[@]}"
                local manifest_choice=$?
                
                case $manifest_choice in
                    0) # Return to apply menu
                        continue
                        ;;
                    1) # Notification
                        clear
                        echo -e "${YELLOW}Applying Notification deployment...${NC}"
                        kubecolor apply -f Manifests/Notifications/notification-deployment.yaml
                        ;;
                    2) # Chat
                        clear
                        echo -e "${YELLOW}Applying Chat deployment...${NC}"
                        kubecolor apply -f Manifests/Chat/chat-deployment.yaml
                        ;;
                    3) # Pong
                        clear
                        echo -e "${YELLOW}Applying Pong deployment...${NC}"
                        kubecolor apply -f Manifests/Pong/pong-deployment.yaml
                        ;;
                    4) # User
                        clear
                        echo -e "${YELLOW}Applying User deployment...${NC}"
                        kubecolor apply -f Manifests/User/User-deployment.yaml
                        ;;
                    5) # Login
                        clear
                        echo -e "${YELLOW}Applying Login deployment...${NC}"
                        kubecolor apply -f Manifests/Login/login-server-deployment.yaml
                        ;;
                esac
                
                echo -e "\n${GREEN}Manifest has been applied!${NC}"
                echo -e "\n${CYAN}Options:${NC}"
                echo -e "${GREEN}1) Apply another manifest${NC}"
                echo -e "${GREEN}2) Return to apply menu${NC}"
                read -n 1 -r choice
                
                if [[ $choice == "2" ]]; then
                    continue
                elif [[ $choice == "1" ]]; then
                    apply_option=1
                    continue
                fi
                ;;
                
            2) # Return to main menu
                stay_in_apply=false
                ;;
        esac
    done
}

# Main menu
while true; do
    clear
    echo -e "${PURPLE}==== Kubernetes Management Tool ====${NC}"
    
    main_options=(
        "Restart pods"
        "Show logs"
        "Apply manifests"
        "Exit"
    )
    
    show_menu "${main_options[@]}"
    main_option=$?
    
	if [ $main_option -eq 254 ] || [ $main_option -eq 255 ]; then
		echo -e "${CYAN}Exiting...${NC}"
		exit 0
	fi

    namespaces=("login" "user" "pong" "chat" "notifications")
    
    case $main_option in
        0)
            restart_pods
            ;;
        1)
            show_logs
            ;;
        2)
            apply_manifests
            ;;
        3)
            echo -e "${CYAN}Exiting...${NC}"
            tput cnorm
			exit 0
            ;;
    esac
done