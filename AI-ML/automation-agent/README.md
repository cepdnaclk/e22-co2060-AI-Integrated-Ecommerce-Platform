# LangChain Autonomous E-Commerce Operations Agent

This service provides an autonomous agentic brain for the e-commerce platform using **LangChain** and **Google Gemini** (or Anthropic Claude). It coordinates trend analysis, marketing campaigns, customer support, and inventory reordering.

---

## 🤖 Core Agents

### 1. Autonomous Trend-to-Marketing Agent (`agents/marketing_agent.py`)
- **Workflow**:
  1. Queries the YouTube trending service (`/trending`) to discover what electronic gadgets, gaming gear, or audio devices are trending online.
  2. Fetches available products from the store catalog (`/api/products`).
  3. Uses LangChain LCEL (LangChain Expression Language) with Pydantic output parsing to match trending topics with store inventory.
  4. Generates high-converting social media marketing campaigns (Headline, Post Copy with emojis, Hashtags, CTA, and urgency hook).
  5. Can be scheduled via cron or triggered on-demand via the Admin Automation API.

### 2. Tool-Calling Customer Support & Shopping Assistant (`agents/support_agent.py`)
- Upgrades the chatbot into a **LangChain ReAct Agent with Tool Calling**.
- **Equipped Tools**:
  - `store_policies`: Returns real store policies on shipping (3-5 days), 30-day returns, and 1-year warranty.
  - `search_catalog`: Queries live store products, prices, and stock levels.
  - `check_order_status`: Queries order status, delivery progress, and tracking IDs.
  - `get_trending_recommendations`: Recommends top trending electronic products.

### 3. Inventory Restock & Supplier Reorder Agent (`agents/restock_agent.py`)
- Connects inventory levels and ML restock predictions.
- Analyzes stockout risks and automatically drafts formal purchase order inquiry emails for suppliers with suggested order quantities and urgency levels.

---

## 🚀 Running the Service

### Prerequisites
- Python 3.10+
- `GEMINI_API_KEY` (configured in `.env` or system environment)

### 1. Local Run
```bash
cd AI-ML/automation-agent
pip install -r requirements.txt
python main.py
```
The service will start on `http://localhost:8004`.

### 2. Docker Run
Included in the root `docker-compose.yml`:
```bash
docker compose up -d automation-agent
```

---

## 📡 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/health` | `GET` | Service health status and agent readiness |
| `/automation/marketing-options` | `GET` | Available tones, campaign types, audiences, and publish modes |
| `/automation/marketing-campaign` | `POST` | Generates a trend-aligned social marketing campaign with options |
| `/automation/chat` | `POST` | Conversational support with tool execution |
| `/automation/restock-review` | `POST` | Evaluates inventory and drafts supplier reorder emails |

### Supported Campaign & Auto-Post Options

| Option | Type | Example / Values |
|---|---|---|
| `tone` | `string` | `"hype"`, `"professional"`, `"discount_driven"`, `"storytelling"`, `"informative"`, `"humorous"` |
| `campaignType` | `string` | `"product_spotlight"`, `"flash_sale"`, `"deal_of_the_day"`, `"trend_roundup"`, `"buying_guide"` |
| `targetAudience` | `string` | `"tech enthusiasts & gamers"`, `"university students"`, `"remote workers"` |
| `promoCode` | `string` | `"TREND15"`, `"SAVE10"` |
| `discountPercent` | `number` | `10`, `15`, `20` |
| `language` | `string` | `"English"`, `"Sinhala"`, `"Tamil"` |
| `postLength` | `string` | `"short"` (< 50 words), `"medium"` (100-150 words), `"long"` (> 200 words) |
| `mode` | `string` | `"now"` (instant publish), `"schedule"`, `"optimal_time"` (smart peak hour), `"draft"` |
| `customProductId` | `string` | Specific product ID to spotlight from store catalog |
| `trendOverride` | `string` | Custom trending topic override |
| `customImageUrl` | `string` | Custom image URL override |

---

## 🔗 Backend Integration

The Express backend (`Backend/backend-inter`) connects to this service via `AUTOMATION_AGENT_URL=http://automation-agent:8004`:
- `GET /api/facebook/auto-post/options`: Fetch all available presets and options
- `POST /api/facebook/auto-post`: Trigger automated Facebook post with full options
- `GET /api/facebook/auto-post/status`: Check auto-posting status and scheduled queue
- `GET /api/automation/status`: Check agent health
- `POST /api/automation/campaign/generate`: Generate marketing campaign with options
- `POST /api/automation/facebook/auto-post`: End-to-end campaign + Facebook publish
- `POST /api/automation/restock/review`: Review restock suggestions
- `POST /api/chat`: Customer chat automatically routed through LangChain with graceful fallback to direct Gemini
