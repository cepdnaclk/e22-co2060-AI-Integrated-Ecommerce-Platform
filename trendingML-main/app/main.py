from fastapi import FastAPI
import json
import os

app = FastAPI()

@app.get("/")
def root():
    if not os.path.exists("output/trending_top3.json"):
        return {"message": "No trending data yet."}

    with open("output/trending_top3.json") as f:
        #data = json.load(f)
        #only get keywords and corresponding growth rate.
        simplified_data = [{"Keyword": item["Keyword"], "GrowthRate": item["GrowthRate"]} for item in json.load(f)] 

    return {"top3": simplified_data}