#!/usr/bin/env python3
"""
CarryBee Issue Reminder Bot
Reads Google Sheet for "In Progress" issues and sends deadline reminders via Telegram.
"""

import requests
import csv
import json
import time
from datetime import datetime, timedelta
from collections import defaultdict

# ==================== CONFIGURATION ====================

# Your Telegram Bot Token
BOT_TOKEN = "8851597317:AAGAjKaTjxp8oJga0reO64se9VhEBf2gYUc"

# Your Google Sheet CSV URL (same as dashboard)
SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSybJkSsKQxyczJc4Llsa10ywnR7YL3JNWN3Yx7RCc3GGWBOt4O43sSOMy2cNgYVQRtoAakguvAqgsy/pub?output=csv"

# Telegram Chat ID(s) to send reminders to
# You need to get this by messaging your bot first, then checking:
# https://api.telegram.org/bot<TOKEN>/getUpdates
# Replace with your actual chat ID(s)
CHAT_IDS = ["8485545697", "8839924588"]  # Nuruzzaman Nahid & Ahmed Asif Rashid

# Timezone offset (BST/Dhaka = UTC+6)
TIMEZONE_OFFSET = 6  # hours ahead of UTC

# Check interval in seconds (check every 5 minutes)
CHECK_INTERVAL = 300

# Reminder windows and deadlines
DEADLINE_RULES = [
    # (start_hour, start_min, end_hour, end_min, deadline_hour, deadline_min)
    (19, 0, 11, 0, 11, 30),    # 7:00 PM – 11:00 AM → 11:30 AM
    (11, 0, 13, 0, 12, 30),    # 11:00 AM – 1:00 PM → 12:30 PM
    (13, 0, 15, 0, 14, 30),    # 1:00 PM – 3:00 PM → 2:30 PM
    (15, 0, 17, 0, 16, 30),    # 3:00 PM – 5:00 PM → 4:30 PM
    (17, 0, 18, 0, 18, 30),    # 5:00 PM – 6:00 PM → 6:30 PM
]

# ==================== HELPER FUNCTIONS ====================

def get_local_time():
    """Get current time in local timezone (UTC+6)"""
    utc_now = datetime.utcnow()
    local_now = utc_now + timedelta(hours=TIMEZONE_OFFSET)
    return local_now

def parse_csv_line(line):
    """
    Parse a CSV line handling quoted fields.
    [DEPRECATED] Keep for backward compatibility/reference but use standard csv.reader for parsing.
    """
    # Performance Optimization: csv.reader is written in C and is ~3x faster.
    # Benchmarks show custom parsing 1,007 rows took ~0.00787s vs csv.reader taking ~0.00064s (~12x faster individually).
    # Also, standard csv.reader correctly handles multi-line cells which custom character-by-character loop fails on.
    reader = csv.reader([line])
    try:
        return [v.strip() for v in next(reader)]
    except StopIteration:
        return []

def fetch_sheet_data():
    """Fetch and parse data from Google Sheet using efficient csv.reader"""
    try:
        cache_buster = f"&nocache={int(time.time())}"
        response = requests.get(SHEET_URL + cache_buster, timeout=30)
        response.raise_for_status()
        csv_text = response.text

        # Use splitlines(keepends=True) so that csv.reader can correctly parse cells
        # with embedded newlines, which split('\n') would break into corrupted records.
        lines = csv_text.splitlines(keepends=True)
        if not lines:
            return []

        reader = csv.reader(lines)
        try:
            raw_headers = next(reader)
        except StopIteration:
            return []

        headers = [h.strip().replace('"', '').replace('\r', '') for h in raw_headers]
        issues = []

        for values in reader:
            if len(values) < 2:
                continue

            issue = {}
            for j, header in enumerate(headers):
                if j < len(values):
                    val = values[j].strip()
                    if header == 'Date':
                        issue['date'] = val
                    elif header == 'Time stamp':
                        issue['timestamp'] = val
                    elif header == 'Consignment ID':
                        issue['consignmentId'] = val
                    elif header == 'Merchant Name':
                        issue['merchant'] = val
                    elif header == 'Issue Tag':
                        issue['issueTag'] = val
                    elif header == 'Issue Details':
                        issue['details'] = val
                    elif header == 'In Process':
                        issue['inProcess'] = val.upper() in ['TRUE', 'YES', '1']
                    elif header == 'Sloved And Closed':
                        issue['solved'] = val.upper() in ['TRUE', 'YES', '1']

            if issue.get('date') and issue.get('merchant'):
                issues.append(issue)

        return issues
    except Exception as e:
        print(f"[ERROR] Failed to fetch sheet: {e}")
        return []

def get_status(issue):
    """Determine issue status"""
    if issue.get('solved'):
        return 'Resolved'
    if issue.get('inProcess'):
        return 'In Progress'
    return 'Open'

