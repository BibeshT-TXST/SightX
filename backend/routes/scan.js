const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const router = express.Router();

// Store file in memory so we can immediately forward it
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    // 1. Create a FormData instance to send to the Python Inference Engine
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // 2. Forward the image to the Python FastAPI engine
    // Make sure the Python engine is running on port 8000!
    const inferenceResponse = await axios.post('http://localhost:8000/predict', formData, {
      headers: { ...formData.getHeaders() }
    });

    // 3. Return the exact JSON dictionary from Python back to the React Frontend
    res.json(inferenceResponse.data);
  } catch (error) {
    console.error('Inference Engine Error:', error.message);
    res.status(500).json({ error: 'Failed to process image through Inference Engine' });
  }
});

module.exports = router;
