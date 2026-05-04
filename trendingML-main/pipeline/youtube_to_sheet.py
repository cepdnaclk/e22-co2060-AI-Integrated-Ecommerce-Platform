from dotenv import load_dotenv
load_dotenv()


import os
from googleapiclient.discovery import build
import pandas as pd
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")

KEYWORDS = ["iPhone", "Smart TV", "Laptop", "Android Phone"]
MAX_RESULTS = 10

youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

def fetch(keyword):
    search = youtube.search().list(
        q=keyword, part="id", type="video", maxResults=MAX_RESULTS
    ).execute()

    ids = [i["id"]["videoId"] for i in search["items"]]
    if not ids:
        return None

    stats = youtube.videos().list(
        part="statistics", id=",".join(ids)
    ).execute()

    views = sum(int(v["statistics"].get("viewCount", 0)) for v in stats["items"])

    return {
        "Date": datetime.now().strftime("%Y-%m-%d"),
        "Keyword": keyword,
        "Videos Analyzed": len(ids),
        "Total Views": views,
        "Average Views": views // len(ids)
    }

rows = [fetch(k) for k in KEYWORDS if fetch(k)]
df = pd.DataFrame(rows)

scope = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]
creds = ServiceAccountCredentials.from_json_keyfile_name(
    "credentials.json", scope
)
client = gspread.authorize(creds)
sheet = client.open_by_key(GOOGLE_SHEET_ID).sheet1

sheet.clear()
sheet.update("A1", [df.columns.tolist()])
sheet.update("A2", df.values.tolist())
print("Data successfully written to Google Sheet.")