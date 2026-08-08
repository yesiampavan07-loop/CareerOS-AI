const express  = require('express');
const multer   = require('multer');
const pdfParse = require('pdf-parse');
const { callGemini, parseJSON } = require('../config/gemini');
const { db }   = require('../database/db');
const auth     = require('../middleware/auth');
const router   = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else { cb(new Error('Only PDF and TXT files allowed.')); }
  }
});

router.post('/upload', auth, upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  try {
    let text = '';
    if (req.file.mimetype === 'application/pdf' || req.file.originalname.endsWith('.pdf')) {
      const parsed = await pdfParse(req.file.buffer);
      text = parsed.text;
    } else { text = req.file.buffer.toString('utf-8'); }
    if (!text.trim()) return res.status(400).json({ error: 'Could not extract text from file.' });
    const wordCount = text.trim().split(/\s+/).length;
    const result = db.prepare(`INSERT INTO resumes (user_id, filename, original_name, file_text, word_count) VALUES (?, ?, ?, ?, ?)`)
      .run(req.user.id, `resume_${Date.now()}`, req.file.originalname, text, wordCount);
    res.json({ message: 'Resume uploaded!', resume_id: result.lastInsertRowid, filename: req.file.originalname, word_count: wordCount });
  } catch(err) { res.status(500).json({ error: 'Failed to process file: ' + err.message }); }
});

router.post('/analyze', auth, async (req, res) => {
  const { resume_id } = req.body;
  if (!resume_id) return res.status(400).json({ error: 'resume_id is required.' });
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ? AND user_id = ?').get(resume_id, req.user.id);
  if (!resume) return res.status(404).json({ error: 'Resume not found.' });

  const prompt = `You are an expert ATS resume coach. Analyze this resume carefully.
Respond in EXACT JSON only (no markdown, no extra text):
{"atsScore":<0-100>,"sections":{"format":<0-100>,"keywords":<0-100>,"experience":<0-100>,"achievements":<0-100>,"education":<0-100>},"foundKeywords":["up to 12 actual skills found"],"missingKeywords":["up to 8 important missing skills"],"skillsCount":<number>,"feedback":"<detailed 400 word feedback with specific rewrite examples>"}

Resume:
---
${resume.file_text.substring(0, 4000)}
---`;

  try {
    const data = parseJSON(await callGemini(prompt, 2000));
    const result = db.prepare(`INSERT INTO resume_analyses (user_id, resume_id, ats_score, format_score, keyword_score, experience_score, achievement_score, education_score, found_keywords, missing_keywords, feedback, skills_count) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(req.user.id, resume_id, data.atsScore, data.sections?.format||0, data.sections?.keywords||0, data.sections?.experience||0, data.sections?.achievements||0, data.sections?.education||0,
        JSON.stringify(data.foundKeywords||[]), JSON.stringify(data.missingKeywords||[]), data.feedback||'', data.skillsCount||0);
    db.prepare('UPDATE resumes SET ats_score = ? WHERE id = ?').run(data.atsScore, resume_id);
    res.json({ analysis_id: result.lastInsertRowid, ats_score: data.atsScore, sections: data.sections, found_keywords: data.foundKeywords||[], missing_keywords: data.missingKeywords||[], feedback: data.feedback, skills_count: data.skillsCount });
  } catch(err) { console.error('Analysis error:', err); res.status(500).json({ error: 'AI analysis failed: ' + err.message }); }
});

router.get('/history', auth, (req, res) => {
  const resumes = db.prepare(`SELECT r.id, r.original_name, r.word_count, r.ats_score, r.uploaded_at, COUNT(ra.id) as analysis_count FROM resumes r LEFT JOIN resume_analyses ra ON ra.resume_id = r.id WHERE r.user_id = ? GROUP BY r.id ORDER BY r.uploaded_at DESC LIMIT 10`).all(req.user.id);
  res.json({ resumes });
});

router.get('/latest', auth, (req, res) => {
  const resume = db.prepare('SELECT id, original_name, word_count, ats_score, uploaded_at FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT 1').get(req.user.id);
  res.json({ resume: resume || null });
});

module.exports = router;
