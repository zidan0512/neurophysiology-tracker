#!/bin/bash

# Deployment script for Neurophysiology Tracker

set -e

echo "🚀 Starting deployment..."

# Check if required files exist
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

if [ ! -f "server.js" ]; then
    echo "❌ server.js not found!"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs backups public data

# Set permissions
echo "🔒 Setting permissions..."
chmod +x scripts/*.sh 2>/dev/null || echo "⚠️ No scripts found to make executable (optional)"

# Build application (if needed)
echo "🔨 Building application..."
# Add build commands here if needed (e.g., for frontend: npm run build)

# Start services
echo "🏃 Starting services..."
if command -v docker-compose &> /dev/null; then
    echo "🐳 Docker Compose detected. Starting containers..."
    docker-compose up -d
else
    echo "🖥️  Running with Node.js directly..."
    npm start &
fi

echo "✅ Deployment completed successfully!"
echo "🌐 Application should be available at http://localhost:3000"