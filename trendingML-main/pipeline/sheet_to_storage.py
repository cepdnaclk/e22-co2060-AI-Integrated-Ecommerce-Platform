
import gspread
import pandas as pd
from oauth2client.service_account import ServiceAccountCredentials
import os
from dotenv import load_dotenv
load_dotenv()

SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
OUT = "storage/youtube_today.csv"

os.makedirs("storage", exist_ok=True)

scope = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly"
]
creds = ServiceAccountCredentials.from_json_keyfile_name(
    "credentials.json", scope
)
client = gspread.authorize(creds)

sheet = client.open_by_key(SHEET_ID).sheet1
data = sheet.get_all_values()

df = pd.DataFrame(data[1:], columns=data[0])
df.to_csv(OUT, index=False)
