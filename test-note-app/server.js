const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const NOTES_FILE = path.join(__dirname, "notes.json");

function loadNotes() {
  try {
    return JSON.parse(fs.readFileSync(NOTES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
}

function serveStatic(res, filePath, contentType) {
  try {
    const data = fs.readFileSync(path.join(__dirname, filePath));
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

function renderHTML(notes) {
  const items = notes
    .map(
      (n) => `
    <li class="note-item">
      <span class="note-text">${escapeHTML(n.text)}</span>
      <span class="note-time">${n.time}</span>
      <button class="del-btn" onclick="delNote(${n.id})">&times;</button>
    </li>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Note App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: #0b0f17; color: #f3f4f6; min-height: 100vh; display: flex; justify-content: center; padding: 40px 20px; }
    .container { max-width: 500px; width: 100%; }
    h1 { font-size: 1.5rem; margin-bottom: 24px; text-align: center; }
    .form { display: flex; gap: 8px; margin-bottom: 24px; }
    .form input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #1f2937; background: #111827; color: #f3f4f6; font-size: 14px; outline: none; }
    .form input:focus { border-color: #6366f1; }
    .form button { padding: 10px 20px; border-radius: 8px; border: none; background: #6366f1; color: white; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.15s; }
    .form button:hover { background: #4f46e5; }
    .note-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
    .note-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #111827; border: 1px solid #1f2937; border-radius: 8px; }
    .note-text { flex: 1; font-size: 14px; word-break: break-word; }
    .note-time { font-size: 11px; color: #6b7280; font-family: monospace; white-space: nowrap; }
    .del-btn { background: none; border: none; color: #ef4444; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1; }
    .del-btn:hover { color: #fca5a5; }
    .empty { text-align: center; color: #4b5563; font-size: 14px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 Note App</h1>
    <form class="form" onsubmit="addNote(event)">
      <input id="noteInput" type="text" placeholder="Write a note..." autofocus />
      <button type="submit">Add</button>
    </form>
    <ul class="note-list" id="notes">${items}</ul>
    ${notes.length === 0 ? '<p class="empty">No notes yet. Write one above.</p>' : ""}
  </div>
  <script>
    async function addNote(e) {
      e.preventDefault();
      const input = document.getElementById("noteInput");
      const text = input.value.trim();
      if (!text) return;
      await fetch("/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      input.value = "";
      location.reload();
    }
    async function delNote(id) {
      await fetch("/notes/" + id, { method: "DELETE" });
      location.reload();
    }
  </script>
</body>
</html>`;
}

function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
    const notes = loadNotes();
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderHTML(notes));
    return;
  }

  if (req.method === "POST" && url.pathname === "/notes") {
    const body = await parseBody(req);
    const notes = loadNotes();
    const note = {
      id: Date.now(),
      text: (body.text || "").slice(0, 500),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    notes.push(note);
    saveNotes(notes);
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(note));
    return;
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/notes/")) {
    const id = parseInt(url.pathname.split("/")[2]);
    const notes = loadNotes().filter((n) => n.id !== id);
    saveNotes(notes);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Note app running on http://localhost:${PORT}`);
});
