# ft_transcendence - Multiplayer Pong Web Application

A comprehensive web application featuring a multiplayer Pong game with real-time chat, user management, and social features. Built with a microservices architecture using Django, WebSockets, and modern web technologies.

## 🏗️ Architecture

This application follows a microservices architecture with the following components:

-   **Frontend**: Modern SPA using Vanilla JavaScript and Vite
-   **Login Service**: JWT-based authentication with OAuth2 support
-   **Chat Service**: Real-time messaging with WebSocket connections
-   **Task/User Service**: User profiles, achievements, and task management
-   **Pong Service**: Multiplayer Pong game engine
-   **Notification Service**: Real-time notifications across the platform
-   **Database**: PostgreSQL with Redis for caching and sessions
-   **Monitoring**: Grafana, Prometheus, and ELK stack for observability

## ✨ Features

### 🎮 Pong Game

-   **Local Mode**: Single-player practice against AI
-   **Multiplayer Mode**: Real-time multiplayer matches via WebSockets
-   **Customization**:
    -   Customizable paddle and ball colors
    -   Adjustable game speed and difficulty
    -   Multiple game modes and power-ups
-   **Game Controls**:
    -   Player 1: W/S keys or Arrow Up/Down
    -   Player 2: Arrow keys
    -   Pause/Resume: Spacebar
-   **Tournament System**: Organized competitions with brackets
-   **Match History**: Track wins, losses, and statistics

### 🔐 Authentication & Security

-   **JWT Token Authentication**: Secure session management
-   **OAuth2 Integration**: Login with external providers
-   **Two-Factor Authentication (2FA)**: Enhanced account security
-   **Password Policies**: Strong password requirements
-   **Session Management**: Automatic token refresh and validation
-   **CORS Protection**: Secure cross-origin requests

### 💬 Real-time Chat System

-   **Public Chat Rooms**: Join community discussions
-   **Private Messaging**: Direct messages between users
-   **Group Chats**: Create and manage group conversations
-   **Message History**: Persistent chat history
-   **Online Status**: See who's currently online
-   **Chat Moderation**: Admin tools for managing chat rooms
-   **File Sharing**: Share images and files in chat
-   **Emoji Support**: Rich emoji reactions and expressions

### 👤 User Management & Profiles

-   **User Profiles**: Customizable avatars and bio information
-   **Friend System**:
    -   Send/accept friend requests
    -   Friends list management
    -   Block/unblock users
-   **Experience System**:
    -   Gain XP from games and activities
    -   Level progression
    -   Achievement badges
-   **Statistics Dashboard**:
    -   Game statistics
    -   Win/loss ratios
    -   Personal records

### 📋 Task & Achievement System

-   **Task Categories**: Organize tasks by type and priority
-   **Progress Tracking**: Visual progress indicators
-   **Experience Points**: Earn XP for completing tasks
-   **Achievement Unlocks**: Unlock new features and badges
-   **Daily Challenges**: Fresh tasks updated daily
-   **Leaderboards**: Compete with other users

### 🔔 Notification System

-   **Real-time Notifications**: Instant updates via WebSockets
-   **Notification Types**:
    -   Friend requests
    -   Game invitations
    -   Chat messages
    -   Achievement unlocks
    -   System announcements
-   **Notification Preferences**: Customize what notifications you receive
-   **Notification History**: Review past notifications

## 🚀 Installation & Setup

### Prerequisites

-   Docker and Docker Compose
-   Python 3.8+
-   Node.js 16+
-   Git

### Quick Start with Docker (Recommended)

1. **Clone the repository**

    ```bash
    git clone <repository-url>
    cd TrascendenceNew
    ```

2. **Start all services**

    ```bash
    ./start.sh
    ```

    This script will:

    - Start Docker Compose services
    - Set up Python virtual environment
    - Install dependencies
    - Run database migrations
    - Start all microservices

3. **Access the application**
    - Frontend: http://localhost:3000
    - API Documentation: http://localhost:8000/docs

### Manual Setup

1. **Backend Services**

    ```bash
    cd Back-End

    # Set up Python environment
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt

    # Start each service in separate terminals
    cd login && python manage.py runserver 8000
    cd chat && python manage.py runserver 8001
    cd task_user && python manage.py runserver 8002
    cd Notifications && python manage.py runserver 8003
    cd pongProject && python manage.py runserver 8004
    ```

2. **Frontend**
    ```bash
    cd Front-End
    npm install
    npm start
    ```

### Using VS Code Tasks

If using VS Code, you can use the pre-configured tasks:

-   `Ctrl+Shift+P` → "Tasks: Run Task" → "Run All"

This will start all services automatically.

### Kubernetes Deployment

For production deployment with Kubernetes:

```bash
# Install ECK (Elastic Cloud on Kubernetes)
kubectl create -f https://download.elastic.co/downloads/eck/2.2.0/crds.yaml
kubectl apply -f https://download.elastic.co/downloads/eck/2.2.0/operator.yaml

# Deploy application manifests
kubectl apply -f Manifests/
```

