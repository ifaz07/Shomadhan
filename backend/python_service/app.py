from flask import Flask, request, jsonify
from services.notification_service import NotificationService
from bson import ObjectId

app = Flask(__name__)

@app.route("/api/tickets", methods=["POST"])
def create_ticket():
    data = request.json
    
    # ... logic to save ticket to MongoDB ...
    ticket_id = "1042" # Sample generated ID
    
    # Prepare payload for notification service
    is_emergency = data.get("category") == "EMERGENCY" or data.get("priority") == "CRITICAL"
    
    payload = {
        "title": data.get("title"),
        "status": "OPEN",
        "email": data.get("reporter_email"),
        "fcm_token": data.get("reporter_fcm_token"),
        "is_emergency": is_emergency,
        "lat": data.get("lat"),
        "lng": data.get("lng")
    }
    
    # 1. Dispatch standard TICKET_CREATED alert
    NotificationService.dispatch(ticket_id, "TICKET_CREATED", payload)
    
    # 2. If it's a high-risk scenario (like a sinkhole), 
    # the dispatch method above will automatically trigger 
    # the 'broadcast_emergency_alert' task because is_emergency=True.
    
    return jsonify({
        "success": True, 
        "ticket_id": ticket_id, 
        "message": "Ticket created and notifications queued."
    }), 201

if __name__ == "__main__":
    app.run(debug=True, port=5002)
