from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials
import gspread
import pandas as pd
from datetime import date

# ========== CONFIG ==========
YOUTUBE_API_KEY = "AIzaSyAh6VbpXTrDp6eOkt0hl0OCbj95uOZ06Gc"
SERVICE_ACCOUNT_FILE = "service_account.json"

SHEET_NAME = "YouTubeTrendingProducts"
WORKSHEET_NAME = "YouTube Keyword Analysis"

SEARCH_TERMS = [
    "iphone review",
    "samsung galaxy review",
    "best laptop",
    "gaming laptop review",
    "smart tv review"
]

MAX_RESULTS = 5
# ============================

youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

scopes = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]
creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=scopes)
gc = gspread.authorize(creds)
try:
        sheet = gc.open(SHEET_NAME).worksheet(WORKSHEET_NAME)
except gc.WorksheetNotFound:
        sheet = gc.open(SHEET_NAME).add_worksheet(title=WORKSHEET_NAME, rows="100", cols="20")

rows = []

for term in SEARCH_TERMS:
    request = youtube.search().list(
        q=term,
        part="snippet",
        type="video",
        maxResults=MAX_RESULTS,
        order="viewCount"
    )
    response = request.execute()

    for item in response["items"]:
        rows.append({
            "date": date.today().isoformat(),
            "keyword": term,
            "video_title": item["snippet"]["title"],
            "channel": item["snippet"]["channelTitle"],
            "views": 0,  # filled later if needed
            "published_at": item["snippet"]["publishedAt"]
        })

df = pd.DataFrame(rows)

sheet.clear()
sheet.append_row(df.columns.tolist())
for row in df.itertuples(index=False):
    sheet.append_row(list(row))

print("✅ YouTube trend data written to Google Sheet")
