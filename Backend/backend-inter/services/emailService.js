import nodemailer from "nodemailer";

/**
 * Create nodemailer transporter lazily inside the function
 * so that process.env vars are guaranteed to be loaded by dotenv first.
 */
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS?.replace(/\s/g, ""), // strip any spaces
    },
  });
}

/**
 * Send a seller email verification link
 * @param {string} toEmail  - recipient email address
 * @param {string} shopName - the seller's shop name
 * @param {string} token    - unique verification token
 */
export async function sendSellerVerificationEmail(toEmail, shopName, token) {
  const transporter = createTransporter();
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-seller-email?token=${token}`;

  await transporter.sendMail({
    from: `"BEETA Marketplace" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "🏪 Verify Your Seller Account – BEETA",
    html: `
      <div style="font-family: Arial, sans-serif; background: #050B2E; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 600px; margin: auto;">
        <h1 style="color: #4ac6ff; margin-bottom: 8px;">Welcome to BEETA Sellers!</h1>
        <p style="color: #cbd5e1; font-size: 16px;">
          Hi <strong>${shopName}</strong>,<br/>
          You're almost ready to start selling. Click the button below to verify your email and activate your seller account.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}"
             style="
               background: linear-gradient(to right, #006494, #0582ca, #00a6fb);
               color: white;
               padding: 14px 32px;
               border-radius: 10px;
               text-decoration: none;
               font-size: 16px;
               font-weight: bold;
               display: inline-block;
             ">
            ✅ Verify Seller Account
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 13px;">
          This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
        </p>

        <hr style="border-color: rgba(255,255,255,0.1); margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px; text-align: center;">BEETA Marketplace · AI-Integrated Ecommerce</p>
      </div>
    `,
  });
}
