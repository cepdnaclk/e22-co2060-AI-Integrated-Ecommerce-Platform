# PayHere Sandbox Payment Gateway Integration Report

## 1. System Architecture

The PayHere payment gateway integration provides a secure, end-to-end payment checkout flow for the AI-Integrated E-Commerce Platform. The architecture follows a server-validated payment workflow:

```
[ Frontend: React ]
       │
       │ 1. POST /api/payment/create (Auth + Shipping Address)
       ▼
[ Backend: Node.js / Express ]
       │
       ├─► Validates buyer authentication
       ├─► Calculates total pricing from trusted database records (Product/SellerOffer)
       ├─► Creates Order in MongoDB with paymentStatus = "pending"
       ├─► Generates PayHere Checkout MD5 Hash using backend-only secret
       │
       ▼ Returns PayHere parameters (merchant_id, order_id, amount, hash, etc.)
[ Frontend: React ]
       │
       │ 2. Submits dynamic hidden HTML form to PayHere Sandbox
       ▼
[ PayHere Sandbox Checkout ] (https://sandbox.payhere.lk/pay/checkout)
       │
       ├─► User completes/cancels Sandbox card transaction
       │
       ├─► 3. Webhook (server-to-server): POST /api/payment/notify
       │      (application/x-www-form-urlencoded)
       │      │
       │      ▼
       │   [ Backend: Node.js ]
       │      ├─► Verifies md5sig checksum BEFORE processing status
       │      ├─► Sets paymentStatus = "paid", status = "confirmed", records paymentId & date
       │      └─► Clears buyer's cart upon success
       │
       └─► 4. User Redirect (browser): GET /payment/status/:orderId
              │
              ▼
           [ Frontend: React PaymentStatusPage ]
              └─► Fetches real-time payment status from MongoDB via GET /api/payment/status/:orderId
```

---

## 2. Files Created & Modified

### Modified Files:
- [`Backend/backend-inter/models/order.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/models/order.js): Extended schema with PayHere payment fields (`orderId`, `currency`, `paymentStatus`, `payherePaymentId`, `payhereMethod`, `payhereStatusCode`, `paymentDate`).
- [`Backend/backend-inter/index.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/index.js): Registered `express.urlencoded({ extended: true })` middleware and mounted `paymentRouter` at `/api/payment`.
- [`Backend/backend-inter/.env`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/.env): Added PayHere Sandbox configuration variables.
- [`Backend/backend-inter/.env.example`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/.env.example): Added PayHere environment variable placeholders.
- [`Backend/backend-inter/package.json`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/package.json): Added `"test:payhere"` test execution command.
- [`Frontend/my-react-app/src/App.jsx`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Frontend/my-react-app/src/App.jsx): Added routes `/payment/status/:orderId`, `/payment/return`, and `/payment/cancel`.
- [`Frontend/my-react-app/src/pages/CheckoutPage.jsx`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Frontend/my-react-app/src/pages/CheckoutPage.jsx): Integrated "Pay with PayHere" button and dynamic form submission handler.

