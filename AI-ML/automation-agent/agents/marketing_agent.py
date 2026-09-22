import json
import httpx
from typing import Dict, Any, List, Optional
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from config import GEMINI_API_KEY, BACKEND_URL, YOUTUBE_TRENDING_URL, MODEL_NAME

class CampaignOutput(BaseModel):
    headline: str = Field(description="Eye-catching promotional headline for the campaign")
    matched_product_name: str = Field(description="Name of the catalog product chosen to promote")
    matched_product_id: Optional[str] = Field(description="ID of the matched catalog product")
    primary_trend_topic: str = Field(description="The trending topic or keyword this campaign aligns with")
    post_caption: str = Field(description="Full engaging Facebook/social media post copy with emojis and value proposition")
    hashtags: List[str] = Field(description="5-8 relevant trending and product hashtags")
    call_to_action: str = Field(description="Call to action directing shoppers to visit the platform")
    urgency_hook: str = Field(description="A limited-time offer or compelling hook for shoppers")

class MarketingCampaignAgent:
    def __init__(self):
        self.parser = JsonOutputParser(pydantic_object=CampaignOutput)
        self.prompt = PromptTemplate(
            template="""You are the Chief AI Marketing Strategist for "I-Computers", a leading e-commerce tech platform.
Your task is to analyze real-time trending electronic topics and match them with available products in our store catalog to generate high-converting social media marketing campaigns.

TRENDING ONLINE TOPICS:
{trending_topics}

CURRENT STORE PRODUCTS:
{store_products}

{format_instructions}

Analyze the trending topics and identify the single best matching product from the store.
Generate an engaging, persuasive social media campaign tailored for Facebook and Instagram.
Make sure the tone is exciting, authoritative, and customer-focused.
Output ONLY valid JSON matching the schema.""",
            input_variables=["trending_topics", "store_products"],
            partial_variables={"format_instructions": self.parser.get_format_instructions()},
        )
        self._init_llm()

    def _init_llm(self):
        if GEMINI_API_KEY:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                self.llm = ChatGoogleGenerativeAI(
                    model=MODEL_NAME,
                    google_api_key=GEMINI_API_KEY,
                    temperature=0.7,
                )
            except Exception as e:
                print(f"Warning: Failed to initialize ChatGoogleGenerativeAI: {e}")
                self.llm = None
        else:
            self.llm = None

    async def fetch_trending_topics(self) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{YOUTUBE_TRENDING_URL}/trending")
                if res.status_code == 200:
                    data = res.json()
                    if isinstance(data, list):
                        return data
                    elif isinstance(data, dict) and "trending" in data:
                        return data["trending"]
        except Exception as e:
            print(f"MarketingAgent: Could not fetch from trending service: {e}")
        return [
            {"title": "Latest AI Gaming Laptops & RTX GPUs", "category": "Electronics"},
            {"title": "Noise-Cancelling Wireless Earbuds with Long Battery Life", "category": "Audio"},
            {"title": "Mechanical Keyboards & Ergonomic Setup", "category": "Accessories"}
        ]

    async def fetch_store_products(self) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{BACKEND_URL}/api/products")
                if res.status_code == 200:
                    data = res.json()
                    products = data if isinstance(data, list) else data.get("products", [])
                    return [
                        {
                            "id": str(p.get("_id", "")),
                            "name": p.get("productName", "Unnamed"),
                            "price": p.get("productPrice", "N/A"),
                            "description": p.get("productDescription", "")[:120],
                            "category": p.get("productCategory", "Electronics")
                        }
                        for p in products[:20]
                    ]
        except Exception as e:
            print(f"MarketingAgent: Could not fetch store products: {e}")
        return [
            {"id": "demo-1", "name": "Pro Gaming Laptop RTX 4070", "price": 1499, "category": "Electronics"},
            {"id": "demo-2", "name": "AeroBuds Pro Active ANC", "price": 129, "category": "Audio"},
            {"id": "demo-3", "name": "RGB Mechanical Keyboard Tactile", "price": 89, "category": "Accessories"}
        ]

    async def generate_campaign(self, custom_trend: Optional[str] = None) -> Dict[str, Any]:
        trending = await self.fetch_trending_topics()
        if custom_trend:
            trending.insert(0, {"title": custom_trend, "category": "Electronics"})

        products = await self.fetch_store_products()

        if not self.llm:
            matched = products[0] if products else {"name": "Featured Gadget", "id": "1", "price": 99}
            trend_title = trending[0]["title"] if trending else "Top Tech"
            return {
                "headline": f"🔥 Trending Now: Get {matched['name']} at I-Computers!",
                "matched_product_name": matched["name"],
                "matched_product_id": matched.get("id"),
                "primary_trend_topic": trend_title,
                "post_caption": f"Everyone is talking about {trend_title}! Upgrade your setup with the {matched['name']} today. Premium performance guaranteed. Shop now at I-Computers!",
                "hashtags": ["#TechDeals", "#TrendingTech", "#IComputers", "#Gaming", "#Innovation"],
                "call_to_action": "Order today from I-Computers and enjoy rapid 3-5 day delivery!",
                "urgency_hook": "Limited stock available on trending items!"
            }

        chain = self.prompt | self.llm | self.parser
        try:
            result = await chain.ainvoke({
                "trending_topics": json.dumps(trending[:5], indent=2),
                "store_products": json.dumps(products[:10], indent=2)
            })
            return result
        except Exception as e:
            print(f"LangChain campaign generation failed, fallback applied: {e}")
            matched = products[0] if products else {"name": "Featured Tech Product", "id": "1"}
            return {
                "headline": f"🚀 Trending Tech Alert: {matched['name']}",
                "matched_product_name": matched["name"],
                "matched_product_id": matched.get("id"),
                "primary_trend_topic": trending[0].get("title", "Electronics"),
                "post_caption": f"Explore the top trending gear this season with {matched['name']}. Available now at unbeatable prices!",
                "hashtags": ["#TrendingGadgets", "#TechNews", "#IComputers"],
                "call_to_action": "Explore exclusive offers at I-Computers today!",
                "urgency_hook": "Grab yours while current inventory lasts!"
            }
