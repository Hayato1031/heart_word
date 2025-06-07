#!/bin/bash

# Lexicore Development Script with better process management

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[Lexicore]${NC} $1"
}

print_error() {
    echo -e "${RED}[Error]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[Info]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v ruby &> /dev/null; then
        print_error "Ruby is not installed"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v bundle &> /dev/null; then
        print_error "Bundler is not installed"
        exit 1
    fi
    
    print_status "All requirements met ✓"
}

# Start services
start_services() {
    print_status "Starting Lexicore services..."
    
    # Start backend in a new terminal (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)/lexicore-back"' && echo -e \"\\033[0;34m[Lexicore Backend]\\033[0m Starting...\" && bundle exec ruby app.rb"'
    else
        # For Linux/Unix, use a new terminal window if available
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal -- bash -c "cd lexicore-back && echo -e '\033[0;34m[Lexicore Backend]\033[0m Starting...' && bundle exec ruby app.rb; exec bash"
        else
            # Fallback to background process
            cd lexicore-back && bundle exec ruby app.rb &
            BACKEND_PID=$!
            cd ..
        fi
    fi
    
    # Wait for backend to start
    sleep 3
    
    # Start frontend in a new terminal (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)/lexicore-front"' && echo -e \"\\033[0;32m[Lexicore Frontend]\\033[0m Starting...\" && npm run dev"'
    else
        # For Linux/Unix
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal -- bash -c "cd lexicore-front && echo -e '\033[0;32m[Lexicore Frontend]\033[0m Starting...' && npm run dev; exec bash"
        else
            # Fallback to background process
            cd lexicore-front && npm run dev &
            FRONTEND_PID=$!
            cd ..
        fi
    fi
    
    print_status "Services started!"
    print_info "Backend: http://localhost:4567"
    print_info "Frontend: http://localhost:3000"
    print_info "Chat: http://localhost:3000/chat"
}

# Main execution
main() {
    clear
    echo -e "${YELLOW}"
    echo "╔═══════════════════════════════════╗"
    echo "║        LEXICORE DEVELOPER         ║"
    echo "║     Interactive Media Art         ║"
    echo "╚═══════════════════════════════════╝"
    echo -e "${NC}"
    
    check_requirements
    start_services
    
    echo -e "\n${GREEN}✨ Lexicore is now running!${NC}"
    echo -e "${YELLOW}Tip:${NC} Each service runs in its own terminal window"
    echo -e "${YELLOW}Tip:${NC} Close terminal windows to stop services"
}

# Run main function
main