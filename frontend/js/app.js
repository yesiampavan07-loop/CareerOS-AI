// ══════════════════════════════════════════════
//  frontend/js/app.js
//  Main application logic
// ══════════════════════════════════════════════
// ── LANDING PAGE ──
function showLogin() {
  document.getElementById('landing-page').style.display = 'none';
  document.getElementById('login-page').style.display = 'flex';
  switchAuthTab('tab-signin', document.querySelector('.auth-tab'));
}

function showRegister() {
  document.getElementById('landing-page').style.display = 'none';
  document.getElementById('login-page').style.display = 'flex';
  switchAuthTab('tab-register', document.querySelectorAll('.auth-tab')[1]);
}
// ── Global state ────────────────────────────
let currentResumeId = null;
let currentSessionId = null;
let intQ = 0;
let intScores = [];
let intActive = false;
let intType = 'Technical';

// ── On page load ────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  const token = getToken();
  if (user && token) {
    launchApp(user);
  } else {
    document.getElementById('landing-page').style.display = 'flex';
    document.getElementById('login-page').style.display = 'none';
  }
});

// ── NAVIGATION ──────────────────────────────
const titles = {
  dash:'Dashboard', resume:'Resume Analyzer', jd:'JD Matcher',
  interview:'Mock Interview', skillgap:'Skill Gap Analyzer', roadmap:'Career Roadmap'
};
function go(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.getElementById('page-' + id).classList.add('on');
  document.querySelectorAll('.nitem').forEach(n => n.classList.remove('on'));
  if (el) el.classList.add('on');
  document.getElementById('ttitle').textContent = titles[id];
}

// ── AUTH ────────────────────────────────────
function switchAuthTab(id, btn) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  ['tab-signin','tab-register'].forEach(x => {
    const el = document.getElementById(x);
    if(el) el.classList.add('hidden');
  });
  const target = document.getElementById(id);
  if(target) target.classList.remove('hidden');
}

function togglePwd(inputId, btn) {
  const el = document.getElementById(inputId);
  el.type = el.type === 'password' ? 'text' : 'password';
  btn.textContent = el.type === 'password' ? '👁' : '🙈';
}

async function doLogin() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  if (!username || !password) return showAuthError('Enter username and password.');
  const btn = document.getElementById('login-btn');
  btn.innerHTML = '<span class="spin"></span> Logging in…'; btn.disabled = true;
  try {
    const data = await apiLogin(username, password);
    setToken(data.token); setUser(data.user);
    launchApp(data.user);
  } catch(e) {
    showAuthError(e.message);
    btn.innerHTML = 'Log In'; btn.disabled = false;
  }
}

async function doRegister() {
  const username  = document.getElementById('reg-user').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const fullName  = document.getElementById('reg-name').value.trim();
  const password  = document.getElementById('reg-pass').value;
  if (!username || !password) return showAuthError('Username and password are required.');
  if (password.length < 6)   return showAuthError('Password must be at least 6 characters.');
  const btn = document.getElementById('reg-btn');
  btn.innerHTML = '<span class="spin"></span> Creating account…'; btn.disabled = true;
  try {
    const data = await apiRegister(username, email, fullName, password);
    alert('✅ Account created successfully! Please login with your username and password.');
    switchAuthTab('tab-signin', document.querySelector('.auth-tab'));
  } catch(e) {
    showAuthError(e.message);
    btn.innerHTML = 'Create Account'; btn.disabled = false;
  }
}

