from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn

from config import PORT, GEMINI_API_KEY
from agents.marketing_agent import MarketingCampaignAgent
from agents.support_agent import SupportAgent
from agents.restock_agent import RestockAutomationAgent

app = FastAPI(
    title="LangChain E-Commerce Automation Service",
    description="Autonomous Agentic Workflow for Marketing, Customer Support, and Inventory Restock",
    version="1.0.0"
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

# ────────────────── Schemas ──────────────────

class CampaignRequest(BaseModel):
    trend_override: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

# ────────────────── Endpoints ──────────────────

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "langchain-automation-agent",
        "llm_configured": bool(GEMINI_API_KEY),
        "agents": ["marketing", "customer_support", "inventory_restock"]
    }

@app.post("/automation/marketing-campaign")
async def create_marketing_campaign(req: Optional[CampaignRequest] = None):
    """
    Autonomous Trend-to-Marketing Agent:
    Fetches real-time YouTube trends, pairs with live store products,
    and generates an optimized social media campaign.
    """
    try:
        custom_trend = req.trend_override if req else None
        campaign = await marketing_agent.generate_campaign(custom_trend=custom_trend)
        return {"status": "success", "campaign": campaign}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate campaign: {str(e)}")

@app.post("/automation/chat")
async def handle_customer_chat(req: ChatRequest):
    """
    Tool-Calling Customer Support Agent:
    Uses live tools for catalog search, order tracking, and store policies.
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
    Autonomous Inventory & Restock Agent:
    Reviews inventory levels, identifies stockout risks, and drafts supplier purchase inquiries.
    """
    try:
        report = await restock_agent.analyze_and_draft_restock()
        return {"status": "success", "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restock review error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
