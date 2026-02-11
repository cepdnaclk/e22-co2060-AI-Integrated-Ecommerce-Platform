from fastapi import FastAPI
import json
import os

app = FastAPI()

@app.get("/")
def root():
    return {"message": "API is running. Go to /trending"}

@app.get("/trending")
def trending():
    if not os.path.exists("output/trending_top3.json"):
        return {"message": "Not enough data yet. Please check back later."}

    with open("output/trending_top3.json") as f:
        return json.load(f)
