from celery import Celery
from pymongo import MongoClient
from datetime import datetime, timedelta
from config import Config
import requests
import firebase_admin
from firebase_admin import messaging, credentials
import resend

# Initialize Celery
celery = Celery("notifications", broker=Config.REDIS_URL)

# Initialize DB & APIs
db = MongoClient(Config.MONGO_URI).get_database()
resend.api_key = Config.RESEND_API_KEY

if not firebase_admin._apps:
    cred = credentials.Certificate(Config.FIREBASE_CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred)

@celery.task
def send_standard_notification(ticket_id, event_type, payload):
    """
    Handles standard life-cycle alerts (Created, Updated, Resolved).
    """
    user_email = payload.get("email")
    user_fcm_token = payload.get("fcm_token")
    
    # 1. Send Email via Resend
    if user_email:
        resend.Emails.send({
            "from": "alerts@shomadhan.civic.gov",
            "to": user_email,
            "subject": f"Update on Ticket #{ticket_id}",
            "html": f"<p>Event: {event_type}</p><p>Status: {payload.get('status')}</p>"
        })

    # 2. Send Push via FCM
    if user_fcm_token:
        message = messaging.Message(
            notification=messaging.Notification(
                title=f"Ticket Update: {event_type}",
                body=f"Your ticket #{ticket_id} has a new status."
            ),
            token=user_fcm_token,
        )
        messaging.send(message)

@celery.task
def broadcast_emergency_alert(ticket_id, lat, lng, payload):
    """
    Radar.com Geofencing + FCM Multicast logic.
    """
    # 1. Find nearby users using Radar.com API
    radar_url = "https://api.radar.io/v1/search/users"
    headers = {"Authorization": Config.RADAR_SECRET_KEY}
    params = {
        "near": f"{lat},{lng}",
        "radius": Config.EMERGENCY_RADIUS_METERS,
        "limit": 1000
    }
    
    try:
        response = requests.get(radar_url, headers=headers, params=params)
        response.raise_for_status()
        nearby_users = response.json().get("users", [])
        user_ids = [u.get("externalId") for u in nearby_users if u.get("externalId")]
    except Exception as e:
        print(f"Radar API Error: {e}")
        return

    if not user_ids:
        return

    # 2. Deduplication check (1-hour window)
    one_hour_ago = datetime.utcnow() - timedelta(hours=Config.DEDUPLICATION_WINDOW_HOURS)
    
    # Query for tokens of these users in MongoDB
    users_cursor = db.users.find({
        "_id": {"$in": user_ids},
        "fcm_token": {"$exists": True}
    })
    
    tokens_to_notify = []
    for user in users_cursor:
        # Check if already notified about THIS ticket recently
        already_sent = db.notification_logs.find_one({
            "user_id": user["_id"],
            "ticket_id": ticket_id,
            "timestamp": {"$gt": one_hour_ago}
        })
        
        if not already_sent:
            tokens_to_notify.append(user["fcm_token"])
            # Log the send
            db.notification_logs.insert_one({
                "user_id": user["_id"],
                "ticket_id": ticket_id,
                "timestamp": datetime.utcnow()
            })

    # 3. FCM Multicast Broadcast
    if tokens_to_notify:
        alert_message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title="⚠️ Emergency Safety Alert",
                body=f"Danger reported near your location: {payload.get('title')}. Please avoid the area."
            ),
            data={"ticket_id": str(ticket_id), "type": "EMERGENCY"},
            tokens=tokens_to_notify,
        )
        response = messaging.send_multicast(alert_message)
        print(f"Multicast result: {response.success_count} sent, {response.failure_count} failed")