## 📖 How to Use the Application

### Getting Started

1. **Register an Account**

    - Navigate to the registration page
    - Fill in required information
    - Verify your email (if configured)
    - Complete profile setup

2. **Login**

    - Use your credentials or OAuth2 provider
    - Enable 2FA for enhanced security

3. **Set Up Your Profile**
    - Upload an avatar
    - Write a bio
    - Configure notification preferences

### Playing Pong

1. **Quick Match**

    - Click "Play Pong" from the main menu
    - Choose "Quick Match" for instant matchmaking
    - Wait for opponent or play against AI

2. **Custom Game**

    - Select "Custom Game"
    - Configure game settings (speed, colors, power-ups)
    - Invite friends or create public lobby

3. **Tournament Mode**
    - Join existing tournaments
    - Create private tournaments with friends
    - Follow bracket progression

### Using Chat

1. **Join Public Rooms**

    - Browse available chat rooms
    - Join rooms based on interests
    - Participate in community discussions

2. **Private Messaging**

    - Find users via search
    - Send friend requests
    - Start private conversations

3. **Group Chats**
    - Create group conversations
    - Invite multiple friends
    - Manage group settings

### Managing Tasks

1. **View Tasks**

    - Access task dashboard
    - Filter by category or status
    - Track progress and deadlines

2. **Complete Tasks**
    - Mark tasks as complete
    - Earn experience points
    - Unlock achievements

## 🛠️ Development

### Project Structure

```
TrascendenceNew/
├── Back-End/                 # Microservices
│   ├── login/               # Authentication service
│   ├── chat/                # Chat service
│   ├── task_user/           # User & task management
│   ├── Notifications/       # Notification service
│   ├── pongProject/         # Pong game service
│   └── jwt-validator/       # JWT validation service
├── Front-End/               # Frontend application
│   └── public/              # Static assets and pages
├── Manifests/               # Kubernetes manifests
└── Monitoring/              # Observability stack
```

### API Endpoints

#### Authentication Service (Port 8000)

-   `POST /api/auth/login/` - User login
-   `POST /api/auth/register/` - User registration
-   `POST /api/auth/refresh/` - Token refresh
-   `GET /api/auth/user/` - Get user info

#### Chat Service (Port 8001)

-   `GET /api/chat/rooms/` - List chat rooms
-   `POST /api/chat/rooms/` - Create chat room
-   `GET /api/chat/messages/` - Get messages
-   `POST /api/chat/messages/` - Send message

#### Task Service (Port 8002)

-   `GET /api/tasks/` - List tasks
-   `POST /api/tasks/` - Create task
-   `PUT /api/tasks/{id}/` - Update task
-   `GET /api/users/profile/` - Get user profile

#### Notification Service (Port 8003)

-   `GET /api/notifications/` - List notifications
-   `POST /api/notifications/mark-read/` - Mark as read
-   `WebSocket /ws/notifications/` - Real-time notifications

#### Pong Service (Port 8004)

-   `POST /api/pong/games/` - Create game
-   `GET /api/pong/games/{id}/` - Get game state
-   `WebSocket /ws/pong/{game_id}/` - Real-time game updates

### Environment Variables

Create `.env` files in each service directory:

```env
# Common variables
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Service-specific
JWT_SECRET_KEY=your-jwt-secret
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret
```

## 🔮 Future Features & Improvements

### Planned Features

#### 🎮 Game Enhancements

-   [ ] **AI Difficulty Levels**: Multiple AI opponents with varying skill levels
-   [ ] **Power-ups System**:
    -   Speed boost
    -   Paddle size modifiers
    -   Multi-ball mode
    -   Shield power-up
-   [ ] **Game Modes**:
    -   Survival mode
    -   Time attack
    -   King of the hill
    -   Team battles (2v2, 3v3)
-   [ ] **Spectator Mode**: Watch live games in progress
-   [ ] **Replay System**: Save and replay memorable matches
-   [ ] **Custom Maps**: Different arena layouts and obstacles
-   [ ] **Mobile Support**: Touch controls for mobile devices

#### 👥 Social Features

-   [ ] **Guilds/Clans**: Create and join gaming communities
-   [ ] **Advanced Friend System**:
    -   Best friends list
    -   Friend activity feed
    -   Friend recommendations
-   [ ] **User Reviews**: Rate and review other players
-   [ ] **Mentorship System**: Experienced players guide newcomers
-   [ ] **Social Media Integration**: Share achievements and highlights

#### 🏆 Competitive Features

-   [ ] **Ranking System**:
    -   ELO-based matchmaking
    -   Seasonal rankings
    -   Division/league system
-   [ ] **Advanced Tournaments**:
    -   Scheduled tournaments
    -   Prize pools
    -   Tournament streaming
    -   Bracket predictions