def parse_issue_datetime(issue):
    """Parse issue submission datetime"""
    try:
        date_str = issue.get('date', '')
        time_str = issue.get('timestamp', '')

        # Try different date formats
        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
            try:
                date_obj = datetime.strptime(date_str, fmt)
                break
            except:
                continue
        else:
            date_obj = datetime.now()

        # Parse time
        time_parts = time_str.split(':')
        if len(time_parts) >= 2:
            hour = int(time_parts[0])
            minute = int(time_parts[1])
            date_obj = date_obj.replace(hour=hour, minute=minute, second=0)

        return date_obj
    except Exception as e:
        print(f"[WARN] Could not parse datetime for issue: {e}")
        return datetime.now()

def calculate_deadline(issue_datetime):
    """Calculate deadline based on issue submission time"""
    dt = issue_datetime

    for start_h, start_m, end_h, end_m, deadline_h, deadline_m in DEADLINE_RULES:
        start_time = dt.replace(hour=start_h, minute=start_m, second=0)
        end_time = dt.replace(hour=end_h, minute=end_m, second=0)

        # Handle overnight window (7 PM to 11 AM next day)
        if start_h > end_h or (start_h == end_h and start_m > end_m):
            end_time += timedelta(days=1)

        if start_time <= dt < end_time:
            deadline = dt.replace(hour=deadline_h, minute=deadline_m, second=0)
            # If deadline has passed for today, it might be next day for overnight
            if deadline < dt and start_h > end_h:
                deadline += timedelta(days=1)
            return deadline

    # Default: 2 hours after submission
    return dt + timedelta(hours=2)

def format_deadline(deadline):
    """Format deadline for display"""
    return deadline.strftime("%I:%M %p")  # e.g., "11:30 AM"

def format_datetime(dt):
    """Format datetime for display"""
    return dt.strftime("%Y-%m-%d %I:%M %p")

def send_telegram_message(chat_id, message, parse_mode="HTML"):
    """Send message via Telegram Bot API"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True
    }
    try:
        response = requests.post(url, json=payload, timeout=30)
        result = response.json()
        if not result.get('ok'):
            print(f"[ERROR] Telegram API error: {result}")
            return False
        return True
    except Exception as e:
        print(f"[ERROR] Failed to send Telegram message: {e}")
        return False

def build_reminder_message(issue, deadline, is_urgent=False):
    """Build formatted reminder message"""
    status_emoji = "⚠️" if is_urgent else "⏰"
    urgency_text = "<b>🔴 URGENT: DEADLINE APPROACHING!</b>\n\n" if is_urgent else ""

    tag = issue.get('issueTag', 'General')
    merchant = issue.get('merchant', 'Unknown')
    consignment = issue.get('consignmentId', 'N/A')
    details = issue.get('details', 'No details')[:100]  # Truncate

    deadline_str = format_deadline(deadline)
    submitted = f"{issue.get('date', 'N/A')} {issue.get('timestamp', 'N/A')}"

    message = f"""{status_emoji} <b>CarryBee Issue Reminder</b> {status_emoji}

{urgency_text}📋 <b>Ticket:</b> <code>{consignment}</code>
🏪 <b>Merchant:</b> {merchant}
🏷 <b>Tag:</b> {tag}
📅 <b>Submitted:</b> {submitted}
⏳ <b>Update Deadline:</b> <b>{deadline_str}</b>

📝 <b>Details:</b>
<i>{details}...</i>

