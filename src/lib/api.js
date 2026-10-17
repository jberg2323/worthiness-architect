// Client for the server routes in /api

export async function postJSON(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `Request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  return data;
}

// Skip UI-only messages and merge adjacent same-role turns so roles always alternate
export function buildChatMessages(messages) {
  const result = [];
  for (const m of messages) {
    if (m.kind) continue;
    const role = m.role === 'model' ? 'assistant' : 'user';
    const last = result[result.length - 1];
    if (last && last.role === role) {
      last.content += `\n\n${m.text}`;
    } else {
      result.push({ role, content: m.text });
    }
  }
  return result;
}
