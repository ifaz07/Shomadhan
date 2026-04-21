from tasks.notification_tasks import send_standard_notification, broadcast_emergency_alert

class NotificationService:
    @staticmethod
    def dispatch(ticket_id, event_type, payload):
        """
        Main entry point for dispatching notifications based on event type.
        """
        # Standard routing
        standard_events = ["TICKET_CREATED", "TICKET_UPDATED", "TICKET_ESCALATED", "TICKET_RESOLVED"]
        
        if event_type in standard_events:
            send_standard_notification.delay(ticket_id, event_type, payload)
            
        # Emergency geofenced broadcast
        if payload.get("is_emergency") or event_type == "TICKET_ESCALATED":
            lat = payload.get("lat")
            lng = payload.get("lng")
            if lat and lng:
                broadcast_emergency_alert.delay(ticket_id, lat, lng, payload)
