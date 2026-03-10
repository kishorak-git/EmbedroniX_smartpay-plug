const express = require('express');
const next = require('next');
const cors = require('cors');
require('dotenv').config();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Import backend application routes
const apiRoutes = require('./backend_api/routes/api');

app.prepare().then(() => {
  const server = express();

  // Middleware that backend originally had
  server.use(cors());
  server.use(express.json());

  // Mount backend API routes onto /api
  server.use('/api', apiRoutes);

  // Default Next.js handler
  server.all(/.*/, (req, res) => {
    return handle(req, res);
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log('> Custom Next.js + Express API server running smoothly!');
  });
}).catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});
