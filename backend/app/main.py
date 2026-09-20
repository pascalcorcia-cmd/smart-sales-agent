import os
import re
import shutil
import sqlite3
import uuid
import logging

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import UPLOAD_DIR, CORS_ORIGINS, ENVIRONMENT, DB_PATH
from app.models import ChatRequest, Meeting, MeetingUpdate, Deal, DealUpdate, DocxExportRequest, PptxExportRequest
from app.agent import run_agent, stream_agent
from app.docx_export import markdown_to_docx
from app.pptx_export import markdown_to_pptx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Smart Sales Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok", "environment": ENVIRONMENT}


@app.post("/api/chat")
def chat(request: ChatRequest):
    result = run_agent(request.conversation_id, request.message)
    return result


@app.post("/api/chat/stream")
def chat_stream(request: ChatRequest):
    return StreamingResponse(
        stream_agent(request.conversation_id, request.message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    filepath = os.path.join(UPLOAD_DIR, file.filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    size_kb = round(os.path.getsize(filepath) / 1024, 1)
    return {"status": "ok", "filename": file.filename, "size_kb": size_kb}


@app.get("/api/files")
def get_files():
    files = []
    for f in os.listdir(UPLOAD_DIR):
        filepath = os.path.join(UPLOAD_DIR, f)
        if os.path.isfile(filepath):
            files.append({"name": f, "size_kb": round(os.path.getsize(filepath) / 1024, 1)})
    return {"files": files}


@app.get("/api/files/{filename}")
def download_file(filename: str):
    filepath = os.path.join(UPLOAD_DIR, os.path.basename(filename))
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    return FileResponse(filepath, filename=os.path.basename(filename))


@app.post("/api/export/docx")
def export_docx(request: DocxExportRequest):
    buffer = markdown_to_docx(request.title, request.content)
    safe_name = re.sub(r"[^\w\-]+", "_", request.title).strip("_") or "document"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.docx"'},
    )


@app.post("/api/export/pptx")
def export_pptx(request: PptxExportRequest):
    buffer = markdown_to_pptx(request.title, [s.model_dump() for s in request.sections])
    safe_name = re.sub(r"[^\w\-]+", "_", request.title).strip("_") or "presentation"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.pptx"'},
    )


def _meeting_row_to_dict(row):
    return {
        "id": row[0], "title": row[1], "company": row[2], "contact_name": row[3],
        "meeting_date": row[4], "notes": row[5], "status": row[6], "created_at": row[7],
    }


@app.get("/api/meetings")
def list_meetings():
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT id, title, company, contact_name, meeting_date, notes, status, created_at "
        "FROM meetings ORDER BY meeting_date IS NULL, meeting_date ASC"
    ).fetchall()
    conn.close()
    return {"meetings": [_meeting_row_to_dict(r) for r in rows]}


@app.post("/api/meetings")
def create_meeting(meeting: Meeting):
    mid = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO meetings (id, title, company, contact_name, meeting_date, notes, status) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (mid, meeting.title, meeting.company, meeting.contact_name, meeting.meeting_date, meeting.notes, meeting.status),
    )
    conn.commit()
    conn.close()
    return {"id": mid, **meeting.model_dump()}


@app.put("/api/meetings/{meeting_id}")
def update_meeting(meeting_id: str, update: MeetingUpdate):
    fields = {k: v for k, v in update.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")

    conn = sqlite3.connect(DB_PATH)
    existing = conn.execute("SELECT id FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Réunion introuvable")

    set_clause = ", ".join(f"{k} = ?" for k in fields)
    conn.execute(f"UPDATE meetings SET {set_clause} WHERE id = ?", (*fields.values(), meeting_id))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.delete("/api/meetings/{meeting_id}")
def delete_meeting(meeting_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}


def _deal_row_to_dict(row):
    return {
        "id": row[0], "company": row[1], "contact_name": row[2], "stage": row[3],
        "value": row[4], "close_date": row[5], "notes": row[6], "created_at": row[7],
    }


@app.get("/api/deals")
def list_deals():
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT id, company, contact_name, stage, value, close_date, notes, created_at "
        "FROM deals ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return {"deals": [_deal_row_to_dict(r) for r in rows]}


@app.post("/api/deals")
def create_deal(deal: Deal):
    did = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO deals (id, company, contact_name, stage, value, close_date, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (did, deal.company, deal.contact_name, deal.stage, deal.value, deal.close_date, deal.notes),
    )
    conn.commit()
    conn.close()
    return {"id": did, **deal.model_dump()}


@app.put("/api/deals/{deal_id}")
def update_deal(deal_id: str, update: DealUpdate):
    fields = {k: v for k, v in update.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")

    conn = sqlite3.connect(DB_PATH)
    existing = conn.execute("SELECT id FROM deals WHERE id = ?", (deal_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Deal introuvable")

    set_clause = ", ".join(f"{k} = ?" for k in fields)
    conn.execute(f"UPDATE deals SET {set_clause} WHERE id = ?", (*fields.values(), deal_id))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.delete("/api/deals/{deal_id}")
def delete_deal(deal_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM deals WHERE id = ?", (deal_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}


STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
