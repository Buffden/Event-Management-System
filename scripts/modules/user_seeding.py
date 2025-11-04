"""
User and Speaker Seeding Module
"""
import time
import requests
from typing import Optional, Tuple, List, Dict
from .utils import (
    AUTH_API_URL, ADMIN_EMAIL, ADMIN_PASSWORD,
    print_success, print_error, print_info, print_step
)


def get_user_id_by_login(email: str, password: str) -> Optional[str]:
    """
    Get user ID by logging in with email and password

    Args:
        email: User email
        password: User password

    Returns:
        User ID if login successful, None otherwise
    """
    url = f"{AUTH_API_URL}/login"
    payload = {
        "email": email,
        "password": password
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            user_id = data.get('user', {}).get('id', '')
            return user_id
        return None
    except:
        return None


def register_user(email: str, password: str, name: str, role: str) -> Tuple[bool, Optional[str], Optional[int]]:
    """
    Register a user via HTTP POST to /api/auth/register
    If user already exists, attempts to get their user_id via login

    Args:
        email: User email
        password: User password
        name: User name
        role: User role (USER or SPEAKER)

    Returns:
        Tuple of (success: bool, user_id: Optional[str], http_status: Optional[int])
    """
    print_step(f"Registering {role}: {name} ({email})")

    url = f"{AUTH_API_URL}/register"
    payload = {
        "email": email,
        "password": password,
        "name": name,
        "role": role
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        http_status = response.status_code

        if http_status == 201:
            data = response.json()
            user_id = data.get('user', {}).get('id', '')
            print_success(f"Registered {role}: {name}")
            return True, user_id, http_status

        elif http_status == 400:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', '')

                if 'already exists' in error_msg.lower() or 'User with this email already exists' in error_msg:
                    print_info(f"User {email} already exists, fetching user ID...")
                    # Try to get user_id by logging in
                    user_id = get_user_id_by_login(email, password)
                    if user_id:
                        print_success(f"Found existing {role}: {name} (ID: {user_id[:8]}...)")
                        return True, user_id, http_status
                    else:
                        print_info(f"Could not get user ID for {email} (may need activation)")
                        # Still return success so we can add email to activation list
                        return True, None, http_status
                else:
                    print_error(f"Failed to register {email}: {error_msg}")
                    return False, None, http_status
            except:
                print_error(f"Failed to register {email}: {response.text}")
                return False, None, http_status

        elif http_status == 502:
            print_error(f"Bad Gateway (502) - nginx cannot reach auth-service")
            print_error(f"Failed to register {email}")
            return False, None, http_status

        elif http_status == 503:
            print_error(f"Service Unavailable (503) - auth-service may be starting up")
            print_info("Wait a few seconds and try again")
            return False, None, http_status

        else:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', response.text)
                print_error(f"Failed to register {email}: HTTP {http_status} - {error_msg}")
            except:
                print_error(f"Failed to register {email}: HTTP {http_status}")
            return False, None, http_status

    except requests.exceptions.ConnectionError:
        print_error(f"Connection error - cannot reach {url}")
        return False, None, None

    except requests.exceptions.Timeout:
        print_error(f"Request timeout - server took too long to respond")
        return False, None, None

    except Exception as e:
        print_error(f"Error registering {email}: {str(e)}")
        return False, None, None


def login_admin() -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Login as admin to get authentication token and user ID

    Returns:
        Tuple of (success: bool, token: Optional[str], user_id: Optional[str])
    """
    print_info(f"Logging in as admin ({ADMIN_EMAIL})...")

    url = f"{AUTH_API_URL}/login"
    payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        http_status = response.status_code

        if http_status == 200:
            data = response.json()
            token = data.get('token', '')
            user_id = data.get('user', {}).get('id', '')
            if token:
                print_success("Admin login successful")
                return True, token, user_id
            else:
                print_error("No token received from login")
                return False, None, None
        elif http_status == 401:
            print_error("Admin login failed: Invalid credentials")
            print_info(f"Please check ADMIN_EMAIL and ADMIN_PASSWORD environment variables")
            print_info(f"Current admin email: {ADMIN_EMAIL}")
            print_info(f"Expected password from seed: Admin123!")
            return False, None, None
        else:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', response.text)
                print_error(f"Admin login failed: HTTP {http_status} - {error_msg}")
            except:
                print_error(f"Admin login failed: HTTP {http_status}")
            return False, None, None

    except requests.exceptions.ConnectionError:
        print_error(f"Connection error - cannot reach {url}")
        return False, None, None
    except Exception as e:
        print_error(f"Error during admin login: {str(e)}")
        return False, None, None


def activate_users_via_api(user_emails: List[str], admin_token: str) -> bool:
    """
    Activate users via protected API endpoint (requires admin authentication)

    Args:
        user_emails: List of email addresses to activate
        admin_token: JWT token from admin login

    Returns:
        True if successful, False otherwise
    """
    if not user_emails:
        print_info("No user emails to activate")
        return False

    print_info(f"Activating {len(user_emails)} users via API...")

    url = f"{AUTH_API_URL}/admin/activate-users"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    }
    payload = {
        "emails": user_emails
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        http_status = response.status_code

        if http_status == 200:
            data = response.json()
            activated = data.get('activated', 0)
            not_found = data.get('notFound', 0)

            print_success(f"Activated {activated} user(s) via API")
            if not_found > 0:
                print_info(f"{not_found} user(s) not found (may have been already activated)")
            return True
        elif http_status == 401:
            print_error("Authentication failed - invalid admin token")
            return False
        elif http_status == 403:
            print_error("Authorization failed - admin access required")
            return False
        else:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', response.text)
                print_error(f"Activation failed: HTTP {http_status} - {error_msg}")
            except:
                print_error(f"Activation failed: HTTP {http_status}")
            return False

    except requests.exceptions.ConnectionError:
        print_error(f"Connection error - cannot reach {url}")
        return False
    except Exception as e:
        print_error(f"Error activating users: {str(e)}")
        return False


def seed_users_and_speakers(admin_token: Optional[str] = None) -> Tuple[List[Dict], List[Dict], List[str], bool]:
    """
    Seed users and speakers

    Returns:
        Tuple of (speakers list, users list, all_emails list, got_502_errors bool)
    """
    speakers = []
    users = []
    all_user_emails = []
    got_502_errors = False

    # Register Speakers
    print()
    from .utils import print_header
    print_header("Step 1: Registering Speakers")
    print("-" * 50)

    for i in range(1, 6):
        email = f"speaker{i}@test.com"
        password = f"Speaker{i}123!"
        name = f"Speaker {i}"

        success, user_id, status = register_user(email, password, name, "SPEAKER")
        if status == 502:
            got_502_errors = True
        if success:
            all_user_emails.append(email)
            # Add to speakers list even if user_id is None (user already exists)
            speakers.append({"email": email, "user_id": user_id})
        time.sleep(0.2)

    # Register Regular Users
    print()
    print_header("Step 2: Registering Regular Users")
    print("-" * 50)

    for i in range(1, 11):
        email = f"user{i}@test.com"
        password = f"User{i}123!"
        name = f"User {i}"

        success, user_id, status = register_user(email, password, name, "USER")
        if status == 502:
            got_502_errors = True
        if success:
            all_user_emails.append(email)
            # Add to users list even if user_id is None (user already exists)
            users.append({"email": email, "user_id": user_id})
        time.sleep(0.2)

    return speakers, users, all_user_emails, got_502_errors

