const express = require('express');
const { callGemini, parseJSON } = require('../config/gemini');
const { db }  = require('../database/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.post('/start', auth, async (req, res) => {
  const { role, interview_type } = req.body;
  if (!role || !interview_type) return res.status(400).json({ error: 'role and interview_type required.' });
  const resume = db.prepare('SELECT file_text FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT 1').get(req.user.id);
  const resumeCtx = resume ? resume.file_text.substring(0,800) : '';

  const prompt = `You are a senior ${role} interviewer conducting a ${interview_type} interview.
${resumeCtx ? 'Candidate resume:\n' + resumeCtx : ''}
Generate interview question 1 of 5. Make it specific and relevant.
Return ONLY the question itself, no numbering or preamble.`;

  try {
    const question = await callGemini(prompt, 250);
    const session = db.prepare('INSERT INTO interview_sessions (user_id, role, interview_type) VALUES (?, ?, ?)').run(req.user.id, role, interview_type);
    const sessionId = session.lastInsertRowid;
    db.prepare('INSERT INTO interview_qa (session_id, question_num, question) VALUES (?, 1, ?)').run(sessionId, question);
    res.json({ session_id: sessionId, question_num: 1, question, role, interview_type });
  } catch(err) { res.status(500).json({ error: 'Failed to start interview: ' + err.message }); }
});

router.post('/answer', auth, async (req, res) => {
  const { session_id, question_num, answer } = req.body;
  if (!session_id || !answer) return res.status(400).json({ error: 'session_id and answer required.' });
  const session = db.prepare('SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?').get(session_id, req.user.id);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const isLast = question_num >= 5;
  const prompt = `You are a senior ${session.role} interviewer evaluating an answer.
Respond in EXACT JSON only (no markdown):
{"score":<55-100>,"verdict":"<Excellent|Strong|Good|Average|Needs Work>","strengths":"<1-2 strengths>","improvements":"<1-2 improvements>","idealAnswer":"<2-3 key points>","nextQuestion":"${isLast ? '' : '<question ' + (question_num+1) + ' of 5>'}"}
Interview type: ${session.interview_type}. Answer: "${answer.substring(0,800)}"`;

  try {
    const data = parseJSON(await callGemini(prompt, 700));
    db.prepare('UPDATE interview_qa SET answer=?, score=?, verdict=?, feedback=? WHERE session_id=? AND question_num=?')
      .run(answer.substring(0,2000), data.score, data.verdict, JSON.stringify({strengths:data.strengths, improvements:data.improvements, idealAnswer:data.idealAnswer}), session_id, question_num);

    let responseData = { score: data.score, verdict: data.verdict, strengths: data.strengths, improvements: data.improvements, ideal_answer: data.idealAnswer, is_complete: isLast };

    if (!isLast && data.nextQuestion) {
      db.prepare('INSERT INTO interview_qa (session_id, question_num, question) VALUES (?,?,?)').run(session_id, question_num+1, data.nextQuestion);
      responseData.next_question = data.nextQuestion;
      responseData.next_question_num = question_num + 1;
    }
    if (isLast) {
      const allQA = db.prepare('SELECT score FROM interview_qa WHERE session_id=? AND score IS NOT NULL').all(session_id);
      const finalScore = Math.round(allQA.reduce((s,q) => s + (q.score||0), 0) / allQA.length);
      db.prepare('UPDATE interview_sessions SET completed=1, final_score=?, completed_at=CURRENT_TIMESTAMP WHERE id=?').run(finalScore, session_id);
      responseData.final_score = finalScore;
    }
    res.json(responseData);
  } catch(err) { res.status(500).json({ error: 'Failed to evaluate: ' + err.message }); }
});

router.get('/history', auth, (req, res) => {
  const sessions = db.prepare('SELECT id, role, interview_type, final_score, completed, started_at FROM interview_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 10').all(req.user.id);
  res.json({ sessions });
});

module.exports = router;
