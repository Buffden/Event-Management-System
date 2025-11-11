#!/usr/bin/env python3
"""
Complete Seeding Script for Event Management System

This script seeds:
1. Users and Speakers (via auth-service)
2. Activates users (via admin API)
3. Creates events (via event-service, assigned to speakers)
4. Creates bookings/registrations (via booking-service)
5. Seeds speaker data: invitations, materials, and messages

Usage:
    python3 scripts/seed.py

    # With custom API URLs
    AUTH_API_URL=http://localhost:3000/api/auth python3 scripts/seed.py
"""
import os
import sys
import time
import random

try:
    import requests
except ImportError:
    print("Error: 'requests' library is required but not installed.")
    print("Please install it using: pip install requests")
    sys.exit(1)

try:
    from faker import Faker
except ImportError:
    print("Error: 'faker' library is required but not installed.")
    print("Please install it using: pip install faker")
    sys.exit(1)

# Import modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from modules import utils
from modules.user_seeding import (
    login_admin, activate_users_via_api, activate_user_via_api, seed_users_and_speakers
)
from modules.event_seeding import seed_events, seed_events_staggered
from modules.booking_seeding import seed_bookings, seed_bookings_staggered
from modules.speaker_seeding import (
    seed_speaker_data,
    invite_speakers_to_events,
    invite_speakers_to_events_staggered,
    speakers_accept_invitations,
    speakers_accept_invitations_staggered
)


def test_api_connectivity() -> bool:
    """Test if the API is reachable before starting"""
    utils.print_info(f"Testing API connectivity to {utils.AUTH_API_URL}...")

    # Try health endpoint first
    try:
        health_url = f"{utils.AUTH_API_URL}/health"
        response = requests.get(health_url, timeout=5)
        if response.status_code in [200, 404]:
            utils.print_success("API is reachable (health check)")
            return True
    except:
        pass

    # Fallback: try register endpoint
    try:
        test_url = f"{utils.AUTH_API_URL}/register"
        response = requests.post(
            test_url,
            json={"email": "test@test.com", "password": "test123!", "name": "Test", "role": "USER"},
            timeout=5
        )
        if response.status_code in [201, 400, 500]:
            utils.print_success("API is reachable (register endpoint accessible)")
            return True
        elif response.status_code == 502:
            utils.print_error("Cannot connect to auth-service (502 Bad Gateway)")
            return False
    except requests.exceptions.ConnectionError:
        utils.print_error(f"Cannot connect to {utils.AUTH_API_URL}")
        return False
    except:
        pass

    utils.print_info("Could not verify API connectivity, but will attempt to proceed...")
    return True


