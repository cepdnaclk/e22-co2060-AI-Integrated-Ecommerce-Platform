import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:3000")
YOUTUBE_TRENDING_URL = os.getenv("YOUTUBE_TRENDING_URL", "http://youtube-trending:8003")
RESTOCK_ML_URL = os.getenv("RESTOCK_ML_URL", "http://restock-ml:8001")
PORT = int(os.getenv("PORT", "8004"))
MODEL_NAME = os.getenv("LANGCHAIN_MODEL", "gemini-1.5-flash")
