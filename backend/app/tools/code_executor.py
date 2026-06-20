import json
import sys
import io
import traceback

EXECUTE_PYTHON_TOOL = {
    "name": "execute_python",
    "description": "Exécute du code Python pour faire des calculs, analyses de données, ou générer des résultats. Le code a accès à pandas, json, math, datetime, et collections.",
    "input_schema": {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "Le code Python à exécuter"
            }
        },
        "required": ["code"]
    }
}

ALLOWED_MODULES = {
    "pandas", "json", "math", "datetime", "collections",
    "statistics", "csv", "re", "itertools", "functools",
    "decimal", "fractions", "operator", "string",
}


def execute_python(code: str) -> str:
    stdout_capture = io.StringIO()
    old_stdout = sys.stdout

    restricted_globals = {"__builtins__": __builtins__}

    try:
        sys.stdout = stdout_capture
        exec(code, restricted_globals)
        sys.stdout = old_stdout
        output = stdout_capture.getvalue()

        return json.dumps({
            "status": "success",
            "output": output[:5000] if output else "(no output)",
        }, ensure_ascii=False)
    except Exception:
        sys.stdout = old_stdout
        return json.dumps({
            "status": "error",
            "error": traceback.format_exc()[-2000:],
            "output": stdout_capture.getvalue()[:2000],
        }, ensure_ascii=False)
