/**
 * SightX Backend API
 * 
 * Provides a Node.js Express server to handle retinal scan uploads 
 * and coordinate with the Python AI Inference Engine.
 */
const express = require('express');
const cors = require('cors');
const scanRoutes = require('./routes/scan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware Configuration ──
app.use(cors());
app.use(express.json());

// ── Route Definitions ──
app.use('/api/scan', scanRoutes);

// ── Health Check ──
app.get('/', (req, res) => {
  res.send('SightX Backend API is running...');
});

// ── Server Start ──
app.listen(PORT, () => {
  console.log(`[SightX] Server is sprinting on port ${PORT}`);
});