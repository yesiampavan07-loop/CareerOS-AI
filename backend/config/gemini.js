// Uses Groq API — 100% FREE, no credit card, no expiry
// Get key: https://console.groq.com (sign up with Google/GitHub)

const fetch = require('node-fetch');

async function callGemini(prompt, maxTokens = 1800) {
  const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No API key set in .env');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No response from Groq');
  return text;
}

function parseJSON(raw) {
  let clean = raw.replace(/```json|```/g, '').trim();
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('No JSON found');
  try {
    return JSON.parse(clean.substring(s, e + 1));
  } catch(e1) {
    const fixed = clean.substring(s, e + 1)
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
      .replace(/\t/g, ' ');
    return JSON.parse(fixed);
  }
}

module.exports = { callGemini, parseJSON };
