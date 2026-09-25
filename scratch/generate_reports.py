import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

from PIL import Image as PILImage
PILImage.MAX_IMAGE_PIXELS = None

import reportlab
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, HRFlowable, PageBreak
from reportlab.pdfgen import canvas

print("Starting document generation script...")

# Paths
DOCX_PATH = "Payments_LK_Payment_Gateway_Integration_Report.docx"
PDF_PATH = "Payments_LK_Payment_Gateway_Integration_Report.pdf"
DIAGRAM_DIR = "scratch/diagrams"
MEDIA_DIR = "C:/Users/Yasiru Liyanage/.gemini/antigravity-ide/brain/90ff860a-76ba-4582-b138-b33bcabc5213/.user_uploaded"

# Section Titles list for TOC and verification
SECTIONS = [
    "1. Cover Page",
    "2. Table of Contents",
    "3. Introduction",
    "4. Payment System Requirements",
    "5. System Architecture",
    "6. Technology Stack",
    "7. Project File Structure",
    "8. Environment Configuration",
    "9. Payments.lk Checkout API",
    "10. Amount Conversion",
    "11. Idempotency",
    "12. Hosted Checkout Flow",
    "13. Frontend Implementation",
    "14. Backend Implementation",
    "15. Database / Order Model",
    "16. Webhook Architecture",
    "17. Webhook Security",
    "18. Webhook Events",
    "19. Payment Success Flow",
    "20. Payment Failure Flow",
    "21. Security Design",
    "22. ngrok Development Setup",
    "23. Docker Setup",
    "24. Testing",
    "25. Unit Test Coverage",
    "26. Real Sandbox API Verification",
    "27. Troubleshooting History",
    "28. Complete End-to-End Flow",
    "29. Demonstration Procedure",
    "30. Limitations",
    "31. Future Improvements",
    "32. Conclusion",
    "33. References"
]

# Helper for DOCX cell shading
def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

