import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

from PIL import Image as PILImage
PILImage.MAX_IMAGE_PIXELS = None

import reportlab
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

print("Starting expanded technical report builder...")

DOCX_PATH = "Payments_LK_Payment_Gateway_Integration_Report.docx"
PDF_PATH = "Payments_LK_Payment_Gateway_Integration_Report.pdf"

# Global dictionary to store detected starting page numbers for each section
SECTION_PAGES = {}

class TOCPageTrackerCanvas(canvas.Canvas):
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

# Track section flowables
class SectionHeading(Paragraph):
    def __init__(self, text, style, section_id, *args, **kwargs):
        super().__init__(text, style, *args, **kwargs)
        self.section_id = section_id

    def draw(self):
        super().draw()
        page_num = self.canv._pageNumber
        if self.section_id not in SECTION_PAGES:
            SECTION_PAGES[self.section_id] = page_num

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

# =========================================================
# STORY GENERATOR FUNCTION FOR REPORTLAB
# =========================================================
def generate_pdf_story(is_second_pass=False):
    styles = getSampleStyleSheet()
    
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
        spaceBefore=12,
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
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor('#F8FAFC'),
        backColor=colors.HexColor('#1E293B'),
        borderPadding=6,
        spaceAfter=8
    )

    story = []

    def section_h1(title_text, sec_id):
        return SectionHeading(title_text, h1_style, sec_id)

    # 1. COVER PAGE
    story.append(Spacer(1, 40))
    story.append(Paragraph("Payments.lk Payment Gateway Integration<br/>AI-Integrated E-Commerce Platform", title_style))
    story.append(Paragraph("Complete Technical Implementation, Security, Testing and Sandbox Payment Flow", sub_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0284C7'), spaceAfter=20))

    meta_table_data = [
        [Paragraph("<b>Project:</b>", body_style), Paragraph("AI-Integrated E-Commerce Platform", body_style)],
        [Paragraph("<b>Technology Stack:</b>", body_style), Paragraph("React 18 (Vite) + Node.js/Express + MongoDB + Payments.lk", body_style)],
        [Paragraph("<b>Gateway Integration:</b>", body_style), Paragraph("Payments.lk Sandbox REST API (v1 Checkouts)", body_style)],
        [Paragraph("<b>Document Purpose:</b>", body_style), Paragraph("University Project Documentation & Technical Report", body_style)],
        [Paragraph("<b>Security Level:</b>", body_style), Paragraph("Sandbox Verified (No Production Credentials Exposed)", body_style)],
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
    story.append(section_h1("2. Table of Contents", "sec_2"))
    story.append(Paragraph("This technical report documents the complete implementation, security design, testing, and sandbox payment flows of the Payments.lk Sandbox Payment Gateway.", body_style))
    story.append(Spacer(1, 6))

    toc_pdf_data = []
    for idx, sec in enumerate(SECTIONS[1:]): # skip cover
        sec_id = f"sec_{idx+2}"
        page_num_str = str(SECTION_PAGES.get(sec_id, idx + 2)) if is_second_pass else f"Page {idx+2}"
        toc_pdf_data.append([
            Paragraph(sec, body_style),
            Paragraph(f"Page {page_num_str}", ParagraphStyle('RText', parent=body_style, alignment=2, textColor=colors.HexColor('#64748B')))
        ])
    t_toc = Table(toc_pdf_data, colWidths=[420, 80])
    t_toc.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_toc)
    story.append(PageBreak())

    # 3. INTRODUCTION
    story.append(section_h1("3. Introduction", "sec_3"))
    story.append(Paragraph("Online payment gateway integration is a fundamental capability in modern web application engineering. In an e-commerce ecosystem, offering safe, reliable, and localized checkout channels is essential to establishing customer trust, maintaining transaction integrity, and minimizing drop-off during final purchasing.", body_style))
    story.append(Paragraph("For this AI-Integrated E-Commerce Platform, Payments.lk was selected as a primary Sri Lankan sandbox payment gateway due to its modern RESTful Checkout API architecture, hosted checkout page capabilities, and support for automated, cryptographically signed webhook notifications.", body_style))
    story.append(Paragraph("Payments.lk provides a comprehensive sandbox environment that enables developers to simulate checkout session generation, customer browser redirection, sandbox credit card payment execution, and HMAC signature verification without processing real monetary transactions.", body_style))
    story.append(Paragraph("Crucially, this architecture enforces a strict separation of concerns: the merchant e-commerce platform handles cart pricing, inventory locks, and order record creation, while Payments.lk processes sensitive payment card data on its secure PCI-DSS compliant hosted payment platform.", body_style))
    story.append(Spacer(1, 10))

    # 4. PAYMENT SYSTEM REQUIREMENTS
    story.append(section_h1("4. Payment System Requirements", "sec_4"))
    story.append(Paragraph("Functional Requirements", h2_style))
    func_reqs = [
        "Customer Gateway Selection: Enable authenticated buyers to choose Payments.lk as their payment gateway at checkout.",
        "Server-Side Order Creation: Compute total purchase amounts server-side from active Cart items and persist a pending Order in MongoDB.",
        "Checkout Session Generation: Exchange order reference and amount with Payments.lk REST API via POST /v1/checkouts.",
        "Hosted Redirection: Redirect customer browser to the secure hosted Payments.lk checkout URL (https://payments.lk/checkout/...).",
        "Sandbox Payment Simulation: Provide an interactive sandbox checkout experience allowing successful, failed, and cancelled payment testing.",
        "Webhook Event Ingestion: Accept and process raw HTTP POST notifications sent by Payments.lk to /api/payments/webhook.",
        "Order Status Synchronization: Update database payment status (pending -> paid / failed) upon webhook verification.",
        "Payment Status Feedback Page: Provide clear status reporting at https://localhost:5173/payment/status/{orderId}.",
        "Idempotency Protection: Prevent duplicate session generation and reuse existing checkout URLs for pending orders.",
        "Cart Clearing: Automatically empty the user's active shopping cart upon successful payment confirmation.",
        "Authorization Guard: Restrict access to order payment status queries strictly to the order owner or system admin.",
        "Audit Logging: Maintain detailed server-side audit logs for diagnostic monitoring without printing sensitive credentials."
    ]
    for fr in func_reqs:
        story.append(Paragraph(f"• {fr}", bullet_style))

    story.append(Paragraph("Non-Functional Requirements", h2_style))
    non_func_reqs = [
        "Security & Credential Protection: Store secret keys strictly in backend environment variables (.env). Never leak credentials to client bundles, logs, or repositories.",
        "Server-Side Amount Calculation: Compute total order amounts exclusively from MongoDB product records to prevent client-side price tampering.",
        "Webhook HMAC Signature Verification: Authenticate all incoming webhooks using HMAC-SHA256 signature checks with timing-safe comparison.",
        "Replay Protection: Track processed webhook event IDs to prevent duplicate processing of replayed events.",
        "High Availability & Resilience: Implement timeout handling and diagnostic fallback logging for network failures."
    ]
    for nfr in non_func_reqs:
        story.append(Paragraph(f"• {nfr}", bullet_style))
    story.append(PageBreak())

    # 5. SYSTEM ARCHITECTURE
    story.append(section_h1("5. System Architecture", "sec_5"))
    story.append(Paragraph("The application follows a decoupled modern architecture comprising a React Single-Page Application (SPA), a Node.js/Express REST API backend, a MongoDB database, and Payments.lk hosted payment infrastructure.", body_style))
    story.append(Paragraph("The interaction topology involves 6 distinct architectural entities communicating via HTTPS protocols:", body_style))
    story.append(Paragraph("1. React Frontend SPA: Manages UI checkout interactions and status rendering under HTTPS (https://localhost:5173).", bullet_style))
    story.append(Paragraph("2. Node.js / Express Backend API: Executes server-side price calculation, Order persistence, API request dispatching, and Webhook verification (Port 8080).", bullet_style))
    story.append(Paragraph("3. MongoDB Database: Stores Order documents, item snapshots, payment statuses, and checkout URLs (Port 27017).", bullet_style))
    story.append(Paragraph("4. Customer Browser: Interacts with merchant frontend and redirects to hosted payment forms.", bullet_style))
    story.append(Paragraph("5. Payments.lk Sandbox API: Issues checkout session URLs and handles card processing (https://api.payments.lk/v1).", bullet_style))
    story.append(Paragraph("6. ngrok HTTPS Tunnel: Forwards asynchronous webhook POST notifications from Payments.lk to local backend (localhost:8080).", bullet_style))

    if os.path.exists("scratch/diagrams/architecture_diagram.png"):
        story.append(Spacer(1, 6))
        story.append(Image("scratch/diagrams/architecture_diagram.png", width=500, height=310))
        story.append(Paragraph("<i>Figure 5.1: Payments.lk Sandbox System Architecture Topology</i>", ParagraphStyle('Cap', parent=body_style, alignment=1, fontSize=8, textColor=colors.HexColor('#64748B'))))
    story.append(PageBreak())

    # 6. TECHNOLOGY STACK
    story.append(section_h1("6. Technology Stack", "sec_6"))
    story.append(Paragraph("The payment integration relies strictly on modern, verified technologies present in the workspace codebase:", body_style))
    
    tech_data = [
        [Paragraph("<b>Component / Layer</b>", body_style), Paragraph("<b>Technology Specification</b>", body_style), Paragraph("<b>Role & Purpose</b>", body_style)],
        [Paragraph("Frontend Framework", body_style), Paragraph("React 18 SPA built with Vite", body_style), Paragraph("User interface, gateway selection, and payment status routing", body_style)],
        [Paragraph("Frontend SSL Transport", body_style), Paragraph("@vitejs/plugin-basic-ssl (HTTPS)", body_style), Paragraph("Enforces HTTPS (https://localhost:5173) matching gateway return requirements", body_style)],
        [Paragraph("Backend Framework", body_style), Paragraph("Node.js (v22) + Express REST API", body_style), Paragraph("Order management, Payments.lk API integration, and webhook engine", body_style)],
        [Paragraph("Database & ODM", body_style), Paragraph("MongoDB + Mongoose ODM", body_style), Paragraph("Persists Order state, payment IDs, checkout URLs, and item snapshots", body_style)],
        [Paragraph("Payment Gateway API", body_style), Paragraph("Payments.lk REST API v1 Checkouts", body_style), Paragraph("Generates hosted checkout sessions via POST https://api.payments.lk/v1/checkouts", body_style)],
        [Paragraph("Webhook Tunneling", body_style), Paragraph("ngrok HTTPS Forwarding", body_style), Paragraph("Tunnels external webhooks (https://retype-activity-recite.ngrok-free.dev) to local port 8080", body_style)],
        [Paragraph("Cryptographic Security", body_style), Paragraph("Node.js crypto (HMAC-SHA256)", body_style), Paragraph("Verifies webhook signatures with timing-safe string comparison (timingSafeEqual)", body_style)],
        [Paragraph("Containerization", body_style), Paragraph("Docker & Docker Compose", body_style), Paragraph("Orchestrates backend, frontend, MongoDB, and Redis containers", body_style)]
    ]
    t_tech = Table(tech_data, colWidths=[120, 180, 200])
    t_tech.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#FFFFFF')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    for r_idx in range(1, len(tech_data)):
        if r_idx % 2 == 1:
            t_tech.setStyle(TableStyle([('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor('#F8FAFC'))]))
    story.append(t_tech)
    story.append(Spacer(1, 10))

    # 7. PROJECT FILE STRUCTURE
    story.append(section_h1("7. Project File Structure", "sec_7"))
    story.append(Paragraph("The payment gateway module is structured cleanly across backend services, Express controllers, routers, database models, unit tests, and frontend React components:", body_style))
    file_tree_code = """Backend/backend-inter/
├── controllers/
│   └── paymentsLkController.js    # Express controller (createPaymentSession, handlePaymentsLkWebhook, getPaymentStatus)
├── services/
│   └── paymentsLkService.js       # Payments.lk API HTTP client, cents formatter & HMAC signature verifier
├── router/
│   └── paymentsLkRouter.js        # Express routes (/api/payments/create, /webhook, /status/:orderId)
├── models/
│   └── order.js                   # Mongoose Order schema with payment status enums & checkoutUrl persistence
├── tests/
│   └── paymentsLkService.test.js  # 19/19 Unit test suite for cents conversion, HMAC checks & authorization
├── scratch/
│   └── testRealApiCheckout.js     # Live API diagnostic verification script testing POST /v1/checkouts
├── index.js                       # Express application mounting paymentsLkRouter under /api/payments
└── .env                           # Server environment secrets & configuration

Frontend/my-react-app/
├── src/
│   ├── pages/
│   │   ├── CheckoutPage.jsx       # Checkout interface & gateway selection logic
│   │   └── PaymentStatusPage.jsx   # Status display route handling /payment/status/:orderId
│   └── services/
│       └── paymentsLkService.js   # Client API fetch helper methods (createPaymentsLkCheckout, getPaymentsLkStatus)"""
    story.append(Paragraph(file_tree_code.replace('\n', '<br/>'), code_style))
    story.append(PageBreak())

    # 8. ENVIRONMENT CONFIGURATION
    story.append(section_h1("8. Environment Configuration", "sec_8"))
    story.append(Paragraph("All secret API keys, webhook signing secrets, and return endpoint URLs are configured in Backend/backend-inter/.env without exposing secret tokens in client bundles or public repositories:", body_style))
    env_code = """# ======================================================
# PAYMENTS.LK SANDBOX ENVIRONMENT CONFIGURATION
# ======================================================
PAYMENTS_LK_SECRET_KEY=sk_test_[REDACTED]
PAYMENTS_LK_WEBHOOK_SECRET=whsec_[REDACTED]
PAYMENTS_LK_API_BASE_URL=https://api.payments.lk
PAYMENTS_LK_RETURN_URL=https://localhost:5173/payment/status
PAYMENTS_LK_CANCEL_URL=https://localhost:5173/payment/status"""
    story.append(Paragraph(env_code.replace('\n', '<br/>'), code_style))

    story.append(Paragraph("Environment Variable Descriptions", h2_style))
    env_vars = [
        ("PAYMENTS_LK_SECRET_KEY", "Secret Bearer token used to authenticate HTTP API calls to https://api.payments.lk/v1/checkouts. Must be kept strictly server-side."),
        ("PAYMENTS_LK_WEBHOOK_SECRET", "Shared signing secret used to compute and verify HMAC-SHA256 signatures on incoming webhook notifications."),
        ("PAYMENTS_LK_API_BASE_URL", "Base URL for the Payments.lk REST API endpoint (default: https://api.payments.lk)."),
        ("PAYMENTS_LK_RETURN_URL", "HTTPS return URL to which the customer's browser is redirected upon successful payment completion."),
        ("PAYMENTS_LK_CANCEL_URL", "HTTPS return URL to which the customer's browser is redirected if payment is cancelled.")
    ]
    for k, desc in env_vars:
        story.append(Paragraph(f"• <b>{k}</b>: {desc}", bullet_style))
    story.append(Spacer(1, 10))

    # 9. PAYMENTS.LK CHECKOUT API
    story.append(section_h1("9. Payments.lk Checkout API", "sec_9"))
    story.append(Paragraph("To generate a hosted checkout session, the backend issues an HTTP POST request to the Payments.lk REST API endpoint:", body_style))
    story.append(Paragraph("POST https://api.payments.lk/v1/checkouts", h2_style))
    
    req_code = """HTTP Headers:
  Authorization: Bearer sk_test_[REDACTED]
  Content-Type: application/json
  Idempotency-Key: idemp-ORD-PLK-1790239275845-1790239275845

JSON Request Payload:
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

    story.append(Paragraph("API Parameter Definitions", h2_style))
    params_def = [
        ("reference", "Unique merchant order ID string (e.g., ORD-PLK-1790239275845) used for transaction tracking."),
        ("amountCents", "Total transaction amount expressed as an integer in LKR cents (1500.00 LKR = 150000 cents)."),
        ("description", "Textual summary of the purchase displayed on the Payments.lk hosted page."),
        ("successUrl", "HTTPS URL to which Payments.lk redirects the customer after successful payment."),
        ("cancelUrl", "HTTPS URL to which Payments.lk redirects the customer after cancellation."),
        ("customer", "Object containing customer name, email address, and contact phone number.")
    ]
    for p_name, p_desc in params_def:
        story.append(Paragraph(f"• <b>{p_name}</b>: {p_desc}", bullet_style))
    story.append(PageBreak())

    # 10. AMOUNT CONVERSION
    story.append(section_h1("10. Amount Conversion", "sec_10"))
    story.append(Paragraph("Like standard global financial APIs (e.g., Stripe, PayHere), Payments.lk operates using the smallest currency unit (LKR cents). Converting floating-point LKR currency amounts to integer cents prevents floating-point rounding inaccuracies during transaction processing.", body_style))
    story.append(Paragraph("Conversion Formula: <b>amountCents = Math.round(Number(amount) * 100)</b>", body_style))
    
    conv_table = doc_data = [
        [Paragraph("<b>LKR Currency Amount</b>", body_style), Paragraph("<b>Calculation Formula</b>", body_style), Paragraph("<b>Converted Integer Cents</b>", body_style)],
        [Paragraph("LKR 100.00", body_style), Paragraph("100.00 * 100", body_style), Paragraph("10000 cents", body_style)],
        [Paragraph("LKR 2,500.50", body_style), Paragraph("2500.50 * 100", body_style), Paragraph("250050 cents", body_style)],
        [Paragraph("LKR 3,500.00", body_style), Paragraph("3500.00 * 100", body_style), Paragraph("350000 cents", body_style)],
        [Paragraph("LKR 99.99", body_style), Paragraph("99.99 * 100", body_style), Paragraph("9999 cents", body_style)],
        [Paragraph("LKR 0.00", body_style), Paragraph("0.00 * 100", body_style), Paragraph("0 cents", body_style)]
    ]
    t_conv = Table(conv_table, colWidths=[150, 170, 180])
    t_conv.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#FFFFFF')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_conv)
    story.append(Spacer(1, 10))

    # 11. IDEMPOTENCY
    story.append(section_h1("11. Idempotency", "sec_11"))
    story.append(Paragraph("Network retries or multiple clicks by a user must never result in duplicate orders or double billing. The backend enforces idempotency using two complementary mechanisms:", body_style))
    story.append(Paragraph("1. Idempotency-Key Header: Every request to POST /v1/checkouts includes a unique key (e.g., idemp-ORD-PLK-12345). If Payments.lk receives identical requests with the same key, it returns the existing checkout session without creating a new duplicate charge.", bullet_style))
    story.append(Paragraph("2. Order Model checkoutUrl Reuse: If a user re-attempts checkout for an existing order in 'pending' status, the controller retrieves and returns the previously stored checkoutUrl from MongoDB instead of generating a redundant API call.", bullet_style))

    if os.path.exists("scratch/diagrams/idempotency_flow.png"):
        story.append(Spacer(1, 4))
        story.append(Image("scratch/diagrams/idempotency_flow.png", width=460, height=220))
        story.append(Paragraph("<i>Figure 11.1: Order Idempotency & Checkout URL Reuse Decision Flow</i>", ParagraphStyle('Cap', parent=body_style, alignment=1, fontSize=8, textColor=colors.HexColor('#64748B'))))
    story.append(PageBreak())

    # 12. HOSTED CHECKOUT FLOW
    story.append(section_h1("12. Hosted Checkout Flow", "sec_12"))
    story.append(Paragraph("In a hosted payment workflow, the merchant application does not directly handle, collect, or store raw credit/debit card numbers. Instead, the backend obtains a hosted checkout URL from Payments.lk, and the customer's browser is redirected to Payments.lk's secure PCI-DSS compliant sandbox interface.", body_style))
    story.append(Paragraph("Browser Redirect Flow Sequence:", h2_style))
    story.append(Paragraph("Frontend SPA  ──>  Backend API  ──>  Payments.lk API  ──>  Return checkoutUrl  ──>  window.location.href = checkoutUrl", code_style))

    # 13. FRONTEND IMPLEMENTATION
    story.append(section_h1("13. Frontend Implementation", "sec_13"))
    story.append(Paragraph("The frontend is built using React 18 and Vite. It provides an intuitive user interface for selecting Payments.lk during checkout and displaying payment status feedback upon redirect.", body_style))
    story.append(Paragraph("HTTPS Requirement & Vite SSL Configuration", h2_style))
    story.append(Paragraph("To comply with modern browser security standards and payment gateway return specifications, the React dev server is configured with HTTPS support using @vitejs/plugin-basic-ssl.", body_style))
    story.append(Paragraph("During initial testing, an issue occurred where the browser attempted HTTP connection to http://localhost:5173/payment/status/, resulting in ERR_EMPTY_RESPONSE. Updating the return URL to https://localhost:5173/payment/status/{orderId} resolved the protocol mismatch cleanly.", body_style))

    # 14. BACKEND IMPLEMENTATION
    story.append(section_h1("14. Backend Implementation", "sec_14"))
    story.append(Paragraph("The Node.js/Express backend handles checkout session generation, status polling, and webhook verification across three primary endpoints:", body_style))
    
    ep_table_data = [
        [Paragraph("<b>Method & Route</b>", body_style), Paragraph("<b>Auth Requirement</b>", body_style), Paragraph("<b>Handler Function</b>", body_style), Paragraph("<b>Purpose</b>", body_style)],
        [Paragraph("POST /api/payments/create", body_style), Paragraph("Protected (JWT Bearer)", body_style), Paragraph("createPaymentSession", body_style), Paragraph("Calculates cart total, creates pending order, and calls Payments.lk API.", body_style)],
        [Paragraph("POST /api/payments/webhook", body_style), Paragraph("Public Signed Webhook", body_style), Paragraph("handlePaymentsLkWebhook", body_style), Paragraph("Receives raw webhook notifications, verifies HMAC signature, and updates order status.", body_style)],
        [Paragraph("GET /api/payments/status/:orderId", body_style), Paragraph("Protected (JWT Bearer)", body_style), Paragraph("getPaymentStatus", body_style), Paragraph("Fetches reconciled payment status from MongoDB for the customer status page.", body_style)]
    ]
    t_ep = Table(ep_table_data, colWidths=[130, 110, 120, 140])
    t_ep.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#FFFFFF')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_ep)
    story.append(PageBreak())

    # 15. DATABASE / ORDER MODEL
    story.append(section_h1("15. Database / Order Model", "sec_15"))
    story.append(Paragraph("The Mongoose Order schema (models/order.js) tracks order lifecycle states, payment gateway selections, and transaction references:", body_style))
    schema_code = """const orderSchema = new mongoose.Schema({
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
}, { timestamps: true });"""
    story.append(Paragraph(schema_code.replace('\n', '<br/>'), code_style))

    # 16. WEBHOOK ARCHITECTURE
    story.append(section_h1("16. Webhook Architecture", "sec_16"))
    story.append(Paragraph("Webhooks provide asynchronous, server-to-server confirmation of payment outcomes. This guarantees that payment status is updated even if the user closes their browser before returning to the merchant site.", body_style))
    if os.path.exists("scratch/diagrams/webhook_flow.png"):
        story.append(Spacer(1, 4))
        story.append(Image("scratch/diagrams/webhook_flow.png", width=500, height=230))
        story.append(Paragraph("<i>Figure 16.1: Webhook Event Processing & Signature Verification Pipeline</i>", ParagraphStyle('Cap', parent=body_style, alignment=1, fontSize=8, textColor=colors.HexColor('#64748B'))))

    # 17. WEBHOOK SECURITY
    story.append(section_h1("17. Webhook Security", "sec_17"))
    story.append(Paragraph("Webhook payloads must be authenticated before any order status changes are committed to the database.", body_style))
    story.append(Paragraph("Signature Verification Formula:", h2_style))
    story.append(Paragraph("computedHash = HMAC-SHA256(PAYMENTS_LK_WEBHOOK_SECRET, timestamp + '.' + rawBody)", code_style))
    story.append(Paragraph("The calculated hash is compared against the v1 signature in the Payments-Signature header using crypto.timingSafeEqual to prevent timing side-channel attacks.", body_style))
    story.append(PageBreak())

    # 18. WEBHOOK EVENTS
    story.append(section_h1("18. Webhook Events", "sec_18"))
    story.append(Paragraph("The webhook handler processes standardized Payments.lk event notifications:", body_style))
    events_data = [
        [Paragraph("<b>Event Type</b>", body_style), Paragraph("<b>Gateway Description</b>", body_style), Paragraph("<b>Application Database Action</b>", body_style)],
        [Paragraph("payment.succeeded", body_style), Paragraph("Customer payment completed successfully.", body_style), Paragraph("Order paymentStatus updated to 'paid'", body_style)],
        [Paragraph("payment.failed", body_style), Paragraph("Customer payment attempt declined or failed.", body_style), Paragraph("Order paymentStatus updated to 'failed'", body_style)],
        [Paragraph("checkout.expired", body_style), Paragraph("Checkout session timed out without payment.", body_style), Paragraph("Order paymentStatus updated to 'cancelled'", body_style)],
        [Paragraph("payment.refunded", body_style), Paragraph("Payment refunded by merchant.", body_style), Paragraph("Order paymentStatus updated to 'refunded'", body_style)]
    ]
    ev_table = Table(events_data, colWidths=[130, 170, 200])
    ev_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#FFFFFF')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(ev_table)
    story.append(Spacer(1, 10))

    # 19. PAYMENT SUCCESS FLOW
    story.append(section_h1("19. Payment Success Flow", "sec_19"))
    success_steps = [
        "1. Customer selects items and clicks 'Pay with Payments.lk' at checkout.",
        "2. Backend creates Order record in 'pending' status and issues POST https://api.payments.lk/v1/checkouts.",
        "3. Payments.lk returns hosted checkoutUrl; frontend redirects browser.",
        "4. Customer completes sandbox payment on Payments.lk hosted form.",
        "5. Payments.lk dispatches payment.succeeded webhook event to /api/payments/webhook.",
        "6. Backend verifies HMAC-SHA256 signature, matches order ID, and reconciles total amount.",
        "7. Order paymentStatus is updated to 'paid' in MongoDB.",
        "8. Customer browser is redirected to https://localhost:5173/payment/status/{orderId}, displaying payment confirmation."
    ]
    for ss in success_steps:
        story.append(Paragraph(ss, bullet_style))

    # 20. PAYMENT FAILURE FLOW
    story.append(section_h1("20. Payment Failure Flow", "sec_20"))
    story.append(Paragraph("If payment fails, is declined, or times out:", body_style))
    story.append(Paragraph("1. Payments.lk dispatches a payment.failed or checkout.expired webhook event.", bullet_style))
    story.append(Paragraph("2. Backend verifies signature and updates order status to 'failed' or 'cancelled'.", bullet_style))
    story.append(Paragraph("3. Customer status page displays an error notification with options to retry checkout.", bullet_style))

    # 21. SECURITY DESIGN
    story.append(section_h1("21. Security Design", "sec_21"))
    sec_points = [
        "Server-Only Credentials: Secret keys reside exclusively in backend environment variables.",
        "Server-Side Amount Calculation: Total payable amounts are calculated from active cart items in MongoDB.",
        "HMAC Signature Verification: Webhook payloads are verified using HMAC-SHA256 with timing-safe comparison.",
        "Order Ownership Guard: Order status queries verify that the requesting user matches the order owner or holds admin privileges.",
        "Redacted Diagnostic Logs: Error logging outputs HTTP status codes and error messages while hiding secret keys and authorization headers."
    ]
    for sp in sec_points:
        story.append(Paragraph(f"• {sp}", bullet_style))
    story.append(PageBreak())

    # 22. NGROK DEVELOPMENT SETUP
    story.append(section_h1("22. ngrok Development Setup", "sec_22"))
    story.append(Paragraph("During local development, Payments.lk sandbox webhooks cannot directly reach localhost:8080. ngrok is used to create a secure HTTPS forwarding tunnel:", body_style))
    story.append(Paragraph("Payments.lk Webhook Engine  ──>  https://retype-activity-recite.ngrok-free.dev  ──>  http://localhost:8080/api/payments/webhook", code_style))

    # 23. DOCKER SETUP
    story.append(section_h1("23. Docker Setup", "sec_23"))
    story.append(Paragraph("The platform services are containerized via Docker Compose:", body_style))
    docker_data = [
        [Paragraph("<b>Container Service</b>", body_style), Paragraph("<b>Role / Component</b>", body_style), Paragraph("<b>Port Mapping</b>", body_style)],
        [Paragraph("ecommerce-backend", body_style), Paragraph("Node.js Express REST API", body_style), Paragraph("Port 8080", body_style)],
        [Paragraph("ecommerce-frontend", body_style), Paragraph("React Vite SPA (HTTPS)", body_style), Paragraph("Port 5173", body_style)],
        [Paragraph("ecommerce-mongodb", body_style), Paragraph("MongoDB Database Instance", body_style), Paragraph("Port 27017", body_style)],
        [Paragraph("ecommerce-redis", body_style), Paragraph("BullMQ Task Queue", body_style), Paragraph("Port 6379", body_style)]
    ]
    t_d = Table(docker_data, colWidths=[150, 180, 170])
    t_d.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#FFFFFF')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_d)
    story.append(Spacer(1, 10))

    # 24. TESTING
    story.append(section_h1("24. Testing", "sec_24"))
    story.append(Paragraph("Automated unit testing and static code analysis were executed prior to deployment:", body_style))
    story.append(Paragraph("""npm run test:paymentslk
Result: 19 Passed, 0 Failed

node --check index.js services/paymentsLkService.js controllers/paymentsLkController.js router/paymentsLkRouter.js models/order.js
Result: 0 syntax errors""".replace('\n', '<br/>'), code_style))

    # 25. UNIT TEST COVERAGE
    story.append(section_h1("25. Unit Test Coverage", "sec_25"))
    story.append(Paragraph("The test suite (tests/paymentsLkService.test.js) verifies 19 distinct unit assertion cases:", body_style))
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
        story.append(Paragraph(f"• {tc}", bullet_style))
    story.append(PageBreak())

    # 26. REAL SANDBOX API VERIFICATION
    story.append(section_h1("26. Real Sandbox API Verification", "sec_26"))
    story.append(Paragraph("A live diagnostic test (scratch/testRealApiCheckout.js) was performed using valid sandbox environment credentials:", body_style))
    story.append(Paragraph("""POST https://api.payments.lk/v1/checkouts
HTTP Status: 200 OK
Checkout ID: chk_xxxdrnjsgpfev6ej05kb8f69
Redirect URL: https://payments.lk/checkout/chk_xxxdrnjsgpfev6ej05kb8f69
URL Domain Verification: TRUE (starts with https://payments.lk/)
Order Model Persistence: VERIFIED
Frontend Redirect Handler: VERIFIED""".replace('\n', '<br/>'), code_style))

    # 27. TROUBLESHOOTING HISTORY
    story.append(section_h1("27. Troubleshooting History", "sec_27"))
    story.append(Paragraph("During initial sandbox integration, two critical issues were identified and resolved:", body_style))
    story.append(Paragraph("1. ERR_EMPTY_RESPONSE: The return URL was initially set to HTTP (http://localhost:5173/payment/status/). Updating to HTTPS (https://localhost:5173/payment/status/{orderId}) resolved the Vite SSL protocol mismatch.", bullet_style))
    story.append(Paragraph("2. Validation Error (HTTP 400): Payments.lk API requires camelCase parameter keys (reference, amountCents, successUrl, cancelUrl) instead of snake_case. Updating the payload structure resolved API payload validation.", bullet_style))

    # 28. COMPLETE END-TO-END FLOW
    story.append(section_h1("28. Complete End-to-End Flow", "sec_28"))
    story.append(Paragraph("Complete Transaction Lifecycle:", h2_style))
    story.append(Paragraph("Checkout Request  ──>  Create Order (Pending)  ──>  POST Payments.lk API  ──>  Hosted Checkout Redirect  ──>  Sandbox Payment Completion  ──>  Webhook Event Dispatch  ──>  HMAC Signature Verification  ──>  Order Status -> Paid  ──>  Customer Confirmation Page", code_style))

    # 29. DEMONSTRATION PROCEDURE
    story.append(section_h1("29. Demonstration Procedure", "sec_29"))
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
        story.append(Paragraph(ds, bullet_style))
    story.append(PageBreak())

    # 30. LIMITATIONS
    story.append(section_h1("30. Limitations", "sec_30"))
    story.append(Paragraph("1. Sandbox Credentials: Integration operates under sandbox credentials (sk_test_...).", bullet_style))
    story.append(Paragraph("2. Local Development Tunnel: Webhook delivery requires ngrok for local HTTP forwarding.", bullet_style))
    story.append(Paragraph("3. SSL Certificates: Development HTTPS relies on basic self-signed development certificates.", bullet_style))

    # 31. FUTURE IMPROVEMENTS
    story.append(section_h1("31. Future Improvements", "sec_31"))
    story.append(Paragraph("1. Production Gateway Migration: Provision production merchant credentials upon business onboarding.", bullet_style))
    story.append(Paragraph("2. Automated Email Receipts: Send automated PDF receipts to customers upon webhook confirmation.", bullet_style))
    story.append(Paragraph("3. Refund Dashboard: Implement an admin portal for issuing refunds via Payments.lk API.", bullet_style))

    # 32. CONCLUSION
    story.append(section_h1("32. Conclusion", "sec_32"))
    story.append(Paragraph("The Payments.lk Sandbox Payment Gateway integration has been successfully developed, tested, and verified for the AI-Integrated E-Commerce Platform. The system delivers a secure hosted checkout experience, robust server-side amount calculation, timing-safe HMAC webhook signature authentication, and full test suite validation.", body_style))

    # 33. REFERENCES
    story.append(section_h1("33. References", "sec_33"))
    refs = [
        "Payments.lk Developer Portal: https://payments.lk/developers",
        "Payments.lk API Reference (v1 Checkouts): https://payments.lk/developers/api",
        "Express.js Routing & Security Best Practices: https://expressjs.com/",
        "Node.js Crypto Documentation (HMAC-SHA256 & timingSafeEqual): https://nodejs.org/api/crypto.html",
        "Vite Basic SSL Plugin Guide: https://github.com/vitejs/vite-plugin-basic-ssl"
    ]
    for ref in refs:
        story.append(Paragraph(f"• {ref}", bullet_style))

    return story

# =========================================================
# RUN MULTI-PASS GENERATOR
# =========================================================
def build_expanded_pdf_and_docx():
    print("Pass 1: Measuring PDF page numbers for Table of Contents...")
    pdf_pass1 = SimpleDocTemplate(PDF_PATH, pagesize=letter, leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54)
    story1 = generate_pdf_story(is_second_pass=False)
    pdf_pass1.build(story1, canvasmaker=TOCPageTrackerCanvas)

    print(f"Pass 1 Complete. Section Page Map: {SECTION_PAGES}")

    print("Pass 2: Building final PDF with exact Table of Contents page numbers...")
    pdf_pass2 = SimpleDocTemplate(PDF_PATH, pagesize=letter, leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54)
    story2 = generate_pdf_story(is_second_pass=True)
    pdf_pass2.build(story2, canvasmaker=TOCPageTrackerCanvas)

    print("[OK] PDF report built successfully.")

    # BUILD DOCX
    print("Building DOCX document with matching Table of Contents...")
    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    styles = doc.styles
    normal_font = styles['Normal'].font
    normal_font.name = 'Arial'
    normal_font.size = Pt(10.5)
    normal_font.color.rgb = RGBColor(0x33, 0x41, 0x55)

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

    meta_table = doc.add_table(rows=6, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Project:", "AI-Integrated E-Commerce Platform"),
        ("Technology Stack:", "React 18 (Vite) + Node.js/Express + MongoDB + Payments.lk"),
        ("Gateway Integration:", "Payments.lk Sandbox REST API (v1 Checkouts)"),
        ("Document Purpose:", "University Project Documentation & Technical Report"),
        ("Security Level:", "Sandbox Verified (No Production Credentials Exposed)"),
        ("Date:", "September 2026")
    ]
    for row_idx, (k, v) in enumerate(meta_data):
        row = meta_table.rows[row_idx]
        cell_k, cell_v = row.cells[0], row.cells[1]
        cell_k.width, cell_v.width = Inches(2.2), Inches(4.3)
        cell_k.paragraphs[0].add_run(k).bold = True
        cell_v.paragraphs[0].add_run(v)
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

    def add_body(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        p.add_run(text)

    add_heading_1("2. Table of Contents")
    add_body("This technical report documents the complete implementation, security design, testing, and sandbox payment flows of the Payments.lk Sandbox Payment Gateway.")
    
    toc_table = doc.add_table(rows=len(SECTIONS)-1, cols=2)
    toc_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, sec in enumerate(SECTIONS[1:]): # skip cover page
        sec_id = f"sec_{idx+2}"
        exact_pg = SECTION_PAGES.get(sec_id, idx + 2)
        row = toc_table.rows[idx]
        cell_name, cell_pg = row.cells[0], row.cells[1]
        cell_name.width, cell_pg.width = Inches(5.8), Inches(0.7)
        
        p0 = cell_name.paragraphs[0]
        p0.paragraph_format.space_after = Pt(2)
        r0 = p0.add_run(sec)
        r0.font.size = Pt(10)
        
        p1 = cell_pg.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p1.paragraph_format.space_after = Pt(2)
        r1 = p1.add_run(f"Page {exact_pg}")
        r1.font.size = Pt(10)
        r1.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
        
        if idx % 2 == 1:
            set_cell_background(cell_name, "F8FAFC")
            set_cell_background(cell_pg, "F8FAFC")

    doc.save(DOCX_PATH)
    print("[OK] DOCX report built successfully.")

if __name__ == "__main__":
    build_expanded_pdf_and_docx()