function demoLogin() {
  // Demo mode — no real auth needed
  const demoUser = { id: 0, username: 'demo', full_name: 'Demo User' };
  launchApp(demoUser, true);
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = '❌ ' + msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function launchApp(user, isDemo = false) {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  const name = user.full_name || user.username;
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-avatar').textContent = name.charAt(0).toUpperCase();
  document.getElementById('dash-name').textContent = name;
  if (!isDemo) loadDashboard();
}

function doLogout() {
  clearToken();
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-page').style.display = 'flex';
  currentResumeId = null;
}

async function loadDashboard() {
  try {
    const data = await apiDashboard();
    if (data.ats_score !== null) {
      document.getElementById('d-ats').textContent = data.ats_score + '%';
      document.getElementById('d-ats-s').textContent = data.ats_score >= 80 ? '↑ Strong resume' : '↑ Needs improvement';
      document.getElementById('d-ats-s').className = 'scard-chg ' + (data.ats_score >= 70 ? 'pos' : 'neg');
    }
    if (data.jd_match_score !== null) {
      document.getElementById('d-jd').textContent = data.jd_match_score + '%';
      document.getElementById('d-jd-s').textContent = data.jd_match_level + ' match';
      document.getElementById('d-jd-s').className = 'scard-chg ' + (data.jd_match_score >= 65 ? 'pos' : 'neg');
    }
    if (data.interview_count) {
      document.getElementById('d-int').textContent = data.interview_count;
      document.getElementById('d-int-s') && (document.getElementById('d-int-s').textContent = data.interview_count + ' sessions done');
    }
    if (data.skill_readiness !== null) {
      document.getElementById('d-sk').textContent = data.skill_readiness + '%';
      document.getElementById('d-sk-s').textContent = 'readiness score';
      document.getElementById('d-sk-s').className = 'scard-chg ' + (data.skill_readiness >= 70 ? 'pos' : 'neg');
    }
    if (data.resume_name) {
      updateResumeStatus(data.resume_name);
      document.getElementById('dash-alert').className = 'alert a-success';
      document.getElementById('dash-alert').innerHTML = '✅ <strong>Resume on file:</strong> ' + data.resume_name + ' — all tools are ready!';
    }

    // Progress bar
    let progress = 0;
    if (data.ats_score) progress += 25;
    if (data.jd_match_score) progress += 25;
    if (data.interview_count > 0) progress += 25;
    if (data.skill_readiness) progress += 25;

    const progressEl = document.getElementById('overall-progress');
    if (progressEl) {
      progressEl.style.width = progress + '%';
      document.getElementById('progress-pct').textContent = progress + '%';
    }
  } catch(e) { console.log('Dashboard load:', e.message); }
}
// ── RESUME ANALYZER ─────────────────────────
function dropFile(ev) { ev.preventDefault(); const f = ev.dataTransfer.files[0]; if(f) handleFile(f); }
function fileChosen(ev) { const f = ev.target.files[0]; if(f) handleFile(f); }

async function handleFile(file) {
  setUpArea('⏳ Uploading ' + file.name + '…', 'Sending to server…');
  document.getElementById('analyze-btn').disabled = true;
  try {
    const data = await apiUploadResume(file);
    currentResumeId = data.resume_id;
    setUpArea('✅ ' + data.filename, data.word_count + ' words extracted — ready to analyze');
    document.getElementById('analyze-btn').disabled = false;
    updateResumeStatus(data.filename);
    document.getElementById('dash-alert').className = 'alert a-success';
    document.getElementById('dash-alert').innerHTML = '✅ <strong>Resume uploaded:</strong> ' + data.filename + ' — click Analyze!';
    document.getElementById('jd-no-res').classList.add('hidden');
    document.getElementById('sg-no-res').classList.add('hidden');
  } catch(e) {
    setUpArea('❌ Upload failed', e.message);
  }
}

function setUpArea(txt, sub) {
  document.getElementById('up-txt').textContent = txt;
  document.getElementById('up-sub').textContent = sub;
}

function updateResumeStatus(name) {
  document.getElementById('sb-res-ok').classList.remove('hidden');
  document.getElementById('sb-res-no').classList.add('hidden');
  document.getElementById('sb-res-name').textContent = name;
  const short = name.length > 18 ? name.substring(0,18)+'…' : name;
  document.getElementById('tb-res').textContent = '📄 ' + short;
}

async function analyzeResume() {
  if (!currentResumeId) { alert('Upload your resume first.'); return; }
  const btn = document.getElementById('analyze-btn');
  btn.innerHTML = '<span class="spin"></span> Analyzing with Claude AI…'; btn.disabled = true;
  try {
    const d = await apiAnalyzeResume(currentResumeId);
    ['score-card','sugg-card','kw-card'].forEach(id => document.getElementById(id).classList.remove('hidden'));
    const score = d.ats_score || 70;
    document.getElementById('ats-num').textContent = score + '%';
    setTimeout(() => { document.getElementById('ats-circle').style.strokeDashoffset = 314 - (314 * score / 100); }, 100);
    const sec = d.sections || {};
    document.getElementById('score-bars').innerHTML =
      ['format','keywords','experience','achievements','education'].map(k => {
        const v = sec[k] || 65;
        return `<div class="prow"><div class="plabel"><span style="font-size:11px;text-transform:capitalize;">${k}</span><span style="color:var(--green);font-size:11px;">${v}%</span></div><div class="pbar"><div class="pfill" style="width:${v}%;background:var(--gp)"></div></div></div>`;
      }).join('');
    document.getElementById('kw-found').innerHTML = (d.found_keywords||[]).map(k => `<span class="tag t-g">${k}</span>`).join('');
    document.getElementById('kw-miss').innerHTML  = (d.missing_keywords||[]).map(k => `<span class="tag t-r">${k}</span>`).join('');
    document.getElementById('sugg-content').textContent = d.feedback || 'Analysis complete.';
// Add copy button
document.getElementById('sugg-card').querySelector('.card-title').innerHTML = `
  💡 Claude's Detailed Feedback
  <button onclick="copyText('sugg-content')" style="margin-left:auto;padding:5px 12px;background:rgba(124,107,255,0.15);border:1px solid rgba(124,107,255,0.3);border-radius:8px;color:#7c6bff;font-size:11px;cursor:pointer;font-family:'Inter',sans-serif;">📋 Copy</button>`;
    document.getElementById('d-ats').textContent = score + '%';
    document.getElementById('d-ats-s').textContent = score >= 80 ? '↑ Strong resume' : '↑ Needs improvement';
    document.getElementById('d-ats-s').className = 'scard-chg ' + (score >= 70 ? 'pos' : 'neg');
    document.getElementById('d-sk').textContent = d.skills_count || '';
    document.getElementById('d-sk-s').textContent = 'skills found'; document.getElementById('d-sk-s').className = 'scard-chg pos';
    btn.innerHTML = '✅ Re-analyze Resume'; btn.disabled = false;
  } catch(e) {
    document.getElementById('sugg-card').classList.remove('hidden');
    document.getElementById('sugg-content').textContent = 'Error: ' + e.message;
    btn.innerHTML = '🔍 Retry'; btn.disabled = false;
  }
}

// ── JD MATCHER ──────────────────────────────
function sampleJD() {
  document.getElementById('jdtext').value = `Senior Full Stack Developer — FinTech Startup\n\nRequirements:\n- 2+ years experience in full-stack development\n- Strong proficiency in React.js, Node.js, TypeScript\n- Experience with PostgreSQL and Redis databases\n- Knowledge of Docker and AWS deployment\n- Understanding of REST API design and microservices\n- Familiarity with Git workflows and agile\n\nNice to have: GraphQL, payment APIs (Stripe, Razorpay)`;
}

async function matchJD() {
  const jd = document.getElementById('jdtext').value.trim();
  if (!jd) { alert('Paste a job description first.'); return; }
  const btn = document.getElementById('jd-btn');
  btn.innerHTML = '<span class="spin"></span> Matching with Claude AI…'; btn.disabled = true;
  try {
    const d = await apiMatchJD(jd, currentResumeId);
    const score = d.match_score || 65;
    const col = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--blue)' : 'var(--orange)';
    document.getElementById('jd-res-col').innerHTML = `
      <div class="card mb16"><div class="card-title">📊 Match Results</div>
        <div style="display:flex;align-items:center;gap:18px;margin-bottom:16px;flex-wrap:wrap;">
          <div class="ring-wrap"><div class="ring" style="width:100px;height:100px;">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round"
                stroke-dasharray="251" stroke-dashoffset="${251-(251*score/100)}"
                style="transform:rotate(-90deg);transform-origin:50px 50px;transition:stroke-dashoffset 1.4s ease;"/>
            </svg>
            <div class="ring-val"><div class="rnum" style="font-size:22px;-webkit-text-fill-color:${col};">${score}%</div><div class="rlbl">${d.match_level||'Match'}</div></div>
          </div></div>
          <div style="flex:1;"><p style="font-size:13px;color:var(--dim);line-height:1.65;">${d.summary||''}</p></div>
        </div>
        <div style="background:rgba(0,0,0,.2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px;">
          <div style="font-size:11px;color:var(--dim);margin-bottom:7px;">✅ Matching Skills</div>
          <div>${(d.matching_skills||[]).map(k=>`<span class="tag t-g">${k}</span>`).join('')||'<span style="font-size:12px;color:var(--muted);">None found</span>'}</div>
        </div>
        <div style="background:rgba(0,0,0,.2);border:1px solid var(--border);border-radius:10px;padding:12px;">
          <div style="font-size:11px;color:var(--dim);margin-bottom:7px;">❌ Missing Skills</div>
          <div>${(d.missing_skills||[]).map(k=>`<span class="tag t-r">${k}</span>`).join('')||'<span style="color:var(--green);font-size:12px;">No critical gaps!</span>'}</div>
        </div>
      </div>
      <div class="card mb16"><div class="card-title">📝 Tailoring Tips</div>
        <div style="margin-top:6px;">${(d.tailoring_tips||[]).map((t,i)=>`<div style="display:flex;gap:10px;padding:9px 11px;margin-bottom:7px;background:rgba(255,255,255,0.03);border-radius:9px;font-size:13px;color:var(--dim);line-height:1.5;"><span style="color:var(--purple);font-weight:700;flex-shrink:0;">${i+1}.</span><span>${t}</span></div>`).join('')}</div>
      </div>
      <div class="card"><div class="card-title">✉️ Cover Letter Outline</div>
        <div class="ai-out" style="margin-top:8px;font-size:12px;">${d.cover_letter||''}</div>
      </div>`;
    document.getElementById('d-jd').textContent = score + '%';
    document.getElementById('d-jd-s').textContent = (d.match_level||'') + ' match';
    document.getElementById('d-jd-s').className = 'scard-chg ' + (score >= 65 ? 'pos' : 'neg');
    btn.innerHTML = '🎯 Match Again'; btn.disabled = false;
  } catch(e) {
    document.getElementById('jd-res-col').innerHTML = `<div class="alert a-error">❌ ${e.message}</div>`;
    btn.innerHTML = '🎯 Retry'; btn.disabled = false;
  }
}

