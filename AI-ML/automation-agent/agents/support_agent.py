import httpx
from typing import List, Dict, Any, Optional
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from config import GEMINI_API_KEY, BACKEND_URL, YOUTUBE_TRENDING_URL, MODEL_NAME

# ────────────────── Agent Tools ──────────────────

@tool
def store_policies(topic: str) -> str:
    """Provides official I-Computers policies regarding shipping, returns, warranty, and customer support.
    Use this tool when users ask about shipping duration, return conditions, warranty, or support contact.
    """
    topic_lower = topic.lower()
    if "ship" in topic_lower or "delivery" in topic_lower:
        return "Shipping Policy: Standard domestic shipping takes 3-5 business days. Express shipping takes 1-2 business days. Tracking is provided via our Delivery Management System (DMS) once shipped."
    elif "return" in topic_lower or "refund" in topic_lower:
        return "Return Policy: We offer a hassle-free 30-day return policy for unused items in original packaging. Refunds are processed within 3-5 working days upon inspection."
    elif "warranty" in topic_lower or "guarantee" in topic_lower:
        return "Warranty Policy: All electronic products purchased at I-Computers come with an official 1-year manufacturer warranty covering hardware defects."
    else:
        return "I-Computers Store Policies: Standard shipping is 3-5 business days; 30-day money-back return policy; 1-year warranty on all electronic devices."

@tool
async def search_catalog(query: str) -> str:
    """Searches the live store catalog for electronic products, specifications, prices, and availability.
    Use this tool when a customer asks if a product is available, its price, or for recommendations.
    """
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(f"{BACKEND_URL}/api/products")
            if res.status_code == 200:
                data = res.json()
                products = data if isinstance(data, list) else data.get("products", [])
                
                # Filter by keyword
                q = query.lower()
                matches = [
                    p for p in products
                    if q in p.get("productName", "").lower() or q in p.get("productDescription", "").lower() or q in p.get("productCategory", "").lower()
                ]
                
                selected = matches[:4] if matches else products[:3]
                if not selected:
                    return f"No products directly matched '{query}'. Please browse our catalog at /products."
                
                summary = []
                for p in selected:
                    name = p.get("productName", "Product")
                    price = p.get("productPrice", "Contact Us")
                    avail = "In Stock" if p.get("isAvailable", True) else "Out of Stock"
                    summary.append(f"- **{name}**: ${price} ({avail})")
                
                return "Found the following products in store:\n" + "\n".join(summary)
    except Exception as e:
        return f"Could not retrieve real-time catalog: {str(e)}"
    return "Our catalog features high-end gaming laptops, smart audio devices, and computer peripherals."

@tool
async def check_order_status(order_id: str) -> str:
    """Checks the live fulfillment and delivery tracking status of a customer order given its Order ID.
    Use this tool when a customer asks 'Where is my order?', 'What is the status of order XYZ?', etc.
    """
    clean_id = order_id.strip().replace("#", "")
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(f"{BACKEND_URL}/api/orders/{clean_id}")
            if res.status_code == 200:
                order = res.json()
                status = order.get("status", "Processing")
                total = order.get("totalAmount", order.get("total", "N/A"))
                created = order.get("createdAt", "Recent")
                items = len(order.get("items", []))
                return f"Order #{clean_id}: Status is **{status}**. Total: ${total}. Items: {items}. Estimated delivery in 3-5 business days."
            elif res.status_code == 404:
                return f"Order #{clean_id} was not found in our database. Please double check your order number or check your account order history."
    except Exception as e:
        return f"Unable to reach order tracking service: {str(e)}"
    return f"Order #{clean_id} is currently being processed by our warehouse."

