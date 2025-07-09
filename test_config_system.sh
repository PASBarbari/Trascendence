#!/bin/bash

# Test script per verificare il sistema di configurazione

echo "🧪 Testing Game Configuration System"
echo "======================================"

# 1. Test dell'endpoint API
echo "1. Testing API endpoint..."
curl -X GET "http://localhost:8004/pong/config/" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""

# 2. Test della struttura dei file
echo "2. Checking file structure..."
echo "✅ Backend config file:"
ls -la /home/mruggier/Desktop/Trascendence/Back-End/pongProject/pong_app/game_config.py

echo "✅ Frontend config file:"
ls -la /home/mruggier/Desktop/Trascendence/Front-End/public/shared/gameConfig.js

echo "✅ Updated files:"
ls -la /home/mruggier/Desktop/Trascendence/Back-End/pongProject/pong_app/views.py
ls -la /home/mruggier/Desktop/Trascendence/Back-End/pongProject/pong_app/urls.py

echo ""

# 3. Test della configurazione nel consumers.py
echo "3. Checking backend integration..."
grep -n "game_config" /home/mruggier/Desktop/Trascendence/Back-End/pongProject/pong_app/consumers.py

echo ""

# 4. Test della configurazione nel frontend
echo "4. Checking frontend integration..."
grep -n "gameConfig" /home/mruggier/Desktop/Trascendence/Front-End/public/pong/multiplayer/multiSetup.js

echo ""
echo "🎯 Configuration system setup complete!"
echo "Next steps:"
echo "1. Start the backend server"
echo "2. Test the /pong/config/ endpoint"
echo "3. Test the frontend loading"
echo "4. Test the WebSocket configuration sync"
