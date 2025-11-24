#!/usr/bin/env python3
"""
Simple HTTP server for the marketing site.
Solves CORS issues when loading 3D models.

Usage:
    python server.py
    or
    python3 server.py

Then visit: http://localhost:8000
"""

import http.server
import socketserver
import os
import sys

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow loading local files
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def log_message(self, format, *args):
        # Custom log format
        sys.stderr.write("%s - - [%s] %s\n" %
                        (self.address_string(),
                         self.log_date_time_string(),
                         format % args))

if __name__ == "__main__":
    # Change to the directory where this script is located
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    Handler = MyHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"\n{'='*60}")
            print(f"🚀 Marketing Site Server Running!")
            print(f"{'='*60}")
            print(f"📍 Local:   http://localhost:{PORT}")
            print(f"🌐 Network: http://{socketserver.socket.gethostbyname(socketserver.socket.gethostname())}:{PORT}")
            print(f"{'='*60}")
            print(f"Press CTRL+C to stop the server\n")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped. Goodbye!")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"\n❌ Error: Port {PORT} is already in use.")
            print(f"   Try a different port: python server.py --port 8001")
        else:
            print(f"\n❌ Error: {e}")
