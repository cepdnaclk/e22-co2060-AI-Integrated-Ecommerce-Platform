import axios from "axios";

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

export function buildFacebookConnectUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.FB_APP_ID,
    redirect_uri: process.env.FB_REDIRECT_URI,
    state,
    response_type: "code",
    scope: "pages_manage_posts,pages_read_engagement,pages_show_list"
  });
  return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForShortToken(code) {
  const { data } = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
    params: {
      client_id: process.env.FB_APP_ID,
      client_secret: process.env.FB_APP_SECRET,
      redirect_uri: process.env.FB_REDIRECT_URI,
      code
    }
  });
  return data;
}

export async function exchangeForLongLivedToken(shortToken) {
  const { data } = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: process.env.FB_APP_ID,
      client_secret: process.env.FB_APP_SECRET,
      fb_exchange_token: shortToken
    }
  });
  return data;
}

export async function refreshLongLivedToken(longToken) {
  const { data } = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: process.env.FB_APP_ID,
      client_secret: process.env.FB_APP_SECRET,
      fb_exchange_token: longToken
    }
  });
  return data;
}

export async function fetchAdminPages(userAccessToken) {
  const { data } = await axios.get(`${GRAPH_BASE}/me/accounts`, {
    params: {
      access_token: userAccessToken,
      fields: "id,name,access_token,perms,tasks"
    }
  });

  return (data.data || []).filter((page) => {
    const perms = page.perms || [];
    const tasks = page.tasks || [];
    return perms.includes("CREATE_CONTENT") || tasks.includes("CREATE_CONTENT");
  });
}

export async function publishToPage({ pageId, pageAccessToken, content, imageUrl, linkUrl }) {
  if (imageUrl) {
    const payload = {
      access_token: pageAccessToken,
      url: imageUrl,
      caption: linkUrl ? `${content}\n${linkUrl}` : content
    };
    const { data } = await axios.post(`${GRAPH_BASE}/${pageId}/photos`, payload);
    return data;
  }

  const payload = {
    access_token: pageAccessToken,
    message: content
  };
  if (linkUrl) payload.link = linkUrl;

  const { data } = await axios.post(`${GRAPH_BASE}/${pageId}/feed`, payload);
  return data;
}
