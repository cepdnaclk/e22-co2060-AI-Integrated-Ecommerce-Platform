# TrendingML

A machine learning pipeline for predicting and analyzing trending content from YouTube. This project automates daily data collection, feature engineering, and trend prediction to identify the top 3 trending topics.

## Overview

TrendingML is designed to:
- **Collect** YouTube data and store it in Google Sheets
- **Engineer** features from raw data for ML model consumption
- **Predict** trending topics using trained models
- **Track** historical trends and update predictions daily
- **Output** results as JSON for easy integration

## Project Structure

```
trendingML/
├── app/
│   └── main.py              # Main application entry point
├── models/
│   └── trend_model.py       # ML model for trend prediction
├── pipeline/
│   ├── feature_engineering.py    # Feature extraction and transformation
│   ├── predict_trending.py       # Prediction logic
│   ├── sheet_to_storage.py       # Data persistence
│   ├── update_history.py         # Historical data management
│   └── youtube_to_sheet.py       # YouTube data collection
├── output/
│   └── trending_top3.json   # Output: Top 3 trending topics
├── requirements.txt         # Python dependencies
├── run_pipeline.bat         # Windows batch script to run pipeline
├── run_daily_pipeline.py    # Daily pipeline scheduler
├── Dockerfile              # Docker containerization
└── README.md               # This file
```

## Prerequisites

- Python 3.7+
- Google Sheets API credentials
- YouTube API key
- Docker (optional, for containerized deployment)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd trendingML
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up API credentials**
   - Google Sheets API: Place your `credentials.json` in the project root
   - YouTube API: Set your API key in environment variables or config file

## Usage

### Run the Pipeline Manually

**On Windows:**
```bash
run_pipeline.bat
```

**On Linux/macOS:**
```bash
python run_daily_pipeline.py
```

### Run with Docker

```bash
docker build -t trendingml .
docker run trendingml
```

## Pipeline Workflow

1. **youtube_to_sheet.py** - Fetches trending data from YouTube API
2. **feature_engineering.py** - Extracts and transforms features from raw data
3. **predict_trending.py** - Runs the ML model to predict trends
4. **update_history.py** - Updates historical trend records
5. **sheet_to_storage.py** - Persists results to storage
6. **Output** - Generates `trending_top3.json` with top 3 predictions

## Configuration

Edit configuration in:
- `requirements.txt` - Manage Python package versions
- `Dockerfile` - Adjust container settings
- Environment variables - Set API keys and endpoints

## Output Format

The pipeline outputs results in `output/trending_top3.json`:

```json
{
  "timestamp": "2026-05-01T12:00:00Z",
  "trending": [
    {
      "rank": 1,
      "title": "Topic Name",
      "score": 0.95,
      "category": "Category"
    },
    ...
  ]
}
```

## Scheduling

To run the pipeline daily:

- **Windows**: Use Task Scheduler to run `run_pipeline.bat`
- **Linux/macOS**: Use cron: `0 0 * * * python /path/to/run_daily_pipeline.py`
- **Docker**: Use a container orchestration tool (e.g., Kubernetes, Docker Compose with cron)

## Dependencies

Key packages (see `requirements.txt` for full list):
- `google-api-python-client` - Google Sheets & YouTube API
- `pandas` - Data manipulation
- `scikit-learn` - Machine learning
- `numpy` - Numerical computing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions, please open an issue on the repository.

---

**Last Updated:** May 1, 2026
