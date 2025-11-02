"""
Booking/Registration Seeding Module
"""
import random
import time
import requests
from typing import List, Dict, Optional
from .utils import (
    BOOKING_API_URL, print_success, print_error, print_info, print_step
)


def login_user(email: str, password: str) -> Optional[str]:
    """
    Login as a user to get authentication token

    Args:
        email: User email
        password: User password

    Returns:
        JWT token or None if failed
    """
    from .utils import AUTH_API_URL

    url = f"{AUTH_API_URL}/login"
    payload = {
        "email": email,
        "password": password
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get('token', '')
        else:
            return None
    except:
        return None


def create_booking(user_token: str, event_id: str) -> bool:
    """
    Create a booking for an event

    Args:
        user_token: User authentication token
        event_id: Event ID to register for

    Returns:
        True if successful, False otherwise
    """
    url = f"{BOOKING_API_URL}/bookings"
    headers = {
        "Authorization": f"Bearer {user_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "eventId": event_id
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)

        if response.status_code == 201:
            return True
        elif response.status_code == 409:
            # Already registered or fully booked
            return False
        else:
            return False
    except:
        return False


def seed_bookings(events: List[Dict], users: List[Dict]) -> int:
    """
    Seed bookings by having users register for events

    Args:
        events: List of event dictionaries (should be PUBLISHED)
        users: List of user dictionaries with email

    Returns:
        Number of successful bookings created
    """
    from .utils import print_header

    print()
    print_header("Step 5: Creating User Registrations")
    print("-" * 50)

    if not events:
        print_error("No events available to register for")
        return 0

    if not users:
        print_error("No users available to register")
        return 0

    # Filter to only published events
    published_events = [e for e in events if e.get('status') == 'PUBLISHED']

    if not published_events:
        print_error("No published events available to register for")
        return 0

    print_info(f"Registering users for {len(published_events)} published events...")

    successful_bookings = 0
    failed_bookings = 0

    # For each user, randomly register for 1-4 events
    for user in users:
        email = user['email']
        password = f"User{email.split('@')[0].replace('user', '')}123!"  # Extract number from email

        # Login as user
        user_token = login_user(email, password)
        if not user_token:
            print_error(f"Failed to login as {email}, skipping bookings")
            continue

        # Randomly select 1-4 events to register for
        num_registrations = random.randint(1, min(4, len(published_events)))
        events_to_register = random.sample(published_events, num_registrations)

        for event in events_to_register:
            event_id = event.get('id')
            event_name = event.get('name', 'Unknown Event')

            if create_booking(user_token, event_id):
                successful_bookings += 1
                print_step(f"User {email} registered for: {event_name[:50]}")
                time.sleep(0.1)  # Small delay between requests
            else:
                failed_bookings += 1
                # Don't print failed bookings to reduce noise (might be duplicates or full capacity)

        time.sleep(0.2)  # Delay between users

    print()
    print_success(f"Created {successful_bookings} bookings")
    if failed_bookings > 0:
        print_info(f"{failed_bookings} bookings failed (may be duplicates or capacity issues)")

    return successful_bookings