@tool
async def get_trending_recommendations() -> str:
    """Retrieves top trending electronics and devices based on current market trends.
    Use this tool when a customer asks 'What is trending?', 'What's popular right now?', or wants modern tech suggestions.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(f"{YOUTUBE_TRENDING_URL}/trending")
            if res.status_code == 200:
                data = res.json()
                items = data if isinstance(data, list) else data.get("trending", [])
                if items:
                    formatted = [f"{i+1}. {item.get('title', 'Trending Tech')} ({item.get('category', 'Electronics')})" for i, item in enumerate(items[:3])]
                    return "Current Top Trending Electronics:\n" + "\n".join(formatted)
    except Exception:
        pass
    return "Top Trending Items: 1. AI Gaming Laptops & GPUs 2. ANC Wireless Earbuds 3. RGB Mechanical Keyboards"


# ────────────────── Support Agent Class ──────────────────

SYSTEM_PROMPT = """You are the official AI Support & Personal Shopping Assistant for "I-Computers", a premier tech and electronics e-commerce store.
You have direct access to tools for checking live store products, order statuses, store policies, and trending recommendations.

Guidelines:
1. Be polite, concise, professional, and tech-savvy.
2. ALWAYS use the appropriate tool when asked about products, stock, prices, order status, or store policies rather than guessing.
3. If an order ID is mentioned, use check_order_status.
4. Format all responses cleanly using Markdown (bolding, bullet points).
5. Always provide actionable, helpful guidance to help the customer with their purchase.
"""

class SupportAgent:
    def __init__(self):
        self.tools = [store_policies, search_catalog, check_order_status, get_trending_recommendations]
        self.tools_map = {t.name: t for t in self.tools}
        self._init_llm()

    def _init_llm(self):
        if GEMINI_API_KEY:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                raw_llm = ChatGoogleGenerativeAI(
                    model=MODEL_NAME,
                    google_api_key=GEMINI_API_KEY,
                    temperature=0.4,
                )
                self.llm_with_tools = raw_llm.bind_tools(self.tools)
            except Exception as e:
                print(f"Warning: Failed to bind tools to ChatGoogleGenerativeAI: {e}")
                self.llm_with_tools = None
        else:
            self.llm_with_tools = None

    async def answer(self, user_message: str, history: Optional[List[Dict[str, str]]] = None) -> str:
        if not self.llm_with_tools:
            # Graceful fallback response
            msg_lower = user_message.lower()
            if "shipping" in msg_lower or "delivery" in msg_lower:
                return store_policies.invoke("shipping")
            elif "return" in msg_lower or "refund" in msg_lower:
                return store_policies.invoke("returns")
            elif "trend" in msg_lower:
                return await get_trending_recommendations.ainvoke({})
            elif "order" in msg_lower:
                return "Please provide your Order ID (e.g. #ORD12345) and I will check the delivery status for you!"
            else:
                return f"Welcome to I-Computers! We offer the latest computers, gaming gear, and tech gadgets. How can I help you today?"

        messages = [SystemMessage(content=SYSTEM_PROMPT)]

        # Append previous conversation turns if provided
        if history:
            for turn in history[-6:]: # Keep last 3 exchanges for context efficiency
                role = turn.get("role", "user")
                text = turn.get("text", "")
                if role == "user":
                    messages.append(HumanMessage(content=text))
                else:
                    messages.append(AIMessage(content=text))

        messages.append(HumanMessage(content=user_message))

        try:
            # First LLM invocation (may request tool calls)
            ai_msg = await self.llm_with_tools.ainvoke(messages)
            messages.append(ai_msg)

            # If tool calls were triggered, execute them and re-invoke LLM
            if hasattr(ai_msg, "tool_calls") and ai_msg.tool_calls:
                for tool_call in ai_msg.tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]
                    selected_tool = self.tools_map.get(tool_name)
                    if selected_tool:
                        if hasattr(selected_tool, "ainvoke"):
                            tool_res = await selected_tool.ainvoke(tool_args)
                        else:
                            tool_res = selected_tool.invoke(tool_args)
                        from langchain_core.messages import ToolMessage
                        messages.append(ToolMessage(
                            tool_call_id=tool_call["id"],
                            name=tool_name,
                            content=str(tool_res)
                        ))
                
                # Second invocation with tool outputs
                final_ai_msg = await self.llm_with_tools.ainvoke(messages)
                return final_ai_msg.content
            else:
                return ai_msg.content
        except Exception as e:
            print(f"Error in LangChain SupportAgent: {e}")
            return f"Thank you for contacting I-Computers! I'm currently unable to access our live catalog tool, but our standard shipping is 3-5 business days with a 30-day return policy. How else may I assist you?"
