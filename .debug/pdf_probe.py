"""Временный отладочный скрипт: рендерит страницы как mkdocs-exporter и логирует 404."""
import http.server, socketserver, threading, os, sys
from playwright.sync_api import sync_playwright

os.chdir("site")
PORT = 8765

handler = http.server.SimpleHTTPRequestHandler
class H(handler):
    def log_message(self, *a): pass
httpd = socketserver.TCPServer(("127.0.0.1", PORT), H)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

pages = []
for root, dirs, files in os.walk("."):
    for f in files:
        if f == "index.html":
            pages.append(os.path.relpath(os.path.join(root, f), ".").replace(os.sep, "/"))
pages.sort()
print(f"pages: {len(pages)}")

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context()
    for pg in pages:
        bad = []
        def on_resp(resp):
            if resp.status == 404:
                bad.append(resp.url)
        page = ctx.new_page()
        page.on("response", on_resp)
        try:
            page.goto(f"http://127.0.0.1:{PORT}/{pg}", wait_until="networkidle", timeout=30000)
            page.pdf()  # эмулируем рендер PDF
        except Exception as e:
            print(f"FAIL {pg}: {e}")
        page.close()
        for u in sorted(set(bad)):
            print(f"404 {pg} -> {u}")
    browser.close()
print("DONE")
