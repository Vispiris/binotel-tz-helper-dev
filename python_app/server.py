from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from binotel_tz import parse_tz_snapshot


HOST = "127.0.0.1"
PORT = 8765
MAX_BODY = 8 * 1024 * 1024


class Handler(BaseHTTPRequestHandler):
    server_version = "BinotelTZParser/0.1"

    def _headers(self, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Binotel-TZ-Parser")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def _json(self, data: dict, status: int = 200) -> None:
        self._headers(status)
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._headers(204)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._json({"ok": True, "service": "binotel-tz-parser", "apiVersion": 1})
            return
        self._json({"error": "not found"}, 404)

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/parse":
            self._json({"error": "not found"}, 404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY:
                raise ValueError("Некоректний розмір запиту.")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            rows = payload.get("rows")
            if not isinstance(rows, list) or not rows:
                raise ValueError("Не передано рядки ТЗ.")
            result = parse_tz_snapshot(rows, payload.get("currentBlockStates"))
            self._json(result)
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self._json({"error": str(error)}, 400)
        except Exception as error:  # defensive boundary for the browser client
            self._json({"error": f"Внутрішня помилка парсера: {error}"}, 500)

    def log_message(self, message: str, *args: object) -> None:
        print(f"[parser] {self.address_string()} - {message % args}")


if __name__ == "__main__":
    print(f"Binotel TZ Parser запущено: http://{HOST}:{PORT}")
    print("Не закривай це вікно під час читання ТЗ.")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
