const express = require('express');
const { callGemini, parseJSON } = require('../config/gemini');
const { db }  = require('../database/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.post('/match', auth, async (req, res) => {
  const { jd_text, resume_id } = req.body;
  if (!jd_text) return res.status(400).json({ error: 'Job description text is required.' });
  let resumeText = '';
  if (resume_id) {
    const r = db.prepare('SELECT file_text FROM resumes WHERE id = ? AND user_id = ?').get(resume_id, req.user.id);
    if (r) resumeText = r.file_text;
  } else {
    const r = db.prepare('SELECT file_text FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT 1').get(req.user.id);
    if (r) resumeText = r.file_text;
  }
  if (!resumeText) return res.status(400).json({ error: 'No resume found. Please upload your resume first.' });

  const prompt = `You are an expert ATS system. Analyze how well this resume matches the job description.
Respond in EXACT JSON only (no markdown):
{"matchScore":<0-100>,"matchLevel":"<Excellent|Good|Fair|Weak>","matchingSkills":["skills in BOTH"],"missingSkills":["skills in JD not in resume"],"tailoringTips":["5 specific tips"],"summary":"<2-3 sentence assessment>","coverLetterOutline":"<3 bullet points for cover letter>"}

RESUME:\n---\n${resumeText.substring(0,3000)}\n---\nJOB DESCRIPTION:\n---\n${jd_text.substring(0,2000)}\n---`;

  try {
    const data = parseJSON(await callGemini(prompt, 1600));
    const result = db.prepare(`INSERT INTO jd_matches (user_id, resume_id, jd_text, match_score, match_level, matching_skills, missing_skills, tailoring_tips, summary, cover_letter) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run([req.user.id, resume_id||null, jd_text.substring(0,2000), data.matchScore, data.matchLevel, JSON.stringify(data.matchingSkills||[]), JSON.stringify(data.missingSkills||[]), JSON.stringify(data.tailoringTips||[]), data.summary||'', data.coverLetterOutline||'']);
    res.json({ match_id: result.lastInsertRowid, match_score: data.matchScore, match_level: data.matchLevel, matching_skills: data.matchingSkills||[], missing_skills: data.missingSkills||[], tailoring_tips: data.tailoringTips||[], summary: data.summary, cover_letter: data.coverLetterOutline });
  } catch(err) { console.error('JD match error:', err); res.status(500).json({ error: 'JD matching failed: ' + err.message }); }
});

router.get('/history', auth, (req, res) => {
  const matches = db.prepare(`SELECT id, match_score, match_level, summary, matched_at, substr(jd_text,1,100) as jd_preview FROM jd_matches WHERE user_id = ? ORDER BY matched_at DESC LIMIT 10`).all(req.user.id);
  res.json({ matches });
});

module.exports = router;
