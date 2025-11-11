"""
Date Management Module for Seeding
Handles generation and updating of creation/activation dates
"""
import random
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
from .utils import (
    update_user_creation_date,
    update_booking_creation_date,
    update_session_speaker_date,
    update_material_upload_date,
    print_info, print_success, print_error
)


def generate_user_creation_dates(num_users: int, days_back: int = 60) -> List[datetime]:
    """
    Generate creation dates for users spread over time

    Args:
        num_users: Number of users
        days_back: How many days back to start from

    Returns:
        List of creation datetime objects
    """
    dates = []
    base_date = datetime.now() - timedelta(days=days_back)

    for i in range(num_users):
        # Spread users over the time period
        days_offset = random.uniform(0, days_back)
        hours_offset = random.uniform(0, 23)
        minutes_offset = random.choice([0, 15, 30, 45])

        creation_date = base_date + timedelta(days=days_offset, hours=hours_offset, minutes=minutes_offset)
        dates.append(creation_date)

    # Sort by date
    dates.sort()
    return dates


def generate_activation_dates(num_users: int, creation_dates: List[datetime]) -> List[datetime]:
    """
    Generate activation dates for users (same day as creation, but later in the day)

    Args:
        num_users: Number of users
        creation_dates: List of creation dates

    Returns:
        List of activation datetime objects (same day as creation, but later)
    """
    activation_dates = []

    for creation_date in creation_dates:
        # Activation happens on the same day, but 1-6 hours after creation
        hours_later = random.uniform(1, 6)
        activation_date = creation_date + timedelta(hours=hours_later)
        activation_dates.append(activation_date)

    return activation_dates


def generate_event_creation_dates(num_events: int, days_back: int = 30) -> List[datetime]:
    """
    Generate creation dates for events spread over time

    Args:
        num_events: Number of events
        days_back: How many days back to start from

    Returns:
        List of creation datetime objects
    """
    dates = []
    base_date = datetime.now() - timedelta(days=days_back)

    for i in range(num_events):
        # Spread events over the time period
        days_offset = random.uniform(0, days_back)
        hours_offset = random.uniform(9, 17)  # Business hours
        minutes_offset = random.choice([0, 30])

        creation_date = base_date + timedelta(days=days_offset, hours=hours_offset, minutes=minutes_offset)
        dates.append(creation_date)

    # Sort by date
    dates.sort()
    return dates


def generate_booking_dates(num_bookings: int, event_start_date: datetime) -> List[datetime]:
    """
    Generate booking dates that are before the event start date

    Args:
        num_bookings: Number of bookings
        event_start_date: Event start date

    Returns:
        List of booking datetime objects (all before event start)
    """
    dates = []
    # Bookings happen 1-30 days before event
    days_before = random.randint(1, 30)
    base_date = event_start_date - timedelta(days=days_before)

    for i in range(num_bookings):
        # Spread bookings over the period before event
        days_offset = random.uniform(0, days_before - 1)
        hours_offset = random.uniform(8, 20)
        minutes_offset = random.choice([0, 15, 30, 45])

        booking_date = base_date + timedelta(days=days_offset, hours=hours_offset, minutes=minutes_offset)
        # Ensure it's before event start
        if booking_date >= event_start_date:
            booking_date = event_start_date - timedelta(hours=1)
        dates.append(booking_date)

    # Sort by date
    dates.sort()
    return dates


def generate_invitation_dates(num_invitations: int, event_start_date: datetime) -> List[datetime]:
    """
    Generate invitation dates that are before the event start date

    Args:
        num_invitations: Number of invitations
        event_start_date: Event start date

    Returns:
        List of invitation datetime objects (all before event start)
    """
    dates = []
    # Invitations happen 5-45 days before event
    days_before = random.randint(5, 45)
    base_date = event_start_date - timedelta(days=days_before)

    for i in range(num_invitations):
        # Spread invitations over the period before event
        days_offset = random.uniform(0, days_before - 5)
        hours_offset = random.uniform(9, 17)  # Business hours
        minutes_offset = random.choice([0, 30])

        invitation_date = base_date + timedelta(days=days_offset, hours=hours_offset, minutes=minutes_offset)
        # Ensure it's before event start
        if invitation_date >= event_start_date:
            invitation_date = event_start_date - timedelta(days=1)
        dates.append(invitation_date)

    # Sort by date
    dates.sort()
    return dates


