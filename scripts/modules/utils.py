"""
Utility functions for seeding script
"""
import os
from typing import Optional

# Configuration
AUTH_API_URL = os.getenv('AUTH_API_URL', 'http://localhost/api/auth')
SPEAKER_API_URL = os.getenv('SPEAKER_API_URL', 'http://localhost/api/speakers')
EVENT_API_URL = os.getenv('EVENT_API_URL', 'http://localhost/api/event')
BOOKING_API_URL = os.getenv('BOOKING_API_URL', 'http://localhost/api/booking')

# Admin credentials
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@ems.com')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'Admin123!')

# Colors for terminal output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    MAGENTA = '\033[0;35m'
    CYAN = '\033[0;36m'
    RESET = '\033[0m'

def print_success(message: str):
    print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")

def print_error(message: str):
    print(f"{Colors.RED}❌ {message}{Colors.RESET}")

def print_info(message: str):
    print(f"{Colors.YELLOW}ℹ️  {message}{Colors.RESET}")

def print_header(message: str):
    print(f"{Colors.BLUE}{message}{Colors.RESET}")

def print_step(message: str):
    print(f"{Colors.CYAN}→ {message}{Colors.RESET}")

def update_user_creation_date(admin_token: str, email: str, created_at: str) -> bool:
    """
    Update user creation date via API

    Args:
        admin_token: Admin authentication token
        email: User email
        created_at: ISO date string

    Returns:
        True if successful, False otherwise
    """
    import requests
    url = f"{AUTH_API_URL}/admin/seed/update-user-date"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    }
    payload = {
        "email": email,
        "createdAt": created_at
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        return response.status_code == 200
    except:
        return False


def update_booking_creation_date(admin_token: str, booking_id: str, created_at: str) -> bool:
    """
    Update booking creation date via API

    Args:
        admin_token: Admin authentication token
        booking_id: Booking ID
        created_at: ISO date string

    Returns:
        True if successful, False otherwise
    """
    import requests
    url = f"{BOOKING_API_URL}/admin/seed/update-booking-date"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    }
    payload = {
        "bookingId": booking_id,
        "createdAt": created_at
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        return response.status_code == 200
    except:
        return False

def update_session_speaker_date(admin_token: str, session_id: str, speaker_id: str, created_at: str) -> bool:
    """
    Update session speaker assignment creation date via API

    Args:
        admin_token: Admin authentication token
        session_id: Session ID
        speaker_id: Speaker ID
        created_at: ISO date string

    Returns:
        True if successful, False otherwise
    """
    import requests
    url = f"{EVENT_API_URL}/admin/seed/update-session-speaker-date"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    }
    payload = {
        "sessionId": session_id,
        "speakerId": speaker_id,
        "createdAt": created_at
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        return response.status_code == 200
    except:
        return False

def update_material_upload_date(admin_token: str, material_id: str, upload_date: str) -> bool:
    """
    Update material upload date via API

    Args:
        admin_token: Admin authentication token
        material_id: Material ID
        upload_date: ISO date string

    Returns:
        True if successful, False otherwise
    """
    import requests
    base_url = SPEAKER_API_URL.replace('/api/speakers', '')
    url = f"{base_url}/api/materials/seed/update-material-date"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    }
    payload = {
        "materialId": material_id,
        "uploadDate": upload_date
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        return response.status_code == 200
    except:
        return False

