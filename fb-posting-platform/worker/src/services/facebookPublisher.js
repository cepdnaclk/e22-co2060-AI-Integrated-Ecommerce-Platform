async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error?.message || "Graph API publish failed");
    error.details = payload;
    throw error;
  }

  return payload;
}

async function publishToFacebook({ pageId, pageToken, content, linkUrl, imageUrl }) {
  const base = "https://graph.facebook.com/v20.0";
  if (imageUrl) {
    return postJson(`${base}/${pageId}/photos`, {
      access_token: pageToken,
      url: imageUrl,
      caption: linkUrl ? `${content}\n${linkUrl}` : content
    });
  }

  return postJson(`${base}/${pageId}/feed`, {
    access_token: pageToken,
    message: content,
    link: linkUrl || undefined
  });
}

module.exports = { publishToFacebook };
