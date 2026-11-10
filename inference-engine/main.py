"""
SightX Inference Engine — FastAPI Server

This module exposes a REST API for real-time Diabetic Retinopathy (DR)
grading. The model and grading logic live in predictor.py; this file only
handles HTTP.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

# Local project modules
from predictor import predict as predict_image, InvalidImageError


# ── FastAPI Application Instance ─────────────────────────────────────────────
app = FastAPI(title='SightX Inference Engine', version='1.0')


# ── Prediction Endpoint ─────────────────────────────────────────────────────
@app.post('/predict')
async def predict(file: UploadFile = File(...)):
    """
    Receive a retinal fundus image and return the predicted clinical tier,
    averaged probabilities and ensemble grade.

    **Request**
    - Method : POST
    - Content-Type : multipart/form-data
    - Body : a single image file (JPEG or PNG)

    **Response** (JSON)
    ```json
    {
        "tier": "Doctor Visit Required",
        "confidence": 0.87,
        "raw_model_grade_label": "Grade 2: Moderate",
        "inference_time_ms": 4210.5
    }
    ```
    (abridged; see predictor.predict for every field)

    **Errors**
    - 400 : Unsupported file type (only JPEG/PNG accepted) or unreadable image
    - 500 : Internal processing error
    """

    # ── 1. Validate the uploaded file type ───────────────────────────────
    # Only JPEG and PNG are accepted because they are the standard formats
    # for fundus cameras.  Rejecting other types early avoids wasting
    # compute on files that would fail downstream.
    if file.content_type not in ['image/jpeg', 'image/png']:
        raise HTTPException(400, 'Only JPEG/PNG images are accepted')

    # ── 2. Read the upload and grade it ──────────────────────────────────
    # Inference is CPU-bound, so it runs in a worker thread to keep the
    # event loop free for other requests.
    contents = await file.read()
    try:
        result = await run_in_threadpool(predict_image, contents)
    except InvalidImageError:
        raise HTTPException(400, 'Uploaded file is not a readable image')

    return JSONResponse(result)
