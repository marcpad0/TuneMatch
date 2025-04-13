#!/bin/bash

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check for docker-compose or docker compose plugin
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "Error: Neither docker-compose nor docker compose plugin is available"
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

echo "Using Docker Compose command: $DOCKER_COMPOSE_CMD"

# Check if .env file exists. If not, create a placeholder .env file.
if [ ! -f ".env" ]; then
    echo ".env file not found. Creating a placeholder .env file..."
    echo "NODE_ENV=development" > .env
    echo "PORT=3000" >> .env
    echo "SPOTIFY_CLIENT_ID=TUO_SPOTIFY_CLIENT_ID" >> .env
    echo "SPOTIFY_CLIENT_SECRET=TUO_SPOTIFY_CLIENT_SECRET" >> .env
    echo "SPOTIFY_CALLBACK_URL=http://localhost:3000/auth/spotify/callback" >> .env
    echo "TWITCH_CLIENT_ID=TUO_TWITCH_CLIENT_ID" >> .env
    echo "TWITCH_CLIENT_SECRET=TUO_TWITCH_CLIENT_SECRET" >> .env
    echo "TWITCH_CALLBACK_URL=https://marcpado.it/auth/twitch/callback" >> .env
    echo "GOOGLE_CLIENT_ID=TUO_GOOGLE_CLIENT_ID" >> .env
    echo "GOOGLE_CLIENT_SECRET=TUO_GOOGLE_CLIENT_SECRET" >> .env
    echo "GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback" >> .env
    echo "USE_MOCK_DB=false" >> .env
fi

# Build and start the containers
echo "Building and starting Docker containers..."
$DOCKER_COMPOSE_CMD up --build -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 10

# Check if services are running
if $DOCKER_COMPOSE_CMD ps | grep -q "Up"; then
    echo "Services are running!"
    echo "Frontend is available at: http://localhost:8080"
    echo "Backend is available at: http://localhost:3000"
    echo "API documentation is available at: http://localhost:3000/api-docs"
else
    echo "Error: Services failed to start properly"
    $DOCKER_COMPOSE_CMD logs
    exit 1
fi