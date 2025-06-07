#!/bin/bash

# Lexicore - Start both frontend and backend

echo "🚀 Starting Lexicore..."

# Function to kill processes on exit
cleanup() {
    echo -e "\n🛑 Stopping all services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Start backend
echo "📡 Starting backend server..."
cd lexicore-back && bundle exec ruby app.rb &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend server..."
cd lexicore-front && npm run dev &
FRONTEND_PID=$!

# Show running services
echo -e "\n✅ Lexicore is running!"
echo "📡 Backend: http://localhost:4567"
echo "🎨 Frontend: http://localhost:3000"
echo -e "\nPress Ctrl+C to stop all services\n"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID