from fastapi import FastAPI
import json
import os
import asyncio
import subprocess

app = FastAPI()

async def run_pipeline_hourly():
    while True:
        try:
            print("Running hourly YouTube trending pipeline...")
            subprocess.run(["python", "run_daily_pipeline.py"])
            print("Pipeline completed.")
        except Exception as e:
            print(f"Error running pipeline: {e}")
        # Wait 1 minute (60 seconds)
        await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(run_pipeline_hourly())

@app.get("/")
def root():
    return {"message": "API is running. Go to /trending"}

@app.get("/trending")
def trending():
    if not os.path.exists("output/trending_top3.json"):
        return {"message": "Not enough data yet. Please check back later."}

    with open("output/trending_top3.json") as f:
        return json.load(f)
