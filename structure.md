```mermaid
sequenceDiagram
    participant Frontend
    participant LoginService
    participant TaskService
    participant NotificationService
    participant ChatService

    Frontend->>LoginService: User Registration
    LoginService->>ChatService: Create User on Chat Service
    LoginService->>NotificationService: Create User on Notification Service

    Frontend->>LoginService: User Login
    LoginService->>Frontend: Return Token

    Frontend->>TaskService: Get Active Tasks
    TaskService->>Frontend: Return Active Tasks

    Frontend->>TaskService: Complete Task
    TaskService->>Frontend: Confirm Task Completion

    Frontend->>ChatService: WebSocket Connection
    ChatService->>Frontend: WebSocket Messages

    ChatService->>NotificationService: Send Notification
    NotificationService->>Frontend: Confirm Notification Sent

    TaskService->>NotificationService: Send Notification
    NotificationService->>Frontend: Confirm Notification Sent
```