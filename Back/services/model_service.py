"""
Model Service - CNN model loading and inference for plant disease detection.
Loads the Keras model once at startup and provides prediction functionality.
"""

import ast
import numpy as np
import tensorflow as tf
from PIL import Image
import io

from config import MODEL_PATH, CLASS_NAMES_PATH


# ── Load model once at module level ──────────────────────────────────────────
_model = None
_class_names = None


def _get_model():
    global _model
    if _model is None:
        _model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    return _model


def _get_class_names():
    global _class_names
    if _class_names is None:
        with open(CLASS_NAMES_PATH, "r") as f:
            content = f.read()
            try:
                _class_names = ast.literal_eval(content)
            except Exception:
                _class_names = [
                    line.strip().strip("[]',\"")
                    for line in content.splitlines()
                    if line.strip()
                ]
    return _class_names


def predict_disease(image_bytes: bytes) -> dict:
    """
    Predict plant disease from image bytes.
    Returns top-3 predictions with confidence scores.
    """
    model = _get_model()
    class_names = _get_class_names()

    # Load and preprocess image
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224))
    img_array = np.array(img, dtype=np.float32)
    img_array = np.expand_dims(img_array, axis=0)

    # Run inference
    prediction = model.predict(img_array, verbose=0)
    probs = prediction[0]

    # Get top-3 predictions
    top3_indices = np.argsort(probs)[::-1][:3]
    top3 = []
    for idx in top3_indices:
        label = class_names[idx].strip()
        confidence = float(probs[idx] * 100)
        top3.append({
            "label": label,
            "confidence": round(confidence, 2),
            "crop": label.split("_")[0],
            "is_healthy": "healthy" in label.lower(),
        })

    # Determine severity based on confidence
    primary = top3[0]
    if primary["is_healthy"]:
        severity = "none"
    elif primary["confidence"] > 85:
        severity = "severe"
    elif primary["confidence"] > 60:
        severity = "moderate"
    else:
        severity = "mild"

    return {
        "predictions": top3,
        "primary_disease": primary["label"],
        "primary_confidence": primary["confidence"],
        "severity": severity,
        "is_healthy": primary["is_healthy"],
    }
