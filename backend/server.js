require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:3000','http://127.0.0.1:3000','http://localhost:5500','http://127.0.0.1:5500','http://localhost:5000','http://127.0.0.1:5000',process.env.FRONTEND_URL].filter(Boolean),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CareerOS AI running 🚀',
    groqKey: process.env.GROQ_API_KEY ? '✅ Set' : '❌ MISSING' });
});

async function startServer() {
  try {
    const { initDB } = require('./database/db');
    await initDB();
    console.log('✅ Database ready');

    app.use('/api/auth',      require('./routes/auth'));
    app.use('/api/resume',    require('./routes/resume'));
    app.use('/api/jd',        require('./routes/jd'));
    app.use('/api/interview', require('./routes/interview'));
    app.use('/api/career',    require('./routes/career'));

    app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
    app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

    app.listen(PORT, () => {
      console.log('\n══════════════════════════════════════');
      console.log(`🚀  CareerOS AI running on port ${PORT}`);
      console.log(`🌐  Open: http://localhost:${PORT}`);
      console.log(`🔑  : ${process.env.GROQ_API_KEY ? '✅ Set' : '❌ MISSING — add GROQ_API_KEY to .env'}`);
      console.log('══════════════════════════════════════\n');
    });
  } catch(err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
}
startServer();
