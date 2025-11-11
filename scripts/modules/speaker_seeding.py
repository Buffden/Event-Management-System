"""
Speaker Seeding Module
Creates speaker invitations, materials, and messages for speakers
"""
import random
import time
import requests
import io
from typing import List, Dict, Optional, Tuple
from .utils import (
    SPEAKER_API_URL, AUTH_API_URL, ADMIN_EMAIL, print_success, print_error, print_info, print_step
)


def get_speaker_profile_by_user_id(admin_token: str, user_id: str) -> Optional[Dict]:
    """
    Get speaker profile by user ID

    Args:
        admin_token: Admin authentication token
        user_id: User ID to find speaker profile for

    Returns:
        Speaker profile dictionary or None if not found
    """
    # Use /api/speakers/profile/me?userId=... endpoint
    url = f"{SPEAKER_API_URL}/profile/me"
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    params = {"userId": user_id}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get('data')
        return None
    except Exception as e:
        print_error(f"Error fetching speaker profile for user {user_id}: {str(e)}")
        return None


def get_all_speaker_profiles(admin_token: str, speaker_emails: List[str]) -> List[Dict]:
    """
    Get all speaker profiles by logging in as each speaker and fetching their profile

    Args:
        admin_token: Admin authentication token (for API access)
        speaker_emails: List of speaker email addresses

    Returns:
        List of speaker profile dictionaries
    """
    profiles = []

    for email in speaker_emails:
        # Extract speaker number from email
        speaker_num = email.split('@')[0].replace('speaker', '')
        password = f"Speaker{speaker_num}123!"

        # Login as speaker to get token
        login_url = f"{AUTH_API_URL}/login"
        try:
            login_response = requests.post(
                login_url,
                json={"email": email, "password": password},
                timeout=10
            )

            if login_response.status_code == 200:
                login_data = login_response.json()
                speaker_token = login_data.get('token', '')
                user_id = login_data.get('user', {}).get('id', '')

                if speaker_token and user_id:
                    # Get speaker profile using speaker's own token
                    profile_url = f"{SPEAKER_API_URL}/profile/me"
                    profile_headers = {
                        "Authorization": f"Bearer {speaker_token}",
                        "Content-Type": "application/json"
                    }
                    profile_params = {"userId": user_id}

                    profile_response = requests.get(
                        profile_url,
                        headers=profile_headers,
                        params=profile_params,
                        timeout=10
                    )

                    if profile_response.status_code == 200:
                        profile_data = profile_response.json()
                        profile = profile_data.get('data')
                        if profile:
                            profiles.append({
                                'id': profile.get('id'),
                                'userId': user_id,
                                'email': email,
                                'token': speaker_token
                            })
                            print_step(f"Found speaker profile: {email}")
                    elif profile_response.status_code == 404:
                        print_info(f"Speaker profile not yet created for {email} (may need to wait for RabbitMQ)")
                    else:
                        print_info(f"Could not fetch speaker profile for {email} (HTTP {profile_response.status_code})")
                time.sleep(0.2)
        except Exception as e:
            print_error(f"Error getting speaker profile for {email}: {str(e)}")
            continue

    return profiles


