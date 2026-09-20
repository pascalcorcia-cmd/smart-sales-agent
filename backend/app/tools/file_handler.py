import json
import os

import pandas as pd
from PyPDF2 import PdfReader

from app.config import UPLOAD_DIR

READ_FILE_TOOL = {
    "name": "read_file",
    "description": "Lit le contenu d'un fichier uploadé (Excel, CSV, PDF, texte). Pour les fichiers Excel/CSV, retourne les premières lignes et les statistiques.",
    "input_schema": {
        "type": "object",
        "properties": {
            "filename": {
                "type": "string",
                "description": "Nom du fichier à lire"
            },
            "max_rows": {
                "type": "integer",
                "description": "Nombre maximum de lignes à retourner pour Excel/CSV (défaut: 20)",
                "default": 20
            }
        },
        "required": ["filename"]
    }
}

WRITE_FILE_TOOL = {
    "name": "write_file",
    "description": "Écrit du contenu dans un fichier (texte, CSV). Utile pour générer des rapports ou exporter des données.",
    "input_schema": {
        "type": "object",
        "properties": {
            "filename": {
                "type": "string",
                "description": "Nom du fichier à créer"
            },
            "content": {
                "type": "string",
                "description": "Contenu à écrire dans le fichier"
            }
        },
        "required": ["filename", "content"]
    }
}

LIST_FILES_TOOL = {
    "name": "list_files",
    "description": "Liste les fichiers disponibles dans le dossier uploads.",
    "input_schema": {
        "type": "object",
        "properties": {},
        "required": []
    }
}


def _safe_path(filename: str) -> str:
    basename = os.path.basename(filename)
    return os.path.join(UPLOAD_DIR, basename)


def read_file(filename: str, max_rows: int = 20) -> str:
    filepath = _safe_path(filename)
    if not os.path.exists(filepath):
        return json.dumps({"status": "error", "message": f"Fichier '{filename}' non trouvé"})

    ext = os.path.splitext(filename)[1].lower()
    try:
        if ext in (".xlsx", ".xls"):
            df = pd.read_excel(filepath)
            return _dataframe_summary(df, max_rows)
        elif ext == ".csv":
            df = pd.read_csv(filepath)
            return _dataframe_summary(df, max_rows)
        elif ext == ".pdf":
            reader = PdfReader(filepath)
            text = "\n".join(page.extract_text() or "" for page in reader.pages[:10])
            return json.dumps({"status": "success", "content": text[:5000], "pages": len(reader.pages)}, ensure_ascii=False)
        else:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read(10000)
            return json.dumps({"status": "success", "content": content}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def _dataframe_summary(df: pd.DataFrame, max_rows: int) -> str:
    summary = {
        "status": "success",
        "shape": {"rows": len(df), "columns": len(df.columns)},
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "preview": df.head(max_rows).to_dict(orient="records"),
        "stats": {}
    }
    numeric_cols = df.select_dtypes(include=["number"]).columns
    if len(numeric_cols) > 0:
        summary["stats"] = df[numeric_cols].describe().to_dict()
    return json.dumps(summary, ensure_ascii=False, default=str)


def write_file(filename: str, content: str) -> str:
    filepath = _safe_path(filename)
    basename = os.path.basename(filename)
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return json.dumps({"status": "success", "message": f"Fichier '{basename}' créé", "filename": basename})
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def list_files() -> str:
    try:
        files = []
        for f in os.listdir(UPLOAD_DIR):
            filepath = os.path.join(UPLOAD_DIR, f)
            if os.path.isfile(filepath):
                files.append({
                    "name": f,
                    "size_kb": round(os.path.getsize(filepath) / 1024, 1)
                })
        return json.dumps({"status": "success", "files": files}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})
