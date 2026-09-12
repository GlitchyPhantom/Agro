import os
from dotenv import load_dotenv

load_dotenv()

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Sarvam
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

# Model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "plant_disease_model.keras")
CLASS_NAMES_PATH = os.path.join(os.path.dirname(__file__), "class_names", "class_name.txt")

# Plant classes reference
PLANT_CLASSES = [
    "Corn_(maize)_Common_rust",
    "Corn_(maize)_blight",
    "Corn_(maize)_healthy",
    "Potato_early_blight",
    "Potato_healthy",
    "Potato_late_blight",
    "Tomato_early_blight",
    "Tomato_healthy",
    "Tomato_late_blight",
]
