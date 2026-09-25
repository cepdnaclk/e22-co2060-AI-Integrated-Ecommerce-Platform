# Payments.lk Sandbox Payment Gateway Integration Report

## 1. Project Overview
This technical report documents the complete integration of the **Payments.lk Sandbox Payment Gateway** into the existing **AI-Integrated E-Commerce Platform**. The integration provides a secure, server-validated, hosted checkout payment experience for buyers while maintaining strict security standards, HMAC SHA-256 webhook signature verification, order amount reconciliation, idempotency protections, and complete isolation from sensitive payment credentials.

---

## 2. Existing Architecture
The platform is built as a microservices & module-based architecture:
- **Frontend**: React (Vite) single page application with modern component architecture and custom design system.
- **Backend API**: Node.js & Express server running on port `8080`.
- **Database**: MongoDB (Mongoose ODM) storing Products, Cart, Users, Sellers, and Orders.
- **Background Workers & Automation**: BullMQ + Redis queue powering Gemini AI automated Facebook product posting (preserved intact and untouched).

---

## 3. Payments.lk Integration Architecture
```
[ Frontend: React CheckoutPage ]
       │
       │ 1. POST /api/payments/create (JWT + Shipping Details)
       ▼
[ Backend: Node.js / Express ]
       │
       ├─► Authenticates buyer via JWT middleware
       ├─► Calculates trusted order total from DB product/offer records
       ├─► Creates Order in MongoDB (paymentStatus = "pending", paymentProvider = "payments_lk")
       ├─► Calls Payments.lk API: POST /v1/checkouts (Bearer secret key + Idempotency-Key)
       │
       ▼ Returns { checkoutId, checkoutUrl, amount, currency }
[ Frontend: React ]
       │
       │ 2. Redirects browser to Payments.lk Hosted Checkout URL
       ▼
[ Payments.lk Hosted Checkout ] (https://payments.lk / Sandbox)
       │
       ├─► Buyer completes or cancels payment
       │
       ├─► 3. Server-to-Server Webhook: POST /api/payments/webhook
       │      (Public Ngrok URL: https://retype-activity-recite.ngrok-free.dev/api/payments/webhook)
       │      │
       │      ▼
       │   [ Backend Webhook Controller ]
       │      ├─► Captures raw request body via express.json({ verify })
       │      ├─► Verifies Payments-Signature header (HMAC SHA-256)
       │      ├─► Checks event idempotency (prevents duplicate event processing)
       │      ├─► Verifies amount (cents) & currency (LKR)
       │      ├─► Updates Order paymentStatus ("paid", "failed", "expired", "refunded")
       │      └─► Clears buyer's cart upon payment.succeeded
       │
       └─► 4. Browser Redirect: GET /payment/status/:orderId
              │
              ▼
           [ Frontend: React PaymentStatusPage ]
              └─► Queries GET /api/payments/status/:orderId for DB-confirmed status
```

---

## 4. Files Created

1. [`Backend/backend-inter/services/paymentsLkService.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/services/paymentsLkService.js):
   Payments.lk service handling API checkout session creation (`POST /v1/checkouts`), `Authorization: Bearer <secret>` header management, `Idempotency-Key` generation, LKR to cents conversion, and HMAC-SHA256 signature verification.
2. [`Backend/backend-inter/controllers/paymentsLkController.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/controllers/paymentsLkController.js):
   Controller implementing `createPaymentSession` (`POST /api/payments/create`), `handlePaymentsLkWebhook` (`POST /api/payments/webhook`), and `getPaymentStatus` (`GET /api/payments/status/:orderId`).
3. [`Backend/backend-inter/router/paymentsLkRouter.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/router/paymentsLkRouter.js):
   Router registering payment creation, webhook, and status query endpoints.
4. [`Backend/backend-inter/tests/paymentsLkService.test.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/tests/paymentsLkService.test.js):
   Automated unit test suite with 19 assertion tests.
5. [`Frontend/my-react-app/src/services/paymentsLkService.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Frontend/my-react-app/src/services/paymentsLkService.js):
   Frontend API client for Payments.lk checkout creation and status queries.
6. [`PAYMENTS_LK_INTEGRATION_REPORT.md`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/PAYMENTS_LK_INTEGRATION_REPORT.md):
   Comprehensive technical documentation file.

---

## 5. Files Modified

1. [`Backend/backend-inter/models/order.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/models/order.js):
   Extended schema with `subtotal`, `total`, `paymentProvider`, `paymentId`, `checkoutId`, `paymentMethod`, `paymentEventId`, `paidAt`, and expanded `paymentStatus` enum (`pending`, `paid`, `failed`, `cancelled`, `expired`, `refunded`, `chargedback`).
