#!/bin/bash
# Simple server script for the marketing site

PORT=${1:-8000}

echo "============================================================"
echo "🚀 Starting Marketing Site Server"
echo "============================================================"
echo "📍 Local:   http://localhost:$PORT"
echo "============================================================"
echo "Press CTRL+C to stop the server"
echo ""

# Try Python 3 first, then Python 2, then PHP
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
elif command -v php &> /dev/null; then
    php -S localhost:$PORT
else
    echo "❌ Error: No suitable server found."
    echo "   Please install Python 3, Python 2, or PHP"
    exit 1
fi