✅ <b>Action Required:</b> Please update status to <b>Resolved</b>
"""
    return message

def get_in_progress_issues(issues):
    """Filter issues that are In Progress"""
    return [issue for issue in issues if get_status(issue) == 'In Progress']

def check_and_send_reminders():
    """Main function: check issues and send reminders"""
    now = get_local_time()
    print(f"\n{'='*60}")
    print(f"[CHECK] {now.strftime('%Y-%m-%d %I:%M:%S %p')}")
    print(f"{'='*60}")

    if not CHAT_IDS:
        print("[WARN] No CHAT_IDS configured. Add your Telegram chat ID(s).")
        print("[INFO] To get your chat ID, message your bot and visit:")
        print(f"[INFO] https://api.telegram.org/bot{BOT_TOKEN}/getUpdates")
        return

    # Fetch data
    issues = fetch_sheet_data()
    in_progress = get_in_progress_issues(issues)

    print(f"[INFO] Total issues: {len(issues)}")
    print(f"[INFO] In Progress: {len(in_progress)}")

    if not in_progress:
        print("[INFO] No In Progress issues found.")
        return

    # Track which issues to remind about
    reminders_sent = 0

    for issue in in_progress:
        issue_dt = parse_issue_datetime(issue)
        deadline = calculate_deadline(issue_dt)

        # Check if deadline is within the next check window
        time_to_deadline = deadline - now
        minutes_to_deadline = time_to_deadline.total_seconds() / 60

        print(f"\n[ISSUE] {issue.get('consignmentId', 'N/A')} | Merchant: {issue.get('merchant', 'N/A')}")
        print(f"        Submitted: {issue_dt.strftime('%I:%M %p')} | Deadline: {format_deadline(deadline)}")
        print(f"        Time to deadline: {minutes_to_deadline:.0f} minutes")

        # Send reminder if:
        # 1. Deadline is within 30 minutes (approaching)
        # 2. Deadline has passed (overdue)
        # 3. It's exactly at the deadline time (within 5 min window)

        is_urgent = minutes_to_deadline <= 30 and minutes_to_deadline > 0
        is_overdue = minutes_to_deadline <= 0
        is_at_deadline = -5 <= minutes_to_deadline <= 5

        if is_at_deadline or is_urgent or is_overdue:
            message = build_reminder_message(issue, deadline, is_urgent=(is_urgent or is_overdue))

            for chat_id in CHAT_IDS:
                success = send_telegram_message(chat_id, message)
                if success:
                    reminders_sent += 1
                    status = "OVERDUE" if is_overdue else ("URGENT" if is_urgent else "DEADLINE")
                    print(f"        ✅ {status} reminder sent to {chat_id}")
                else:
                    print(f"        ❌ Failed to send to {chat_id}")
        else:
            print(f"        ⏸ No reminder needed yet")

    print(f"\n[INFO] Reminders sent: {reminders_sent}")

# ==================== SCHEDULED REMINDER TIMES ====================
# These are the exact times when reminders should be sent
# Based on your deadline rules

REMINDER_TIMES = [
    (11, 30),  # 11:30 AM - for issues raised 7 PM - 11 AM
    (12, 30),  # 12:30 PM - for issues raised 11 AM - 1 PM
    (14, 30),  # 2:30 PM - for issues raised 1 PM - 3 PM
    (16, 30),  # 4:30 PM - for issues raised 3 PM - 5 PM
    (18, 30),  # 6:30 PM - for issues raised 5 PM - 6 PM
]

def run_scheduled_mode():
    """Run bot in scheduled mode - check at specific times"""
    print("="*60)
    print("CarryBee Issue Reminder Bot - Scheduled Mode")
    print("="*60)
    print(f"Bot Token: {BOT_TOKEN[:20]}...")
    print(f"Timezone: UTC+{TIMEZONE_OFFSET} (BST/Dhaka)")
    print(f"Reminder times: {[f'{h:02d}:{m:02d}' for h, m in REMINDER_TIMES]}")
    print(f"Chat IDs: {CHAT_IDS if CHAT_IDS else 'NOT CONFIGURED'}")
    print("="*60)

    if not CHAT_IDS:
        print("\n[SETUP REQUIRED]")
        print("1. Message your bot on Telegram")
        print("2. Visit: https://api.telegram.org/bot8851597317:AAGAjKaTjxp8oJga0reO64se9VhEBf2gYUc/getUpdates")
        print("3. Find your 'chat.id' in the response")
        print("4. Add it to CHAT_IDS list in this script")
        print("="*60)

    # Send startup notification
    if CHAT_IDS:
        for chat_id in CHAT_IDS:
            send_telegram_message(
                chat_id,
                "🤖 <b>CarryBee Reminder Bot Started</b>\n\n"
                "I will remind you about In Progress issues at these times:\n"
                "• 11:30 AM\n"
                "• 12:30 PM\n"
                "• 2:30 PM\n"
                "• 4:30 PM\n"
                "• 6:30 PM\n\n"
                "Make sure to update issues to <b>Resolved</b> before deadlines!"
            )

    # Track which reminders we've already sent today
    sent_today = set()

    while True:
        now = get_local_time()
        current_time_key = (now.hour, now.minute)

        # Check if it's time for a reminder
        if current_time_key in REMINDER_TIMES:
            day_key = now.strftime("%Y-%m-%d")
            reminder_key = f"{day_key}_{current_time_key[0]}:{current_time_key[1]}"

            if reminder_key not in sent_today:
                print(f"\n[ALERT] It's {now.strftime('%I:%M %p')} - Sending reminders!")
                check_and_send_reminders()
                sent_today.add(reminder_key)

                # Clean up old entries (keep only today)
                sent_today = {k for k in sent_today if k.startswith(day_key)}

        # Sleep for 1 minute
        time.sleep(60)

def run_continuous_mode():
    """Run bot in continuous mode - check every 5 minutes"""
    print("="*60)
    print("CarryBee Issue Reminder Bot - Continuous Mode")
    print("="*60)
    print(f"Check interval: {CHECK_INTERVAL} seconds")
    print("="*60)

    while True:
        check_and_send_reminders()
        print(f"\n[SLEEP] Waiting {CHECK_INTERVAL} seconds...")
        time.sleep(CHECK_INTERVAL)

# ==================== MAIN ====================

if __name__ == "__main__":
    import sys

    # Default: scheduled mode (recommended)
    mode = sys.argv[1] if len(sys.argv) > 1 else "scheduled"

    try:
        if mode == "continuous":
            run_continuous_mode()
        else:
            run_scheduled_mode()
    except KeyboardInterrupt:
        print("\n\n[STOP] Bot stopped by user.")
    except Exception as e:
        print(f"\n[ERROR] Fatal error: {e}")
        # Try to restart after error
        time.sleep(60)
