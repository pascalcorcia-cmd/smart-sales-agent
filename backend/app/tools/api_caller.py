import json
import urllib.request
import urllib.error

CALL_API_TOOL = {
    "name": "call_api",
    "description": "Effectue un appel HTTP vers une API externe. Utile pour récupérer des données depuis des services tiers (CRM, enrichissement de données, etc.).",
    "input_schema": {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "URL de l'API à appeler"
            },
            "method": {
                "type": "string",
                "enum": ["GET", "POST", "PUT", "DELETE"],
                "description": "Méthode HTTP (défaut: GET)",
                "default": "GET"
            },
            "headers": {
                "type": "object",
                "description": "En-têtes HTTP optionnels",
                "default": {}
            },
            "body": {
                "type": "object",
                "description": "Corps de la requête pour POST/PUT",
                "default": {}
            }
        },
        "required": ["url"]
    }
}


MAX_RESPONSE_CHARS = 20000


def call_api(url: str, method: str = "GET", headers: dict | None = None, body: dict | None = None) -> str:
    try:
        h = headers or {}
        req_body = None
        if method in ("POST", "PUT") and body:
            h["Content-Type"] = "application/json"
            req_body = json.dumps(body).encode()

        req = urllib.request.Request(url, data=req_body, headers=h, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                data_raw = response.read().decode()
                truncated = len(data_raw) > MAX_RESPONSE_CHARS
                try:
                    data = json.loads(data_raw) if not truncated else data_raw[:MAX_RESPONSE_CHARS]
                except:
                    data = data_raw[:MAX_RESPONSE_CHARS]

                result = {
                    "status": "success",
                    "status_code": response.status,
                    "data": data,
                }
                if truncated:
                    result["truncated"] = True
                    result["original_size_chars"] = len(data_raw)
                return json.dumps(result, ensure_ascii=False, default=str)
        except urllib.error.HTTPError as e:
            return json.dumps({
                "status": "error",
                "status_code": e.code,
                "message": str(e)
            }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})
