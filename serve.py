import http.server
import socketserver
import os
import sys
import json
import webbrowser
import threading
import urllib.parse
import mimetypes

PORT = 3000
current_user = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Load RSC payload (silences Next.js prefetch loop) ─────────────────────────
RSC_PAYLOAD = None
rsc_file = os.path.join(BASE_DIR, 'rsc_payload.txt')
if os.path.exists(rsc_file):
    with open(rsc_file, 'rb') as f:
        RSC_PAYLOAD = f.read()

# ── Static file paths ─────────────────────────────────────────────────────────
INDEX_FILE = os.path.join(BASE_DIR, 'index.html')
MENU_FILE  = os.path.join(BASE_DIR, 'menu.html')


class AppHandler(http.server.SimpleHTTPRequestHandler):

    # ── Silence RSC prefetch spam in console ──────────────────────────────────
    def log_message(self, fmt, *args):
        if args and '_rsc=' in str(args[0]):
            return
        # Also silence individual menu asset noise if desired
        super().log_message(fmt, *args)

    # ── CORS / common headers ─────────────────────────────────────────────────
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    # ── POST ──────────────────────────────────────────────────────────────────
    def do_POST(self):
        global current_user
        path = urllib.parse.urlparse(self.path).path
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length) if length > 0 else b''
        try:
            data = json.loads(body.decode('utf-8')) if body else {}
        except Exception:
            data = {}

        if path in ('/api/auth/login', '/auth/login'):
            username = data.get('username', 'Member') or 'Member'
            current_user = {
                'uid': 1,
                'username': username,
                'display': {'rank': 'VIP Member'},
                'createdAt': '2026-01-01T00:00:00Z',
                'tosAccepted': True,
                'permissions': ['client.download', 'forum.view', 'forum.post'],
            }
            self._json(200, {'ok': True})
            return

        if path in ('/api/auth/logout', '/auth/logout'):
            current_user = None
            self._json(200, {'ok': True})
            return

        if path in ('/api/account/tos/accept', '/account/tos/accept'):
            if current_user:
                current_user['tosAccepted'] = True
            self._json(200, {'ok': True})
            return

        self._json(404, {'error': 'not found'})

    # ── GET ───────────────────────────────────────────────────────────────────
    def do_GET(self):
        global current_user
        parsed = urllib.parse.urlparse(self.path)
        path   = parsed.path

        # 1. Next.js RSC prefetch – absorb silently with a stale payload
        if '_rsc' in parsed.query and RSC_PAYLOAD:
            self.send_response(200)
            self.send_header('Content-Type', 'text/x-component')
            self.send_header('Cache-Control',
                             'public, max-age=86400, stale-while-revalidate=86400')
            self.send_header('x-nextjs-stale-time', '86400000')
            self.send_header('Vary',
                             'RSC, Next-Router-State-Tree, Next-Router-Prefetch')
            self.send_header('Content-Length', str(len(RSC_PAYLOAD)))
            self.end_headers()
            self.wfile.write(RSC_PAYLOAD)
            return

        # 2. Root and SPA page routes → React app (index.html)
        if path == '/':
            self._serve_file(INDEX_FILE)
            return

        # 3. Auth / config APIs
        if path in ('/api/auth/me', '/auth/me'):
            if current_user:
                self._json(200, current_user)
            else:
                self._json(401, {'error': 'unauthorized'})
            return

        if path in ('/api/config', '/config'):
            self._json(200, {})
            return

        if path == '/api/client':
            self._json(200, {'release': {'version': 'v2.4.1'}})
            return

        if path in ('/api/members/online', '/members/online'):
            members = [{'uid': 1, 'username': current_user['username']}] if current_user else []
            self._json(200, {'members': members})
            return

        if path in ('/api/subscriptions', '/subscriptions'):
            self._json(200, [{'active': True, 'expiresAt': None}])
            return

        if path in ('/api/messages/unread-count', '/api/notifications/unread-count'):
            self._json(200, {'count': 0})
            return

        if path in ('/api/client/download', '/client/download'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/octet-stream')
            self.send_header('Content-Disposition',
                             'attachment; filename="odyssey-loader.exe"')
            self.end_headers()
            self.wfile.write(b'Odyssey Loader Placeholder')
            return

        if path in ('/api/invites', '/invites'):
            self._json(200, {'invites': [{'code': 'ODYSSEY-DEMO-2026', 'used': False}]})
            return

        # 5. Video streaming with Range support
        target = self._resolve(path)
        if target and os.path.isfile(target) and target.lower().endswith('.mp4'):
            self._serve_video(target)
            return

        # 6. Static files (_next, brand, images, etc.)
        if target and os.path.isfile(target):
            return super().do_GET()

        # 7. SPA fallback → React app handles all page routes
        self._serve_file(INDEX_FILE)

    # ── Helpers ───────────────────────────────────────────────────────────────
    def _json(self, code, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self, fpath):
        if not os.path.exists(fpath):
            self.send_error(404)
            return
        mime = 'text/html; charset=utf-8'
        with open(fpath, 'rb') as f:
            data = f.read()
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _resolve(self, path):
        clean = path.lstrip('/')
        return os.path.abspath(os.path.join(BASE_DIR, clean))

    def translate_path(self, path):
        return self._resolve(urllib.parse.urlparse(path).path) or BASE_DIR

    def _serve_video(self, file_path):
        file_size   = os.path.getsize(file_path)
        range_header = self.headers.get('Range')

        if not range_header:
            self.send_response(200)
            self.send_header('Content-Type', 'video/mp4')
            self.send_header('Content-Length', str(file_size))
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.copyfile(f, self.wfile)
            return

        parts = range_header.strip().replace('bytes=', '').split('-')
        start = int(parts[0]) if parts[0] else 0
        end   = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
        end   = min(end, file_size - 1)
        length = end - start + 1

        self.send_response(206)
        self.send_header('Content-Type', 'video/mp4')
        self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
        self.send_header('Content-Length', str(length))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        with open(file_path, 'rb') as f:
            f.seek(start)
            self.wfile.write(f.read(length))


# ── Server startup ─────────────────────────────────────────────────────────────
def find_open_port(start=3000):
    import socket
    for p in range(start, start + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', p)) != 0:
                return p
    return start


def run():
    global PORT
    PORT = find_open_port(3000)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', PORT), AppHandler) as httpd:
        url = f'http://localhost:{PORT}'
        print('=' * 56)
        print(f'  odyssey.cc  ·  running at:')
        print(f'  -->  {url}')
        print('=' * 56)
        print('Press Ctrl+C to stop.\n')
        threading.Timer(1.2, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServer stopped.')


if __name__ == '__main__':
    run()
