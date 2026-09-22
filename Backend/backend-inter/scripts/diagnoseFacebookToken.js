import axios from "axios";
import "dotenv/config";

const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const pageId = process.env.FACEBOOK_PAGE_ID || "1128959573629110";
const GRAPH_BASE = "https://graph.facebook.com/v26.0";

async function verifyAndPost() {
  console.log("==================================================");
  console.log("VERIFYING NEW PAGE TOKEN & MINIMAL POST TEST");
  console.log("==================================================");

  if (!token) {
    console.error("❌ FACEBOOK_PAGE_ACCESS_TOKEN is missing in .env");
    return;
  }

  // 1. Debug token
  console.log("\n1️⃣ Verifying token via /debug_token...");
  try {
    const { data } = await axios.get(`${GRAPH_BASE}/debug_token`, {
      params: { input_token: token, access_token: token }
    });
    const info = data.data || {};
    console.log("   is_valid:", info.is_valid);
    console.log("   app_id:", info.app_id);
    console.log("   type:", info.type);
    console.log("   user_id:", info.user_id || "N/A");
    console.log("   expires_at:", info.expires_at ? (info.expires_at === 0 ? "Never (Long-Lived Page Token)" : new Date(info.expires_at * 1000).toISOString()) : "Never");
    console.log("   scopes:", info.scopes);
    console.log("   granular_scopes:", JSON.stringify(info.granular_scopes));
  } catch (err) {
    console.log("   ❌ /debug_token error:", err.response?.data?.error?.message || err.message);
  }

  // 2. Perform ONE minimal test POST
  console.log(`\n2️⃣ Performing ONE minimal test POST to /${pageId}/feed...`);
  try {
    const { data } = await axios.post(`${GRAPH_BASE}/${pageId}/feed`, {
      message: "BEETA Products API connection test",
      access_token: token
    });
    console.log("\n🎉 SUCCESS! Facebook Post ID:", data.id);
  } catch (err) {
    const errorObj = err.response?.data?.error;
    if (errorObj) {
      console.log("   ❌ POST Failed with Meta API Error:");
      console.log("     code:", errorObj.code);
      console.log("     message:", errorObj.message);
      console.log("     error_subcode:", errorObj.error_subcode || "None");
      console.log("     fbtrace_id:", errorObj.fbtrace_id);
    } else {
      console.log("   ❌ POST Failed:", err.message);
    }
  }
}

verifyAndPost();
