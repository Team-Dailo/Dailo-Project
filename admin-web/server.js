const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.ADMIN_PORT || 3000;
const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080';

app.use(express.static(path.join(__dirname, 'public')));

// API 프록시
app.use('/proxy', async (req, res) => {
  try {
    const targetUrl = API_BASE + req.url;
    const headers = {};
    if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
    if (req.headers['x-user-id']) headers['X-User-Id'] = req.headers['x-user-id'];

    const fetchOptions = { method: req.method, headers };
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      let body = '';
      await new Promise((resolve) => {
        req.on('data', (chunk) => (body += chunk));
        req.on('end', resolve);
      });
      if (body) fetchOptions.body = body;
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    res.status(response.status);
    if (contentType.includes('application/json')) {
      res.json(await response.json());
    } else {
      res.send(await response.text());
    }
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: 'Backend unreachable' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin dashboard: http://0.0.0.0:${PORT}`);
  console.log(`API proxy target: ${API_BASE}`);
});
