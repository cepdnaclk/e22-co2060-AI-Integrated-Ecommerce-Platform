import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteScheduledPost,
  getAvailablePages,
  getFacebookConnectUrl,
  getScheduledPosts,
  getSelectedPages,
  saveSelectedPages,
  schedulePost
} from "../services/sellerMarketingService";

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #050B2E, #081A4A, #020617)",
    color: "#fff",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  container: {
    maxWidth: 1080,
    margin: "0 auto"
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 20,
    marginBottom: 18
  },
  heading: {
    margin: 0,
    fontSize: 28
  },
  subHeading: {
    margin: "6px 0 0",
    color: "#94a3b8"
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10
  },
  btn: {
    border: "none",
    borderRadius: 8,
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer"
  },
  btnBlue: {
    background: "linear-gradient(to right, #006494, #0582ca)",
    color: "#fff"
  },
  btnGhost: {
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.15)"
  },
  input: {
    width: "100%",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    padding: "10px 12px",
    marginTop: 6,
    marginBottom: 12
  },
  label: {
    fontSize: 13,
    color: "#cbd5e1"
  },
  status: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase"
  }
};

function toDateTimeLocalInput(iso = "") {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const SellerMarketingScheduler = () => {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [availablePages, setAvailablePages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [posts, setPosts] = useState([]);

  const [form, setForm] = useState({
    pageId: "",
    content: "",
    linkUrl: "",
    scheduledAt: "",
    imageFile: null
  });

  const selectedPageIds = useMemo(() => selectedPages.map((p) => p.pageId), [selectedPages]);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [pagesData, selectedData, postsData] = await Promise.all([
        getAvailablePages(),
        getSelectedPages(),
        getScheduledPosts()
      ]);
      setAvailablePages(pagesData.pages || []);
      setSelectedPages(selectedData.pages || []);
      const fetchedPosts = postsData.posts || [];
      setPosts(fetchedPosts);
      if (!form.pageId && (selectedData.pages || []).length > 0) {
        setForm((prev) => ({ ...prev, pageId: selectedData.pages[0].pageId }));
      }
    } catch (err) {
      setError(err.message || "Failed to load marketing scheduler");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleConnect = async () => {
    setError("");
    setMessage("");
    try {
      const data = await getFacebookConnectUrl();
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectPages = async (pageId) => {
    setError("");
    setMessage("");
    try {
      const hasPage = selectedPageIds.includes(pageId);
      const nextIds = hasPage
        ? selectedPageIds.filter((id) => id !== pageId)
        : [...selectedPageIds, pageId];

      if (!nextIds.length) {
        setError("At least one page should stay selected.");
        return;
      }

      await saveSelectedPages(nextIds);
      await loadAll();
      setMessage("Selected pages updated.");
    } catch (err) {
      setError(err.message);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await schedulePost(form);
      setForm((prev) => ({
        ...prev,
        content: "",
        linkUrl: "",
        scheduledAt: "",
        imageFile: null
      }));
      await loadAll();
      setMessage("Post scheduled successfully.");
    } catch (err) {
      setError(err.message);
    }
  };

  const onDelete = async (postId) => {
    setError("");
    setMessage("");
    try {
      await deleteScheduledPost(postId);
      await loadAll();
      setMessage("Scheduled post deleted.");
    } catch (err) {
      setError(err.message);
    }
  };

  const statusStyle = (status) => {
    if (status === "published") {
      return { ...styles.status, background: "rgba(34,197,94,0.16)", color: "#4ade80" };
    }
    if (status === "failed") {
      return { ...styles.status, background: "rgba(239,68,68,0.16)", color: "#f87171" };
    }
    return { ...styles.status, background: "rgba(251,191,36,0.16)", color: "#fbbf24" };
  };

  return (
    <div className="p-4 md:p-[36px_20px]" style={styles.page}>
      <div style={styles.container}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 style={styles.heading}>Seller Marketing Scheduler</h1>
            <p style={styles.subHeading}>Schedule Facebook Page posts for automatic publishing.</p>
          </div>
          <Link to="/seller/dashboard" style={{ ...styles.btn, ...styles.btnGhost, textDecoration: "none" }}>
            Back to Dashboard
          </Link>
        </div>

        {error ? <div style={{ ...styles.card, borderColor: "rgba(239,68,68,0.35)", color: "#fecaca" }}>{error}</div> : null}
        {message ? <div style={{ ...styles.card, borderColor: "rgba(34,197,94,0.35)", color: "#bbf7d0" }}>{message}</div> : null}

        <div style={styles.card}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 style={{ margin: 0, fontSize: 20 }}>1. Connect Facebook</h2>
            <button type="button" style={{ ...styles.btn, ...styles.btnBlue }} onClick={handleConnect}>
              Connect Facebook
            </button>
          </div>
          <p style={{ color: "#94a3b8", marginBottom: 0 }}>
            Connect your seller account to Facebook, then select the Beta page(s) you want to publish to.
          </p>
        </div>

        <div style={styles.card}>
          <h2 style={{ marginTop: 0, fontSize: 20 }}>2. Select Target Pages</h2>
          {loading ? (
            <p style={{ color: "#94a3b8" }}>Loading pages...</p>
          ) : !availablePages.length ? (
            <p style={{ color: "#94a3b8" }}>No pages found yet. Connect Facebook first.</p>
          ) : (
            availablePages.map((page) => {
              const checked = selectedPageIds.includes(page.id);
              return (
                <label key={page.id} style={{ display: "block", marginBottom: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleSelectPages(page.id)}
                    style={{ marginRight: 8 }}
                  />
                  {page.name}
                </label>
              );
            })
          )}
        </div>

        <div style={styles.card}>
          <h2 style={{ marginTop: 0, fontSize: 20 }}>3. Schedule a Post</h2>
          <form onSubmit={onSubmit}>
            <label style={styles.label}>Page</label>
            <select
              style={styles.input}
              value={form.pageId}
              onChange={(e) => setForm((prev) => ({ ...prev, pageId: e.target.value }))}
              required
            >
              <option value="" disabled>
                Select a page
              </option>
              {selectedPages.map((page) => (
                <option key={page._id} value={page.pageId}>
                  {page.pageName}
                </option>
              ))}
            </select>

            <label style={styles.label}>Post Content</label>
            <textarea
              style={{ ...styles.input, minHeight: 120 }}
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              maxLength={5000}
              required
            />

            <label style={styles.label}>Link URL (optional)</label>
            <input
              style={styles.input}
              value={form.linkUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
              placeholder="https://..."
            />

            <label style={styles.label}>Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              style={styles.input}
              onChange={(e) => setForm((prev) => ({ ...prev, imageFile: e.target.files?.[0] || null }))}
            />

            <label style={styles.label}>Schedule Date & Time</label>
            <input
              type="datetime-local"
              style={styles.input}
              value={form.scheduledAt}
              onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
              required
            />

            <button type="submit" style={{ ...styles.btn, ...styles.btnBlue }}>
              Schedule Post
            </button>
          </form>
        </div>

        <div style={styles.card}>
          <h2 style={{ marginTop: 0, fontSize: 20 }}>Scheduled & Published Posts</h2>
          {!posts.length ? (
            <p style={{ color: "#94a3b8" }}>No posts yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {posts.map((post) => (
                <div
                  key={post._id}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: 14,
                    background: "rgba(255,255,255,0.02)"
                  }}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                    <strong>{post.pageRef?.pageName || "Page"}</strong>
                    <span style={statusStyle(post.status)}>{post.status}</span>
                  </div>
                  <div style={{ color: "#e2e8f0", marginBottom: 8 }}>{post.content}</div>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>
                    Scheduled: {toDateTimeLocalInput(post.scheduledAt).replace("T", " ")}
                  </div>
                  {post.publishedAt ? (
                    <div style={{ color: "#94a3b8", fontSize: 13 }}>
                      Published: {toDateTimeLocalInput(post.publishedAt).replace("T", " ")}
                    </div>
                  ) : null}
                  {post.errorMessage ? (
                    <div style={{ color: "#fca5a5", fontSize: 13 }}>Error: {post.errorMessage}</div>
                  ) : null}
                  {post.status === "pending" ? (
                    <button
                      type="button"
                      onClick={() => onDelete(post._id)}
                      style={{ ...styles.btn, ...styles.btnGhost, marginTop: 10 }}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerMarketingScheduler;