def main():
    """Main execution function"""
    utils.print_header("=" * 60)
    utils.print_header("  Event Management System - Complete Seeding Script")
    utils.print_header("=" * 60)
    print()

    # Test connectivity
    if not test_api_connectivity():
        print()
        utils.print_error("API connectivity test failed")
        print()
        utils.print_info("Troubleshooting steps:")
        utils.print_info("  1. Ensure the API server is running")
        utils.print_info("  2. Check the API URLs are correct")
        utils.print_info("  3. If using Docker: docker ps | grep -E 'auth-service|event-service|booking-service'")
        print()
        response = input("Continue anyway? (y/N): ")
        if response.lower() != 'y':
            sys.exit(1)
        print()

    # Step 0: Verify Admin Login
    utils.print_header("Step 0: Verifying Admin Credentials")
    print("-" * 60)
    utils.print_info("Checking admin credentials before starting...")

    login_success, admin_token, admin_user_id = login_admin()
    if not login_success or not admin_token or not admin_user_id:
        utils.print_error("Admin login failed - cannot proceed")
        print()
        utils.print_error("Please ensure:")
        utils.print_error("  1. An admin user exists (seed via: cd ems-services/auth-service && npx prisma db seed)")
        utils.print_error("  2. ADMIN_EMAIL and ADMIN_PASSWORD are set correctly")
        print()
        utils.print_info("Default admin credentials from seed file:")
        utils.print_info("  Email: admin@eventmanagement.com")
        utils.print_info("  Password: Admin123!")
        print()
        sys.exit(1)

    utils.print_success("Admin credentials verified")
    print()

    # Step 1-2: Seed Users and Speakers (with staggered creation)
    utils.print_header("Step 1-2: Registering Users and Speakers (Staggered)")
    print("-" * 60)
    utils.print_info("Creating users and speakers at different times to simulate realistic timeline...")
    speakers, users, all_user_emails, got_502_errors, user_creation_dates, user_activation_dates = seed_users_and_speakers(admin_token)

    # Update user creation dates
    if admin_token and all_user_emails and user_creation_dates:
        utils.print_info("Updating user creation dates to reflect realistic timeline...")
        from modules.date_management import update_user_dates
        updated = update_user_dates(admin_token, all_user_emails, user_creation_dates)
        utils.print_success(f"Updated creation dates for {updated} users")

    if got_502_errors:
        print()
        utils.print_error("⚠️  502 Bad Gateway Errors Detected")
        utils.print_error("The nginx gateway is reachable, but it cannot connect to auth-service.")
        utils.print_info("Please ensure auth-service is running: docker ps | grep auth-service")
        print()

    # Step 3: Wait for RabbitMQ Processing
    utils.print_header("Step 3: Waiting for RabbitMQ Processing")
    print("-" * 60)
    utils.print_info("Waiting 5 seconds for RabbitMQ to process speaker profile creation messages...")
    time.sleep(5)

    # Step 4: Activate Users (on same dates as creation, but later in day)
    utils.print_header("Step 4: Activating Users (Same Day as Creation)")
    print("-" * 60)
    utils.print_info("Activating users on the same day as creation (but later in the day)...")

    if all_user_emails and admin_token and user_activation_dates:
        # Activate users according to their activation dates
        activated_count = 0
        for i, (email, activation_date) in enumerate(zip(all_user_emails, user_activation_dates)):
            # Calculate delay to match activation date (simulate waiting)
            if i > 0:
                prev_activation = user_activation_dates[i-1]
                delay_seconds = (activation_date - prev_activation).total_seconds()
                if delay_seconds > 0 and delay_seconds < 3600:  # Only wait if less than 1 hour
                    time.sleep(min(delay_seconds, 2.0))  # Cap at 2 seconds for practical purposes

            if activate_user_via_api(email, admin_token):
                activated_count += 1

        utils.print_success(f"Activated {activated_count} user(s) according to timeline")
    else:
        if not all_user_emails:
            utils.print_info("No users created, skipping activation")
        elif not admin_token:
            utils.print_error("Cannot activate users - admin token not available")

    # Step 5: Create Events (Staggered - create at different times)
    utils.print_header("Step 5: Creating Events (Staggered Timeline)")
    print("-" * 60)
    utils.print_info("Creating events at different times to simulate realistic event creation timeline...")

    if admin_token and admin_user_id:
        events = seed_events_staggered(admin_token, admin_user_id, num_events=8)
    else:
        utils.print_error("Cannot create events - admin token or user ID not available")
        events = []

    # Step 6: Create Bookings (Staggered - register at different times, before event start)
    utils.print_header("Step 6: Creating User Registrations (Before Event Start)")
    print("-" * 60)
    utils.print_info("Users registering for events at different times (all before event start)...")

    if events and users:
        bookings_count, created_bookings = seed_bookings_staggered(events, users)

        # Update booking dates to be before event start
        if admin_token and created_bookings:
            utils.print_info("Updating booking creation dates to be before event start dates...")
            from modules.date_management import generate_booking_dates, update_booking_dates
            from datetime import datetime

            booking_dates_list = []
            for booking in created_bookings:
                event_start_str = booking.get('eventStartDate')
                if event_start_str:
                    if isinstance(event_start_str, str):
                        event_start = datetime.fromisoformat(event_start_str.replace('Z', '+00:00').replace('+00:00', ''))
                    else:
                        event_start = event_start_str
                    # Generate booking date before event start
                    dates = generate_booking_dates(1, event_start)
                    booking_dates_list.extend(dates)

            if booking_dates_list:
                updated = update_booking_dates(admin_token, created_bookings, booking_dates_list)
                utils.print_success(f"Updated creation dates for {updated} bookings")
    else:
        if not events:
            utils.print_info("Skipping bookings - no events created")
        if not users:
            utils.print_info("Skipping bookings - no users available")

    # Step 7a: Admin Invites Speakers to Events (Staggered)
    utils.print_header("Step 7a: Admin Inviting Speakers (Staggered Timeline)")
    print("-" * 60)
    utils.print_info("Admin sending invitations at different times to simulate realistic invitation timeline...")

    if admin_token and admin_user_id and speakers and events:
        speaker_emails = [s['email'] for s in speakers if s.get('email')]
        if speaker_emails:
            invite_stats = invite_speakers_to_events_staggered(
                admin_token=admin_token,
                admin_user_id=admin_user_id,
                speaker_emails=speaker_emails,
                events=events
            )
        else:
            utils.print_info("Skipping speaker invitations - no speaker emails available")
            invite_stats = {'invitations_created': 0}
    else:
        if not admin_token:
            utils.print_info("Skipping speaker invitations - admin token not available")
        elif not speakers:
            utils.print_info("Skipping speaker invitations - no speakers created")
        elif not events:
            utils.print_info("Skipping speaker invitations - no events created")
        invite_stats = {'invitations_created': 0}

    # Step 7b: Speakers Accept Invitations (Staggered)
    utils.print_header("Step 7b: Speakers Accepting Invitations (Staggered Timeline)")
    print("-" * 60)
    utils.print_info("Speakers responding to invitations at different times...")

    if speakers:
        speaker_emails = [s['email'] for s in speakers if s.get('email')]
        if speaker_emails:
            accept_stats = speakers_accept_invitations_staggered(
                speaker_emails=speaker_emails
            )
        else:
            utils.print_info("Skipping invitation acceptance - no speaker emails available")
            accept_stats = {'invitations_accepted': 0}
    else:
        utils.print_info("Skipping invitation acceptance - no speakers created")
        accept_stats = {'invitations_accepted': 0}

    # Step 8: Seed Additional Speaker Data (Materials, Messages) with different upload dates
    utils.print_header("Step 8: Uploading Materials (Staggered Timeline)")
    print("-" * 60)
    utils.print_info("Speakers uploading materials at different times...")

    if admin_token and admin_user_id and speakers and events:
        speaker_emails = [s['email'] for s in speakers if s.get('email')]
        if speaker_emails:
            speaker_stats = seed_speaker_data(
                admin_token=admin_token,
                admin_user_id=admin_user_id,
                speaker_emails=speaker_emails,
                events=events
            )

            # Update material upload dates
            if admin_token and speaker_stats.get('materials_list'):
                utils.print_info("Updating material upload dates to reflect realistic timeline...")
                from modules.date_management import generate_material_upload_dates, update_material_dates
                from datetime import datetime

                upload_dates_list = []
                materials_list = speaker_stats.get('materials_list', [])

                for material in materials_list:
                    event_id = material.get('eventId')
                    if event_id:
                        # Find event start date
                        event = next((e for e in events if e.get('id') == event_id), None)
                        if event:
                            event_start_str = event.get('bookingStartDate')
                            if isinstance(event_start_str, str):
                                event_start = datetime.fromisoformat(event_start_str.replace('Z', '+00:00').replace('+00:00', ''))
                            else:
                                event_start = event_start_str
                            # Generate upload date before event
                            dates = generate_material_upload_dates(1, event_start)
                            upload_dates_list.extend(dates)
                        else:
                            # No event, use current date - 10 days
                            from datetime import timedelta
                            upload_date = datetime.now() - timedelta(days=random.randint(1, 10))
                            upload_dates_list.append(upload_date)
                    else:
                        # No event, use current date - 10 days
                        from datetime import timedelta
                        upload_date = datetime.now() - timedelta(days=random.randint(1, 10))
                        upload_dates_list.append(upload_date)

                if upload_dates_list:
                    updated = update_material_dates(admin_token, materials_list, upload_dates_list)
                    utils.print_success(f"Updated upload dates for {updated} materials")
        else:
            utils.print_info("Skipping additional speaker data seeding - no speaker emails available")
            speaker_stats = {'materials': 0, 'messages': 0}
    else:
        if not admin_token or not admin_user_id:
            utils.print_info("Skipping additional speaker data seeding - admin credentials not available")
        elif not speakers:
            utils.print_info("Skipping additional speaker data seeding - no speakers created")
        elif not events:
            utils.print_info("Skipping additional speaker data seeding - no events created")
        speaker_stats = {'materials': 0, 'messages': 0}

    # Summary
    print()
    utils.print_header("=" * 60)
    utils.print_success("Seeding Complete!")
    utils.print_header("=" * 60)
    print()

    utils.print_info("Summary:")
    if got_502_errors:
        utils.print_error("  ⚠️  Some registrations may have failed due to 502 Bad Gateway errors")
    else:
        utils.print_success(f"  ✓ {len(speakers)} Speakers registered")
        utils.print_success(f"  ✓ {len(users)} Users registered")
        if events:
            utils.print_success(f"  ✓ {len(events)} Events created and published")
        if users and events:
            utils.print_info("  ✓ Users registered for events")
        # Show speaker data stats if seeding was attempted
        if speakers:
            speaker_emails = [s['email'] for s in speakers if s.get('email')]
            if speaker_emails:
                if invite_stats.get('invitations_created', 0) > 0:
                    utils.print_success(f"  ✓ {invite_stats['invitations_created']} Speaker invitations created by admin")
                if accept_stats.get('invitations_accepted', 0) > 0:
                    utils.print_success(f"  ✓ {accept_stats['invitations_accepted']} Invitations accepted by speakers")
                if speaker_stats.get('materials', 0) > 0 or speaker_stats.get('messages', 0) > 0:
                    utils.print_info("  ✓ Additional speaker data seeded (materials, messages)")

    print()
    utils.print_info("Important Notes:")
    if admin_token:
        utils.print_success("  ✓ Users have been activated via API (emailVerified set, isActive=true)")
        utils.print_info("  ✓ Users can now login without email verification")
    utils.print_info("  ✓ Speaker profiles are created automatically via RabbitMQ")
    utils.print_info("  ✓ Events are auto-published when created by admin")
    utils.print_info("  ✓ Admin users should be seeded via: cd ems-services/auth-service && npx prisma db seed")
    print()

    utils.print_info("Credentials Created:")
    utils.print_info("  Speakers: speaker1@test.com to speaker5@test.com (Password: Speaker[N]123!)")
    utils.print_info("  Users: user1@test.com to user10@test.com (Password: User[N]123!)")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        utils.print_error("Script interrupted by user")
        sys.exit(1)
    except Exception as e:
        utils.print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

