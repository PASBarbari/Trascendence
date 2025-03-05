#!/bin/bash

# Function to show logs from pods
show_logs() {
	echo "==== Showing logs for pods ===="
	echo "1. Show logs from all pods"
	echo "2. Show logs from specific namespace"
	echo "3. Show logs from pods with issues"
	read -n 1 -r -p "Choose an option (1-3): " option
	echo
		
	case $option in
		1)
			namespaces=("login" "user" "pong" "chat" "notifications")
			for ns in "${namespaces[@]}"; do
				pods=$(kubecolor get pods -n $ns -o jsonpath='{.items[*].metadata.name}')
				for pod in $pods; do
					echo "==== Logs from $pod in namespace $ns ===="
					kubecolor logs -n $ns $pod --tail=50
					echo ""
				done
			done
			;;
		2)
			echo "Available namespaces:"
			kubecolor get namespaces | grep -E 'login|user|pong|chat|notifications'
			read -p "Enter namespace: " selected_ns
			pods=$(kubecolor get pods -n $selected_ns -o jsonpath='{.items[*].metadata.name}')
			for pod in $pods; do
				echo "==== Logs from $pod in namespace $selected_ns ===="
				kubecolor logs -n $selected_ns $pod --tail=50
				echo ""
			done
			;;
		3)
			namespaces=("login" "user" "pong" "chat" "notifications")
			Error_pods=()
			Error_namespaces=()
			
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
					echo "==== Logs from problematic pod $pod in namespace $ns ===="
					kubecolor logs -n $ns $pod --tail=50 || echo "Could not retrieve logs, trying to describe pod:"
					# If logs fail, try to describe the pod
					if [ $? -ne 0 ]; then
						echo "==== Pod description for $pod in namespace $ns ===="
						kubecolor describe pod -n $ns $pod
					fi
					# echo "Do you want to restart this pod? (y/n)"
					# read -n 1 -r
					# echo
					# if [[ $REPLY =~ ^[Yy]$ ]]; then
					# 	echo "Deleting pod $pod in namespace $ns"
					# 	kubecolor delete pod -n $ns $pod
					# fi
					done
				echo "Do you want to restart these pods? (y/n)"
				read -n 1 -r
				echo
				if [[ $REPLY =~ ^[Yy]$ ]]; then
					for i in "${!Error_pods[@]}"; do
						pod=${Error_pods[$i]}
						ns=${Error_namespaces[$i]}
						echo "Deleting pod $pod in namespace $ns"
						kubecolor delete pod -n $ns $pod
					done
				fi
			else
				echo "No problematic pods found"
			fi
			;;
		*)
			echo "Invalid option"
			;;
	esac
}

# Main menu
echo "What would you like to do?"
echo "1. Restart pods"
echo "2. Show logs"
echo "3. Reapply manifests"
read -n 1 -r -p "Choose an option (1-3): " main_option
echo

namespaces=("login" "user" "pong" "chat" "notifications")

case $main_option in
	1)
		echo "Restart everything or just the problematic pods?"
		read -p "restart everything? (y/n) " -n 1 -r
		echo
		
		if [[ $REPLY =~ ^[Yy]$ ]]; then
			kubecolor rollout restart deployment -n login -l app=login-server
			kubecolor rollout restart deployment -n user -l app=user
			kubecolor rollout restart deployment -n pong -l app=pong
			kubecolor rollout restart deployment -n chat -l app=chat
			kubecolor rollout restart deployment -n notifications -l app=notifications-server
		else
			Error_pods=()
			Error_namespaces=()
			
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
					echo "Deleting pod $pod in namespace $ns"
					kubecolor delete pod -n $ns $pod
				done
			else
				echo "No problematic pods found"
			fi
		fi
		;;
	2)
		show_logs
		;;
	3)
		kubecolor apply -f Manifests/Notifications/notification-deployment.yaml		
		kubecolor apply -f Manifests/Chat/chat-deployment.yaml
		kubecolor apply -f Manifests/Pong/pong-deployment.yaml
		kubecolor apply -f Manifests/User/User-deployment.yaml
		kubecolor apply -f Manifests/Login/login-server-deployment.yaml
		;;
	*)
		echo "Invalid option"
		;;
esac