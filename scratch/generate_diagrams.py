import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

os.makedirs("scratch/diagrams", exist_ok=True)

# Set global style
plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['font.family'] = 'sans-serif'

def draw_system_architecture():
    fig, ax = plt.subplots(figsize=(11.0, 7.0), dpi=200)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')
    
    # Title Box
    title_rect = patches.FancyBboxPatch((0.5, 9.1), 9.0, 0.7, boxstyle="round,pad=0.05", ec="#0284c7", fc="#e0f2fe", lw=1.5)
    ax.add_patch(title_rect)
    ax.text(5.0, 9.45, "Figure 5.1: Payments.lk Sandbox System Architecture", fontsize=13, fontweight='bold', ha='center', va='center', color='#0f172a')
    
    # Components boxes (x, y, w, h, title, bg_color, border_color)
    boxes = [
        (0.4, 5.5, 2.6, 2.6, "React Frontend SPA\n(HTTPS https://localhost:5173)\n• CheckoutPage.jsx\n• PaymentStatusPage.jsx", "#e0f2fe", "#0284c7"),
        (3.7, 5.5, 2.6, 2.6, "Node.js / Express Backend\n(Port 8080)\n• paymentsLkController.js\n• paymentsLkService.js", "#dcfce7", "#16a34a"),
        (7.0, 5.5, 2.6, 2.6, "MongoDB Database\n(Port 27017)\n• Order Schema\n• checkoutUrl persistence", "#faf5ff", "#9333ea"),
        (0.4, 1.2, 2.6, 2.6, "Customer Browser\n• Gateway Selection\n• Hosted Redirect\n• Payment Confirmation", "#f8fafc", "#475569"),
        (3.7, 1.2, 2.6, 2.6, "Payments.lk Sandbox API\n(https://api.payments.lk/v1)\n• POST /v1/checkouts\n• Hosted Payment Page", "#fee2e2", "#dc2626"),
        (7.0, 1.2, 2.6, 2.6, "ngrok HTTPS Tunnel\n(Development Webhook)\n• Forwarding Webhook Event\n  to localhost:8080", "#ffedd5", "#ea580c")
    ]
    
    for x, y, w, h, text, bg, border in boxes:
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08", ec=border, fc=bg, lw=2.0)
        ax.add_patch(rect)
        ax.text(x + w/2, y + h/2, text, fontsize=8.5, ha='center', va='center', color='#0f172a', fontweight='bold', multialignment='center')
        
    # Arrows with clean text labels
    arrow_props = dict(arrowstyle="-|>", lw=2.0, color="#1e293b", mutation_scale=14)
    
    # 1. Frontend -> Backend (Top Right Arrow)
    ax.annotate("", xy=(3.6, 7.1), xytext=(3.1, 7.1), arrowprops=arrow_props)
    ax.text(3.35, 7.35, "1. POST /api/payments/create", fontsize=7.5, ha='center', fontweight='bold', color='#0284c7')

    # 2. Backend -> DB (Top Far Right Arrow)
    ax.annotate("", xy=(6.9, 7.1), xytext=(6.4, 7.1), arrowprops=arrow_props)
    ax.text(6.65, 7.35, "2. Save Order", fontsize=7.5, ha='center', fontweight='bold', color='#16a34a')

    # 3. Backend -> Payments.lk API (Vertical Down Arrow)
    ax.annotate("", xy=(5.0, 3.9), xytext=(5.0, 5.4), arrowprops=arrow_props)
    ax.text(5.15, 4.65, "3. POST /v1/checkouts", fontsize=7.5, ha='left', fontweight='bold', color='#dc2626')

    # 4. Return checkoutUrl -> Frontend (Top Left Arrow)
    ax.annotate("", xy=(3.1, 6.1), xytext=(3.6, 6.1), arrowprops=arrow_props)
    ax.text(3.35, 5.85, "4. Return checkoutUrl", fontsize=7.5, ha='center', fontweight='bold', color='#0284c7')

    # 5. Browser -> Payments.lk Sandbox (Bottom Right Arrow)
    ax.annotate("", xy=(3.6, 2.5), xytext=(3.1, 2.5), arrowprops=arrow_props)
    ax.text(3.35, 2.75, "5. Hosted Redirect", fontsize=7.5, ha='center', fontweight='bold', color='#dc2626')

    # 6a. Payments.lk -> ngrok Tunnel (Bottom Far Right Arrow)
    ax.annotate("", xy=(6.9, 2.5), xytext=(6.4, 2.5), arrowprops=arrow_props)
    ax.text(6.65, 2.75, "6a. Webhook Event", fontsize=7.5, ha='center', fontweight='bold', color='#ea580c')

    # 6b. ngrok Tunnel -> Backend API (Diagonal Up Left Arrow)
    ax.annotate("", xy=(6.4, 5.8), xytext=(7.1, 3.9), arrowprops=arrow_props)
    ax.text(7.1, 4.8, "6b. Webhook POST", fontsize=7.5, ha='center', fontweight='bold', color='#ea580c')

    plt.tight_layout()
    plt.savefig("scratch/diagrams/architecture_diagram.png", bbox_inches='tight', pad_inches=0.1)
    plt.close()

