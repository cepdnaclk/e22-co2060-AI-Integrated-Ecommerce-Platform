HEAD
___
# DELETE THIS INSTRUCTIONS AND ADD AN INTRODUCTION ABOUT YOUR PROJECT
___

# eYY-co2060-project-template

This is a sample repository you can use for your Software Systems Design Project. Once you followed these instructions, remove the text and add a brief introduction to here.

### Enable GitHub Pages

You can put the things to be shown in GitHub pages into the _docs/_ folder. Both html and md file formats are supported. You need to go to settings and enable GitHub pages and select _main_ branch and _docs_ folder from the dropdowns, as shown in the below image.

![image](https://user-images.githubusercontent.com/11540782/98789936-028d3600-2429-11eb-84be-aaba665fdc75.png)

### Special Configurations

These projects will be automatically added into [https://projects.ce.pdn.ac.lk](). If you like to show more details about your project on this site, you can fill the parameters in the file, _/docs/index.json_

```
{
  "title": "This is the title of the project",
  "team": [
    {
      "name": "Team Member Name 1",
      "email": "email@eng.pdn.ac.lk",
      "eNumber": "E/yy/xxx"
    },
    {
      "name": "Team Member Name 2",
      "email": "email@eng.pdn.ac.lk",
      "eNumber": "E/yy/xxx"
    },
    {
      "name": "Team Member Name 3",
      "email": "email@eng.pdn.ac.lk",
      "eNumber": "E/yy/xxx"
    }
  ],
  "supervisors": [
    {
      "name": "Dr. Supervisor 1",
      "email": "email@eng.pdn.ac.lk"
    },
    {
      "name": "Supervisor 2",
      "email": "email@eng.pdn.ac.lk"
    }
  ],
  "tags": ["Web", "Software Systems", "CO2060"]
}
```

Once you filled this _index.json_ file, please verify the syntax is correct. (You can use [this](https://jsonlint.com/) tool).

### Page Theme

A custom theme integrated with this GitHub Page, which is based on [github.com/cepdnaclk/eYY-project-theme](https://github.com/cepdnaclk/eYY-project-theme). If you like to remove this default theme, you can remove the file, _docs/\_config.yml_ and use HTML based website.
=======
# YouTube Trending Products System

A fully automated data pipeline that analyzes YouTube trends for consumer electronics products and predicts which ones are gaining traction. The system fetches YouTube search data daily, performs feature engineering, and uses machine learning to identify top trending products.

## 🎯 Project Overview

This system tracks trending consumer products (iPhone, Smart TV, Laptop, Android Phone) by:
1. Fetching YouTube search statistics for specific keywords
2. Storing historical data in Google Sheets and CSV files
3. Computing trend features (growth rate, acceleration, consistency)
4. Scoring products using a machine learning model
5. Exposing trending data via a REST API

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Daily Pipeline (03:00 UTC)               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. YouTube API                                             │
│     └─> Fetch video stats for keywords                      │
│         └─> youtube_to_sheet.py                             │
│                                                              │
│  2. Google Sheets & CSV Storage                             │
│     └─> sheet_to_storage.py (Push data to storage)          │
│     └─> youtube_today.csv (Daily snapshots)                 │
│     └─> youtube_history.csv (Historical data)               │
│                                                              │
│  3. History Update                                          │
│     └─> update_history.py (Merge daily data into history)   │
│                                                              │
│  4. Feature Engineering                                     │
│     └─> feature_engineering.py                              │
│         ├─> GrowthRate (comparing last 5 vs prev 5 days)    │
│         ├─> Acceleration (momentum of views)                │
│         ├─> Consistency (stability of views)                │
│         └─> RelativePerformance (normalized performance)    │
│         └─> features.csv (Engineered features)              │
│                                                              │
│  5. Trend Prediction & Scoring                              │
│     └─> predict_trending.py                                 │
│     └─> trend_model.py (Weighted scoring algorithm)         │
│         └─> trending_top3.json (Top 3 results)              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   FastAPI Server │
                    │   (app/main.py)  │
                    │   GET / (Root)   │
                    └──────────────────┘
                              │
                              ▼
                    Returns top 3 trending
                    products with growth rates
```

## 📁 Project Structure

```
youtube-trending-system/
├── app/
│   └── main.py                    # FastAPI REST API server
├── models/
│   └── trend_model.py            # ML scoring function
├── pipeline/
│   ├── youtube_to_sheet.py       # Fetch data from YouTube API
│   ├── sheet_to_storage.py       # Sync Google Sheets to CSV
│   ├── update_history.py         # Merge daily data into history
│   ├── feature_engineering.py    # Compute trend features
│   └── predict_trending.py       # Generate top-3 predictions
├── storage/
│   ├── youtube_history.csv       # Full historical data
│   ├── youtube_today.csv         # Today's snapshot
│   └── features.csv              # Engineered features
├── output/
│   └── trending_top3.json        # Final prediction results
├── run_daily_pipeline.py         # Pipeline orchestrator
├── run_pipeline.bat              # Windows batch runner
├── requirements.txt              # Python dependencies
├── Dockerfile                    # Docker containerization
├── credentials.json              # Google API credentials
└── README.md                     # This file
```

## 🔄 Workflow Steps

### Step 1: Fetch YouTube Data (`youtube_to_sheet.py`)
- Uses YouTube Data API v3 to search for keywords: "iPhone", "Smart TV", "Laptop", "Android Phone"
- For each keyword:
  - Searches for top 10 videos
  - Fetches view count statistics
  - Calculates total and average views
- Results are written to Google Sheets and local CSV file

**Output:** `youtube_today.csv` with columns: Date, Keyword, Videos Analyzed, Total Views, Average Views

### Step 2: Store Data (`sheet_to_storage.py`)
- Pulls data from Google Sheets
- Stores daily snapshots in CSV format

**Output:** `youtube_today.csv` stored in `/storage` directory

### Step 3: Update History (`update_history.py`)
- Appends today's data to historical records
- Maintains cumulative dataset for trend analysis

**Output:** `youtube_history.csv` (appended with new records)

### Step 4: Feature Engineering (`feature_engineering.py`)
For each keyword, computes:
- **GrowthRate**: Ratio of last 5 days avg views vs previous 5 days
  - Formula: `last5_avg / (prev5_avg + 1)`
- **Acceleration**: Momentum - change in views over the last 5 days
  - Formula: `latest_views - oldest_views`
- **Consistency**: Standard deviation of views (lower is more stable)
- **RelativePerformance**: How well it performs vs overall average

**Output:** `features.csv` with computed features

### Step 5: Predict Trending (`predict_trending.py`)
- Loads computed features
- Applies ML scoring model
- Selects top 3 products

**Output:** `trending_top3.json` (consumed by API)

### Step 6: Serve Results (REST API)
The FastAPI application exposes the predictions via HTTP.

## 🚀 Setup & Installation

### Prerequisites
- Python 3.10+
- Windows/Linux/macOS
- Google Cloud Project with YouTube Data API enabled
- Google Service Account with Sheets API access

### 1. Clone and Navigate
```bash
cd youtube-trending-system
```

### 2. Create Virtual Environment
```bash
# Using venv
python -m venv testenv
testenv\Scripts\activate  # Windows
# or
source testenv/bin/activate  # macOS/Linux
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Credentials
1. Download your Google Service Account JSON from Google Cloud Console
2. Save it as `credentials.json` in the project root
3. Set environment variables in `.env` file:
   ```
   YOUTUBE_API_KEY=your_youtube_api_key
   GOOGLE_SHEET_ID=your_google_sheet_id
   ```

## 📋 Dependencies

- **Data Processing**: `pandas`, `python-dateutil`
- **Google APIs**: `google-api-python-client`, `gspread`, `oauth2client`
- **Machine Learning**: `scikit-learn`
- **Web Framework**: `fastapi`, `uvicorn`
- **HTTP**: `requests`, `urllib3`
- **Utilities**: `python-dotenv`

See `requirements.txt` for specific versions.

## ⚙️ Execution Methods

### Option 1: Run Daily Pipeline (Automated - Recommended)
Executes all steps in sequence:
```bash
python run_daily_pipeline.py
```

This runs at **03:00 UTC** when scheduled as a cron job (Linux/macOS) or Task Scheduler (Windows).

**Windows Batch Script:**
```bash
run_pipeline.bat
```

### Option 2: Run Individual Pipeline Steps
```bash
# Fetch YouTube data
python -c "import pipeline.youtube_to_sheet"

# Sync to storage
python -c "import pipeline.sheet_to_storage"

# Update history
python -c "import pipeline.update_history"

# Engineer features
python -c "import pipeline.feature_engineering"

# Predict trends
python -c "import pipeline.predict_trending"
```

### Option 3: Start FastAPI Server
```bash
uvicorn app.main:app --reload
```

Then visit: `http://localhost:8000/`

**Expected Response:**
```json
{
  "top3": [
    {
      "Keyword": "iPhone",
      "GrowthRate": 1.45
    },
    {
      "Keyword": "Smart TV",
      "GrowthRate": 1.32
    },
    {
      "Keyword": "Laptop",
      "GrowthRate": 1.18
    }
  ]
}
```

### Option 4: Docker Execution
```bash
# Build image
docker build -t youtube-trending .

# Run container
docker run -p 8000:8000 youtube-trending
```

## 📊 Trending Score Calculation

The `trend_model.py` computes a weighted score:

```
TrendScore = (
    0.35 × GrowthRate +
    0.25 × Acceleration (percentile ranked) +
    0.20 × RelativePerformance +
    0.20 × ConsistencyScore
)
```

**Weights:**
- **Growth Rate (35%)**: Primary indicator of trend momentum
- **Acceleration (25%)**: Recent velocity of growth
- **Relative Performance (20%)**: Performance vs category average
- **Consistency (20%)**: Stability of the trend

Products are ranked by TrendScore and top 3 are selected.

## 📅 Scheduling

### Linux/macOS (Cron)
Add to crontab (runs daily at 03:00 UTC):
```bash
crontab -e
```
```
0 3 * * * cd /path/to/youtube-trending-system && python run_daily_pipeline.py
```

### Windows (Task Scheduler)
1. Open **Task Scheduler**
2. Create Basic Task
3. Set trigger: Daily at 03:00 UTC
4. Set action: Run `run_pipeline.bat`

## 🔑 Environment Variables

Create a `.env` file:
```
YOUTUBE_API_KEY=your_api_key_here
GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_CREDENTIALS_PATH=credentials.json
```

## 📈 Data Flow Example

```
Day 1:  iPhone: 1M views  →  Stored in storage/youtube_today.csv
        Smart TV: 800K views
        Laptop: 600K views

Day 2:  iPhone: 1.2M views  →  Merged into youtube_history.csv
        Smart TV: 900K views     Feature engineering computes:
        Laptop: 650K views       - GrowthRate, Acceleration, etc.

Day 3:  iPhone: 1.5M views  →  Model scores and ranks:
        Smart TV: 1M views       1. iPhone (score: 0.85)
        Laptop: 700K views       2. Smart TV (score: 0.72)
                                 3. Laptop (score: 0.65)
                                 → Output to trending_top3.json
```

## 🐛 Troubleshooting

### "No trending data yet" Error
- **Cause**: `trending_top3.json` doesn't exist
- **Fix**: Run the full pipeline: `python run_daily_pipeline.py`

### "Features file not found" Error
- **Cause**: Feature engineering hasn't been run
- **Fix**: Run `python -c "import pipeline.feature_engineering"`

### "Not enough historical data"
- **Cause**: Less than 3 keywords with 3+ days of data
- **Fix**: Wait for more days of data collection before predictions

### YouTube API Authentication Failed
- **Cause**: Invalid API key or credentials
- **Fix**: Verify `YOUTUBE_API_KEY` and `credentials.json` in `.env`

## 📝 Key Files Explained

| File | Purpose |
|------|---------|
| `run_daily_pipeline.py` | Orchestrates all pipeline steps in order |
| `app/main.py` | FastAPI server that exposes trending data |
| `models/trend_model.py` | ML scoring function for ranking products |
| `pipeline/youtube_to_sheet.py` | Fetches data from YouTube API |
| `pipeline/feature_engineering.py` | Computes trend features from raw data |
| `pipeline/predict_trending.py` | Generates final top-3 predictions |

## 🎓 How It Works in Summary

1. **Collection**: Daily YouTube API calls collect search/view statistics
2. **Storage**: Data stored in Google Sheets and local CSVs
3. **Analysis**: Compute features that capture trend behavior
4. **Scoring**: Weighted ML model scores products on trend potential
5. **Delivery**: Results exposed via REST API

The entire workflow is automated to run daily, identifying which consumer electronics products are gaining the most traction on YouTube.

## 📜 License

[Add your license here]

## 👤 Author

[Add your name/contact here]

---

**Last Updated**: April 2026
**Status**: Active & Running Daily at 03:00 UTC
68bb6e1 (Dockerized AI/ML part)
