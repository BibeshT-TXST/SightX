const express = require('express');
const cors = require('cors');
const scanRoutes = require('./routes/scan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/scan', scanRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.send('SightX Backend API is running...');
});

app.listen(PORT, () => {
  console.log(`Server is sprinting on port ${PORT}`);
});