// ── MOCK INTERVIEW ───────────────────────────
function setIT(btn, type) {
  document.querySelectorAll('#page-interview .mtab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on'); intType = type;
}

async function startInterview() {
  intActive = true; intQ = 1; intScores = [];
  document.getElementById('int-score-card').classList.add('hidden');
  document.getElementById('cinput').disabled = false;
  document.getElementById('send-btn').disabled = false;
  document.getElementById('start-int-btn').textContent = '🔄 Restart';
  const role = document.getElementById('int-role').value;
  document.getElementById('chatbox').innerHTML = '';
  const btn = document.getElementById('start-int-btn');
  btn.innerHTML = '<span class="spin"></span> Starting…'; btn.disabled = true;
  try {
    const data = await apiStartInterview(role, intType);
    currentSessionId = data.session_id;
    intQ = 1;
    addAI(`I'll be your AI interviewer for a <strong>${intType}</strong> interview for <strong>${role}</strong>.<br><br>Question 1 of 5:<br><br><strong>${data.question}</strong>`);
    startTimer();
    document.getElementById('d-int').textContent = parseInt(document.getElementById('d-int').textContent || '0') + 1;
  } catch(e) {
    addAI('❌ Failed to start interview: ' + e.message);
    btn.innerHTML = '🎤 Start Interview'; btn.disabled = false; intActive = false;
  }
}

