import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/shomadhan")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # API Keys
    RADAR_SECRET_KEY = os.getenv("RADAR_SECRET_KEY")
    FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH")
    RESEND_API_KEY = os.getenv("RESEND_API_KEY")
    
    # Settings
    EMERGENCY_RADIUS_METERS = 2000
    DEDUPLICATION_WINDOW_HOURS = 1
