import builtins
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

# ponytail: allowlist, not a real interpreter sandbox -- exec() in-process is
# never airtight (resource limits, C extensions can still misbehave). This
# blocks the obvious escapes (file I/O, process/network access, eval/exec of
# fresh untrusted strings, unlisted imports). Upgrade path if this needs to be
# bulletproof: run in a subprocess with a resource-limited restricted user, or
# a real sandbox (gVisor/Firecracker/Pyodide-in-a-worker).
ALLOWED_MODULES = {"pandas", "json", "math", "datetime", "collections", "re", "statistics", "itertools", "random"}
BLOCKED_BUILTINS = {"open", "eval", "exec", "compile", "input", "exit", "quit", "help", "breakpoint", "memoryview"}


def _safe_import(name, *args, **kwargs):
    if name.split(".")[0] not in ALLOWED_MODULES:
        raise ImportError(f"Module '{name}' non autorisé dans cet environnement restreint")
    return builtins.__import__(name, *args, **kwargs)


def _build_safe_globals():
    safe_builtins = {n: getattr(builtins, n) for n in dir(builtins) if n not in BLOCKED_BUILTINS}
    safe_builtins["__import__"] = _safe_import

    import pandas as pd
    import math
    import datetime
    import collections

    return {
        "__builtins__": safe_builtins,
        "pandas": pd,
        "pd": pd,
        "json": json,
        "math": math,
        "datetime": datetime,
        "collections": collections,
    }


def execute_python(code: str) -> str:
    stdout_capture = io.StringIO()
    old_stdout = sys.stdout
    restricted_globals = _build_safe_globals()

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


def demo():
    r = json.loads(execute_python("print(1 + 1)"))
    assert r["status"] == "success" and r["output"].strip() == "2", r

    r = json.loads(execute_python("import pandas as pd\ndf = pd.DataFrame({'a':[1,2]})\nprint(df.shape)"))
    assert r["status"] == "success" and "(2, 1)" in r["output"], r

    r = json.loads(execute_python("import math\nprint(round(math.pi, 2))"))
    assert r["status"] == "success" and "3.14" in r["output"], r

    r = json.loads(execute_python("open('C:/Windows/win.ini')"))
    assert r["status"] == "error" and "not defined" in r["error"], r

    r = json.loads(execute_python("import os\nos.system('echo hacked')"))
    assert r["status"] == "error" and "non autorisé" in r["error"], r

    r = json.loads(execute_python("eval('1+1')"))
    assert r["status"] == "error" and "not defined" in r["error"], r

    print("all checks passed")


if __name__ == "__main__":
    demo()