def generate_material_upload_dates(num_materials: int, event_start_date: datetime) -> List[datetime]:
    """
    Generate material upload dates (typically after invitation acceptance, before event)

    Args:
        num_materials: Number of materials
        event_start_date: Event start date

    Returns:
        List of upload datetime objects
    """
    dates = []
    # Materials uploaded 1-20 days before event
    days_before = random.randint(1, 20)
    base_date = event_start_date - timedelta(days=days_before)

    for i in range(num_materials):
        # Spread uploads over the period before event
        days_offset = random.uniform(0, days_before - 1)
        hours_offset = random.uniform(9, 18)
        minutes_offset = random.choice([0, 15, 30, 45])

        upload_date = base_date + timedelta(days=days_offset, hours=hours_offset, minutes=minutes_offset)
        # Ensure it's before event start
        if upload_date >= event_start_date:
            upload_date = event_start_date - timedelta(hours=2)
        dates.append(upload_date)

    # Sort by date
    dates.sort()
    return dates


def update_user_dates(admin_token: str, user_emails: List[str], creation_dates: List[datetime]) -> int:
    """
    Update user creation dates via API

    Args:
        admin_token: Admin authentication token
        user_emails: List of user emails
        creation_dates: List of creation dates

    Returns:
        Number of successful updates
    """
    updated = 0
    for email, creation_date in zip(user_emails, creation_dates):
        if update_user_creation_date(admin_token, email, creation_date.isoformat()):
            updated += 1
        else:
            print_error(f"Failed to update creation date for {email}")
    return updated


def update_booking_dates(admin_token: str, bookings: List[Dict], booking_dates: List[datetime]) -> int:
    """
    Update booking creation dates via API

    Args:
        admin_token: Admin authentication token
        bookings: List of booking dictionaries with 'id' field
        booking_dates: List of booking dates

    Returns:
        Number of successful updates
    """
    updated = 0
    # Ensure we have enough dates
    if len(booking_dates) < len(bookings):
        # Generate more dates if needed
        from datetime import datetime, timedelta
        base_date = booking_dates[-1] if booking_dates else datetime.now()
        for i in range(len(bookings) - len(booking_dates)):
            booking_dates.append(base_date + timedelta(days=i+1))

    for booking, booking_date in zip(bookings, booking_dates):
        booking_id = booking.get('id')
        if booking_id and update_booking_creation_date(admin_token, booking_id, booking_date.isoformat()):
            updated += 1
        else:
            print_error(f"Failed to update creation date for booking {booking_id}")
    return updated


def update_session_speaker_dates(admin_token: str, assignments: List[Dict], invitation_dates: List[datetime]) -> int:
    """
    Update session speaker assignment creation dates via API

    Args:
        admin_token: Admin authentication token
        assignments: List of assignment dictionaries with 'sessionId' and 'speakerId'
        invitation_dates: List of invitation dates

    Returns:
        Number of successful updates
    """
    updated = 0
    # Ensure we have enough dates
    if len(invitation_dates) < len(assignments):
        # Generate more dates if needed
        from datetime import datetime, timedelta
        base_date = invitation_dates[-1] if invitation_dates else datetime.now()
        for i in range(len(assignments) - len(invitation_dates)):
            invitation_dates.append(base_date + timedelta(days=i+1))

    for assignment, invitation_date in zip(assignments, invitation_dates):
        session_id = assignment.get('sessionId')
        speaker_id = assignment.get('speakerId')
        if session_id and speaker_id and update_session_speaker_date(admin_token, session_id, speaker_id, invitation_date.isoformat()):
            updated += 1
        else:
            print_error(f"Failed to update date for session speaker assignment")
    return updated


def update_material_dates(admin_token: str, materials: List[Dict], upload_dates: List[datetime]) -> int:
    """
    Update material upload dates via API

    Args:
        admin_token: Admin authentication token
        materials: List of material dictionaries with 'id' field
        upload_dates: List of upload dates

    Returns:
        Number of successful updates
    """
    updated = 0
    # Ensure we have enough dates
    if len(upload_dates) < len(materials):
        # Generate more dates if needed
        from datetime import datetime, timedelta
        base_date = upload_dates[-1] if upload_dates else datetime.now()
        for i in range(len(materials) - len(upload_dates)):
            upload_dates.append(base_date + timedelta(days=i+1))

    for material, upload_date in zip(materials, upload_dates):
        material_id = material.get('id')
        if material_id and update_material_upload_date(admin_token, material_id, upload_date.isoformat()):
            updated += 1
        else:
            print_error(f"Failed to update upload date for material {material_id}")
    return updated