2. [`Backend/backend-inter/index.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/index.js):
   Configured `express.json({ verify: (req, res, buf) => { req.rawBody = buf; } })` middleware for raw body preservation and mounted `paymentsLkRouter` at `/api/payments`.
3. [`Backend/backend-inter/.env`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/.env):
   Added Payments.lk environment variables.
4. [`Backend/backend-inter/.env.example`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/.env.example):
   Added Payments.lk configuration placeholders.
5. [`Backend/backend-inter/package.json`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/package.json):
   Added `"test:paymentslk"` script command.
6. [`Frontend/my-react-app/src/pages/CheckoutPage.jsx`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Frontend/my-react-app/src/pages/CheckoutPage.jsx):
   Integrated "Pay with Payments.lk" button and checkout redirect logic.
7. [`Frontend/my-react-app/src/pages/PaymentStatusPage.jsx`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Frontend/my-react-app/src/pages/PaymentStatusPage.jsx):
   Updated status page to display DB-confirmed payment status for Payments.lk (`paid`, `pending`, `failed`, `cancelled`, `expired`, `refunded`).

---

## 6. API Endpoints

### 1. `POST /api/payments/create`
- **Authentication**: Required (`Authorization: Bearer <token>`)
- **Request Body**: `{ shippingAddress, deliveryCharge }`
- **Operation**:
  - Calculates trusted total from DB pricing.
  - Creates Order with `paymentStatus = "pending"` & `paymentProvider = "payments_lk"`.
  - Sends checkout creation request to Payments.lk API with `Idempotency-Key`.
  - Saves `checkoutId` on Order.
- **Response**: `{ message, orderId, checkoutId, checkoutUrl, amount, currency }`

### 2. `POST /api/payments/webhook`
- **Authentication**: Cryptographic signature via `payments-signature` header.
- **Request Body**: Raw request buffer (`req.rawBody`).
- **Operation**:
  - Verifies HMAC-SHA256 signature against `PAYMENTS_LK_WEBHOOK_SECRET` before parsing payload.
  - Checks webhook event idempotency (`paymentEventId`).
  - Reconciles amount (cents) and currency ("LKR").
  - Updates order status for events: `payment.succeeded`, `payment.failed`, `checkout.expired`, `payment.refunded`.
  - Clears user cart on success.
- **Response**: `{ received: true, status }`

### 3. `GET /api/payments/status/:orderId`
- **Authentication**: Required (`Authorization: Bearer <token>`)
- **Operation**:
  - Validates order ownership (buyer ID must match logged-in user or admin).
  - Returns DB-confirmed payment status details.
- **Response**: `{ orderId, paymentStatus, paymentProvider, total, currency, paidAt, paymentMethod, createdAt }`

---

## 7. MongoDB Order Schema Structure

```javascript
{
  orderId: String,            // Unique Order ID (e.g. ORD-PLK-1758693000-4810)
  userId: ObjectId,           // Buyer user reference
  sellerId: ObjectId,         // Seller reference
  items: [                    // Array of ordered products
    { productId, sellerOfferId, price, quantity }
  ],
  subtotal: Number,           // Product subtotal (LKR)
  deliveryCharge: Number,     // Delivery charge (LKR)
  totalAmount: Number,        // Trusted total (LKR)
  total: Number,              // Total alias (LKR)
  currency: String,           // "LKR"
  paymentStatus: String,      // Enum: ["pending", "paid", "failed", "cancelled", "expired", "refunded", "chargedback"]
  paymentProvider: String,    // "payments_lk"
  paymentId: String,          // Payments.lk transaction ID (e.g. pay_xxx)
  checkoutId: String,         // Payments.lk checkout ID (e.g. chk_xxx)
  paymentMethod: String,      // Payment method (e.g. card)
  paymentEventId: String,     // Webhook event ID for idempotency (e.g. evt_xxx)
  paidAt: Date,               // Timestamp when marked paid
  status: String,             // Order lifecycle status ("pending", "confirmed", etc.)
  shippingAddress: Object,    // Delivery address details
  createdAt: Date,
  updatedAt: Date
}
```

---

## 8. Webhook Signature Verification Flow

```
Incoming Request
      │
      ├─► Extract Raw Body (req.rawBody Buffer)
      ├─► Extract Signature Header (payments-signature)
      │
      ▼
Compute HMAC-SHA256(PAYMENTS_LK_WEBHOOK_SECRET, rawBody)
      │
      ├─► Format A: Header 't=12345,v1=hash' -> HMAC over 't.rawBody'
      ├─► Format B: Header 'direct_hash' -> HMAC over 'rawBody'
      │
      ▼
Timing-Safe Comparison (crypto.timingSafeEqual)
      │
      ├── [Match] ──► Parse JSON event payload ──► Process Order Update
      │
      └── [Mismatch] ──► Return HTTP 400 "Invalid signature" (DO NOT update DB)
```

---

## 9. Security Implementation

1. **Backend Secret Isolation**: `PAYMENTS_LK_SECRET_KEY` & `PAYMENTS_LK_WEBHOOK_SECRET` are stored strictly in backend environment variables and never sent to frontend React code or logged.
2. **Server-Side Pricing**: Order total is computed from database product offer prices. Frontend prices are ignored to prevent price tampering.
3. **Webhook Signature Authentication**: All incoming webhook notifications are authenticated using HMAC SHA-256 before any database operation.
4. **Idempotency Protection**: Unique `Idempotency-Key` headers are sent when creating checkouts, and webhook `paymentEventId` tracking prevents duplicate processing of re-delivered webhooks.
5. **Ownership Guard**: Status queries enforce `order.userId === req.user.id` authorization check.
6. **No Credit Card Storage**: Credit card numbers and CVV are entered directly on Payments.lk's hosted checkout portal.

---

## 10. Environment Variables

Added to `.env` and `.env.example`:

```env
# ── Payments.lk Payment Gateway Sandbox ──
PAYMENTS_LK_SECRET_KEY=sk_test_sandbox_secret_key_placeholder
PAYMENTS_LK_WEBHOOK_SECRET=whsec_test_webhook_secret_placeholder
PAYMENTS_LK_API_BASE_URL=https://api.payments.lk
PAYMENTS_LK_WEBHOOK_URL=https://retype-activity-recite.ngrok-free.dev/api/payments/webhook
PAYMENTS_LK_RETURN_URL=http://localhost:5173/payment/status/
PAYMENTS_LK_CANCEL_URL=http://localhost:5173/payment/status/
```

---

## 11. Public Ngrok Tunnel Setup

To expose the local Express backend (`http://localhost:8080`) to receive Payments.lk webhook notifications:

```bash
ngrok http 8080
```

Public Webhook URL:
`https://retype-activity-recite.ngrok-free.dev/api/payments/webhook`

---

## 12. Automated Test Suite Results

Run unit tests from `Backend/backend-inter`:

```bash
npm run test:paymentslk
```

Test Results:
```
=========================================
🧪 Running Payments.lk Integration Unit Tests
=========================================
1. Testing Checkout Session Creation & Idempotency Key...
  ✅ PASS: Checkout session returns checkoutId
  ✅ PASS: Checkout session returns checkoutUrl
  ✅ PASS: Converts 2500.50 LKR to 250050 cents
  ✅ PASS: Generates unique order idempotency key

2. Testing Backend Amount Calculation (Cents Conversion)...
  ✅ PASS: 100 LKR = 10000 cents
  ✅ PASS: 99.99 LKR = 9999 cents
  ✅ PASS: 0 LKR = 0 cents

3. Testing Secret Key Requirement for API Checkout...
  ✅ PASS: Throws error if PAYMENTS_LK_SECRET_KEY is missing

4. Testing Invalid Webhook Signature Rejection...
  ✅ PASS: Rejects invalid webhook signature header

5. Testing Valid Webhook Signature Verification (HMAC-SHA256)...
  ✅ PASS: Successfully verifies valid HMAC-SHA256 webhook signature

6. Testing Direct Hex Webhook Signature Format...
  ✅ PASS: Verifies direct hex HMAC-SHA256 signature

7. Testing Event Types Data Structures...
  ✅ PASS: Supports event 'payment.succeeded' mapping to 'paid'
  ✅ PASS: Supports event 'payment.failed' mapping to 'failed'
  ✅ PASS: Supports event 'checkout.expired' mapping to 'expired'
  ✅ PASS: Supports event 'payment.refunded' mapping to 'refunded'

8. Testing Webhook Event Idempotency Key Structure...
  ✅ PASS: Valid event ID format for idempotency tracking

9. Testing Amount Mismatch Detection...
  ✅ PASS: Detects amount mismatch between trusted DB total and webhook payload

10. Testing Currency Mismatch Detection...
  ✅ PASS: Detects currency mismatch (expected LKR, got USD)

11. Testing Order Status Authorization Guard...
  ✅ PASS: Denies order status access when requesting user is not order owner or admin

=========================================
📊 Test Results: 19 Passed, 0 Failed
=========================================
```

---

## 13. Facebook Safety Verification

The existing Facebook automated product posting system was verified and remains completely unchanged and intact:
- `Backend/backend-inter/services/facebookService.js` (unmodified)
- `Backend/backend-inter/services/facebookCaptionService.js` (unmodified)
- `Backend/backend-inter/worker/facebookPublisherWorker.js` (unmodified)
- `Backend/backend-inter/queues/facebookPostQueue.js` (unmodified)
- `Backend/backend-inter/queues/redisConnection.js` (unmodified)
- Product approval workflow and Facebook status fields (`facebookStatus`, `facebookPostId`, etc.) remain fully functional.