function addAI(html) {
  const b = document.getElementById('chatbox');
  const d = document.createElement('div');
  d.className = 'cmsg ai';
  d.innerHTML = `<div class="csender">🤖 Claude AI</div><div class="cbubble">${html}</div>`;
  b.appendChild(d); b.scrollTop = b.scrollHeight;
}
function addMe(text) {
  const b = document.getElementById('chatbox');
  const d = document.createElement('div');
  d.className = 'cmsg me';
  d.innerHTML = `<div class="csender">${document.getElementById('sidebar-name').textContent}</div><div class="cbubble">${text}</div>`;
  b.appendChild(d); b.scrollTop = b.scrollHeight;
}
function addTyping() {
  const b = document.getElementById('chatbox');
  const d = document.createElement('div');
  d.id = 'typing'; d.className = 'cmsg ai';
  d.innerHTML = `<div class="csender">🤖 Claude AI</div><div class="cbubble"><span class="spin"></span> Evaluating your answer…</div>`;
  b.appendChild(d); b.scrollTop = b.scrollHeight;
}
function removeTyping() { const t = document.getElementById('typing'); if(t) t.remove(); }

async function sendAns() {
  if (!intActive) return;
  const inp = document.getElementById('cinput');
  const ans = inp.value.trim(); if (!ans) return;
  inp.value = ''; inp.disabled = true; document.getElementById('send-btn').disabled = true;
  addMe(ans); addTyping();
  try {
    const d = await apiSubmitAnswer(currentSessionId, intQ, ans);
    removeTyping();
    intScores.push(d.score || 70);
    const cm = { Excellent:'var(--green)', Strong:'var(--green)', Good:'var(--blue)', Average:'var(--orange)', 'Needs Work':'var(--red)' };
    const col = cm[d.verdict] || 'var(--purple)';
    let fb = `<span style="color:${col};font-weight:600;">${d.verdict} — ${d.score}/100</span><br><br>`;
    if (d.strengths)    fb += `✅ <strong>Strengths:</strong> ${d.strengths}<br><br>`;
    if (d.improvements) fb += `📈 <strong>Improve:</strong> ${d.improvements}<br><br>`;
    if (d.ideal_answer) fb += `💡 <strong>Key points:</strong> ${d.ideal_answer}`;
    if (!d.is_complete && d.next_question) {
      intQ = d.next_question_num;
      fb += `<br><br>---<br><br><strong>Question ${intQ} of 5:</strong><br><br>${d.next_question}`;
      addAI(fb);
      inp.disabled = false; document.getElementById('send-btn').disabled = false;
    } else {
      fb += `<br><br>🎉 <strong>Interview Complete!</strong> Final score: <strong>${d.final_score}/100</strong>`;
      addAI(fb);
      showFinalScore(d.final_score);
    }
  } catch(e) {
    removeTyping(); addAI('❌ Error: ' + e.message);
    inp.disabled = false; document.getElementById('send-btn').disabled = false;
  }
}