def create_invitation(admin_token: str, admin_user_id: str, speaker_id: str, speaker_user_id: str, event_id: str, event_name: str = None, message: str = None) -> Optional[Dict]:
    """
    Create a speaker invitation and send a message to the speaker

    Args:
        admin_token: Admin authentication token
        admin_user_id: Admin user ID
        speaker_id: Speaker profile ID
        speaker_user_id: Speaker user ID
        event_id: Event ID
        event_name: Event name (for message)
        message: Optional invitation message

    Returns:
        Dictionary with invitation_id and message_id if successful, None otherwise
    """
    # Invitations API is at /api/invitations (via gateway)
    base_url = SPEAKER_API_URL.replace('/api/speakers', '')
    url = f"{base_url}/api/invitations"
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    invitation_message = message or f"You have been invited to speak at this event."
    payload = {
        "speakerId": speaker_id,
        "eventId": event_id,
        "message": invitation_message
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code == 201:
            response_data = response.json()
            invitation_id = response_data.get('data', {}).get('id', 'unknown')
            print_step(f"  Created invitation {invitation_id[:8]}...")

            # Now create a message from admin to speaker about the invitation
            event_name_str = event_name or "an event"
            message_subject = f"Speaking Invitation: {event_name_str}"
            message_content = f"You have been invited to speak at {event_name_str}.\n\n{invitation_message}\n\nPlease respond to this invitation."

            message_id = send_message(admin_token, admin_user_id, speaker_user_id, message_subject, message_content, event_id)

            if message_id:
                print_step(f"  Sent invitation message to speaker")
                return {'invitation_id': invitation_id, 'message_id': message_id}
            else:
                print_info(f"  Invitation created but message failed to send")
                return {'invitation_id': invitation_id, 'message_id': None}
        elif response.status_code == 400:
            # Might be duplicate invitation
            try:
                error_data = response.json()
                error_msg = str(error_data.get('error', ''))
                if 'already exists' in error_msg.lower():
                    print_info(f"  Invitation already exists (duplicate)")
                    return None  # Duplicate, not an error
                else:
                    print_error(f"  Bad request: {error_msg}")
                    return None
            except:
                print_error(f"  Bad request: {response.text}")
                return None
        elif response.status_code == 500:
            try:
                error_data = response.json()
                error_msg = str(error_data.get('error', ''))
                print_error(f"  Server error: {error_msg}")
            except:
                print_error(f"  Server error: {response.text}")
            return None
        else:
            print_error(f"  Unexpected status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print_error(f"  Exception creating invitation: {str(e)}")
        return None


def respond_to_invitation(speaker_token: str, invitation_id: str, status: str = 'ACCEPTED') -> bool:
    """
    Respond to an invitation as a speaker

    Args:
        speaker_token: Speaker authentication token
        invitation_id: Invitation ID
        status: Response status ('ACCEPTED' or 'DECLINED')

    Returns:
        True if successful, False otherwise
    """
    # Invitations API is at /api/invitations (via gateway)
    # Gateway rewrites /api/invitations/:id/respond to /api/invitations/:id/respond on speaker-service
    base_url = SPEAKER_API_URL.replace('/api/speakers', '')
    url = f"{base_url}/api/invitations/{invitation_id}/respond"
    headers = {
        "Authorization": f"Bearer {speaker_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "status": status
    }

    try:
        response = requests.put(url, json=payload, headers=headers, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print_error(f"Error responding to invitation: {str(e)}")
        return False


def upload_material(speaker_token: str, speaker_id: str, event_id: str = None) -> Tuple[bool, Optional[str]]:
    """
    Upload a fake presentation material for a speaker

    Args:
        speaker_token: Speaker authentication token
        speaker_id: Speaker profile ID
        event_id: Optional event ID to associate material with

    Returns:
        Tuple of (success: bool, material_id: Optional[str])
    """
    # Materials API is at /api/materials (via gateway)
    # Gateway rewrites /api/materials/upload to /api/materials/upload on speaker-service
    base_url = SPEAKER_API_URL.replace('/api/speakers', '')
    url = f"{base_url}/api/materials/upload"
    headers = {
        "Authorization": f"Bearer {speaker_token}"
    }

    # Create a fake PDF file (minimal valid PDF)
    fake_pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<< /Size 4 /Root 1 0 R >>
startxref
174
%%EOF"""

    # Create form data
    files = {
        'file': ('presentation.pdf', fake_pdf_content, 'application/pdf')
    }
    data = {
        'speakerId': speaker_id
    }
    if event_id:
        data['eventId'] = event_id

    try:
        response = requests.post(url, files=files, data=data, headers=headers, timeout=10)
        if response.status_code == 201:
            response_data = response.json()
            material_id = response_data.get('data', {}).get('id')
            return True, material_id
        return False, None
    except Exception as e:
        print_error(f"Error uploading material: {str(e)}")
        return False, None


def send_message(admin_token: str, from_user_id: str, to_user_id: str, subject: str, content: str, event_id: str = None) -> Optional[str]:
    """
    Send a message to a user

    Args:
        admin_token: Admin authentication token
        from_user_id: Sender user ID
        to_user_id: Recipient user ID
        subject: Message subject
        content: Message content
        event_id: Optional event ID to associate with message

    Returns:
        Message ID if successful, None otherwise
    """
    # Messages API is at /api/messages (via gateway)
    # Gateway rewrites /api/messages to /api/messages on speaker-service
    base_url = SPEAKER_API_URL.replace('/api/speakers', '')
    url = f"{base_url}/api/messages"
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "fromUserId": from_user_id,
        "toUserId": to_user_id,
        "subject": subject,
        "content": content
    }
    if event_id:
        payload["eventId"] = event_id

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code == 201:
            response_data = response.json()
            message_id = response_data.get('data', {}).get('id')
            return message_id
        return None
    except Exception as e:
        print_error(f"Error sending message: {str(e)}")
        return None


def mark_message_as_read(speaker_token: str, message_id: str) -> bool:
    """
    Mark a message as read

    Args:
        speaker_token: Speaker authentication token
        message_id: Message ID to mark as read

    Returns:
        True if successful, False otherwise
    """
    base_url = SPEAKER_API_URL.replace('/api/speakers', '')
    url = f"{base_url}/api/messages/{message_id}/read"
    headers = {
        "Authorization": f"Bearer {speaker_token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.put(url, headers=headers, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print_error(f"Error marking message as read: {str(e)}")
        return False


def get_user_inbox_messages(speaker_token: str, user_id: str) -> List[Dict]:
    """
    Get all inbox messages for a user

    Args:
        speaker_token: Speaker authentication token
        user_id: User ID

    Returns:
        List of message dictionaries
    """
    base_url = SPEAKER_API_URL.replace('/api/speakers', '')
    url = f"{base_url}/api/messages/inbox/{user_id}"
    headers = {
        "Authorization": f"Bearer {speaker_token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            response_data = response.json()
            # Response format: {"success": true, "data": [messages...]}
            return response_data.get('data', [])
        return []
    except Exception as e:
        print_error(f"Error getting inbox messages: {str(e)}")
        return []


def invite_speakers_to_events(
    admin_token: str,
    admin_user_id: str,
    speaker_emails: List[str],
    events: List[Dict]
) -> Dict:
    """
    Login as admin and invite speakers to events

    Args:
        admin_token: Admin authentication token
        speaker_emails: List of speaker email addresses
        events: List of event dictionaries

    Returns:
        Dictionary with invitation statistics
    """
    from .utils import print_header

    print()
    print_header("Step 7a: Admin Inviting Speakers to Events")
    print("-" * 50)

    if not speaker_emails:
        print_info("No speakers to invite")
        return {'invitations_created': 0}

    if not events:
        print_info("No events available for invitations")
        return {'invitations_created': 0}

    # Wait for speaker profiles to be created
    print_info("Waiting 3 seconds for speaker profiles to be fully created...")
    time.sleep(3)

    # Get all speaker profiles
    print_info("Fetching speaker profiles...")
    speaker_profiles = get_all_speaker_profiles(admin_token, speaker_emails)

    if not speaker_profiles:
        print_error("No speaker profiles found. They may still be processing via RabbitMQ.")
        print_info("You may need to wait a few more seconds and re-run this step.")
        return {'invitations_created': 0}

    print_success(f"Found {len(speaker_profiles)} speaker profiles")

    # Filter to published events only
    published_events = [e for e in events if e.get('status') == 'PUBLISHED']

    if not published_events:
        print_info("No published events available for invitations")
        return {'invitations_created': 0}

    print()
    print_info(f"Admin ({ADMIN_EMAIL}) is inviting speakers to events...")

    stats = {'invitations_created': 0, 'messages_sent': 0}
    invitation_data = []  # Store invitation and message info for later use

    for speaker in speaker_profiles:
        # Assign each speaker to 2-4 random events
        num_events = random.randint(2, min(4, len(published_events)))
        assigned_events = random.sample(published_events, num_events)

        for event in assigned_events:
            event_id = event.get('id')
            event_name = event.get('name', 'Unknown Event')

            print_info(f"  Inviting {speaker['email']} (speaker ID: {speaker['id'][:8]}...) to event {event_name[:40]} (event ID: {event_id[:8]}...)")

            result = create_invitation(
                admin_token=admin_token,
                admin_user_id=admin_user_id,
                speaker_id=speaker['id'],
                speaker_user_id=speaker['userId'],
                event_id=event_id,
                event_name=event_name
            )

            if result and result.get('invitation_id'):
                stats['invitations_created'] += 1
                if result.get('message_id'):
                    stats['messages_sent'] += 1
                invitation_data.append({
                    'invitation_id': result['invitation_id'],
                    'message_id': result.get('message_id'),
                    'event_id': event_id,
                    'speaker_user_id': speaker['userId'],
                    'speaker_email': speaker['email']
                })
                print_success(f"  ✓ Successfully invited {speaker['email']} to {event_name[:40]} and sent message")
            else:
                print_error(f"  ✗ Failed to invite {speaker['email']} to {event_name[:40]}")
            time.sleep(0.1)

    print_success(f"Admin created {stats['invitations_created']} invitations and sent {stats['messages_sent']} messages")

    # Store invitation data globally for use in acceptance step
    invite_speakers_to_events.invitation_data = invitation_data

    return stats


def invite_speakers_to_events_staggered(
    admin_token: str,
    admin_user_id: str,
    speaker_emails: List[str],
    events: List[Dict]
) -> Dict:
    """
    Login as admin and invite speakers to events at different times (staggered timeline)
    This simulates invitations being sent over time rather than all at once

    Args:
        admin_token: Admin authentication token
        admin_user_id: Admin user ID
        speaker_emails: List of speaker email addresses
        events: List of event dictionaries

    Returns:
        Dictionary with invitation statistics
    """
    from .utils import print_header
    import random

    if not speaker_emails:
        print_info("No speakers to invite")
        return {'invitations_created': 0}

    if not events:
        print_info("No events available for invitations")
        return {'invitations_created': 0}

    # Wait for speaker profiles to be created
    print_info("Waiting 3 seconds for speaker profiles to be fully created...")
    time.sleep(3)

    # Get all speaker profiles
    print_info("Fetching speaker profiles...")
    speaker_profiles = get_all_speaker_profiles(admin_token, speaker_emails)

    if not speaker_profiles:
        print_error("No speaker profiles found. They may still be processing via RabbitMQ.")
        print_info("You may need to wait a few more seconds and re-run this step.")
        return {'invitations_created': 0}

    print_success(f"Found {len(speaker_profiles)} speaker profiles")

    # Filter to published events only
    published_events = [e for e in events if e.get('status') == 'PUBLISHED']

    if not published_events:
        print_info("No published events available for invitations")
        return {'invitations_created': 0}

    print()
    print_info(f"Admin ({ADMIN_EMAIL}) is inviting speakers to events...")
    print_info("Invitations will be sent at different times to simulate realistic timeline...")

    stats = {'invitations_created': 0, 'messages_sent': 0}
    invitation_data = []  # Store invitation and message info for later use

    for speaker_idx, speaker in enumerate(speaker_profiles):
        # Add delay between speakers (1-3 seconds)
        if speaker_idx > 0:
            delay = random.uniform(1.0, 3.0)
            time.sleep(delay)

        # Assign each speaker to 2-4 random events
        num_events = random.randint(2, min(4, len(published_events)))
        assigned_events = random.sample(published_events, num_events)

        for event_idx, event in enumerate(assigned_events):
            # Add delay between invitations (0.5-2 seconds)
            if event_idx > 0:
                delay = random.uniform(0.5, 2.0)
                time.sleep(delay)

            event_id = event.get('id')
            event_name = event.get('name', 'Unknown Event')

            print_info(f"  Inviting {speaker['email']} (speaker ID: {speaker['id'][:8]}...) to event {event_name[:40]} (event ID: {event_id[:8]}...)")

            result = create_invitation(
                admin_token=admin_token,
                admin_user_id=admin_user_id,
                speaker_id=speaker['id'],
                speaker_user_id=speaker['userId'],
                event_id=event_id,
                event_name=event_name
            )

            if result and result.get('invitation_id'):
                stats['invitations_created'] += 1
                if result.get('message_id'):
                    stats['messages_sent'] += 1
                invitation_data.append({
                    'invitation_id': result['invitation_id'],
                    'message_id': result.get('message_id'),
                    'event_id': event_id,
                    'speaker_user_id': speaker['userId'],
                    'speaker_email': speaker['email']
                })
                print_success(f"  ✓ Successfully invited {speaker['email']} to {event_name[:40]} and sent message")
            else:
                print_error(f"  ✗ Failed to invite {speaker['email']} to {event_name[:40]}")

    print_success(f"Admin created {stats['invitations_created']} invitations and sent {stats['messages_sent']} messages over time")

    # Store invitation data globally for use in acceptance step
    invite_speakers_to_events_staggered.invitation_data = invitation_data

    return stats


def speakers_accept_invitations(
    speaker_emails: List[str]
) -> Dict:
    """
    Login as each speaker and accept their pending invitations

    Args:
        speaker_emails: List of speaker email addresses

    Returns:
        Dictionary with acceptance statistics
    """
    from .utils import print_header

    print()
    print_header("Step 7b: Speakers Accepting Invitations")
    print("-" * 50)

    if not speaker_emails:
        print_info("No speakers to process")
        return {'invitations_accepted': 0}

    # Wait a moment for invitations to be processed
    print_info("Waiting 1 second for invitations to be fully processed...")
    time.sleep(1)

    stats = {'invitations_accepted': 0}

    for email in speaker_emails:
        # Extract speaker number from email
        speaker_num = email.split('@')[0].replace('speaker', '')
        password = f"Speaker{speaker_num}123!"

        print_info(f"Logging in as {email}...")

        # Login as speaker to get token
        login_url = f"{AUTH_API_URL}/login"
        try:
            login_response = requests.post(
                login_url,
                json={"email": email, "password": password},
                timeout=10
            )

            if login_response.status_code == 200:
                login_data = login_response.json()
                speaker_token = login_data.get('token', '')
                user_id = login_data.get('user', {}).get('id', '')

                if speaker_token and user_id:
                    # Get speaker profile
                    profile_url = f"{SPEAKER_API_URL}/profile/me"
                    profile_headers = {
                        "Authorization": f"Bearer {speaker_token}",
                        "Content-Type": "application/json"
                    }
                    profile_params = {"userId": user_id}

                    profile_response = requests.get(
                        profile_url,
                        headers=profile_headers,
                        params=profile_params,
                        timeout=10
                    )

                    if profile_response.status_code == 200:
                        profile_data = profile_response.json()
                        profile = profile_data.get('data')

                        if profile:
                            speaker_id = profile.get('id')

                            # Get pending invitations for this speaker
                            base_url = SPEAKER_API_URL.replace('/api/speakers', '')
                            invites_url = f"{base_url}/api/invitations/speaker/{speaker_id}?status=PENDING"
                            invites_headers = {
                                "Authorization": f"Bearer {speaker_token}",
                                "Content-Type": "application/json"
                            }

                            invites_response = requests.get(invites_url, headers=invites_headers, timeout=10)

                            if invites_response.status_code == 200:
                                invites_data = invites_response.json()
                                invitations = invites_data.get('data', [])

                                print_info(f"  Found {len(invitations)} pending invitation(s) for {email}")

                                # Accept ~70% of invitations
                                for invitation in invitations:
                                    invitation_id = invitation.get('id')
                                    event_id = invitation.get('eventId')

                                    if random.random() < 0.7:
                                        # First, get all inbox messages and find the invitation message
                                        inbox_messages = get_user_inbox_messages(speaker_token, user_id)
                                        invitation_message = None

                                        # Find the message related to this invitation (from admin about this event)
                                        for msg in inbox_messages:
                                            if msg.get('eventId') == event_id and msg.get('status') != 'READ':
                                                # Check if it's an invitation message (subject contains "Invitation" or "Speaking")
                                                subject = msg.get('subject', '').lower()
                                                if 'invitation' in subject or 'speaking' in subject:
                                                    invitation_message = msg
                                                    break

                                        if invitation_message:
                                            message_id = invitation_message.get('id')
                                            if mark_message_as_read(speaker_token, message_id):
                                                print_step(f"  {email} read invitation message for event {event_id[:8]}...")
                                            time.sleep(0.1)

                                        # Now respond to the invitation
                                        if respond_to_invitation(speaker_token, invitation_id, 'ACCEPTED'):
                                            stats['invitations_accepted'] += 1
                                            print_step(f"  {email} accepted invitation for event {event_id[:8]}...")
                                        time.sleep(0.1)
                                    else:
                                        # Even if declining, mark message as read
                                        inbox_messages = get_user_inbox_messages(speaker_token, user_id)
                                        for msg in inbox_messages:
                                            if msg.get('eventId') == event_id and msg.get('status') != 'READ':
                                                subject = msg.get('subject', '').lower()
                                                if 'invitation' in subject or 'speaking' in subject:
                                                    mark_message_as_read(speaker_token, msg.get('id'))
                                                    break

                                        print_info(f"  {email} declined invitation for event {event_id[:8]}...")
                            else:
                                print_info(f"  Could not fetch invitations for {email} (HTTP {invites_response.status_code})")
                    else:
                        print_info(f"  Could not fetch speaker profile for {email} (HTTP {profile_response.status_code})")
                else:
                    print_error(f"  Could not get token or user ID for {email}")
            else:
                print_error(f"  Login failed for {email} (HTTP {login_response.status_code})")
        except Exception as e:
            print_error(f"  Error processing {email}: {str(e)}")
            continue

        time.sleep(0.2)

    print_success(f"Speakers accepted {stats['invitations_accepted']} invitations")

    return stats


def speakers_accept_invitations_staggered(
    speaker_emails: List[str]
) -> Dict:
    """
    Login as each speaker and accept their pending invitations at different times (staggered timeline)
    This simulates speakers responding over time rather than all at once

    Args:
        speaker_emails: List of speaker email addresses

    Returns:
        Dictionary with acceptance statistics
    """
    from .utils import print_header
    import random

    if not speaker_emails:
        print_info("No speakers to process")
        return {'invitations_accepted': 0}

    # Wait a moment for invitations to be processed
    print_info("Waiting 1 second for invitations to be fully processed...")
    time.sleep(1)

    stats = {'invitations_accepted': 0}

    for speaker_idx, email in enumerate(speaker_emails):
        # Add delay between speakers (2-5 seconds)
        if speaker_idx > 0:
            delay = random.uniform(2.0, 5.0)
            print_info(f"Waiting {delay:.1f} seconds before next speaker responds...")
            time.sleep(delay)

        # Extract speaker number from email
        speaker_num = email.split('@')[0].replace('speaker', '')
        password = f"Speaker{speaker_num}123!"

        print_info(f"Logging in as {email}...")

        # Login as speaker to get token
        login_url = f"{AUTH_API_URL}/login"
        try:
            login_response = requests.post(
                login_url,
                json={"email": email, "password": password},
                timeout=10
            )

            if login_response.status_code == 200:
                login_data = login_response.json()
                speaker_token = login_data.get('token', '')
                user_id = login_data.get('user', {}).get('id', '')

                if speaker_token and user_id:
                    # Get speaker profile
                    profile_url = f"{SPEAKER_API_URL}/profile/me"
                    profile_headers = {
                        "Authorization": f"Bearer {speaker_token}",
                        "Content-Type": "application/json"
                    }
                    profile_params = {"userId": user_id}

                    profile_response = requests.get(
                        profile_url,
                        headers=profile_headers,
                        params=profile_params,
                        timeout=10
                    )

                    if profile_response.status_code == 200:
                        profile_data = profile_response.json()
                        profile = profile_data.get('data')

                        if profile:
                            speaker_id = profile.get('id')

                            # Get pending invitations for this speaker
                            base_url = SPEAKER_API_URL.replace('/api/speakers', '')
                            invites_url = f"{base_url}/api/invitations/speaker/{speaker_id}?status=PENDING"
                            invites_headers = {
                                "Authorization": f"Bearer {speaker_token}",
                                "Content-Type": "application/json"
                            }

                            invites_response = requests.get(invites_url, headers=invites_headers, timeout=10)

                            if invites_response.status_code == 200:
                                invites_data = invites_response.json()
                                invitations = invites_data.get('data', [])

                                print_info(f"  Found {len(invitations)} pending invitation(s) for {email}")

                                # Accept ~70% of invitations with delays
                                for inv_idx, invitation in enumerate(invitations):
                                    # Add delay between responses (1-3 seconds)
                                    if inv_idx > 0:
                                        delay = random.uniform(1.0, 3.0)
                                        time.sleep(delay)

                                    invitation_id = invitation.get('id')
                                    event_id = invitation.get('eventId')

                                    if random.random() < 0.7:
                                        # First, get all inbox messages and find the invitation message
                                        inbox_messages = get_user_inbox_messages(speaker_token, user_id)
                                        invitation_message = None

                                        # Find the message related to this invitation (from admin about this event)
                                        for msg in inbox_messages:
                                            if msg.get('eventId') == event_id and msg.get('status') != 'READ':
                                                # Check if it's an invitation message (subject contains "Invitation" or "Speaking")
                                                subject = msg.get('subject', '').lower()
                                                if 'invitation' in subject or 'speaking' in subject:
                                                    invitation_message = msg
                                                    break

                                        if invitation_message:
                                            message_id = invitation_message.get('id')
                                            if mark_message_as_read(speaker_token, message_id):
                                                print_step(f"  {email} read invitation message for event {event_id[:8]}...")
                                            time.sleep(0.1)

                                        # Now respond to the invitation
                                        if respond_to_invitation(speaker_token, invitation_id, 'ACCEPTED'):
                                            stats['invitations_accepted'] += 1
                                            print_step(f"  {email} accepted invitation for event {event_id[:8]}...")
                                        time.sleep(0.1)
                                    else:
                                        # Even if declining, mark message as read
                                        inbox_messages = get_user_inbox_messages(speaker_token, user_id)
                                        for msg in inbox_messages:
                                            if msg.get('eventId') == event_id and msg.get('status') != 'READ':
                                                subject = msg.get('subject', '').lower()
                                                if 'invitation' in subject or 'speaking' in subject:
                                                    mark_message_as_read(speaker_token, msg.get('id'))
                                                    break

                                        print_info(f"  {email} declined invitation for event {event_id[:8]}...")
                            else:
                                print_info(f"  Could not fetch invitations for {email} (HTTP {invites_response.status_code})")
                    else:
                        print_info(f"  Could not fetch speaker profile for {email} (HTTP {profile_response.status_code})")
                else:
                    print_error(f"  Could not get token or user ID for {email}")
            else:
                print_error(f"  Login failed for {email} (HTTP {login_response.status_code})")
        except Exception as e:
            print_error(f"  Error processing {email}: {str(e)}")
            continue

    print_success(f"Speakers accepted {stats['invitations_accepted']} invitations over time")

    return stats


def seed_speaker_data(
    admin_token: str,
    admin_user_id: str,
    speaker_emails: List[str],
    events: List[Dict]
) -> Dict:
    """
    Seed speaker data: invitations, materials, and messages

    Args:
        admin_token: Admin authentication token
        admin_user_id: Admin user ID (for sending messages)
        speaker_emails: List of speaker email addresses
        events: List of event dictionaries

    Returns:
        Dictionary with seeding statistics
    """
    from .utils import print_header

    print()
    print_header("Step 7c: Seeding Additional Speaker Data (Materials, Messages)")
    print("-" * 50)

    if not speaker_emails:
        print_info("No speakers to seed data for")
        return {'materials': 0, 'messages': 0}

    if not events:
        print_info("No events available")
        return {'materials': 0, 'messages': 0}

    # Note: We already waited 5 seconds in main seed.py after user registration
    # Additional wait here ensures speaker profiles are fully processed
    print_info("Waiting 3 seconds for speaker profiles to be fully created...")
    time.sleep(3)

    # Get all speaker profiles
    print_info("Fetching speaker profiles...")
    speaker_profiles = get_all_speaker_profiles(admin_token, speaker_emails)

    if not speaker_profiles:
        print_error("No speaker profiles found. They may still be processing via RabbitMQ.")
        print_info("You may need to wait a few more seconds and re-run this step.")
        return {'materials': 0, 'messages': 0}

    print_success(f"Found {len(speaker_profiles)} speaker profiles")

    stats = {
        'materials': 0,
        'messages': 0
    }

    # Note: Invitations are now created in invite_speakers_to_events()
    # and accepted in speakers_accept_invitations()
    # This function now only handles materials and messages

    # Step 1: Upload materials for speakers (especially for accepted events)
    print()
    print_info("Uploading presentation materials...")

    for speaker in speaker_profiles:
        # Upload 1-3 materials per speaker
        num_materials = random.randint(1, 3)

        # Get accepted events for this speaker to associate materials
        try:
            base_url = SPEAKER_API_URL.replace('/api/speakers', '')
            invites_url = f"{base_url}/api/invitations/speaker/{speaker['id']}"
            invites_headers = {
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            }
            invites_response = requests.get(invites_url, headers=invites_headers, timeout=10)

            accepted_event_ids = []
            if invites_response.status_code == 200:
                invites_data = invites_response.json()
                invitations = invites_data.get('data', [])
                accepted_event_ids = [
                    inv.get('eventId') for inv in invitations
                    if inv.get('status') == 'ACCEPTED'
                ]
        except:
            accepted_event_ids = []

        for i in range(num_materials):
            # Sometimes associate with an accepted event, sometimes general
            event_id = random.choice(accepted_event_ids) if accepted_event_ids and random.random() < 0.6 else None

            success, material_id = upload_material(speaker['token'], speaker['id'], event_id)
            if success and material_id:
                stats['materials'] += 1
                # Store material info for date updates
                if 'materials_list' not in stats:
                    stats['materials_list'] = []
                stats['materials_list'].append({
                    'id': material_id,
                    'speakerId': speaker['id'],
                    'eventId': event_id
                })
                print_step(f"Uploaded material {i+1} for {speaker['email']}")
            time.sleep(0.2)

    print_success(f"Uploaded {stats['materials']} materials")

    # Step 2: Send messages to speakers
    print()
    print_info("Sending messages to speakers...")

    message_subjects = [
        "Welcome to EventManager!",
        "Important Event Information",
        "Reminder: Upcoming Speaking Engagement",
        "Event Schedule Update",
        "Thank you for your participation"
    ]

    message_contents = [
        "We're excited to have you on board as a speaker!",
        "Please review the event details and prepare your materials.",
        "This is a reminder about your upcoming event.",
        "There has been a schedule update for your event.",
        "Thank you for your contribution to our events!"
    ]

    for speaker in speaker_profiles:
        # Send 0-2 messages per speaker
        num_messages = random.randint(0, 2)

        for i in range(num_messages):
            subject = random.choice(message_subjects)
            content = random.choice(message_contents)

            message_id = send_message(admin_token, admin_user_id, speaker['userId'], subject, content)
            if message_id:
                stats['messages'] += 1
                print_step(f"Sent message to {speaker['email']}: {subject}")
            time.sleep(0.1)

    print_success(f"Sent {stats['messages']} messages")

    print()
    print_success("Speaker data seeding complete!")

    return stats

