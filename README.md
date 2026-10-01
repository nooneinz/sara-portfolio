# Sara Alharbi — Portfolio + AI Assistant

Personal portfolio (Arabic, RTL) with an embedded AI chatbot that answers questions about Sara's projects, skills and achievements.

```
sara-portfolio/
├── frontend/            Static site (HTML / CSS / vanilla JS)
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── config.js    ← set your backend URL here
│       └── main.js
├── backend/             FastAPI + OpenAI
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
└── render.yaml          One-click Render blueprint for the backend
```

---

## Run locally

**1. Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # then put your real OPENAI_API_KEY in .env
uvicorn main:app --reload --port 8000
```

Check it: open http://localhost:8000/api/health — or try the interactive docs at http://localhost:8000/docs.

**2. Frontend** (new terminal)

```bash
cd frontend
python -m http.server 5500
```

Open http://localhost:5500. The chat talks to `http://localhost:8000` automatically when running on localhost.

> Don't open `index.html` by double-clicking (file://) — browsers block the API call from that origin. Use the server above or VS Code Live Server (port 5500).

---

## Deploy

### Backend → Render

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → pick the repo (it reads `render.yaml`).
   Or **New → Web Service** manually with:
   - Root directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Environment variables:
   - `OPENAI_API_KEY` = your key
   - `ALLOWED_ORIGINS` = your frontend URL, e.g. `https://sara-alharbi.netlify.app` (comma-separate several)
4. Copy the service URL, e.g. `https://sara-portfolio-api.onrender.com`.

> Free Render instances sleep when idle; the first question after a while can take ~30–50 s.

### Frontend → Netlify or Vercel

1. Edit `frontend/js/config.js` and replace `https://YOUR-BACKEND.onrender.com` with your Render URL.
2. **Netlify:** Add new site → Import from Git → Base directory `frontend`, no build command, publish directory `frontend`.
   **Vercel:** New Project → Root Directory `frontend`, Framework preset "Other", no build command.
3. Add the final site URL to `ALLOWED_ORIGINS` on Render and redeploy the backend.

---

## Configuration (backend `.env`)

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | — | Required. Never commit it; stays server-side only. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model used for answers. |
| `ALLOWED_ORIGINS` | localhost:5500 / 3000 | CORS allow-list. |
| `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW_SECONDS` | 15 / 60 | Per-IP limit to protect your API budget. |

To update what the assistant knows, edit `SYSTEM_PROMPT` in `backend/main.py`.

## API

`POST /api/ask`

```json
{ "question": "ما هو مشروع Baseera؟" }
```

→ `{ "answer": "..." }`
