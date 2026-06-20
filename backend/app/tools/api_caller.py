import json

import httpx

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


def call_api(url: str, method: str = "GET", headers: dict | None = None, body: dict | None = None) -> str:
    try:
        with httpx.Client(timeout=30, follow_redirects=True) as client:
            response = client.request(
                method=method,
                url=url,
                headers=headers or {},
                json=body if method in ("POST", "PUT") and body else None,
            )
        try:
            data = response.json()
        except Exception:
            data = response.text[:5000]

        return json.dumps({
            "status": "success",
            "status_code": response.status_code,
            "data": data
        }, ensure_ascii=False, default=str)
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})
