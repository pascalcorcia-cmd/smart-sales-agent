import uuid
import json
import anthropic

from app.config import ANTHROPIC_API_KEY, CLAUDE_MODEL
from app.prompts.system import SYSTEM_PROMPT
from app.tools import ALL_TOOLS, TOOL_HANDLERS

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

conversations: dict[str, list[dict]] = {}


def get_or_create_conversation(conversation_id: str | None) -> tuple[str, list[dict]]:
    if conversation_id and conversation_id in conversations:
        return conversation_id, conversations[conversation_id]
    cid = conversation_id or str(uuid.uuid4())
    conversations[cid] = []
    return cid, conversations[cid]


def _execute_tool(name: str, input_data: dict) -> str:
    handler = TOOL_HANDLERS.get(name)
    if not handler:
        return json.dumps({"status": "error", "message": f"Outil inconnu: {name}"})
    return handler(**input_data)


def run_agent(conversation_id: str | None, user_message: str) -> dict:
    cid, messages = get_or_create_conversation(conversation_id)
    messages.append({"role": "user", "content": user_message})

    tool_calls_log = []
    max_iterations = 10

    for _ in range(max_iterations):
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=ALL_TOOLS,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})

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
            messages.append({"role": "assistant", "content": response.content})
            text_response = ""
            for block in response.content:
                if hasattr(block, "text"):
                    text_response += block.text
            return {
                "response": text_response,
                "conversation_id": cid,
                "tool_calls": tool_calls_log if tool_calls_log else None,
            }

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
    max_iterations = 10

    yield f"data: {json.dumps({'type': 'conversation_id', 'data': cid})}\n\n"

    for _ in range(max_iterations):
        collected_content = []
        current_text = ""

        with client.messages.stream(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=ALL_TOOLS,
            messages=messages,
        ) as stream:
            for event in stream:
                if event.type == "content_block_start":
                    if event.content_block.type == "text":
                        current_text = ""
                    elif event.content_block.type == "tool_use":
                        yield f"data: {json.dumps({'type': 'tool_start', 'data': {'tool': event.content_block.name}}, ensure_ascii=False)}\n\n"
                elif event.type == "content_block_delta":
                    if event.delta.type == "text_delta":
                        current_text += event.delta.text
                        yield f"data: {json.dumps({'type': 'text', 'data': event.delta.text}, ensure_ascii=False)}\n\n"

            response = stream.get_final_message()

        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})

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
            messages.append({"role": "assistant", "content": response.content})
            yield f"data: {json.dumps({'type': 'done', 'data': {'tool_calls': tool_calls_log if tool_calls_log else None}})}\n\n"
            return

    yield f"data: {json.dumps({'type': 'done', 'data': {'tool_calls': tool_calls_log}})}\n\n"
