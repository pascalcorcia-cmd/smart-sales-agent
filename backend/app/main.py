import os
import shutil

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.config import UPLOAD_DIR
from app.models import ChatRequest
from app.agent import run_agent, stream_agent

app = FastAPI(title="Smart Sales Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


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


STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.isdir(STATIC_DIR):
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
