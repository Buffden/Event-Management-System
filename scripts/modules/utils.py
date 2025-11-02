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
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@eventmanagement.com')
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