def draw_webhook_flow():
    fig, ax = plt.subplots(figsize=(11.5, 4.5), dpi=200)
    ax.set_xlim(0, 11.5)
    ax.set_ylim(0, 6)
    ax.axis('off')
    
    title_rect = patches.FancyBboxPatch((0.5, 5.1), 10.5, 0.6, boxstyle="round,pad=0.05", ec="#16a34a", fc="#dcfce7", lw=1.5)
    ax.add_patch(title_rect)
    ax.text(5.75, 5.4, "Figure 16.1: Payments.lk Webhook Processing & HMAC Security Flow", fontsize=11, fontweight='bold', ha='center', va='center', color='#0f172a')
    
    steps = [
        "1. Webhook Received\n(Payments-Signature)",
        "2. Preserve Raw Body\n(Buffer / UTF-8)",
        "3. HMAC-SHA256 Sign\n(t + '.' + rawBody)",
        "4. Timing-Safe Compare\n(crypto.timingSafeEqual)",
        "5. Event Idempotency\n(Track Event ID)",
        "6. Reconcile Amount\n(Match DB Order)",
        "7. Update Order\n(status = 'paid')"
    ]
    
    x_coords = [0.3, 1.9, 3.5, 5.1, 6.7, 8.3, 9.9]
    box_w = 1.3
    for i, (x, text) in enumerate(zip(x_coords, steps)):
        bg = "#e0f2fe" if i < 4 else ("#fef08a" if i == 4 else "#dcfce7")
        border = "#0284c7" if i < 4 else ("#ca8a04" if i == 4 else "#16a34a")
        rect = patches.FancyBboxPatch((x, 1.2), box_w, 3.2, boxstyle="round,pad=0.08", ec=border, fc=bg, lw=1.8)
        ax.add_patch(rect)
        ax.text(x + box_w/2, 2.8, text, fontsize=7.2, ha='center', va='center', color='#0f172a', fontweight='bold', multialignment='center')
        
        if i < len(steps) - 1:
            ax.annotate("", xy=(x_coords[i+1], 2.8), xytext=(x + box_w, 2.8),
                        arrowprops=dict(arrowstyle="-|>", lw=1.8, color="#475569", mutation_scale=12))
            
    plt.tight_layout()
    plt.savefig("scratch/diagrams/webhook_flow.png", bbox_inches='tight', pad_inches=0.1)
    plt.close()

def draw_idempotency_flow():
    fig, ax = plt.subplots(figsize=(8.5, 4.5), dpi=200)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 8)
    ax.axis('off')
    
    title_rect = patches.FancyBboxPatch((0.5, 7.0), 9.0, 0.6, boxstyle="round,pad=0.05", ec="#ca8a04", fc="#fef08a", lw=1.5)
    ax.add_patch(title_rect)
    ax.text(5.0, 7.3, "Figure 11.1: Order Idempotency & Checkout URL Reuse Flow", fontsize=11, fontweight='bold', ha='center', va='center', color='#0f172a')
    
    # Nodes
    rect1 = patches.FancyBboxPatch((0.5, 3.5), 2.4, 2.2, boxstyle="round,pad=0.1", ec="#0284c7", fc="#e0f2fe", lw=2.0)
    ax.add_patch(rect1)
    ax.text(1.7, 4.6, "Incoming Request\n(POST /api/payments/create)\nOrder ID + Cart Items", fontsize=8.5, ha='center', va='center', fontweight='bold', multialignment='center')
    
    rect2 = patches.FancyBboxPatch((3.7, 3.5), 2.6, 2.2, boxstyle="round,pad=0.1", ec="#ca8a04", fc="#fef08a", lw=2.0)
    ax.add_patch(rect2)
    ax.text(5.0, 4.6, "Pending Order Exists\nin MongoDB with\nStored checkoutUrl?", fontsize=8.5, ha='center', va='center', fontweight='bold', multialignment='center')
    
    rect3 = patches.FancyBboxPatch((7.1, 5.0), 2.4, 1.8, boxstyle="round,pad=0.1", ec="#16a34a", fc="#dcfce7", lw=2.0)
    ax.add_patch(rect3)
    ax.text(8.3, 5.9, "YES:\nReturn Stored\ncheckoutUrl", fontsize=8.5, ha='center', va='center', fontweight='bold', multialignment='center')
    
    rect4 = patches.FancyBboxPatch((7.1, 1.8), 2.4, 1.8, boxstyle="round,pad=0.1", ec="#dc2626", fc="#fee2e2", lw=2.0)
    ax.add_patch(rect4)
    ax.text(8.3, 2.7, "NO:\nCall Payments.lk API\n(POST /v1/checkouts)", fontsize=8.5, ha='center', va='center', fontweight='bold', multialignment='center')
    
    # Arrows
    arrow_props = dict(arrowstyle="-|>", lw=2.0, color="#1e293b", mutation_scale=14)
    ax.annotate("", xy=(3.6, 4.6), xytext=(3.0, 4.6), arrowprops=arrow_props)
    ax.annotate("YES", xy=(7.0, 5.9), xytext=(6.4, 5.2), arrowprops=dict(arrowstyle="-|>", lw=2.0, color="#16a34a", mutation_scale=14), fontsize=9, fontweight='bold')
    ax.annotate("NO", xy=(7.0, 2.7), xytext=(6.4, 4.0), arrowprops=dict(arrowstyle="-|>", lw=2.0, color="#dc2626", mutation_scale=14), fontsize=9, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig("scratch/diagrams/idempotency_flow.png", bbox_inches='tight', pad_inches=0.1)
    plt.close()

draw_system_architecture()
draw_webhook_flow()
draw_idempotency_flow()

print("[OK] Diagrams regenerated with perfect padding.")