### Created Files:
- [`Backend/backend-inter/services/payhereService.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/services/payhereService.js): PayHere hash generation, signature verification, amount formatting, and status code mapping logic.
- [`Backend/backend-inter/controllers/paymentController.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/controllers/paymentController.js): Implementations for checkout initialization (`createPayment`), notification webhook processing (`notifyPayment`), and payment status queries (`getPaymentStatus`).
- [`Backend/backend-inter/router/paymentRouter.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/router/paymentRouter.js): API router defining `/create`, `/notify`, and `/status/:orderId`.
- [`Backend/backend-inter/tests/payhereService.test.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Backend/backend-inter/tests/payhereService.test.js): Automated unit tests verifying hash generation, signature checksums, and status code mappings.
- [`Frontend/my-react-app/src/services/paymentService.js`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Frontend/my-react-app/src/services/paymentService.js): Frontend API wrapper for PayHere endpoints and dynamic form submission utility.
- [`Frontend/my-react-app/src/pages/PaymentStatusPage.jsx`](file:///d:/e22-co2060-AI-Integrated-Ecommerce-Platform-main%20%281%29/e22-co2060-AI-Integrated-Ecommerce-Platform-main/Frontend/my-react-app/src/pages/PaymentStatusPage.jsx): Dedicated payment status component displaying real-time database state (Paid, Pending, Failed, Cancelled, Chargedback).

---

## 3. API Endpoints

### 1. `POST /api/payment/create` (Protected)
- **Auth**: Requires JWT (`Authorization: Bearer <token>`)
- **Body**: `{ shippingAddress, deliveryCharge }`
- **Logic**:
  1. Validates buyer authentication and cart.
  2. Calculates subtotal and grand total using trusted database prices.
  3. Creates `Order` with `paymentStatus = "pending"`.
  4. Generates PayHere checkout hash via `generateCheckoutHash()`.
- **Response**: `{ message, payhere: { merchant_id, return_url, cancel_url, notify_url, order_id, items, amount, currency, hash, ... }, orders }`

### 2. `POST /api/payment/notify` (Public Webhook)
- **Content-Type**: `application/x-www-form-urlencoded`
- **Payload**: `merchant_id`, `order_id`, `payment_id`, `payhere_amount`, `payhere_currency`, `status_code`, `md5sig`, `method`, `status_message`
- **Logic**:
  1. Calculates expected `md5sig` using `verifyNotificationSignature()`.
  2. Rejects request with status 400 if `md5sig` signature checksum does not match.
  3. Updates database order `paymentStatus` based on mapped `status_code`:
     - `2` -> `paid` (also sets order `status = "confirmed"`, records `paymentDate`, clears user cart)
     - `0` -> `pending`
     - `-1` -> `cancelled`
     - `-2` -> `failed`
     - `-3` -> `chargedback`
- **Response**: `200 OK`

### 3. `GET /api/payment/status/:orderId` (Public / Status Query)
- **Params**: `orderId` (Custom string ID e.g. `ORD-xxx` or MongoDB `_id`)
- **Response**: `{ orderId, paymentStatus, status, totalAmount, currency, payhereMethod, paymentDate, ordersCount }`

---

## 4. Database Structure (Order Schema Extension)

```javascript
{
  orderId: String,            // Indexed PayHere unique order ID (e.g. ORD-1758493021-4921)
  userId: ObjectId,           // Reference to User
  sellerId: ObjectId,         // Reference to Seller
  items: [                    // Array of ordered products
    { productId, sellerOfferId, price, quantity }
  ],
  productTotal: Number,       // Subtotal of products
  deliveryCharge: Number,     // Delivery fee
  totalAmount: Number,        // Trusted grand total
  currency: String,           // Default: "LKR"
  paymentStatus: String,      // Enum: ["pending", "paid", "failed", "cancelled", "chargedback"]
  payherePaymentId: String,   // PayHere transaction reference ID
  payhereMethod: String,      // Payment method (e.g. VISA, MASTER, EZCASH)
  payhereStatusCode: Number,  // Numeric status code returned by PayHere
  paymentDate: Date,          // Timestamp of payment confirmation
  status: String,             // Enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"]
  shippingAddress: Object,    // Complete shipping address
  createdAt: Date,
  updatedAt: Date
}
```

---

## 5. PayHere Hash & Checksum Formulas

### 1. Checkout Hash Formula
Used when launching the Sandbox payment portal:
$$\text{Checkout Hash} = \text{MD5}\left(\text{merchant\_id} + \text{order\_id} + \text{formatted\_amount} + \text{currency} + \text{UPPERCASE}(\text{MD5}(\text{merchant\_secret}))\right).\text{toUpperCase}()$$

### 2. Notification Checksum Formula
Used to authenticate PayHere webhook callbacks:
$$\text{Notification Checksum} = \text{MD5}\left(\text{merchant\_id} + \text{order\_id} + \text{payhere\_amount} + \text{payhere\_currency} + \text{status\_code} + \text{UPPERCASE}(\text{MD5}(\text{merchant\_secret}))\right).\text{toUpperCase}()$$

---

## 6. Security Implementation

1. **Merchant Secret Protection**: `PAYHERE_MERCHANT_SECRET` is defined strictly as a backend environment variable and is never exposed to the React frontend or printed in application logs.
2. **Amount Trust Assurance**: Payment totals are computed exclusively from database records (`SellerOffer` prices) on the backend. Frontend prices are ignored to prevent price tampering attacks.
3. **Cryptographic Signature Verification**: Every incoming webhook notification payload (`md5sig`) is verified before any database state transition occurs.
4. **Order Ownership & Idempotency**: Duplicate payment callback notifications are safely ignored if the order has already been marked as `paid`.
5. **No PCI Card Data Storage**: Card numbers, CVV, or sensitive payment credentials are never handled or stored by the application server; payments are handled entirely on PayHere's secure PCI-DSS compliant sandbox hosted portal.

---

## 7. Environment Variables

Add to `Backend/backend-inter/.env`:

```env
# ── PayHere Payment Gateway Sandbox ──
PAYHERE_MERCHANT_ID=1234567
PAYHERE_MERCHANT_SECRET=4XXXXXXXXXXXX
PAYHERE_SANDBOX=true
PAYHERE_NOTIFY_URL=https://your-public-domain.com/api/payment/notify
PAYHERE_RETURN_URL=https://your-frontend-domain.com/payment/status/
PAYHERE_CANCEL_URL=https://your-frontend-domain.com/payment/status/
```

---

## 8. Testing Instructions

### Run Unit Tests
Execute the PayHere unit test suite from the backend directory:

```bash
npm run test:payhere
```

Sample Output:
```
=========================================
🧪 Running PayHere Payment Service Tests
=========================================
1. Testing formatAmount...
  ✅ PASS: Formats integer 1000 to '1000.00'
  ✅ PASS: Formats string '99.9' to '99.90'
  ✅ PASS: Formats 0 to '0.00'

2. Testing PayHere Checkout Hash Generation...
  ✅ PASS: Checkout hash matches official PayHere MD5 algorithm
  ✅ PASS: Checkout hash is uppercase

3. Testing Valid Notification Checksum Verification...
  ✅ PASS: Valid notification signature verified successfully

4. Testing Invalid Notification Checksum Rejection...
  ✅ PASS: Invalid checksum correctly rejected

5. Testing PayHere Status Code Mappings...
  ✅ PASS: status_code 2 maps to 'paid'
  ✅ PASS: status_code '2' (string) maps to 'paid'
  ✅ PASS: status_code 0 maps to 'pending'
  ✅ PASS: status_code -1 maps to 'cancelled'
  ✅ PASS: status_code -2 maps to 'failed'
  ✅ PASS: status_code -3 maps to 'chargedback'
  ✅ PASS: Unknown status_code defaults to 'failed'

=========================================
📊 Test Results: 14 Passed, 0 Failed
=========================================
```

---

## 9. PayHere Sandbox Manual Testing Instructions

1. Log into your PayHere Sandbox Merchant Account at [https://sandbox.payhere.lk/](https://sandbox.payhere.lk/).
2. Retrieve your Sandbox **Merchant ID** and **Merchant Secret**.
3. Set `PAYHERE_MERCHANT_ID` and `PAYHERE_MERCHANT_SECRET` in `Backend/backend-inter/.env`.
4. Start backend (`npm start` on port 8080) and frontend (`npm run dev` on port 5173).
5. In the React frontend, add items to cart and navigate to `/checkout`.
6. Click **"💳 Pay with PayHere"**.
7. The browser will automatically redirect to `https://sandbox.payhere.lk/pay/checkout`.
8. Use PayHere Sandbox test cards:
   - **Card Number**: `4111 1111 1111 1111`
   - **Expiry Date**: Any future date (e.g. `12/28`)
   - **CVV**: `123`
9. Submit the transaction. PayHere Sandbox will trigger `POST /api/payment/notify` and redirect back to `/payment/status/:orderId`.

---

## 10. Remaining Configuration Required Before First Real Sandbox Transaction

Before running live sandbox transactions in staging/production:

1. **Public Tunnel / Webhook URL**: PayHere Sandbox servers cannot send HTTP POST webhooks to `localhost`. For local testing, configure ngrok or localtunnel:
   ```bash
   ngrok http 8080
   ```
   Set `PAYHERE_NOTIFY_URL=https://<your-ngrok-subdomain>.ngrok-free.app/api/payment/notify` in `.env`.
2. **Real Merchant Credentials**: Replace `PAYHERE_MERCHANT_ID` and `PAYHERE_MERCHANT_SECRET` in `.env` with actual credentials from your PayHere Sandbox Dashboard.