-   [ ] **Esports Features**:
    -   Team management
    -   Coach accounts
    -   Statistics dashboard
    -   Professional player profiles

#### 💬 Chat Improvements

-   [ ] **Voice Chat**: Integrated voice communication
-   [ ] **Video Calls**: Video chat with friends
-   [ ] **Chat Bots**: Automated assistance and fun bots
-   [ ] **Translation**: Real-time message translation
-   [ ] **Rich Media**:
    -   GIF support
    -   Sticker packs
    -   Custom emojis
-   [ ] **Chat Games**: Mini-games within chat
-   [ ] **Moderation Tools**:
    -   Auto-moderation
    -   Chat reporting
    -   Moderator dashboard

#### 🎨 Customization

-   [ ] **Themes**: Multiple UI themes and color schemes
-   [ ] **Avatar System**:
    -   3D avatars
    -   Avatar customization
    -   Avatar animations
-   [ ] **Paddle Skins**: Collectible paddle designs
-   [ ] **Profile Customization**:
    -   Profile banners
    -   Custom badges
    -   Profile music
-   [ ] **Arena Customization**: Custom backgrounds and effects

#### 📊 Analytics & Insights

-   [ ] **Advanced Statistics**:
    -   Heat maps
    -   Performance analytics
    -   Improvement suggestions
-   [ ] **Achievement System 2.0**:
    -   Hidden achievements
    -   Progressive achievements
    -   Community achievements
-   [ ] **Learning Center**:
    -   Tutorial system
    -   Strategy guides
    -   Pro player tips

#### 🛡️ Security & Performance

-   [ ] **Enhanced Security**:
    -   Biometric authentication
    -   Hardware key support
    -   Advanced anti-cheat
-   [ ] **Performance Optimization**:
    -   CDN integration
    -   Image optimization
    -   Caching improvements
-   [ ] **Accessibility**:
    -   Screen reader support
    -   Keyboard navigation
    -   High contrast mode
    -   Colorblind support

### 🐛 Known Issues & Fixes Needed

#### High Priority

-   [x] **Database Connection Issues**: Fixed PostgreSQL connection problems and standardized configuration
-   [x] **Import Errors**: Resolved authentication import issues across services
-   [ ] **WebSocket Connection Stability**: Improve reconnection logic
-   [ ] **Game Synchronization**: Fix occasional desync in multiplayer games
-   [x] **Health Checks**: Health check endpoints implemented in login service, need to add to others
-   [ ] **Mobile Responsiveness**: Improve mobile layout and controls
-   [x] **Security Issues**: Fixed hardcoded secrets and improved password policies
-   [x] **Database Port Conflicts**: Standardized PostgreSQL port configuration

#### Medium Priority

-   [ ] **Database Optimization**: Improve query performance for large datasets
-   [ ] **Error Handling**: Better error messages and recovery mechanisms
-   [ ] **Loading Times**: Optimize initial app loading speed
-   [ ] **Notification Spam**: Implement notification rate limiting
-   [ ] **File Upload Limits**: Better handling of large file uploads
-   [ ] **Cross-browser Compatibility**: Fix Safari and Firefox specific issues

#### Low Priority

-   [ ] **UI Polish**: Minor visual improvements and animations
-   [ ] **Code Refactoring**: Clean up legacy code and improve maintainability
-   [ ] **Documentation**: Expand API documentation and user guides
-   [ ] **Testing Coverage**: Increase automated test coverage
-   [ ] **Logging**: Improve application logging and debugging

### 🔧 Technical Improvements

-   [ ] **Microservice Communication**: Implement proper service mesh
-   [ ] **Database Migration**: Plan for database schema changes
-   [ ] **CI/CD Pipeline**: Set up automated testing and deployment
-   [ ] **Monitoring**: Enhanced application performance monitoring
-   [ ] **Security Audit**: Regular security assessments and updates
-   [ ] **Frontend Post Support**: Implement POST request handling in frontend
-   [ ] **Index Database**: Add proper database indexing for performance
-   [ ] **Backend Post Support**: Enhance POST request handling in backend
-   [ ] **REST API to gRPC Migration**: Plan migration from REST API to gRPC
-   [ ] **DevOps Integration**: Implement ArgoCD and Jenkins for deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

-   Follow PEP 8 for Python code
-   Use ESLint for JavaScript code
-   Write tests for new features
-   Update documentation as needed
-   Follow semantic versioning

## 📄 License

This project is part of the 42 School curriculum (ft_transcendence project).

## 🆘 Support

-   **Documentation**: Check the wiki for detailed guides
-   **Issues**: Report bugs via GitHub issues
-   **Community**: Join our Discord server for help
-   **Email**: Contact the development team

## 🙏 Acknowledgments

-   42 School for the project specifications
-   The development team and contributors
-   Open source libraries and frameworks used
-   Beta testers and community feedback

---

**Version**: 1.0.0  
**Last Updated**: February 2025  
**Maintainers**: Development Team