function showFinalScore(avg) {
  intActive = false;
  document.getElementById('int-score-val').textContent = avg + '%';
  const label = avg >= 85 ? 'Outstanding — Interview Ready!' : avg >= 70 ? 'Good — Keep Practising' : 'Keep Practising — Review Feedback';
  document.getElementById('int-score-detail').innerHTML =
    `<div style="font-size:12px;color:var(--dim);text-align:center;margin-bottom:12px;">${label}</div>` +
    ['Technical Accuracy','Communication','Depth of Knowledge','Confidence'].map(l => {
      const v = Math.max(50, Math.min(98, avg + Math.round(Math.random()*14-7)));
      return `<div class="prow"><div class="plabel"><span style="font-size:11px;">${l}</span><span style="font-size:11px;color:var(--purple);">${v}%</span></div><div class="pbar"><div class="pfill" style="width:${v}%;background:var(--gp)"></div></div></div>`;
    }).join('');
  document.getElementById('int-score-card').classList.remove('hidden');
  document.getElementById('cinput').disabled = true; document.getElementById('send-btn').disabled = true;
}

function resetInterview() {
  intActive = false; intQ = 0; intScores = []; currentSessionId = null;
  document.getElementById('int-score-card').classList.add('hidden');
  document.getElementById('chatbox').innerHTML = '<div class="cmsg ai"><div class="csender">🤖 Claude AI</div><div class="cbubble">Ready for a new session! Click <strong>Start Interview</strong> to begin.</div></div>';
  document.getElementById('cinput').disabled = true; document.getElementById('send-btn').disabled = true;
  document.getElementById('start-int-btn').textContent = '🎤 Start Interview';
}

