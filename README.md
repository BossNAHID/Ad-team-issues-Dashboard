# 🐝 CarryBee Issue Tracker + Reminder Bot

A complete issue tracking dashboard with Telegram deadline reminders for CarryBee logistics operations.

---

## 📁 Project Structure

```
carrybee-project/
├── index.html                  # Issue Tracker Dashboard (open in browser)
├── carrybee_reminder_bot.py    # Telegram Bot (runs 24/7)
├── requirements.txt            # Python dependencies
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

---

## 🖥️ Issue Tracker Dashboard

A beautiful, dark/light mode issue tracker that reads from Google Sheets.

### Features
- ✅ Real-time data from Google Sheets
- ✅ Dark/Light theme toggle
- ✅ Search & filter by status/tag
- ✅ Analytics charts (Chart.js)
- ✅ Export to CSV
- ✅ Raise new issues
- ✅ Update status directly

### How to Use
Simply open `index.html` in any modern browser. No server needed!

---

## 🤖 Telegram Reminder Bot

Automatically sends deadline reminders for "In Progress" issues.

### Reminder Schedule

| Issue Raised Window | Reminder Sent At |
|---|---|
| 7:00 PM – 11:00 AM | 11:30 AM |
| 11:00 AM – 1:00 PM | 12:30 PM |
| 1:00 PM – 3:00 PM | 2:30 PM |
| 3:00 PM – 5:00 PM | 4:30 PM |
| 5:00 PM – 6:00 PM | 6:30 PM |

### Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the bot:**
   ```bash
   python carrybee_reminder_bot.py
   ```

3. **Keep it running 24/7** (see hosting options below)

---

## ☁️ Hosting the Bot 24/7

### Option 1: PythonAnywhere ($5/month)
- Sign up at [pythonanywhere.com](https://www.pythonanywhere.com)
- Upload files via the Files tab
- Install: `pip install requests`
- Go to **Tasks → Always-on tasks** → Add your script
- Done!

### Option 2: Your Computer (Free)
```bash
# Windows - run in background
pythonw carrybee_reminder_bot.py

# Mac/Linux - run in background
nohup python carrybee_reminder_bot.py &
```

### Option 3: Railway.app / Render.com
- Push to GitHub
- Connect repo to Railway/Render
- Free tier available

---

## 🔧 Configuration

### Google Sheet
The dashboard and bot both read from:
```
https://docs.google.com/spreadsheets/d/e/2PACX-1vSybJkSsKQxyczJc4Llsa10ywnR7YL3JNWN3Yx7RCc3GGWBOt4O43sSOMy2cNgYVQRtoAakguvAqgsy/pub?output=csv
```

Make sure your sheet is **published to the web** as CSV.

### Telegram Bot
- Bot Token: `8851597317:AAGAjKaTjxp8oJga0reO64se9VhEBf2gYUc`
- Chat IDs configured: `8485545697`, `8839924588`

To add more recipients, edit `CHAT_IDS` in `carrybee_reminder_bot.py`.

---

## 👥 Team

- **Nuruzzaman Nahid** — Chat ID: `8485545697`
- **Ahmed Asif Rashid** — Chat ID: `8839924588`

---

## 📄 License

Internal use for CarryBee logistics operations.
