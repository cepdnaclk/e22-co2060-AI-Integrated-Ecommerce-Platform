import API_BASE_URL from "../config/api";
import { getAuthToken } from "../utils/auth";

const BASE_URL = `${API_BASE_URL}/api/sellers/marketing/facebook`;

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${getAuthToken()}`,
    ...extra
  };
}

export async function getFacebookConnectUrl() {
  const res = await fetch(`${BASE_URL}/connect`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to get connect URL");
  return data;
}

export async function getAvailablePages() {
  const res = await fetch(`${BASE_URL}/pages`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch available pages");
  return data;
}

export async function getSelectedPages() {
  const res = await fetch(`${BASE_URL}/pages/selected`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch selected pages");
  return data;
}

export async function saveSelectedPages(pages) {
  const res = await fetch(`${BASE_URL}/pages/select`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ pages })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to save pages");
  return data;
}

export async function schedulePost({ pageId, content, scheduledAt, linkUrl, imageFile }) {
  const formData = new FormData();
  formData.append("pageId", pageId);
  formData.append("content", content);
  formData.append("scheduledAt", scheduledAt);
  if (linkUrl) formData.append("linkUrl", linkUrl);
  if (imageFile) formData.append("image", imageFile);

  const res = await fetch(`${BASE_URL}/posts`, {
    method: "POST",
    headers: authHeaders(),
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to schedule post");
  return data;
}

export async function getScheduledPosts() {
  const res = await fetch(`${BASE_URL}/posts`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch scheduled posts");
  return data;
}

export async function deleteScheduledPost(postId) {
  const res = await fetch(`${BASE_URL}/posts/${postId}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!res.ok) {
    let message = "Failed to delete scheduled post";
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }
}
