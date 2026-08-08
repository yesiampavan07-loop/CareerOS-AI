# 🚀 CareerOS AI — Real Intelligence Career Platform

AI-powered career platform built with Claude API + Node.js + SQLite.

---

## 📁 Project Structure

```
careeros-ai/
├── backend/
│   ├── server.js                ← Main Express server (run this)
│   ├── package.json             ← npm dependencies
│   ├── .env.example             ← Copy → rename to .env → add your API key
│   ├── .gitignore
│   ├── database/
│   │   └── db.js                ← SQLite schema (auto-creates careeros.db)
│   ├── middleware/
│   │   └── auth.js              ← JWT authentication
│   └── routes/
│       ├── auth.js              ← Register / Login
│       ├── resume.js            ← Upload + Analyze resume
│       ├── jd.js                ← JD matching
│       ├── interview.js         ← Mock interview Q&A
│       └── career.js            ← Skill gap + Roadmap + Dashboard
│
└── frontend/
    ├── index.html               ← Main HTML page
    ├── css/
    │   └── style.css            ← All styles
    └── js/
        ├── api.js               ← API calls to backend
        └── app.js               ← UI logic
```

---

## ⚡ Setup in 5 Steps

### Step 1 — Install Node.js
Download from https://nodejs.org (LTS version)

### Step 2 — Get Anthropic API Key
Go to https://console.anthropic.com → API Keys → Create Key
Your key starts with `sk-ant-api03-...`

### Step 3 — Configure Environment
```bash
cd backend
cp .env.example .env
```
Open `.env` and replace `sk-ant-api03-YOUR_KEY_HERE` with your real key.

### Step 4 — Install Dependencies
```bash
cd backend
npm install
```

### Step 5 — Run the Server
```bash
npm start
```
Open your browser → http://localhost:5000

---

## 🌐 Features

| Module | What it does |
|---|---|
| 📄 Resume Analyzer | Upload PDF → server parses → Claude gives real ATS score + feedback |
| 🎯 JD Matcher | Paste any JD → real semantic match % + tailoring tips |
| 🎤 Mock Interview | Role-specific questions → Claude scores every answer |
| 📊 Skill Gap | Resume skills vs. industry requirements |
| 🗺️ Career Roadmap | Personalized step-by-step plan from your resume |

---

## 🗄️ Database (SQLite — No Setup Needed!)

The database file `backend/database/careeros.db` is created **automatically** when you first run the server. No MySQL, no PostgreSQL, no extra installation needed.

Tables created automatically:
- `users` — accounts with hashed passwords
- `resumes` — uploaded resume text
- `resume_analyses` — ATS scores and feedback
- `jd_matches` — job description match results
- `interview_sessions` — mock interview sessions
- `interview_qa` — questions, answers, scores
- `skill_gaps` — skill gap analyses
- `roadmaps` — career roadmap steps

---

## 🚀 Deploy to Render.com (Free)

1. Push to GitHub
2. Go to render.com → New Web Service → Connect repo
3. Root Directory: `backend`
4. Build: `npm install`
5. Start: `npm start`
6. Environment Variables: Add `ANTHROPIC_API_KEY`

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot find module` | Run `npm install` inside the `backend/` folder |
| `Invalid API key` | Check `.env` file — key must start with `sk-ant-` |
| Port already in use | Change `PORT=5000` in `.env` to `PORT=5001` |
| PDF not reading | Use a text-based PDF (not scanned image) |
| CORS error | Make sure frontend is opened via `http://localhost:5000` not as a file |
