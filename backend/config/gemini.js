const fetch = require('node-fetch');
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callGemini(prompt, maxTokens = 1800) {
  const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No API key set in .env');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant. Always respond with valid JSON only. No markdown, no extra text, just pure JSON.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.3
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
  const s = clean.indexOf('{');
  const e = clean.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('No JSON found');
  let jsonStr = clean.substring(s, e + 1);
  try {
    return JSON.parse(jsonStr);
  } catch(e1) {
    // Fix common issues
    jsonStr = jsonStr
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    try {
      return JSON.parse(jsonStr);
    } catch(e2) {
      jsonStr = jsonStr.replace(/[^\x20-\x7E]/g, '');
      return JSON.parse(jsonStr);
    }
  }
}

module.exports = { callGemini, parseJSON };