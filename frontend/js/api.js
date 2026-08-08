// ══════════════════════════════════════════════
//  frontend/js/api.js
//  All API calls to the backend server
// ══════════════════════════════════════════════

const API_BASE = window.location.origin + '/api';

// ── Token helpers ───────────────────────────
function getToken()       { return localStorage.getItem('careeros_token'); }
function setToken(t)      { localStorage.setItem('careeros_token', t); }
function clearToken()     { localStorage.removeItem('careeros_token'); localStorage.removeItem('careeros_user'); }
function getUser()        { return JSON.parse(localStorage.getItem('careeros_user') || 'null'); }
function setUser(u)       { localStorage.setItem('careeros_user', JSON.stringify(u)); }

// ── Base fetch with auth ────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const res = await fetch(API_BASE + endpoint, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── AUTH ────────────────────────────────────
async function apiRegister(username, email, fullName, password) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, full_name: fullName, password })
  });
}

async function apiLogin(username, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

async function apiGetMe() {
  return apiFetch('/auth/me');
}

// ── RESUME ──────────────────────────────────
async function apiUploadResume(file) {
  const form = new FormData();
  form.append('resume', file);
  const token = getToken();
  const res = await fetch(API_BASE + '/resume/upload', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body:    form
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

async function apiAnalyzeResume(resumeId) {
  return apiFetch('/resume/analyze', {
    method: 'POST',
    body: JSON.stringify({ resume_id: resumeId })
  });
}

async function apiResumeHistory() {
  return apiFetch('/resume/history');
}

async function apiLatestResume() {
  return apiFetch('/resume/latest');
}

// ── JD MATCHER ──────────────────────────────
async function apiMatchJD(jdText, resumeId = null) {
  return apiFetch('/jd/match', {
    method: 'POST',
    body: JSON.stringify({ jd_text: jdText, resume_id: resumeId })
  });
}

async function apiJDHistory() {
  return apiFetch('/jd/history');
}

// ── INTERVIEW ────────────────────────────────
async function apiStartInterview(role, interviewType) {
  return apiFetch('/interview/start', {
    method: 'POST',
    body: JSON.stringify({ role, interview_type: interviewType })
  });
}

async function apiSubmitAnswer(sessionId, questionNum, answer) {
  return apiFetch('/interview/answer', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, question_num: questionNum, answer })
  });
}

async function apiInterviewHistory() {
  return apiFetch('/interview/history');
}

// ── SKILL GAP ────────────────────────────────
async function apiSkillGap(targetRole) {
  return apiFetch('/career/skillgap', {
    method: 'POST',
    body: JSON.stringify({ target_role: targetRole })
  });
}

// ── ROADMAP ──────────────────────────────────
async function apiRoadmap(targetRole, timeline) {
  return apiFetch('/career/roadmap', {
    method: 'POST',
    body: JSON.stringify({ target_role: targetRole, timeline })
  });
}

// ── DASHBOARD ────────────────────────────────
async function apiDashboard() {
  return apiFetch('/career/dashboard');
}
