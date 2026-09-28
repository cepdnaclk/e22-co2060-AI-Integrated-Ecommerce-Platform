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
    key_features: List[str] = Field(description="3 top product benefits or specifications highlighted in the post", default=[])
    hashtags: List[str] = Field(description="5-8 relevant trending and product hashtags")
    call_to_action: str = Field(description="Call to action directing shoppers to visit the platform")
    urgency_hook: str = Field(description="A limited-time offer, promo code, or compelling hook for shoppers")
    target_audience_appeal: Optional[str] = Field(description="Short note on how this appeals to the target audience", default=None)

class CampaignOptions(BaseModel):
    trend_override: Optional[str] = None
    custom_product_id: Optional[str] = None
    tone: Optional[str] = "hype" # hype, professional, storytelling, discount_driven, informative, humorous
    campaign_type: Optional[str] = "product_spotlight" # product_spotlight, flash_sale, buying_guide, trend_roundup, deal_of_the_day
    target_audience: Optional[str] = "tech enthusiasts & gamers"
    promo_code: Optional[str] = None
    discount_percent: Optional[int] = None
    language: Optional[str] = "English" # English, Sinhala, Tamil, etc.
    post_length: Optional[str] = "medium" # short, medium, long

class MarketingCampaignAgent:
    def __init__(self):
        self.parser = JsonOutputParser(pydantic_object=CampaignOutput)
        self.prompt = PromptTemplate(
            template="""You are the Chief AI Marketing Strategist for "I-Computers", a premier tech & electronics e-commerce platform.
Your task is to analyze real-time online trends and match them with store products to generate an optimized social media marketing campaign.

CAMPAIGN CONFIGURATION:
- Desired Tone: {tone}
- Campaign Type: {campaign_type}
- Target Audience: {target_audience}
- Promo Code: {promo_code}
- Discount: {discount_percent}%
- Language: {language}
- Post Length: {post_length}

TRENDING ONLINE TOPICS:
{trending_topics}

CURRENT STORE PRODUCTS:
{store_products}

{format_instructions}

INSTRUCTIONS:
1. Identify the best product matching the trend (or use the requested specific product if provided).
2. Craft high-converting social media copy strictly adhering to the requested tone ({tone}), campaign type ({campaign_type}), and target audience ({target_audience}).
3. If promo code or discount is provided, prominently feature it in the urgency hook and caption.
4. Keep the text format clean and engaging with appropriate emojis.
5. Output ONLY valid JSON matching the schema.""",
            input_variables=[
                "tone", "campaign_type", "target_audience", "promo_code",
                "discount_percent", "language", "post_length",
                "trending_topics", "store_products"
            ],
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

    async def generate_campaign(self, options: Optional[CampaignOptions] = None) -> Dict[str, Any]:
        if options is None:
            options = CampaignOptions()

        trending = await self.fetch_trending_topics()
        if options.trend_override:
            trending.insert(0, {"title": options.trend_override, "category": "Electronics"})

        products = await self.fetch_store_products()
        if options.custom_product_id:
            # Reorder products so the requested product is first
            products = sorted(
                products,
                key=lambda p: 0 if str(p.get("id")) == str(options.custom_product_id) else 1
            )

        if not self.llm:
            matched = products[0] if products else {"name": "Featured Gadget", "id": "1", "price": 99}
            trend_title = trending[0]["title"] if trending else "Top Tech"
            discount_text = f" Use code {options.promo_code} for {options.discount_percent}% off!" if options.promo_code else ""
            return {
                "headline": f"🔥 Trending Now: Get {matched['name']} at I-Computers!",
                "matched_product_name": matched["name"],
                "matched_product_id": matched.get("id"),
                "primary_trend_topic": trend_title,
                "post_caption": f"Everyone is talking about {trend_title}! Upgrade your setup with the {matched['name']} today.{discount_text} Premium performance guaranteed. Shop now at I-Computers!",
                "key_features": ["Ultra-fast performance", "Latest generation hardware", "Official manufacturer warranty"],
                "hashtags": ["#TechDeals", "#TrendingTech", "#IComputers", "#Gaming", "#Innovation"],
                "call_to_action": "Order today from I-Computers and enjoy rapid 3-5 day delivery!",
                "urgency_hook": f"Limited stock available on trending items!{discount_text}",
                "target_audience_appeal": f"Tailored for {options.target_audience}"
            }

        chain = self.prompt | self.llm | self.parser
        try:
            result = await chain.ainvoke({
                "tone": options.tone or "hype",
                "campaign_type": options.campaign_type or "product_spotlight",
                "target_audience": options.target_audience or "tech enthusiasts",
                "promo_code": options.promo_code or "None",
                "discount_percent": str(options.discount_percent or 0),
                "language": options.language or "English",
                "post_length": options.post_length or "medium",
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
                "key_features": ["High performance", "Top user reviews", "Exclusive store deal"],
                "hashtags": ["#TrendingGadgets", "#TechNews", "#IComputers"],
                "call_to_action": "Explore exclusive offers at I-Computers today!",
                "urgency_hook": "Grab yours while current inventory lasts!",
                "target_audience_appeal": f"Designed for {options.target_audience}"
            }
