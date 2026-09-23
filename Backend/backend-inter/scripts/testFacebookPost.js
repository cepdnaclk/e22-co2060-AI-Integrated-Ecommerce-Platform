import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

async function testFacebookPost() {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !pageAccessToken) {
    console.error("❌ ERROR: FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN is missing in .env");
    process.exit(1);
  }

  const testMessage = "🚀 Test post from our AI E-Commerce Platform. Facebook integration is working successfully!";

  try {
    const url = `https://graph.facebook.com/v26.0/${pageId}/feed`;
    const response = await axios.post(url, {
      message: testMessage,
      access_token: pageAccessToken
    });

    console.log("==========================================");
    console.log("✅ Facebook Test Post Published Successfully!");
    console.log("==========================================");
    console.log(`Facebook Post ID: ${response.data.id}`);
    console.log(`Posted Message   : "${testMessage}"`);
    console.log("==========================================");
    process.exit(0);
  } catch (error) {
    console.error("==========================================");
    console.error("❌ Facebook Post Publication Failed");
    console.error("==========================================");
    if (error.response && error.response.data && error.response.data.error) {
      console.error(`Error Code   : ${error.response.data.error.code}`);
      console.error(`Error Message: ${error.response.data.error.message}`);
      if (error.response.data.error.error_subcode) {
        console.error(`Subcode      : ${error.response.data.error.error_subcode}`);
      }
    } else {
      console.error(`Error Message: ${error.message}`);
    }
    console.error("==========================================");
    process.exit(1);
  }
}

testFacebookPost();
