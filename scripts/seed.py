#!/usr/bin/env python3
"""
Complete Seeding Script for Event Management System

This script seeds:
1. Users and Speakers (via auth-service)
2. Activates users (via admin API)
3. Creates events (via event-service, assigned to speakers)
4. Creates bookings/registrations (via booking-service)

Usage:
    python3 scripts/seed.py

    # With custom API URLs
    AUTH_API_URL=http://localhost:3000/api/auth python3 scripts/seed.py
"""
import os
import sys
import time

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
    login_admin, activate_users_via_api, seed_users_and_speakers
)
from modules.event_seeding import seed_events
from modules.booking_seeding import seed_bookings


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

    # Step 1-2: Seed Users and Speakers
    speakers, users, all_user_emails, got_502_errors = seed_users_and_speakers(admin_token)

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

    # Step 4: Activate Users
    utils.print_header("Step 4: Activating Users via API")
    print("-" * 60)
    if all_user_emails and admin_token:
        activate_users_via_api(all_user_emails, admin_token)
    else:
        if not all_user_emails:
            utils.print_info("No users created, skipping activation")
        elif not admin_token:
            utils.print_error("Cannot activate users - admin token not available")

    # Step 5: Create Events
    if admin_token and admin_user_id:
        events = seed_events(admin_token, admin_user_id, num_events=8)
        # Wait a moment for events to be fully processed
        time.sleep(2)
    else:
        utils.print_error("Cannot create events - admin token or user ID not available")
        events = []

    # Step 6: Create Bookings
    if events and users:
        seed_bookings(events, users)
    else:
        if not events:
            utils.print_info("Skipping bookings - no events created")
        if not users:
            utils.print_info("Skipping bookings - no users available")

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

