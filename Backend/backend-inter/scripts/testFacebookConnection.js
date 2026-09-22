import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

async function testFacebookConnection() {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !pageAccessToken) {
    console.error("❌ ERROR: FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN is missing in .env");
    process.exit(1);
  }

  try {
    const url = `https://graph.facebook.com/v26.0/${pageId}`;
    const response = await axios.get(url, {
      params: {
        fields: "id,name",
        access_token: pageAccessToken
      }
    });

    console.log("==========================================");
    console.log("✅ Facebook Page Connection Successful!");
    console.log("==========================================");
    console.log(`Page ID  : ${response.data.id}`);
    console.log(`Page Name: ${response.data.name}`);
    console.log("==========================================");
    process.exit(0);
  } catch (error) {
    console.error("==========================================");
    console.error("❌ Meta API Request Failed");
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

testFacebookConnection();
