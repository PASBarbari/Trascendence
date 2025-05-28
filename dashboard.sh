#!/usr/bin/env bash
set -euo pipefail

# Controllo che k3s kubectl esista
if ! command -v k3s &>/dev/null; then
  echo "Errore: k3s non sembra installato o 'k3s' non è nel PATH."
  exit 1
fi

KUBECTL="kubecolor"

echo "1. Creazione alias kubectl per k3s"
alias kubectl="${KUBECTL}"

echo "2. Applicazione manifest Dashboard"
${KUBECTL} apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.8.0/aio/deploy/recommended.yaml

echo "3. Espongo il Service come NodePort"
${KUBECTL} -n kubernetes-dashboard patch svc kubernetes-dashboard \
  -p '{"spec":{"type":"NodePort"}}'

echo "4. Creo ServiceAccount e ClusterRoleBinding"
cat <<EOF | ${KUBECTL} apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
EOF

echo "5. Attendo che i pod siano pronti..."
${KUBECTL} -n kubernetes-dashboard wait --for=condition=available deployment kubernetes-dashboard --timeout=120s

echo "6. Recupero token di autenticazione"
TOKEN=$(${KUBECTL} -n kubernetes-dashboard create token admin-user)
echo
echo "=== Dashboard installata con successo! ==="
echo "Usa questo TOKEN per il login:"
echo "${TOKEN}"
echo
echo "Ora puoi accedere alla Dashboard via NodePort:"
NP=$(${KUBECTL} -n kubernetes-dashboard get svc kubernetes-dashboard -o jsonpath='{.spec.ports[0].nodePort}')
echo "http://<IP-NODO>:${NP}"
echo
echo "Oppure, se preferisci, esegui:"
echo "  kubectl proxy"
echo "e apri nel browser:"
echo "  http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/"