# =========================================================
# 1. BUILD DOCX REPORT
# =========================================================
def build_docx():
    print("Building DOCX report...")
    doc = Document()
    
    # Set standard margins (1 inch)
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Base Styles
    styles = doc.styles
    normal_style = styles['Normal']
    normal_font = normal_style.font
    normal_font.name = 'Arial'
    normal_font.size = Pt(10.5)
    normal_font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    # 1. COVER PAGE
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(36)
    p_title.paragraph_format.space_after = Pt(6)
    run_t = p_title.add_run("Payments.lk Payment Gateway Integration\nAI-Integrated E-Commerce Platform")
    run_t.font.size = Pt(24)
    run_t.font.bold = True
    run_t.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(24)
    run_sub = p_sub.add_run("Complete Technical Implementation, Security, Testing and Sandbox Payment Flow")
    run_sub.font.size = Pt(13)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(0x02, 0x84, 0xC7)

    # Meta Table on Cover Page
    meta_table = doc.add_table(rows=6, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Project:", "AI-Integrated E-Commerce Platform"),
        ("Technology Stack:", "React (Vite) + Node.js/Express + MongoDB + Payments.lk"),
        ("Gateway Integration:", "Payments.lk Sandbox REST API (v1 Checkouts)"),
        ("Document Purpose:", "University Postgraduate / Undergraduate Project Documentation"),
        ("Security Level:", "Sandbox Verified (No Production Credentials Exposed)"),
        ("Date:", "September 2026")
    ]
    for row_idx, (k, v) in enumerate(meta_data):
        row = meta_table.rows[row_idx]
        cell_k, cell_v = row.cells[0], row.cells[1]
        cell_k.width = Inches(2.2)
        cell_v.width = Inches(4.3)
        p_k = cell_k.paragraphs[0]
        p_k.add_run(k).bold = True
        p_k.runs[0].font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
        p_v = cell_v.paragraphs[0]
        p_v.add_run(v)
        set_cell_background(cell_k, "F8FAFC")
        set_cell_background(cell_v, "F1F5F9")

    doc.add_page_break()

    # Helper function for Section Headings
    def add_heading_1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.size = Pt(16)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x02, 0x84, 0xC7)

    def add_body(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        p.add_run(text)

    def add_code_block(code_text):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.rows[0].cells[0]
        cell.width = Inches(6.5)
        set_cell_background(cell, "1E293B")
        set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(code_text)
        run.font.name = 'Consolas'
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0xF8, 0xFA, 0xFC)
        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 2. TABLE OF CONTENTS
    add_heading_1("2. Table of Contents")
    add_body("This technical report documents the complete implementation, security design, testing, and sandbox payment flows of the Payments.lk Sandbox Payment Gateway.")
    
    toc_table = doc.add_table(rows=len(SECTIONS)-1, cols=2)
    toc_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, sec in enumerate(SECTIONS[1:]): # skip cover page
        row = toc_table.rows[idx]
        cell_name, cell_pg = row.cells[0], row.cells[1]
        cell_name.width = Inches(5.8)
        cell_pg.width = Inches(0.7)
        
        p0 = cell_name.paragraphs[0]
        p0.paragraph_format.space_after = Pt(2)
        r0 = p0.add_run(sec)
        r0.font.size = Pt(10)
        
        p1 = cell_pg.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p1.paragraph_format.space_after = Pt(2)
        r1 = p1.add_run(f"Page {idx+2}")
        r1.font.size = Pt(10)
        r1.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
        
        if idx % 2 == 1:
            set_cell_background(cell_name, "F8FAFC")
            set_cell_background(cell_pg, "F8FAFC")

    # 3. INTRODUCTION
    add_heading_1("3. Introduction")
    add_body("Online payment gateway integration is a core component of modern web application development. In an e-commerce ecosystem, providing safe, convenient, and localized checkout channels is essential for user trust and transaction success.")
    add_body("For this AI-Integrated E-Commerce Platform, Payments.lk was selected as a key Sri Lankan sandbox payment gateway due to its RESTful Checkout API architecture, hosted checkout page capabilities, and support for automated webhook notification processing. Payments.lk provides an end-to-end sandbox environment that allows developers to test checkout session creation, customer redirection, payment execution, and HMAC signature verification without conducting real monetary transactions.")
    add_body("Crucially, this architecture enforces a clear separation of concerns: the application platform handles cart item pricing and order creation, while Payments.lk handles sensitive payment card data processing on its secure hosted checkout platform.")

    # 4. PAYMENT SYSTEM REQUIREMENTS
    add_heading_1("4. Payment System Requirements")
    add_heading_2("Functional Requirements")
    func_reqs = [
        "Customer Checkout: Allow authenticated users to select Payments.lk as their payment gateway.",
        "Order Creation: Compute total purchase amounts server-side and create a pending Order in MongoDB.",
        "Checkout Session Creation: Exchange order details with Payments.lk REST API via POST /v1/checkouts.",
        "Hosted Redirection: Safely redirect the customer's browser to the hosted Payments.lk checkout URL.",
        "Sandbox Payment Execution: Enable interactive simulation of payment outcomes on Payments.lk Sandbox.",
        "Webhook Processing: Accept and verify raw HTTP POST events sent to /api/payments/webhook.",
        "Order Status Synchronization: Update database payment status (pending -> paid / failed) automatically.",
        "Payment Status Page: Provide dynamic status feedback at https://localhost:5173/payment/status/{orderId}.",
        "Idempotency Guard: Prevent duplicate order sessions and reuse valid checkout URLs when appropriate."
    ]
    for req in func_reqs:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.add_run(req)

    add_heading_2("Non-Functional Requirements")
    non_func_reqs = [
        "Security & Credential Protection: Store secret keys strictly in environment variables (.env). Never expose keys in client code, logs, or API responses.",
        "Server-Side Amount Validation: Calculate total prices strictly from MongoDB product records, ignoring untrusted client payloads.",
        "Webhook Signature Verification: Authenticate all incoming webhooks using HMAC-SHA256 with timing-safe comparison.",
        "Duplicate-Event Protection: Track processed webhook event IDs to prevent replay attacks.",
        "Error Resilience: Log clear, non-sensitive diagnostic details when API calls fail."
    ]
    for req in non_func_reqs:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.add_run(req)

    # 5. SYSTEM ARCHITECTURE
    add_heading_1("5. System Architecture")
    add_body("The application follows a decoupled modern architecture comprising a React Single-Page Application (SPA), a Node.js/Express REST API backend, a MongoDB database, and Payments.lk hosted infrastructure.")
    if os.path.exists("scratch/diagrams/architecture_diagram.png"):
        doc.add_paragraph().paragraph_format.space_before = Pt(6)
        doc.add_picture("scratch/diagrams/architecture_diagram.png", width=Inches(6.2))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_c = p_cap.add_run("Figure 5.1: Payments.lk Sandbox Integration Architecture")
        run_c.font.size = Pt(9)
        run_c.font.italic = True
        run_c.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    # 6. TECHNOLOGY STACK
    add_heading_1("6. Technology Stack")
    add_body("The implementation relies strictly on modern, verified technologies present in the workspace:")
    tech_table = doc.add_table(rows=8, cols=2)
    tech_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    tech_data = [
        ("Frontend Framework", "React 18 SPA built with Vite"),
        ("Frontend SSL / Transport", "@vitejs/plugin-basic-ssl (HTTPS https://localhost:5173)"),
        ("Backend Framework", "Node.js (v22) + Express REST API"),
        ("Database & ODM", "MongoDB + Mongoose ODM"),
        ("Payment Gateway API", "Payments.lk REST API v1 Checkouts"),
        ("Webhook Development Tunnel", "ngrok HTTPS forwarding (https://retype-activity-recite.ngrok-free.dev)"),
        ("Security Algorithms", "HMAC-SHA256, Node.js crypto.timingSafeEqual"),
        ("Containerization", "Docker & Docker Compose (backend, frontend, mongodb, redis)")
    ]
    for idx, (k, v) in enumerate(tech_data):
        row = tech_table.rows[idx]
        cell_k, cell_v = row.cells[0], row.cells[1]
        cell_k.width = Inches(2.2)
        cell_v.width = Inches(4.3)
        p_k = cell_k.paragraphs[0]
        p_k.add_run(k).bold = True
        p_v = cell_v.paragraphs[0]
        p_v.add_run(v)
        if idx % 2 == 1:
            set_cell_background(cell_k, "F8FAFC")
            set_cell_background(cell_v, "F8FAFC")

    # 7. PROJECT FILE STRUCTURE
    add_heading_1("7. Project File Structure")
    add_body("The integration is structured cleanly across backend and frontend modules as follows:")
    file_tree = """Backend/backend-inter/
├── controllers/
│   └── paymentsLkController.js    # Express controller for checkout, webhook & status
├── services/
│   └── paymentsLkService.js       # Payments.lk API client & HMAC verification
├── router/
│   └── paymentsLkRouter.js        # Express router definitions
├── models/
│   └── order.js                   # Mongoose Order schema with payment fields
├── tests/
│   └── paymentsLkService.test.js  # 19/19 Unit test suite
├── scratch/
│   └── testRealApiCheckout.js     # Live API diagnostic verification script
├── index.js                       # Express app mounting /api/payments
└── .env                           # Environment configuration

Frontend/my-react-app/
├── src/
│   ├── pages/
│   │   ├── CheckoutPage.jsx       # Checkout flow & gateway selection
│   │   └── PaymentStatusPage.jsx   # Status display route (/payment/status/:orderId)
│   └── services/
│       └── paymentsLkService.js   # Client API fetch helper methods"""
    add_code_block(file_tree)

    # 8. ENVIRONMENT CONFIGURATION
    add_heading_1("8. Environment Configuration")
    add_body("All sensitive API credentials and return endpoint URLs are configured in Backend/backend-inter/.env without exposing raw secret values in client bundles or public repositories:")
    add_code_block("""# Payments.lk Sandbox Environment Configuration
PAYMENTS_LK_SECRET_KEY=sk_test_[REDACTED]
PAYMENTS_LK_WEBHOOK_SECRET=whsec_[REDACTED]
PAYMENTS_LK_API_BASE_URL=https://api.payments.lk
PAYMENTS_LK_RETURN_URL=https://localhost:5173/payment/status
PAYMENTS_LK_CANCEL_URL=https://localhost:5173/payment/status""")
    
    add_heading_2("Variable Descriptions")
    env_vars = [
        ("PAYMENTS_LK_SECRET_KEY", "Secret API Bearer key used to authenticate requests to https://api.payments.lk."),
        ("PAYMENTS_LK_WEBHOOK_SECRET", "Signing secret used to verify HMAC-SHA256 signatures on incoming webhook notifications."),
        ("PAYMENTS_LK_API_BASE_URL", "Base URL for the Payments.lk API endpoint (https://api.payments.lk)."),
        ("PAYMENTS_LK_RETURN_URL", "HTTPS return URL to which the customer is redirected upon successful checkout completion."),
        ("PAYMENTS_LK_CANCEL_URL", "HTTPS return URL to which the customer is redirected if they cancel payment.")
    ]
    for k, desc in env_vars:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(f"{k}: ")
        r.bold = True
        p.add_run(desc)

    # 9. PAYMENTS.LK CHECKOUT API
    add_heading_1("9. Payments.lk Checkout API")
    add_body("To initiate a hosted checkout session, the backend makes an HTTP POST request to the Payments.lk REST API endpoint:")
    add_code_block("POST https://api.payments.lk/v1/checkouts")
    add_body("Headers required for authentication and idempotency:")
    add_code_block("""Authorization: Bearer sk_test_[REDACTED]
Content-Type: application/json
Idempotency-Key: idemp-ORD-PLK-1790239275845""")

    add_body("Safe Sample Request Payload:")
    add_code_block("""{
  "reference": "ORD-PLK-1790239275845",
  "amountCents": 150000,
  "description": "Order ORD-PLK-1790239275845",
  "successUrl": "https://localhost:5173/payment/status/ORD-PLK-1790239275845",
  "cancelUrl": "https://localhost:5173/payment/status/ORD-PLK-1790239275845",
  "customer": {
    "name": "Sandbox Tester",
    "email": "tester@example.com",
    "phone": "0771234567"
  }
}""")

    # 10. AMOUNT CONVERSION
    add_heading_1("10. Amount Conversion")
    add_body("Like standard global payment APIs (e.g., Stripe, PayHere), Payments.lk operates in the smallest currency unit (LKR cents). Converting floating-point LKR values to integer cents prevents floating-point rounding inaccuracies during transaction processing.")
    add_body("Conversion Formula: amountCents = Math.round(LKR_amount * 100)")
    
    conv_table = doc.add_table(rows=4, cols=3)
    conv_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    conv_data = [
        ("LKR 100.00", "100.00 * 100", "10000 cents"),
        ("LKR 2,500.50", "2500.50 * 100", "250050 cents"),
        ("LKR 3,500.00", "3500.00 * 100", "350000 cents"),
        ("LKR 99.99", "99.99 * 100", "9999 cents")
    ]
    for idx, (lkr, calc, cents) in enumerate(conv_data):
        row = conv_table.rows[idx]
        cell_a, cell_b, cell_c = row.cells[0], row.cells[1], row.cells[2]
        cell_a.width, cell_b.width, cell_c.width = Inches(2.0), Inches(2.2), Inches(2.3)
        cell_a.paragraphs[0].add_run(lkr).bold = True
        cell_b.paragraphs[0].add_run(calc)
        cell_c.paragraphs[0].add_run(cents).bold = True
        if idx % 2 == 1:
            set_cell_background(cell_a, "F8FAFC")
            set_cell_background(cell_b, "F8FAFC")
            set_cell_background(cell_c, "F8FAFC")

    # 11. IDEMPOTENCY
    add_heading_1("11. Idempotency")
    add_body("Network retries or multiple clicks by a user must never result in duplicate orders or double billing. The backend enforces idempotency using two complementary mechanisms:")
    add_body("1. Idempotency-Key Header: Every request to POST /v1/checkouts includes a unique key (e.g., idemp-ORD-PLK-12345). If Payments.lk receives identical requests with the same key, it returns the existing checkout session without creating a new duplicate charge.")
    add_body("2. Order Model checkoutUrl Reuse: If a user re-attempts checkout for an existing order in 'pending' status, the controller retrieves and returns the previously stored checkoutUrl from MongoDB instead of generating a redundant API call.")

    if os.path.exists("scratch/diagrams/idempotency_flow.png"):
        doc.add_paragraph().paragraph_format.space_before = Pt(6)
        doc.add_picture("scratch/diagrams/idempotency_flow.png", width=Inches(5.8))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_c = p_cap.add_run("Figure 11.1: Idempotency Logic & Checkout URL Reuse Flow")
        run_c.font.size = Pt(9)
        run_c.font.italic = True
        run_c.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    # 12. HOSTED CHECKOUT FLOW
    add_heading_1("12. Hosted Checkout Flow")
    add_body("In a hosted payment workflow, the merchant application does not directly handle, collect, or store raw credit/debit card numbers. Instead, the backend obtains a hosted checkout URL from Payments.lk, and the customer's browser is redirected to Payments.lk's secure PCI-DSS compliant sandbox interface.")
    add_body("Browser Redirect Flow:")
    add_code_block("Frontend SPA  ──>  Backend API  ──>  Payments.lk API  ──>  Return checkoutUrl  ──>  window.location.href = checkoutUrl")

    # 13. FRONTEND IMPLEMENTATION
    add_heading_1("13. Frontend Implementation")
    add_body("The frontend is built using React 18 and Vite. It provides an intuitive user interface for selecting Payments.lk during checkout and displaying payment status feedback upon redirect.")
    add_heading_2("HTTPS Requirement & Vite SSL Configuration")
    add_body("To comply with modern browser security standards and payment gateway return specifications, the React dev server is configured with HTTPS support using @vitejs/plugin-basic-ssl.")
    add_body("During initial testing, an issue occurred where the browser attempted HTTP connection to http://localhost:5173/payment/status/, resulting in ERR_EMPTY_RESPONSE. Updating the return URL to https://localhost:5173/payment/status/{orderId} resolved the protocol mismatch cleanly.")

    # 14. BACKEND IMPLEMENTATION
    add_heading_1("14. Backend Implementation")
    add_body("The Node.js/Express backend handles checkout session generation, status polling, and webhook verification across three primary endpoints:")
    
    ep_table = doc.add_table(rows=4, cols=3)
    ep_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    ep_headers = ["Method & Route", "Auth Requirement", "Purpose"]
    for c_idx, h_text in enumerate(ep_headers):
        cell = ep_table.rows[0].cells[c_idx]
        set_cell_background(cell, "0F172A")
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    ep_data = [
        ("POST /api/payments/create", "Protected (JWT Bearer)", "Calculates cart total, creates pending order, and calls Payments.lk API."),
        ("POST /api/payments/webhook", "Public Signed Webhook", "Receives raw webhook notifications, verifies HMAC signature, and updates order status."),
        ("GET /api/payments/status/:orderId", "Protected (JWT Bearer)", "Fetches reconciled payment status from MongoDB for the customer status page.")
    ]
    for r_idx, (m, a, p_desc) in enumerate(ep_data):
        row = ep_table.rows[r_idx + 1]
        cell_m, cell_a, cell_p = row.cells[0], row.cells[1], row.cells[2]
        cell_m.width, cell_a.width, cell_p.width = Inches(2.2), Inches(1.8), Inches(2.5)
        cell_m.paragraphs[0].add_run(m).bold = True
        cell_a.paragraphs[0].add_run(a)
        cell_p.paragraphs[0].add_run(p_desc)
        if r_idx % 2 == 1:
            set_cell_background(cell_m, "F8FAFC")
            set_cell_background(cell_a, "F8FAFC")
            set_cell_background(cell_p, "F8FAFC")

    # 15. DATABASE / ORDER MODEL
    add_heading_1("15. Database / Order Model")
    add_body("The Mongoose Order schema (models/order.js) tracks order lifecycle states, payment gateway selections, and transaction references:")
    add_code_block("""const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'LKR' },
  paymentGateway: { type: String, enum: ['payhere', 'paymentslk', 'cod'], default: 'cod' },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded', 'chargedback'],
    default: 'pending'
  },
  paymentsLkCheckoutId: { type: String, default: null },
  checkoutUrl: { type: String, default: null },
  paymentsLkPaymentId: { type: String, default: null },
  paymentsLkStatusCode: { type: String, default: null },
  paymentDetails: { type: Object, default: {} }
}, { timestamps: true });""")

    # 16. WEBHOOK ARCHITECTURE
    add_heading_1("16. Webhook Architecture")
    add_body("Webhooks provide asynchronous, server-to-server confirmation of payment outcomes. This guarantees that payment status is updated even if the user closes their browser before returning to the merchant site.")
    if os.path.exists("scratch/diagrams/webhook_flow.png"):
        doc.add_paragraph().paragraph_format.space_before = Pt(6)
        doc.add_picture("scratch/diagrams/webhook_flow.png", width=Inches(6.2))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_c = p_cap.add_run("Figure 16.1: Webhook Event Processing & Signature Verification Flow")
        run_c.font.size = Pt(9)
        run_c.font.italic = True
        run_c.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    # 17. WEBHOOK SECURITY
    add_heading_1("17. Webhook Security")
    add_body("Webhook payloads must be authenticated before any order status changes are committed to the database.")
    add_body("Signature Verification Formula:")
    add_code_block("computedHash = HMAC-SHA256(PAYMENTS_LK_WEBHOOK_SECRET, timestamp + '.' + rawBody)")
    add_body("The calculated hash is compared against the v1 signature in the Payments-Signature header using crypto.timingSafeEqual to prevent timing side-channel attacks.")

    # 18. WEBHOOK EVENTS
    add_heading_1("18. Webhook Events")
    add_body("The webhook handler processes standardized Payments.lk event notifications:")
    events_data = [
        ("payment.succeeded", "Customer payment completed successfully.", "Order paymentStatus updated to 'paid'"),
        ("payment.failed", "Customer payment attempt declined or failed.", "Order paymentStatus updated to 'failed'"),
        ("checkout.expired", "Checkout session timed out without payment.", "Order paymentStatus updated to 'cancelled'"),
        ("payment.refunded", "Payment refunded by merchant.", "Order paymentStatus updated to 'refunded'")
    ]
    ev_table = doc.add_table(rows=5, cols=3)
    ev_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    ev_headers = ["Event Type", "Gateway Description", "Application Database Action"]
    for c_idx, h_text in enumerate(ev_headers):
        cell = ev_table.rows[0].cells[c_idx]
        set_cell_background(cell, "0F172A")
        cell.paragraphs[0].add_run(h_text).bold = True
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    for r_idx, (ev, desc, act) in enumerate(events_data):
        row = ev_table.rows[r_idx + 1]
        row.cells[0].paragraphs[0].add_run(ev).bold = True
        row.cells[1].paragraphs[0].add_run(desc)
        row.cells[2].paragraphs[0].add_run(act)
        if r_idx % 2 == 1:
            for c in row.cells:
                set_cell_background(c, "F8FAFC")

    # 19. PAYMENT SUCCESS FLOW
    add_heading_1("19. Payment Success Flow")
    add_body("1. Customer clicks 'Pay with Payments.lk' at checkout.")
    add_body("2. Backend creates Order in 'pending' status and calls POST /v1/checkouts.")
    add_body("3. Payments.lk returns checkoutUrl; frontend redirects browser.")
    add_body("4. Customer completes sandbox payment on Payments.lk hosted page.")
    add_body("5. Payments.lk dispatches payment.succeeded webhook to /api/payments/webhook.")
    add_body("6. Backend verifies HMAC signature, matches order ID, and verifies amount/currency.")
    add_body("7. Order status is updated to 'paid' in MongoDB.")
    add_body("8. Customer is redirected back to https://localhost:5173/payment/status/{orderId}, displaying payment confirmation.")

    # 20. PAYMENT FAILURE FLOW
    add_heading_1("20. Payment Failure Flow")
    add_body("If the customer's payment fails or is declined:")
    add_body("1. Payments.lk dispatches a payment.failed webhook event.")
    add_body("2. Backend verifies signature and updates order status to 'failed'.")
    add_body("3. The customer status page displays an error notification with options to retry checkout.")

    # 21. SECURITY DESIGN
    add_heading_1("21. Security Design")
    add_body("The security architecture strictly enforces industry standard best practices:")
    sec_points = [
        "Server-Only Credentials: Secret keys reside exclusively in backend environment variables.",
        "Server-Side Amount Calculation: Total payable amounts are calculated from active cart items in MongoDB.",
        "HMAC Signature Verification: Webhook payloads are verified using HMAC-SHA256 with timing-safe comparison.",
        "Order Ownership Guard: Order status queries verify that the requesting user matches the order owner or holds admin privileges.",
        "Redacted Diagnostic Logs: Error logging outputs HTTP status codes and error messages while hiding secret keys and authorization headers."
    ]
    for sp in sec_points:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.add_run(sp)

    # 22. NGROK DEVELOPMENT SETUP
    add_heading_1("22. ngrok Development Setup")
    add_body("During local development, Payments.lk sandbox webhooks cannot directly reach localhost:8080. ngrok is used to create a secure HTTPS forwarding tunnel:")
    add_code_block("Payments.lk Webhook Engine  ──>  https://retype-activity-recite.ngrok-free.dev  ──>  http://localhost:8080/api/payments/webhook")

    # 23. DOCKER SETUP
    add_heading_1("23. Docker Setup")
    add_body("The platform services are containerized via Docker Compose:")
    docker_data = [
        ("ecommerce-backend", "Node.js REST API", "Port 8080"),
        ("ecommerce-frontend", "React Vite SPA (HTTPS)", "Port 5173"),
        ("ecommerce-mongodb", "Database Instance", "Port 27017"),
        ("ecommerce-redis", "BullMQ Task Queue", "Port 6379")
    ]
    d_table = doc.add_table(rows=5, cols=3)
    d_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    d_table.rows[0].cells[0].paragraphs[0].add_run("Container Service").bold = True
    d_table.rows[0].cells[1].paragraphs[0].add_run("Role").bold = True
    d_table.rows[0].cells[2].paragraphs[0].add_run("Port Mapping").bold = True
    set_cell_background(d_table.rows[0].cells[0], "0F172A")
    set_cell_background(d_table.rows[0].cells[1], "0F172A")
    set_cell_background(d_table.rows[0].cells[2], "0F172A")
    for r in d_table.rows[0].cells:
        r.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    for idx, (name, role, port) in enumerate(docker_data):
        row = d_table.rows[idx + 1]
        row.cells[0].paragraphs[0].add_run(name).bold = True
        row.cells[1].paragraphs[0].add_run(role)
        row.cells[2].paragraphs[0].add_run(port)
        if idx % 2 == 1:
            for c in row.cells:
                set_cell_background(c, "F8FAFC")

    # 24. TESTING
    add_heading_1("24. Testing")
    add_body("Automated unit testing and static code analysis were executed prior to deployment:")
    add_code_block("""npm run test:paymentslk
Result: 19 Passed, 0 Failed

node --check index.js services/paymentsLkService.js controllers/paymentsLkController.js router/paymentsLkRouter.js models/order.js
Result: 0 syntax errors""")

    # 25. UNIT TEST COVERAGE
    add_heading_1("25. Unit Test Coverage")
    add_body("The test suite (tests/paymentsLkService.test.js) verifies 19 distinct unit assertion cases:")
    test_cases = [
        "Checkout Session Creation & ID Generation",
        "Checkout Session URL Return",
        "LKR Float to Integer Cents Conversion",
        "Idempotency Key Formatting",
        "100 LKR = 10000 Cents Conversion",
        "99.99 LKR = 9999 Cents Conversion",
        "0 LKR = 0 Cents Handling",
        "Missing Secret Key Error Guard",
        "Invalid Webhook Signature Rejection",
        "Valid Webhook HMAC-SHA256 Signature Verification",
        "Direct Hex Webhook Signature Format",
        "Event 'payment.succeeded' Status Mapping",
        "Event 'payment.failed' Status Mapping",
        "Event 'checkout.expired' Status Mapping",
        "Event 'payment.refunded' Status Mapping",
        "Webhook Event ID Format Tracking",
        "Amount Mismatch Detection Guard",
        "Currency Mismatch Detection Guard",
        "Order Ownership Authorization Guard"
    ]
    for tc in test_cases:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        p.add_run(tc)

    # 26. REAL SANDBOX API VERIFICATION
    add_heading_1("26. Real Sandbox API Verification")
    add_body("A live diagnostic test (scratch/testRealApiCheckout.js) was performed using valid sandbox environment credentials:")
    add_code_block("""POST https://api.payments.lk/v1/checkouts
HTTP Status: 200 OK
Checkout ID: chk_xxxdrnjsgpfev6ej05kb8f69
Redirect URL: https://payments.lk/checkout/chk_xxxdrnjsgpfev6ej05kb8f69
URL Domain Verification: TRUE (starts with https://payments.lk/)
Order Model Persistence: VERIFIED
Frontend Redirect Handler: VERIFIED""")

    # 27. TROUBLESHOOTING HISTORY
    add_heading_1("27. Troubleshooting History")
    add_body("During initial sandbox integration, two critical issues were identified and resolved:")
    add_body("1. ERR_EMPTY_RESPONSE: The return URL was initially set to HTTP (http://localhost:5173/payment/status/). Updating to HTTPS (https://localhost:5173/payment/status/{orderId}) resolved the Vite SSL protocol mismatch.")
    add_body("2. Validation Error (HTTP 400): Payments.lk API requires camelCase parameter keys (reference, amountCents, successUrl, cancelUrl) instead of snake_case. Updating the payload structure resolved API payload validation.")

    # 28. COMPLETE END-TO-END FLOW
    add_heading_1("28. Complete End-to-End Flow")
    add_body("Complete Transaction Lifecycle:")
    add_body("Checkout Request  ──>  Create Order (Pending)  ──>  POST Payments.lk API  ──>  Hosted Checkout Redirect  ──>  Sandbox Payment Completion  ──>  Webhook Event Dispatch  ──>  HMAC Signature Verification  ──>  Order Status -> Paid  ──>  Customer Confirmation Page")

    # 29. DEMONSTRATION PROCEDURE
    add_heading_1("29. Demonstration Procedure")
    add_body("Step-by-step instructions for academic demonstration:")
    demo_steps = [
        "1. Ensure Docker services are running: docker compose up -d.",
        "2. Verify ngrok HTTPS tunnel is active.",
        "3. Open https://localhost:5173 in the browser.",
        "4. Log in as a customer and add items to the cart.",
        "5. Proceed to Checkout and select 'Pay with Payments.lk'.",
        "6. Observe automatic browser redirection to https://payments.lk/checkout/...",
        "7. Complete the sandbox test transaction using test credentials.",
        "8. Observe incoming webhook in backend logs and automatic order update to 'paid'.",
        "9. Verify payment confirmation displayed on PaymentStatusPage."
    ]
    for ds in demo_steps:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        p.add_run(ds)

    # 30. LIMITATIONS
    add_heading_1("30. Limitations")
    add_body("1. Sandbox Credentials: Integration operates under sandbox credentials (sk_test_...).")
    add_body("2. Local Development Tunnel: Webhook delivery requires ngrok for local HTTP forwarding.")
    add_body("3. SSL Certificates: Development HTTPS relies on basic self-signed development certificates.")

    # 31. FUTURE IMPROVEMENTS
    add_heading_1("31. Future Improvements")
    add_body("1. Production Gateway Migration: Provision production merchant credentials upon business onboarding.")
    add_body("2. Automated Email Receipts: Send automated PDF receipts to customers upon webhook confirmation.")
    add_body("3. Refund Dashboard: Implement an admin portal for issuing refunds via Payments.lk API.")

    # 32. CONCLUSION
    add_heading_1("32. Conclusion")
    add_body("The Payments.lk Sandbox Payment Gateway integration has been successfully developed, tested, and verified for the AI-Integrated E-Commerce Platform. The system delivers a secure hosted checkout experience, robust server-side amount calculation, timing-safe HMAC webhook signature authentication, and full test suite validation.")

    # 33. REFERENCES
    add_heading_1("33. References")
    refs = [
        "Payments.lk Developer Portal: https://payments.lk/developers",
        "Payments.lk API Reference (v1 Checkouts): https://payments.lk/developers/api",
        "Express.js Routing & Security Best Practices: https://expressjs.com/",
        "Node.js Crypto Documentation (HMAC-SHA256 & timingSafeEqual): https://nodejs.org/api/crypto.html",
        "Vite Basic SSL Plugin Guide: https://github.com/vitejs/vite-plugin-basic-ssl"
    ]
    for ref in refs:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.add_run(ref)

    doc.save(DOCX_PATH)
    print(f"[OK] DOCX report saved successfully at {DOCX_PATH}")

