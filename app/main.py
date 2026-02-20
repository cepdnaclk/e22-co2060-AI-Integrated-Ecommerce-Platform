from fastapi import FastAPI
import json
import os

app = FastAPI()

@app.get("/")
def root():
    if not os.path.exists("output/trending_top3.json"):
        return {"message": "Not enough data yet. Please check back later."}

    with open("output/trending_top3.json") as f:
        data = json.load(f)

    # Extract only keywords
    keywords = [item["Keyword"] for item in data]

    return keywords

