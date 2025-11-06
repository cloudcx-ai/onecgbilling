#!/bin/bash

# OneCG Genesys Billing Report - Deployment Script
# This script helps you deploy the application to external servers

set -e

echo "🚀 OneCG Genesys Billing Deployment"
echo "===================================="
echo ""

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist/ directory not found"
    echo "Please run 'npm run build' first"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    exit 1
fi

echo "✅ Build files found"
echo ""

# Install production dependencies
echo "📦 Installing production dependencies..."
npm install --production

echo ""
echo "✅ Dependencies installed"
echo ""

# Check for environment variables
if [ -z "$SESSION_SECRET" ]; then
    echo "⚠️  Warning: SESSION_SECRET not set"
    echo "Generating a random secret..."
    export SESSION_SECRET=$(openssl rand -base64 32)
    echo "SESSION_SECRET=$SESSION_SECRET"
    echo ""
    echo "💡 Save this secret and set it as an environment variable for production"
fi

# Set NODE_ENV if not set
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
    echo "✅ NODE_ENV set to production"
fi

# Set PORT if not set
if [ -z "$PORT" ]; then
    export PORT=5000
    echo "✅ PORT set to 5000"
fi

echo ""
echo "🎯 Starting application..."
echo "===================================="
echo "Environment: $NODE_ENV"
echo "Port: $PORT"
echo ""
echo "Login credentials:"
echo "  Username: once (or onecg)"
echo "  Password: once (or onecg)"
echo ""
echo "Application will be available at:"
echo "  http://localhost:$PORT"
echo ""

# Start the application
node dist/index.js