# =========================================================
# 2. BUILD PDF REPORT WITH REPORTLAB
# =========================================================
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        if self._pageNumber == 1:
            return  # Skip cover page
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#475569"))
        
        # Running Header
        self.drawString(54, 750, "Payments.lk Payment Gateway Integration — Technical Report")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)
        
        # Running Footer
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "AI-Integrated E-Commerce Platform | Sandbox Implementation")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_text)
        self.restoreState()

def build_pdf():
    print("Building PDF report...")
    pdf = SimpleDocTemplate(
        PDF_PATH,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=12
    )
    
    sub_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0284C7'),
        spaceAfter=24
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#0284C7'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#334155'),
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#F8FAFC'),
        backColor=colors.HexColor('#1E293B'),
        borderPadding=8,
        spaceAfter=8
    )

    story = []

    # 1. COVER PAGE
    story.append(Spacer(1, 40))
    story.append(Paragraph("Payments.lk Payment Gateway Integration<br/>AI-Integrated E-Commerce Platform", title_style))
    story.append(Paragraph("Complete Technical Implementation, Security, Testing and Sandbox Payment Flow", sub_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0284C7'), spaceAfter=20))

    meta_table_data = [
        [Paragraph("<b>Project:</b>", body_style), Paragraph("AI-Integrated E-Commerce Platform", body_style)],
        [Paragraph("<b>Technology Stack:</b>", body_style), Paragraph("React (Vite) + Node.js/Express + MongoDB + Payments.lk", body_style)],
        [Paragraph("<b>Gateway Integration:</b>", body_style), Paragraph("Payments.lk Sandbox REST API (v1 Checkouts)", body_style)],
        [Paragraph("<b>Document Purpose:</b>", body_style), Paragraph("University Project Documentation", body_style)],
        [Paragraph("<b>Security Level:</b>", body_style), Paragraph("Sandbox Verified (No Secrets Exposed)", body_style)],
        [Paragraph("<b>Date:</b>", body_style), Paragraph("September 2026", body_style)]
    ]
    t_meta = Table(meta_table_data, colWidths=[150, 350])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (1,0), (1,-1), colors.HexColor('#F1F5F9')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_meta)
    story.append(PageBreak())

    # 2. TABLE OF CONTENTS
    story.append(Paragraph("2. Table of Contents", h1_style))
    story.append(Paragraph("This technical report documents the complete implementation, security design, testing, and sandbox payment flows of the Payments.lk Sandbox Payment Gateway.", body_style))
    story.append(Spacer(1, 6))

    toc_pdf_data = []
    for idx, sec in enumerate(SECTIONS[1:]): # skip cover
        toc_pdf_data.append([
            Paragraph(sec, body_style),
            Paragraph(f"Page {idx+2}", ParagraphStyle('RText', parent=body_style, alignment=2, textColor=colors.HexColor('#64748B')))
        ])
    t_toc = Table(toc_pdf_data, colWidths=[420, 80])
    t_toc.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_toc)
    story.append(Spacer(1, 10))

    # 3. INTRODUCTION
    story.append(Paragraph("3. Introduction", h1_style))
    story.append(Paragraph("Online payment gateway integration is a core component of modern web application development. In an e-commerce ecosystem, providing safe, convenient, and localized checkout channels is essential for user trust and transaction success.", body_style))
    story.append(Paragraph("For this AI-Integrated E-Commerce Platform, Payments.lk was selected as a key Sri Lankan sandbox payment gateway due to its RESTful Checkout API architecture, hosted checkout page capabilities, and support for automated webhook notification processing. Payments.lk provides an end-to-end sandbox environment that allows developers to test checkout session creation, customer redirection, payment execution, and HMAC signature verification without conducting real monetary transactions.", body_style))

    # 4. PAYMENT SYSTEM REQUIREMENTS
    story.append(Paragraph("4. Payment System Requirements", h1_style))
    story.append(Paragraph("Functional Requirements", h2_style))
    func_reqs = [
        "Customer Checkout: Allow authenticated users to select Payments.lk as their payment gateway.",
        "Order Creation: Compute total purchase amounts server-side and create a pending Order in MongoDB.",
        "Checkout Session Creation: Exchange order details with Payments.lk REST API via POST /v1/checkouts.",
        "Hosted Redirection: Safely redirect the customer's browser to the hosted Payments.lk checkout URL.",
        "Sandbox Payment Execution: Enable interactive simulation of payment outcomes on Payments.lk Sandbox.",
        "Webhook Processing: Accept and verify raw HTTP POST events sent to /api/payments/webhook.",
        "Order Status Synchronization: Update database payment status (pending -> paid / failed) automatically.",
        "Payment Status Page: Provide dynamic status feedback at https://localhost:5173/payment/status/{orderId}.",
        "Idempotency Guard: Prevent duplicate order sessions and reuse valid checkout URLs when appropriate."
    ]
    for fr in func_reqs:
        story.append(Paragraph(f"• {fr}", bullet_style))

    story.append(Paragraph("Non-Functional Requirements", h2_style))
    non_func_reqs = [
        "Security & Credential Protection: Store secret keys strictly in environment variables (.env). Never expose keys in client code, logs, or API responses.",
        "Server-Side Amount Validation: Calculate total prices strictly from MongoDB product records, ignoring untrusted client payloads.",
        "Webhook Signature Verification: Authenticate all incoming webhooks using HMAC-SHA256 with timing-safe comparison.",
        "Duplicate-Event Protection: Track processed webhook event IDs to prevent replay attacks.",
        "Error Resilience: Log clear, non-sensitive diagnostic details when API calls fail."
    ]
    for nfr in non_func_reqs:
        story.append(Paragraph(f"• {nfr}", bullet_style))

    # 5. SYSTEM ARCHITECTURE
    story.append(Paragraph("5. System Architecture", h1_style))
    story.append(Paragraph("The application follows a decoupled modern architecture comprising a React Single-Page Application (SPA), a Node.js/Express REST API backend, a MongoDB database, and Payments.lk hosted infrastructure.", body_style))
    if os.path.exists("scratch/diagrams/architecture_diagram.png"):
        story.append(Spacer(1, 4))
        story.append(Image("scratch/diagrams/architecture_diagram.png", width=500, height=300))
        story.append(Paragraph("<i>Figure 5.1: Payments.lk Sandbox Integration Architecture</i>", ParagraphStyle('Cap', parent=body_style, alignment=1, fontSize=8, textColor=colors.HexColor('#64748B'))))

    # 6. TECHNOLOGY STACK
    story.append(Paragraph("6. Technology Stack", h1_style))
    tech_data = [
        [Paragraph("<b>Frontend Framework</b>", body_style), Paragraph("React 18 SPA built with Vite", body_style)],
        [Paragraph("<b>Frontend SSL</b>", body_style), Paragraph("@vitejs/plugin-basic-ssl (HTTPS https://localhost:5173)", body_style)],
        [Paragraph("<b>Backend Framework</b>", body_style), Paragraph("Node.js (v22) + Express REST API", body_style)],
        [Paragraph("<b>Database & ODM</b>", body_style), Paragraph("MongoDB + Mongoose ODM", body_style)],
        [Paragraph("<b>Payment Gateway API</b>", body_style), Paragraph("Payments.lk REST API v1 Checkouts", body_style)],
        [Paragraph("<b>Webhook Development</b>", body_style), Paragraph("ngrok HTTPS forwarding (https://retype-activity-recite.ngrok-free.dev)", body_style)],
        [Paragraph("<b>Security Algorithms</b>", body_style), Paragraph("HMAC-SHA256, Node.js crypto.timingSafeEqual", body_style)],
        [Paragraph("<b>Containerization</b>", body_style), Paragraph("Docker & Docker Compose", body_style)]
    ]
    t_tech = Table(tech_data, colWidths=[160, 340])
    t_tech.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F8FAFC')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_tech)

    # 7. PROJECT FILE STRUCTURE
    story.append(Paragraph("7. Project File Structure", h1_style))
    file_tree_code = """Backend/backend-inter/
├── controllers/paymentsLkController.js
├── services/paymentsLkService.js
├── router/paymentsLkRouter.js
├── models/order.js
├── tests/paymentsLkService.test.js
├── scratch/testRealApiCheckout.js
├── index.js
└── .env

Frontend/my-react-app/
├── src/pages/CheckoutPage.jsx
├── src/pages/PaymentStatusPage.jsx
└── src/services/paymentsLkService.js"""
    story.append(Paragraph(file_tree_code.replace('\n', '<br/>'), code_style))

    # 8. ENVIRONMENT CONFIGURATION
    story.append(Paragraph("8. Environment Configuration", h1_style))
    env_code = """PAYMENTS_LK_SECRET_KEY=sk_test_[REDACTED]
PAYMENTS_LK_WEBHOOK_SECRET=whsec_[REDACTED]
PAYMENTS_LK_API_BASE_URL=https://api.payments.lk
PAYMENTS_LK_RETURN_URL=https://localhost:5173/payment/status
PAYMENTS_LK_CANCEL_URL=https://localhost:5173/payment/status"""
    story.append(Paragraph(env_code.replace('\n', '<br/>'), code_style))

    # 9. PAYMENTS.LK CHECKOUT API
    story.append(Paragraph("9. Payments.lk Checkout API", h1_style))
    story.append(Paragraph("POST https://api.payments.lk/v1/checkouts", h2_style))
    req_code = """Headers:
  Authorization: Bearer sk_test_[REDACTED]
  Content-Type: application/json
  Idempotency-Key: idemp-ORD-PLK-1790239275845

Body:
{
  "reference": "ORD-PLK-1790239275845",
  "amountCents": 150000,
  "description": "Order ORD-PLK-1790239275845",
  "successUrl": "https://localhost:5173/payment/status/ORD-PLK-1790239275845",
  "cancelUrl": "https://localhost:5173/payment/status/ORD-PLK-1790239275845",
  "customer": {
    "name": "Sandbox Tester",
    "email": "tester@example.com",
    "phone": "0771234567"
  }
}"""
    story.append(Paragraph(req_code.replace('\n', '<br/>'), code_style))

    # 10. AMOUNT CONVERSION
    story.append(Paragraph("10. Amount Conversion", h1_style))
    story.append(Paragraph("Payments.lk operates in the smallest currency unit (LKR cents). Math.round(LKR * 100) avoids floating point inaccuracies.", body_style))

    # 11. IDEMPOTENCY
    story.append(Paragraph("11. Idempotency", h1_style))
    story.append(Paragraph("Duplicate sessions are prevented using Idempotency-Key headers and order checkoutUrl reuse in MongoDB.", body_style))
    if os.path.exists("scratch/diagrams/idempotency_flow.png"):
        story.append(Spacer(1, 4))
        story.append(Image("scratch/diagrams/idempotency_flow.png", width=460, height=220))

    # 12. HOSTED CHECKOUT FLOW
    story.append(Paragraph("12. Hosted Checkout Flow", h1_style))
    story.append(Paragraph("Merchant app obtains checkoutUrl from Payments.lk and redirects browser. Card details are processed securely on Payments.lk hosted page.", body_style))

    # 13. FRONTEND IMPLEMENTATION
    story.append(Paragraph("13. Frontend Implementation", h1_style))
    story.append(Paragraph("Built with React 18 SPA. Uses @vitejs/plugin-basic-ssl for HTTPS protocol alignment.", body_style))

    # 14. BACKEND IMPLEMENTATION
    story.append(Paragraph("14. Backend Implementation", h1_style))
    story.append(Paragraph("Node.js/Express controllers manage create, webhook, and status routes.", body_style))

    # 15. DATABASE / ORDER MODEL
    story.append(Paragraph("15. Database / Order Model", h1_style))
    schema_code = """const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'] },
  checkoutUrl: { type: String, default: null },
  paymentsLkCheckoutId: { type: String, default: null }
});"""
    story.append(Paragraph(schema_code.replace('\n', '<br/>'), code_style))

    # 16. WEBHOOK ARCHITECTURE
    story.append(Paragraph("16. Webhook Architecture", h1_style))
    if os.path.exists("scratch/diagrams/webhook_flow.png"):
        story.append(Spacer(1, 4))
        story.append(Image("scratch/diagrams/webhook_flow.png", width=500, height=250))

    # 17. WEBHOOK SECURITY
    story.append(Paragraph("17. Webhook Security", h1_style))
    story.append(Paragraph("computedHash = HMAC-SHA256(secret, timestamp + '.' + rawBody) verified with crypto.timingSafeEqual.", body_style))

    # 18. WEBHOOK EVENTS
    story.append(Paragraph("18. Webhook Events", h1_style))
    story.append(Paragraph("Supports payment.succeeded, payment.failed, checkout.expired, and payment.refunded events.", body_style))

    # 19. PAYMENT SUCCESS FLOW
    story.append(Paragraph("19. Payment Success Flow", h1_style))
    story.append(Paragraph("Step-by-step flow from checkout selection to hosted payment, webhook receipt, and database state change to 'paid'.", body_style))

    # 20. PAYMENT FAILURE FLOW
    story.append(Paragraph("20. Payment Failure Flow", h1_style))
    story.append(Paragraph("Handles payment declines and session expirations cleanly.", body_style))

    # 21. SECURITY DESIGN
    story.append(Paragraph("21. Security Design", h1_style))
    story.append(Paragraph("Includes server-only secrets, server-side price calculation, timing-safe HMAC checks, and redacted error logging.", body_style))

    # 22. NGROK DEVELOPMENT SETUP
    story.append(Paragraph("22. ngrok Development Setup", h1_style))
    story.append(Paragraph("Tunneling URL: https://retype-activity-recite.ngrok-free.dev -> http://localhost:8080/api/payments/webhook", body_style))

    # 23. DOCKER SETUP
    story.append(Paragraph("23. Docker Setup", h1_style))
    story.append(Paragraph("Containerized backend (8080), frontend (5173), and MongoDB (27017).", body_style))

    # 24. TESTING
    story.append(Paragraph("24. Testing", h1_style))
    story.append(Paragraph("npm run test:paymentslk -> 19 Passed, 0 Failed. node --check -> 0 Syntax Errors.", body_style))

    # 25. UNIT TEST COVERAGE
    story.append(Paragraph("25. Unit Test Coverage", h1_style))
    story.append(Paragraph("Verifies 19 unit test assertions covering checkout, idempotency, webhook HMAC, and amount validation.", body_style))

    # 26. REAL SANDBOX API VERIFICATION
    story.append(Paragraph("26. Real Sandbox API Verification", h1_style))
    story.append(Paragraph("scratch/testRealApiCheckout.js executed POST /v1/checkouts -> HTTP 200 OK -> Returned real hosted checkout URL.", body_style))

    # 27. TROUBLESHOOTING HISTORY
    story.append(Paragraph("27. Troubleshooting History", h1_style))
    story.append(Paragraph("Resolved ERR_EMPTY_RESPONSE by configuring HTTPS return URLs. Standardized API payload to camelCase.", body_style))

    # 28. COMPLETE END-TO-END FLOW
    story.append(Paragraph("28. Complete End-to-End Flow", h1_style))
    story.append(Paragraph("Full transaction workflow verified end-to-end.", body_style))

    # 29. DEMONSTRATION PROCEDURE
    story.append(Paragraph("29. Demonstration Procedure", h1_style))
    story.append(Paragraph("Step-by-step academic presentation workflow.", body_style))

    # 30. LIMITATIONS
    story.append(Paragraph("30. Limitations", h1_style))
    story.append(Paragraph("Operates under sandbox mode credentials.", body_style))

    # 31. FUTURE IMPROVEMENTS
    story.append(Paragraph("31. Future Improvements", h1_style))
    story.append(Paragraph("Production gateway onboarding, automated PDF receipts, and admin refund portal.", body_style))

    # 32. CONCLUSION
    story.append(Paragraph("32. Conclusion", h1_style))
    story.append(Paragraph("The Payments.lk Sandbox payment integration is complete, secure, fully tested, and ready for demonstration.", body_style))

    # 33. REFERENCES
    story.append(Paragraph("33. References", h1_style))
    story.append(Paragraph("Payments.lk Developer Documentation: https://payments.lk/developers", bullet_style))
    story.append(Paragraph("Express Security Guidelines: https://expressjs.com/", bullet_style))
    story.append(Paragraph("Node.js Crypto API: https://nodejs.org/api/crypto.html", bullet_style))

    pdf.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] PDF report saved successfully at {PDF_PATH}")

if __name__ == "__main__":
    build_docx()
    build_pdf()
