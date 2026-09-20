from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    tool_calls: list[dict] | None = None


class Meeting(BaseModel):
    title: str
    company: str | None = None
    contact_name: str | None = None
    meeting_date: str | None = None
    notes: str | None = None
    status: str = "planifie"


class MeetingUpdate(BaseModel):
    title: str | None = None
    company: str | None = None
    contact_name: str | None = None
    meeting_date: str | None = None
    notes: str | None = None
    status: str | None = None


class Deal(BaseModel):
    company: str
    contact_name: str | None = None
    stage: str = "prospection"
    value: float | None = None
    close_date: str | None = None
    notes: str | None = None


class DealUpdate(BaseModel):
    company: str | None = None
    contact_name: str | None = None
    stage: str | None = None
    value: float | None = None
    close_date: str | None = None
    notes: str | None = None


class DocxExportRequest(BaseModel):
    title: str
    content: str


class PptxSection(BaseModel):
    title: str
    content: str


class PptxExportRequest(BaseModel):
    title: str
    sections: list[PptxSection]
