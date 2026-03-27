const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const router = express.Router();

// Configuration: Store file in memory for immediate forwarding to inference engine
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/scan/upload
 * Handles retinal image upload, forwards to the AI Inference Engine, 
 * and returns the diagnostic result.
 */
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No clinical image provided' });
    }

    // 1. Prepare Multipart Form Data for internal engine communication
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // 2. Forward payload to Python FastAPI service using Docker internal networking
    const inferenceUrl = process.env.INFERENCE_ENGINE_URL || 'http://inference-engine:8000';
    
    const inferenceResponse = await axios.post(`${inferenceUrl}/predict`, formData, {
      headers: { ...formData.getHeaders() }
    });

    // 3. Relay the clinical diagnosis back to the frontend
    res.json(inferenceResponse.data);

  } catch (error) {
    // Log detailed error for system maintenance
    console.error('[Inference Error]:', error.message);
    res.status(500).json({ error: 'Failed to process image through AI Inference Engine' });
  }
});

module.exports = router;
