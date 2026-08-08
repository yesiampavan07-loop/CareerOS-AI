const express = require('express');
const { callGemini, parseJSON } = require('../config/gemini');
const { db }  = require('../database/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

function getResumeText(userId) {
  const r = db.prepare('SELECT file_text FROM resumes WHERE user_id=? ORDER BY uploaded_at DESC LIMIT 1').get(userId);
  return r ? r.file_text : '';
}

router.post('/skillgap', auth, async (req, res) => {
  const { target_role } = req.body;
  if (!target_role) return res.status(400).json({ error: 'target_role is required.' });
  const resumeText = getResumeText(req.user.id);
  if (!resumeText) return res.status(400).json({ error: 'No resume found. Please upload your resume first.' });

  const prompt = `You are an expert technical recruiter. Analyze this resume for the role: ${target_role}.
Respond in EXACT JSON only (no markdown):
{"overallReadiness":<0-100>,"summary":"<2 sentence assessment>","skills":[{"name":"<skill>","candidate":<0-100>,"required":<60-100>,"priority":"<High|Medium|Low>"}],"strengths":["strength1","strength2","strength3"],"criticalGaps":[{"skill":"<name>","gap":"<why needed>","resource":"<best free resource>"}]}
Include 8-10 skills. Base candidate scores ONLY on resume evidence.
RESUME:\n---\n${resumeText.substring(0,3500)}\n---`;

  try {
    const data = parseJSON(await callGemini(prompt, 1400));
    const resume = db.prepare('SELECT id FROM resumes WHERE user_id=? ORDER BY uploaded_at DESC LIMIT 1').get(req.user.id);
    const result = db.prepare('INSERT INTO skill_gaps (user_id, resume_id, target_role, overall_readiness, summary, skills_data, strengths, critical_gaps) VALUES (?,?,?,?,?,?,?,?)')
      .run(req.user.id, resume?.id||null, target_role, data.overallReadiness, data.summary, JSON.stringify(data.skills||[]), JSON.stringify(data.strengths||[]), JSON.stringify(data.criticalGaps||[]));
    res.json({ gap_id: result.lastInsertRowid, overall_readiness: data.overallReadiness, summary: data.summary, skills: data.skills||[], strengths: data.strengths||[], critical_gaps: data.criticalGaps||[] });
  } catch(err) { res.status(500).json({ error: 'Skill gap analysis failed: ' + err.message }); }
});

router.post('/roadmap', auth, async (req, res) => {
  const { target_role, timeline } = req.body;
  if (!target_role || !timeline) return res.status(400).json({ error: 'target_role and timeline required.' });
  const resumeText = getResumeText(req.user.id);

  const prompt = `You are a career coach. Create a ${timeline} roadmap for a CSE student targeting ${target_role}.
${resumeText ? 'Based on resume:\n' + resumeText.substring(0,1500) : ''}
Respond in EXACT JSON only (no markdown):
{"steps":[{"title":"<title>","duration":"<Week X-Y>","status":"<done|active|todo>","skills":["s1","s2","s3"],"resources":["r1","r2"],"milestone":"<what they can build after this>"}],"keyMilestone":"<most important milestone>","firstAction":"<specific thing to do TODAY>"}
Include 5-7 steps. Mark first as done if resume shows basics, second active, rest todo.`;

  try {
    const data = parseJSON(await callGemini(prompt, 1500));
    const result = db.prepare('INSERT INTO roadmaps (user_id, target_role, timeline, steps_data, key_milestone, first_action) VALUES (?,?,?,?,?,?)')
      .run(req.user.id, target_role, timeline, JSON.stringify(data.steps||[]), data.keyMilestone||'', data.firstAction||'');
    res.json({ roadmap_id: result.lastInsertRowid, steps: data.steps||[], key_milestone: data.keyMilestone, first_action: data.firstAction });
  } catch(err) { res.status(500).json({ error: 'Roadmap generation failed: ' + err.message }); }
});

router.get('/dashboard', auth, (req, res) => {
  const uid = req.user.id;
  const latestResume   = db.prepare('SELECT ats_score, original_name FROM resumes WHERE user_id=? ORDER BY uploaded_at DESC LIMIT 1').get(uid);
  const latestJD       = db.prepare('SELECT match_score, match_level FROM jd_matches WHERE user_id=? ORDER BY matched_at DESC LIMIT 1').get(uid);
  const intCount       = db.prepare('SELECT COUNT(*) as cnt FROM interview_sessions WHERE user_id=?').get(uid);
  const latestSkillGap = db.prepare('SELECT overall_readiness FROM skill_gaps WHERE user_id=? ORDER BY analyzed_at DESC LIMIT 1').get(uid);
  res.json({ ats_score: latestResume?.ats_score||null, resume_name: latestResume?.original_name||null, jd_match_score: latestJD?.match_score||null, jd_match_level: latestJD?.match_level||null, interview_count: intCount?.cnt||0, skill_readiness: latestSkillGap?.overall_readiness||null });
});

module.exports = router;