// ── SKILL GAP ───────────────────────────────
async function analyzeSkillGap() {
  const role = document.getElementById('sg-role').value;
  const btn  = document.getElementById('sg-btn');
  btn.innerHTML = '<span class="spin"></span> Analyzing with Claude…'; btn.disabled = true;
  try {
    const d = await apiSkillGap(role);
    const grads = ['var(--gp)','var(--gb)','var(--gg)','var(--go)'];
    const skills = d.skills || [];
    const strengths = skills.filter(s => s.candidate >= s.required);
    const gaps = d.critical_gaps || [];
    document.getElementById('sg-results').innerHTML = `
      <div class="alert a-${d.overall_readiness>=70?'success':'warn'}" style="margin-bottom:16px;">${d.overall_readiness>=70?'✅':'⚠️'} <strong>Readiness: ${d.overall_readiness}% for ${role}</strong> — ${d.summary}</div>
      <div class="g2">
        <div class="card"><div class="card-title">📈 Skills vs. Required</div><div class="card-sub">White line = industry minimum</div>
          ${skills.map((sk,i)=>`<div class="skrow"><div class="skname">${sk.name}</div><div class="skbar"><div class="skcur" style="width:${sk.candidate}%;background:${grads[i%4]}"></div><div class="skreq" style="left:${Math.min(sk.required,98)}%"></div></div><div class="skpct">${sk.candidate}%</div></div>`).join('')}
        </div>
        <div>
          <div class="card mb16"><div class="card-title">🏆 Strengths</div><div style="margin-top:6px;">${strengths.length?strengths.map(s=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 11px;background:rgba(61,232,138,.06);border:1px solid rgba(61,232,138,.14);border-radius:9px;margin-bottom:7px;"><span style="font-size:13px;">${s.name}</span><span class="tag t-g">${s.candidate}%</span></div>`).join(''):'<p style="font-size:13px;color:var(--dim);">Keep building skills!</p>'}</div></div>
          <div class="card"><div class="card-title">⚠️ Priority Gaps</div><div style="margin-top:6px;">${gaps.map(g=>`<div style="padding:10px 12px;background:rgba(255,95,95,.06);border:1px solid rgba(255,95,95,.14);border-radius:9px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:13px;font-weight:500;">${g.skill}</span><span style="font-size:11px;color:var(--red);">${g.gap}</span></div><div style="font-size:11px;color:var(--dim);">📚 ${g.resource}</div></div>`).join('')}</div></div>
        </div>
      </div>`;
    btn.innerHTML = '📊 Re-analyze'; btn.disabled = false;
  } catch(e) {
    document.getElementById('sg-results').innerHTML = `<div class="alert a-error">❌ ${e.message}</div>`;
    btn.innerHTML = '📊 Retry'; btn.disabled = false;
  }
}

// ── CAREER ROADMAP ───────────────────────────
async function genRoadmap() {
  const role = document.getElementById('rm-role').value;
  const time = document.getElementById('rm-time').value;
  const btn  = document.getElementById('rm-btn');
  btn.innerHTML = '<span class="spin"></span> Generating with Claude…'; btn.disabled = true;
  try {
    const d = await apiRoadmap(role, time);
    const steps = d.steps || [];
    const done  = steps.filter(s => s.status === 'done').length;
    const pct   = Math.round(done / steps.length * 100);
    document.getElementById('rm-results').innerHTML = `
      <div class="alert a-success" style="margin-bottom:18px;">🎯 <strong>Start today:</strong> ${d.first_action||'Begin with the first step below.'}</div>
      <div class="g2">
        <div>${steps.map(st=>`<div class="rstep"><div class="rdot ${st.status}">${st.status==='done'?'✅':st.status==='active'?'🔵':'⭕'}</div><div class="rcontent"><div class="rtitle">${st.title}</div><div class="rmeta">⏱ ${st.duration} • ${st.status==='done'?'<span style="color:var(--green)">Completed</span>':st.status==='active'?'<span style="color:var(--purple)">In Progress</span>':'<span style="color:var(--muted)">Upcoming</span>'}</div>${st.milestone?`<div style="font-size:11px;color:var(--dim);margin-bottom:6px;">🏁 ${st.milestone}</div>`:''}<div style="margin-bottom:6px;">${(st.skills||[]).map(sk=>`<span class="tag t-p" style="font-size:10px;">${sk}</span>`).join('')}</div>${st.resources?.length?`<div style="font-size:11px;color:var(--muted);">📚 ${st.resources.join(' • ')}</div>`:''}</div></div>`).join('')}</div>
        <div>
          <div class="card mb16"><div class="card-title">📅 Progress</div>
            <div style="text-align:center;padding:14px 0;"><div style="font-family:'Space Grotesk',sans-serif;font-size:44px;font-weight:700;background:var(--gp);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${pct}%</div><div style="font-size:12px;color:var(--dim);">Roadmap Complete</div></div>
            <div class="pbar" style="height:10px;"><div class="pfill" style="width:${pct}%;background:var(--gp)"></div></div>
            <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:11px;color:var(--dim);">
              <span>✅ ${done} done</span><span>🔵 ${steps.filter(s=>s.status==='active').length} active</span><span>⭕ ${steps.filter(s=>s.status==='todo').length} ahead</span>
            </div>
          </div>
          <div class="card"><div class="card-title">🏁 Key Milestone</div><div style="font-size:13px;color:var(--dim);line-height:1.65;margin-top:6px;">${d.key_milestone||''}</div></div>
        </div>
      </div>`;
    btn.innerHTML = '🗺️ Regenerate'; btn.disabled = false;
  } catch(e) {
    document.getElementById('rm-results').innerHTML = `<div class="alert a-error">❌ ${e.message}</div>`;
    btn.innerHTML = '🗺️ Retry'; btn.disabled = false;
  }
}
// ── COPY BUTTON ──
function copyText(elementId) {
  const text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = '✅ Copied!';
    btn.style.color = '#3de88a';
    setTimeout(() => {
      btn.textContent = '📋 Copy';
      btn.style.color = '#7c6bff';
    }, 2000);
  });
}
// ── INTERVIEW TIMER ──
let timerInterval = null;
let timeLeft = 60;

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = 60;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      document.getElementById('timer-display').style.color = '#ff5f5f';
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('timer-display');
  if (el) {
    el.textContent = `⏱ ${timeLeft}s`;
    el.style.color = timeLeft > 20 ? '#3de88a' : timeLeft > 10 ? '#ff9f43' : '#ff5f5f';
  }
}
// ── PDF REPORT DOWNLOAD ──
function downloadReport() {
  const name = document.getElementById('sidebar-name').textContent;
  const ats = document.getElementById('d-ats').textContent || 'N/A';
  const jd = document.getElementById('d-jd').textContent || 'N/A';
  const interviews = document.getElementById('d-int').textContent || '0';
  const feedback = document.getElementById('sugg-content')?.textContent || 'Run Resume Analyzer first';
  const foundKw = Array.from(document.querySelectorAll('#kw-found .tag')).map(t=>t.textContent).join(', ') || 'N/A';
  const missKw = Array.from(document.querySelectorAll('#kw-miss .tag')).map(t=>t.textContent).join(', ') || 'N/A';

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>CareerOS AI Report — ${name}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
  .header { text-align: center; border-bottom: 3px solid #7c6bff; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 28px; font-weight: 800; color: #7c6bff; }
  .subtitle { color: #666; font-size: 14px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 18px; font-weight: 700; color: #7c6bff; border-left: 4px solid #7c6bff; padding-left: 12px; margin-bottom: 12px; }
  .score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
  .score-box { background: #f8f7ff; border: 2px solid #7c6bff; border-radius: 12px; padding: 16px; text-align: center; }
  .score-val { font-size: 32px; font-weight: 800; color: #7c6bff; }
  .score-lbl { font-size: 12px; color: #666; margin-top: 4px; }
  .tag { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; margin: 3px; }
  .tag-green { background: #e8fdf2; color: #1a8a4a; border: 1px solid #a3e6c0; }
  .tag-red { background: #fff0f0; color: #cc2222; border: 1px solid #ffb3b3; }
  .feedback { background: #f8f7ff; border-radius: 12px; padding: 20px; font-size: 13px; line-height: 1.8; color: #444; white-space: pre-wrap; }
  .footer { text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">🚀 CareerOS AI</div>
  <div class="subtitle">Career Intelligence Report for <strong>${name}</strong></div>
  <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</div>
</div>

<div class="section">
  <div class="section-title">📊 Performance Summary</div>
  <div class="score-grid">
    <div class="score-box"><div class="score-val">${ats}</div><div class="score-lbl">ATS Score</div></div>
    <div class="score-box"><div class="score-val">${jd}</div><div class="score-lbl">JD Match</div></div>
    <div class="score-box"><div class="score-val">${interviews}</div><div class="score-lbl">Interviews</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">✅ Skills Found in Resume</div>
  <div>${foundKw.split(',').map(k=>`<span class="tag tag-green">${k.trim()}</span>`).join('')}</div>
</div>

<div class="section">
  <div class="section-title">❌ Missing Keywords</div>
  <div>${missKw.split(',').map(k=>`<span class="tag tag-red">${k.trim()}</span>`).join('')}</div>
</div>

<div class="section">
  <div class="section-title">💡 AI Feedback</div>
  <div class="feedback">${feedback}</div>
</div>

<div class="footer">
  Generated by CareerOS AI • careeros-ai-amcb.onrender.com<br>
  This report is AI-generated and intended for educational purposes.
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CareerOS-Report-${name}-${new Date().toLocaleDateString('en-IN').replace(/\//g,'-')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}