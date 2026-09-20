import uuid
import json
import logging
import sqlite3
import anthropic

from app.config import ANTHROPIC_API_KEY, CLAUDE_MODEL, DB_PATH, MAX_ITERATIONS, MAX_TOKENS
from app.prompts.system import SYSTEM_PROMPT
from app.tools import ALL_TOOLS, TOOL_HANDLERS

logger = logging.getLogger(__name__)
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def get_or_create_conversation(conversation_id: str | None) -> tuple[str, list[dict]]:
    cid = conversation_id or str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT messages FROM conversations WHERE id = ?", (cid,))
    row = cursor.fetchone()

    if row:
        messages = json.loads(row[0])
        conn.close()
        return cid, messages

    conn.execute("INSERT INTO conversations (id, messages) VALUES (?, ?)", (cid, json.dumps([])))
    conn.commit()
    conn.close()
    return cid, []


def _save_conversation(cid: str, messages: list[dict]):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("UPDATE conversations SET messages = ? WHERE id = ?", (json.dumps(messages), cid))
    conn.commit()
    conn.close()


def _execute_tool(name: str, input_data: dict) -> str:
    handler = TOOL_HANDLERS.get(name)
    if not handler:
        return json.dumps({"status": "error", "message": f"Outil inconnu: {name}"})
    return handler(**input_data)


def _serialize_content(content: list) -> list[dict]:
    """Anthropic SDK content blocks (TextBlock, ToolUseBlock) are Pydantic models,
    not JSON-serializable dicts — convert before storing in messages/SQLite."""
    return [block.model_dump() for block in content]


def run_agent(conversation_id: str | None, user_message: str) -> dict:
    cid, messages = get_or_create_conversation(conversation_id)
    messages.append({"role": "user", "content": user_message})
    tool_calls_log = []

    for _ in range(MAX_ITERATIONS):
        try:
            response = client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                tools=ALL_TOOLS,
                messages=messages,
            )

            if response.stop_reason == "tool_use":
                messages.append({"role": "assistant", "content": _serialize_content(response.content)})
                tool_results = []

                for block in response.content:
                    if block.type == "tool_use":
                        result = _execute_tool(block.name, block.input)
                        tool_calls_log.append({
                            "tool": block.name,
                            "input": block.input,
                            "output": json.loads(result) if result else None,
                        })
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        })

                messages.append({"role": "user", "content": tool_results})
            else:
                messages.append({"role": "assistant", "content": _serialize_content(response.content)})
                _save_conversation(cid, messages)

                text_response = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        text_response += block.text

                return {
                    "response": text_response,
                    "conversation_id": cid,
                    "tool_calls": tool_calls_log if tool_calls_log else None,
                }
        except Exception as e:
            logger.error(f"Error in run_agent: {e}")
            return {
                "response": f"Erreur: {str(e)}",
                "conversation_id": cid,
                "tool_calls": tool_calls_log,
            }

    _save_conversation(cid, messages)
    return {
        "response": "J'ai atteint la limite d'itérations. Peux-tu reformuler ta demande ?",
        "conversation_id": cid,
        "tool_calls": tool_calls_log,
    }


def stream_agent(conversation_id: str | None, user_message: str):
    """Generator that yields SSE events for streaming responses."""
    cid, messages = get_or_create_conversation(conversation_id)
    messages.append({"role": "user", "content": user_message})
    tool_calls_log = []

    yield f"data: {json.dumps({'type': 'conversation_id', 'data': cid})}\n\n"

    for _ in range(MAX_ITERATIONS):
        try:
            with client.messages.stream(
                model=CLAUDE_MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                tools=ALL_TOOLS,
                messages=messages,
            ) as stream:
                for event in stream:
                    if event.type == "content_block_start":
                        if event.content_block.type == "tool_use":
                            yield f"data: {json.dumps({'type': 'tool_start', 'data': {'tool': event.content_block.name}}, ensure_ascii=False)}\n\n"
                    elif event.type == "content_block_delta":
                        if event.delta.type == "text_delta":
                            yield f"data: {json.dumps({'type': 'text', 'data': event.delta.text}, ensure_ascii=False)}\n\n"

                response = stream.get_final_message()

            if response.stop_reason == "tool_use":
                messages.append({"role": "assistant", "content": _serialize_content(response.content)})
                tool_results = []

                for block in response.content:
                    if block.type == "tool_use":
                        result = _execute_tool(block.name, block.input)
                        parsed = json.loads(result) if result else None
                        tool_calls_log.append({
                            "tool": block.name,
                            "input": block.input,
                            "output": parsed,
                        })
                        yield f"data: {json.dumps({'type': 'tool_result', 'data': {'tool': block.name, 'result': parsed}}, ensure_ascii=False)}\n\n"
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        })

                messages.append({"role": "user", "content": tool_results})
            else:
                messages.append({"role": "assistant", "content": _serialize_content(response.content)})
                _save_conversation(cid, messages)
                yield f"data: {json.dumps({'type': 'done', 'data': {'tool_calls': tool_calls_log if tool_calls_log else None}})}\n\n"
                return
        except Exception as e:
            logger.error(f"Error in stream_agent: {e}")
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"
            return

    _save_conversation(cid, messages)
    yield f"data: {json.dumps({'type': 'done', 'data': {'tool_calls': tool_calls_log}})}\n\n"
