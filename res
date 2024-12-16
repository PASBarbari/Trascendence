apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    deployment.kubernetes.io/revision: "1"
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apps/v1","kind":"Deployment","metadata":{"annotations":{},"labels":{"app":"login-db"},"name":"login-db-deployment","namespace":"default"},"spec":{"replicas":1,"selector":{"matchLabels":{"app":"login-db"}},"template":{"metadata":{"labels":{"app":"login-db"}},"spec":{"containers":[{"image":"postgres:latest","name":"login-db","ports":[{"containerPort":5432}],"resources":{"limits":{"cpu":"500m","memory":"512Mi"},"requests":{"cpu":"250m","memory":"256Mi"}}}]}}}}
  creationTimestamp: "2024-12-11T17:09:07Z"
  generation: 1
  labels:
    app: login-db
  name: login-db-deployment
  namespace: default
  resourceVersion: "6279"
  uid: 17cf3aa2-e20a-4125-ba5b-e96fc1755121
spec:
  progressDeadlineSeconds: 600
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: login-db
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: login-db
    spec:
      containers:
      - image: postgres:latest
        imagePullPolicy: Always
        name: login-db
        ports:
        - containerPort: 5432
          protocol: TCP
        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 250m
            memory: 256Mi
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
status:
  conditions:
  - lastTransitionTime: "2024-12-11T17:09:08Z"
    lastUpdateTime: "2024-12-11T17:09:08Z"
    message: Deployment does not have minimum availability.
    reason: MinimumReplicasUnavailable
    status: "False"
    type: Available
  - lastTransitionTime: "2024-12-11T17:09:07Z"
    lastUpdateTime: "2024-12-11T17:09:08Z"
    message: ReplicaSet "login-db-deployment-6859bb8498" is progressing.
    reason: ReplicaSetUpdated
    status: "True"
    type: Progressing
  observedGeneration: 1
  replicas: 1
  unavailableReplicas: 1
  updatedReplicas: 1
