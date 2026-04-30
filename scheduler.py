"""
Optional Scheduler for YouTube Trending System
Runs the daily pipeline on a schedule (default: 03:00 UTC daily)
Use with Dockerfile.scheduler
"""

import schedule
import time
import logging
from datetime import datetime
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/scheduler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def run_pipeline():
    """Execute the complete daily pipeline"""
    logger.info("=" * 60)
    logger.info("Starting daily pipeline execution")
    logger.info("=" * 60)
    
    try:
        # Import pipeline modules
        import pipeline.youtube_to_sheet
        import pipeline.sheet_to_storage
        import pipeline.update_history
        import pipeline.feature_engineering
        import pipeline.predict_trending
        
        logger.info("✅ Pipeline completed successfully")
        logger.info(f"Next run: {schedule.next_run()}")
    except Exception as e:
        logger.error(f"❌ Pipeline failed: {str(e)}", exc_info=True)

def schedule_jobs():
    """Schedule the pipeline to run daily"""
    # Get schedule from environment or use default (03:00 UTC = "03:00")
    schedule_time = os.getenv("SCHEDULE_TIME", "03:00")
    
    schedule.every().day.at(schedule_time).do(run_pipeline)
    logger.info(f"✅ Scheduler initialized - Pipeline runs daily at {schedule_time} UTC")
    logger.info(f"   Next run: {schedule.next_run()}")

def main():
    """Main scheduler loop"""
    logger.info("🚀 YouTube Trending System Scheduler Started")
    logger.info(f"   Start time: {datetime.now()}")
    
    schedule_jobs()
    
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        logger.info("⛔ Scheduler stopped by user")
    except Exception as e:
        logger.error(f"❌ Scheduler error: {str(e)}", exc_info=True)
        raise

if __name__ == "__main__":
    main()
