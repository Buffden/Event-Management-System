"""
Event Seeding Module
"""
import random
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import requests
from faker import Faker
from .utils import (
    EVENT_API_URL, print_success, print_error, print_info, print_step
)

fake = Faker()
Faker.seed(42)  # For reproducible results


def parse_time(time_str: str) -> Tuple[int, int]:
    """Parse HH:mm time string to (hour, minute) tuple"""
    parts = time_str.split(':')
    return int(parts[0]), int(parts[1])


def time_to_minutes(time_str: str) -> int:
    """Convert HH:mm time string to total minutes since midnight"""
    hour, minute = parse_time(time_str)
    return hour * 60 + minute


def validate_event_time_against_venue(event_start: datetime, event_end: datetime,
                                      venue_opening: str, venue_closing: str) -> bool:
    """
    Validate that event times fall within venue operating hours

    Args:
        event_start: Event start datetime
        event_end: Event end datetime
        venue_opening: Venue opening time (HH:mm)
        venue_closing: Venue closing time (HH:mm)

    Returns:
        True if valid, False otherwise
    """
    event_start_minutes = event_start.hour * 60 + event_start.minute
    event_end_minutes = event_end.hour * 60 + event_end.minute

    venue_open_minutes = time_to_minutes(venue_opening)
    venue_close_minutes = time_to_minutes(venue_closing)

    # Handle venues that close at 24:00 (midnight)
    if venue_close_minutes == 24 * 60:
        venue_close_minutes = 23 * 60 + 59

    return (event_start_minutes >= venue_open_minutes and
            event_end_minutes <= venue_close_minutes)


def generate_event_dates(days_ahead: int = None, duration_days: int = None) -> Tuple[datetime, datetime]:
    """
    Generate event start and end dates

    Args:
        days_ahead: Days from now to start event (default: 7-30 days)
        duration_days: Event duration in days (default: 0-3 days)

    Returns:
        Tuple of (start_date, end_date)
    """
    if days_ahead is None:
        days_ahead = random.randint(7, 30)

    if duration_days is None:
        duration_days = random.randint(0, 3)  # 0 = same day, 1-3 = multiple days

    start_date = datetime.now() + timedelta(days=days_ahead)

    # Randomize start time (between 9 AM and 6 PM)
    start_hour = random.randint(9, 18)
    start_minute = random.choice([0, 30])
    start_date = start_date.replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)

    # Calculate end date
    if duration_days == 0:
        # Same day event - duration 2-8 hours
        duration_hours = random.randint(2, 8)
        end_date = start_date + timedelta(hours=duration_hours)
    else:
        # Multi-day event
        end_date = start_date + timedelta(days=duration_days)
        # End time between 5 PM and 10 PM
        end_hour = random.randint(17, 22)
        end_minute = random.choice([0, 30])
        end_date = end_date.replace(hour=end_hour, minute=end_minute, second=0, microsecond=0)

    return start_date, end_date


def adjust_event_times_for_venue(event_start: datetime, event_end: datetime,
                                 venue_opening: str, venue_closing: str) -> Tuple[datetime, datetime]:
    """
    Adjust event times to fit within venue operating hours

    Args:
        event_start: Desired event start datetime
        event_end: Desired event end datetime
        venue_opening: Venue opening time (HH:mm)
        venue_closing: Venue closing time (HH:mm)

    Returns:
        Tuple of (adjusted_start, adjusted_end)
    """
    venue_open_hour, venue_open_minute = parse_time(venue_opening)
    venue_close_hour, venue_close_minute = parse_time(venue_closing)

    # Adjust start time to not be before venue opening
    if event_start.hour < venue_open_hour or (event_start.hour == venue_open_hour and event_start.minute < venue_open_minute):
        event_start = event_start.replace(hour=venue_open_hour, minute=venue_open_minute)

    # Handle closing at 24:00 (midnight)
    if venue_close_hour == 24:
        venue_close_hour = 23
        venue_close_minute = 59

    # Adjust end time to not be after venue closing
    if event_end.hour > venue_close_hour or (event_end.hour == venue_close_hour and event_end.minute > venue_close_minute):
        event_end = event_end.replace(hour=venue_close_hour, minute=venue_close_minute)

    # Ensure end is after start
    if event_end <= event_start:
        event_end = event_start + timedelta(hours=2)  # Minimum 2 hour event

    return event_start, event_end


