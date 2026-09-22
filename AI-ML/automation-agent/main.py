from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn

from config import PORT, GEMINI_API_KEY
from agents.marketing_agent import MarketingCampaignAgent, CampaignOptions
from agents.support_agent import SupportAgent
from agents.restock_agent import RestockAutomationAgent
from agents.youtube_trending_agent import YouTubeTrendingAgent

app = FastAPI(
    title="LangChain E-Commerce Automation Service",
    description="Autonomous Agentic Workflow for Marketing, Customer Support, and Inventory Restock",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Agents
marketing_agent = MarketingCampaignAgent()
support_agent = SupportAgent()
restock_agent = RestockAutomationAgent()
youtube_trending_agent = YouTubeTrendingAgent()

# ────────────────── Schemas ──────────────────

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

# ────────────────── Endpoints ──────────────────

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "langchain-automation-agent",
        "version": "1.2.0",
        "llm_configured": bool(GEMINI_API_KEY),
        "agents": ["marketing", "customer_support", "inventory_restock", "youtube_trending"]
    }

@app.get("/automation/marketing-options")
def get_marketing_options():
    """Returns all supported presets and customization options for campaign generation."""
    return {
        "tones": [
            {"id": "hype", "label": "Hype & Excited", "description": "High-energy with emojis and excitement for major releases"},
            {"id": "professional", "label": "Professional & Authoritative", "description": "Clean, technical, highlighting build quality and specs"},
            {"id": "discount_driven", "label": "Deal & Discount Focused", "description": "Highlights savings, limited-time price drops, and promo codes"},
            {"id": "storytelling", "label": "Storytelling & Use-Case", "description": "Narrates a day in the life or problem solved by the gear"},
            {"id": "informative", "label": "Tech Guide & Informative", "description": "Focuses on benchmarks, features, and specs"},
            {"id": "humorous", "label": "Casual & Humorous", "description": "Witty, relatable tech humor for social engagement"}
        ],
        "campaign_types": [
            {"id": "product_spotlight", "label": "Product Spotlight", "description": "Deep-dive focus on one trending product"},
            {"id": "flash_sale", "label": "Flash Sale & Limited Deal", "description": "Urgent call to action with countdown and discount"},
            {"id": "deal_of_the_day", "label": "Deal of the Day", "description": "Featured bargain of the day for shoppers"},
            {"id": "trend_roundup", "label": "Trending Tech Roundup", "description": "Showcases top trending gear in one post"},
            {"id": "buying_guide", "label": "Buyer's Quick Guide", "description": "Helps users choose the right specs for their needs"}
        ],
        "target_audiences": [
            "tech enthusiasts & gamers",
            "university & college students",
            "remote workers & professionals",
            "budget-conscious shoppers",
            "audiophiles & creators"
        ],
        "languages": ["English", "Sinhala", "Tamil"],
        "post_lengths": [
            {"id": "short", "label": "Short & Punchy (< 50 words)"},
            {"id": "medium", "label": "Balanced (100 - 150 words)"},
            {"id": "long", "label": "Detailed Breakdown (> 200 words)"}
        ],
        "publish_modes": [
            {"id": "now", "label": "Instant Publish", "description": "Posts directly to Facebook right now"},
            {"id": "schedule", "label": "Scheduled Time", "description": "Delays posting until a specific future date and time"},
            {"id": "optimal_time", "label": "AI Optimal Time", "description": "Schedules at evening peak engagement hour (7:00 PM)"},
            {"id": "draft", "label": "Save as Draft", "description": "Generates and saves for admin review before publishing"}
        ]
    }

@app.post("/automation/marketing-campaign")
async def create_marketing_campaign(options: Optional[CampaignOptions] = None):
    """
    Autonomous Trend-to-Marketing Agent with Rich Customization Options.
    """
    try:
        campaign = await marketing_agent.generate_campaign(options=options)
        return {"status": "success", "campaign": campaign, "options_applied": options.dict() if options else {}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate campaign: {str(e)}")

@app.post("/automation/chat")
async def handle_customer_chat(req: ChatRequest):
    """
    Tool-Calling Customer Support Agent.
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    try:
        reply = await support_agent.answer(user_message=req.message, history=req.history)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

@app.post("/automation/restock-review")
async def review_inventory_restock():
    """
    Autonomous Inventory & Restock Agent.
    """
    try:
        report = await restock_agent.analyze_and_draft_restock()
        return {"status": "success", "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restock review error: {str(e)}")

@app.get("/automation/youtube-trending-products")
@app.post("/automation/youtube-trending-products")
async def extract_youtube_trending_products(category_filter: Optional[str] = None):
    """
    LangChain YouTube Trending Products Automation:
    Analyzes viral YouTube tech trends, extracts concrete electronic products,
    evaluates viewer sentiment, and cross-references against live store catalog.
    """
    try:
        report = await youtube_trending_agent.get_trending_products(category_filter=category_filter)
        return {"status": "success", "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"YouTube trending extraction error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
