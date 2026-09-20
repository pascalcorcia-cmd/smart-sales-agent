import json
from ddgs import DDGS

WEB_SEARCH_TOOL = {
    "name": "web_search",
    "description": "Recherche des informations sur le web. Utilise ce tool pour trouver des informations sur des entreprises, des contacts, des marchés, des actualités, etc.",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "La requête de recherche"
            },
            "max_results": {
                "type": "integer",
                "description": "Nombre maximum de résultats (défaut: 5)",
                "default": 5
            }
        },
        "required": ["query"]
    }
}


def web_search(query: str, max_results: int = 5) -> str:
    try:
        with DDGS() as ddgs:
            # ponytail: backend="auto" fans out to 8 search engines per call (many
            # 429 from cloud IPs), turning one search into 10-20s. Pin to the one
            # engine that responds reliably; widen if duckduckgo itself starts failing.
            results = list(ddgs.text(query, max_results=max_results, backend="duckduckgo"))
        if not results:
            return json.dumps({"status": "no_results", "message": "Aucun résultat trouvé"})
        formatted = []
        for r in results:
            formatted.append({
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "snippet": r.get("body", "")
            })
        return json.dumps({"status": "success", "results": formatted}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})
