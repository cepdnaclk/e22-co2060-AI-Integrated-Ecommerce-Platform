import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

const userToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const targetPageId = process.env.FACEBOOK_PAGE_ID || "1128959573629110";
const GRAPH_BASE = "https://graph.facebook.com/v26.0";

async function exchangeToken() {
  console.log("🔍 Fetching Page Access Token from GET /me/accounts...");

  if (!userToken) {
    console.error("❌ FACEBOOK_PAGE_ACCESS_TOKEN is missing in .env");
    process.exit(1);
  }

  try {
    const { data } = await axios.get(`${GRAPH_BASE}/me/accounts`, {
      params: {
        fields: "id,name,tasks,access_token",
        access_token: userToken
      }
    });

    const accounts = data.data || [];
    const targetAccount = accounts.find((acc) => acc.id === targetPageId);

    if (!targetAccount || !targetAccount.access_token) {
      console.error("❌ Could not find Page Access Token for Page ID:", targetPageId);
      process.exit(1);
    }

    console.log(`✅ Found Page: ${targetAccount.name} (${targetAccount.id})`);
    const pageAccessToken = targetAccount.access_token;

    // Update .env file securely
    let envContent = fs.readFileSync(envPath, "utf-8");
    const regex = /^FACEBOOK_PAGE_ACCESS_TOKEN=.*$/m;

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `FACEBOOK_PAGE_ACCESS_TOKEN=${pageAccessToken}`);
    } else {
      envContent += `\nFACEBOOK_PAGE_ACCESS_TOKEN=${pageAccessToken}`;
    }

    fs.writeFileSync(envPath, envContent, "utf-8");
    console.log("🔒 Successfully updated Backend/backend-inter/.env with the Page Access Token.");
  } catch (err) {
    console.error("❌ Token Exchange Error:", err.response?.data?.error?.message || err.message);
    process.exit(1);
  }
}

exchangeToken();
