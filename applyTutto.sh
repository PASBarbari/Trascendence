kubectl apply -f Manifests/Certs &&
  kubectl apply -f Manifests/Chat && 
  kubectl apply -f Manifests/Ingresses && 
#   kubectl apply -f Manifests/Jobs && 
  kubectl apply -f Manifests/Login && 
  kubectl apply -f Manifests/Minio && 
  kubectl apply -f Manifests/Notifications && 
  kubectl apply -f Manifests/Pong && 
  kubectl apply -f Manifests/Redis && 
  kubectl apply -f Manifests/User && 
  kubectl apply -f Manifests/Volumes && 
  kubectl apply -f Manifests/configmaps && 
  kubectl apply -f Manifests/front-end-deployment.yaml && 
  kubectl apply -f Manifests/secrets.yaml
# docker build -t bombatomica/login:latest . && docker push bombatomica/login:latest && kubectl get deployment -n login -l app=login-server -o name | xargs -I{} kubectl rollout restart -n login {}