def get_venues(admin_token: str) -> List[Dict]:
    """
    Fetch all available venues

    Args:
        admin_token: Admin authentication token

    Returns:
        List of venue dictionaries
    """
    url = f"{EVENT_API_URL}/venues/all"
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get('data', [])
        else:
            print_error(f"Failed to fetch venues: HTTP {response.status_code}")
            return []
    except Exception as e:
        print_error(f"Error fetching venues: {str(e)}")
        return []


def create_event(admin_token: str, admin_user_id: str, venue: Dict,
                event_name: str, description: str, category: str) -> Optional[Dict]:
    """
    Create an event as admin (admin is the creator)

    Args:
        admin_token: Admin authentication token
        admin_user_id: User ID of the admin creating the event
        venue: Venue dictionary
        event_name: Event name
        description: Event description
        category: Event category

    Returns:
        Created event dictionary or None if failed
    """
    # Generate event dates
    start_date, end_date = generate_event_dates()

    # Adjust times for venue operating hours
    start_date, end_date = adjust_event_times_for_venue(
        start_date, end_date,
        venue['openingTime'], venue['closingTime']
    )

    # Create event as admin (admin uses their own userId)
    # Admin uses the speaker endpoint but with admin token - this auto-publishes the event
    # Note: Gateway rewrites /api/event/speaker/events to /speaker/events on event-service
    url = f"{EVENT_API_URL}/speaker/events"
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "name": event_name,
        "description": description,
        "category": category,
        "venueId": venue['id'],
        "bookingStartDate": start_date.isoformat(),
        "bookingEndDate": end_date.isoformat(),
        "userId": admin_user_id  # Admin creates event with their own userId
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)

        if response.status_code == 201:
            data = response.json()
            event = data.get('data', {})
            status = event.get('status', 'UNKNOWN')
            print_success(f"Created event: {event_name} (status: {status}, created by admin)")
            return event
        else:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', response.text)
                print_error(f"Failed to create event '{event_name}': HTTP {response.status_code} - {error_msg}")
            except:
                print_error(f"Failed to create event '{event_name}': HTTP {response.status_code}")
            return None

    except Exception as e:
        print_error(f"Error creating event '{event_name}': {str(e)}")
        return None


def seed_events(admin_token: str, admin_user_id: str, num_events: int = 8) -> List[Dict]:
    """
    Seed events by creating them as admin (admin is the creator)

    Args:
        admin_token: Admin authentication token
        admin_user_id: Admin user ID
        num_events: Number of events to create

    Returns:
        List of created event dictionaries
    """
    from .utils import print_header

    print()
    print_header("Step 5: Creating Events")
    print("-" * 50)

    # Fetch available venues
    print_info("Fetching available venues...")
    venues = get_venues(admin_token)

    if not venues:
        print_error("No venues available. Please seed venues first.")
        return []

    print_success(f"Found {len(venues)} venues")
    print_info(f"Creating events as admin (user ID: {admin_user_id[:8]}...)")

    # Event categories
    categories = [
        "Technology", "Business", "Education", "Arts & Culture",
        "Health & Wellness", "Science", "Entertainment", "Networking"
    ]

    # Generate creative event names using Faker
    created_events = []

    for i in range(num_events):
        # Pick random venue
        venue = random.choice(venues)

        # Generate creative event name (2 words only)
        word1 = fake.word().title()
        word2 = fake.word().title()
        event_name = f"{word1} {word2}"

        # Generate description
        description = fake.text(max_nb_chars=200)

        # Pick category
        category = random.choice(categories)

        print_step(f"Creating event {i+1}/{num_events}: {event_name}")
        print_info(f"  Venue: {venue['name']}")
        print_info(f"  Category: {category}")

        event = create_event(
            admin_token=admin_token,
            admin_user_id=admin_user_id,
            venue=venue,
            event_name=event_name,
            description=description,
            category=category
        )

        if event:
            created_events.append(event)

    print()
    print_success(f"Created {len(created_events)} events")
    return created_events

