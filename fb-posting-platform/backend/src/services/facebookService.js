const env = require("../config/env");
const { httpRequest } = require("../utils/http");

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

function connectUrl(state) {
  const params = new URLSearchParams({
    client_id: env.FB_APP_ID,
    redirect_uri: env.FB_REDIRECT_URI,
    state,
    response_type: "code",
    scope: "pages_manage_posts,pages_read_engagement,pages_show_list"
  });
  return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    client_id: env.FB_APP_ID,
    client_secret: env.FB_APP_SECRET,
    redirect_uri: env.FB_REDIRECT_URI,
    code
  });
  return httpRequest(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`, { method: "GET" });
}

async function exchangeLongLivedToken(shortLivedToken) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: env.FB_APP_ID,
    client_secret: env.FB_APP_SECRET,
    fb_exchange_token: shortLivedToken
  });
  return httpRequest(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`, { method: "GET" });
}

async function refreshLongLivedToken(existingLongLivedToken) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: env.FB_APP_ID,
    client_secret: env.FB_APP_SECRET,
    fb_exchange_token: existingLongLivedToken
  });
  return httpRequest(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`, { method: "GET" });
}

async function getUserPages(accessToken) {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,name,access_token,perms,tasks"
  });
  const data = await httpRequest(`${GRAPH_BASE}/me/accounts?${params.toString()}`);
  return (data.data || []).filter((p) => {
    const perms = p.perms || [];
    const tasks = p.tasks || [];
    return perms.includes("CREATE_CONTENT") || tasks.includes("CREATE_CONTENT");
  });
}

async function publishPostToPage({ pageId, pageToken, content, imageUrl, linkUrl }) {
  if (imageUrl) {
    const payload = { url: imageUrl, caption: content, access_token: pageToken };
    if (linkUrl) {
      payload.caption = `${content}\n${linkUrl}`;
    }
    return httpRequest(`${GRAPH_BASE}/${pageId}/photos`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  return httpRequest(`${GRAPH_BASE}/${pageId}/feed`, {
    method: "POST",
    body: JSON.stringify({
      message: content,
      link: linkUrl,
      access_token: pageToken
    })
  });
}

module.exports = {
  connectUrl,
  exchangeCodeForToken,
  exchangeLongLivedToken,
  refreshLongLivedToken,
  getUserPages,
  publishPostToPage
};
