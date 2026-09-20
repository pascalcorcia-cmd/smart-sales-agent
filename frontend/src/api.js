const API_BASE = '/api';

export async function sendMessage(message, conversationId) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversation_id: conversationId }),
  });
  return res.json();
}

export async function streamMessage(message, conversationId, onEvent, model) {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversation_id: conversationId, model: model || undefined }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          onEvent(event);
        } catch {}
      }
    }
  }
}

// Coalesces rapid 'text' deltas into at most one state update per animation
// frame instead of one per token -- streaming a long response was triggering
// a full message-list re-render (and a full markdown re-parse) per delta.
export function createTextBatcher(onFlush) {
  let content = '';
  let scheduled = false;
  const flush = () => { scheduled = false; onFlush(content); };
  return {
    append(delta) {
      content += delta;
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(flush);
      }
    },
    flushNow() { flush(); },
  };
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
  return res.json();
}

export async function getFiles() {
  const res = await fetch(`${API_BASE}/files`);
  return res.json();
}

export async function getMeetings() {
  const res = await fetch(`${API_BASE}/meetings`);
  return res.json();
}

export async function createMeeting(meeting) {
  const res = await fetch(`${API_BASE}/meetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meeting),
  });
  return res.json();
}

export async function updateMeeting(id, update) {
  const res = await fetch(`${API_BASE}/meetings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  return res.json();
}

export async function deleteMeeting(id) {
  const res = await fetch(`${API_BASE}/meetings/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function getDeals() {
  const res = await fetch(`${API_BASE}/deals`);
  return res.json();
}

export async function createDeal(deal) {
  const res = await fetch(`${API_BASE}/deals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deal),
  });
  return res.json();
}

export async function updateDeal(id, update) {
  const res = await fetch(`${API_BASE}/deals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  return res.json();
}

export async function deleteDeal(id) {
  const res = await fetch(`${API_BASE}/deals/${id}`, { method: 'DELETE' });
  return res.json();
}

async function downloadBlob(res, title, ext) {
  if (!res.ok) throw new Error(`Export ${ext} échoué`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^\w\-]+/g, '_')}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportDocx(title, content) {
  const res = await fetch(`${API_BASE}/export/docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  await downloadBlob(res, title, 'docx');
}

export async function exportPptx(title, sections) {
  const res = await fetch(`${API_BASE}/export/pptx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, sections }),
  });
  await downloadBlob(res, title, 'pptx');
}
