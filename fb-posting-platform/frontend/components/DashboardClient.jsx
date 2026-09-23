"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

function StatusBadge({ status }) {
  const cls =
    status === "published"
      ? "bg-green-100 text-green-800"
      : status === "failed"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";
  return <span className={`rounded px-2 py-1 text-xs font-semibold ${cls}`}>{status}</span>;
}

export default function DashboardClient() {
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [form, setForm] = useState({ pageId: "", content: "", linkUrl: "", scheduledAt: "" });
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const preview = useMemo(() => {
    const hashtags = form.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 3)
      .map((w) => `#${w}`)
      .join(" ");
    return `${form.content}${hashtags ? `\n\n${hashtags}` : ""}${form.linkUrl ? `\n${form.linkUrl}` : ""}`;
  }, [form.content, form.linkUrl]);

  async function loadPosts() {
    const data = await api("/api/posts");
    setPosts(data.posts);
  }

  async function loadSelectedPages() {
    const data = await api("/api/facebook/pages/selected");
    setSelectedPages(data.pages.map((p) => p.pageId));
  }

  useEffect(() => {
    loadPosts().catch(() => {});
    loadSelectedPages().catch(() => {});
  }, []);

  async function connectFacebook() {
    const data = await api("/api/facebook/connect");
    window.location.href = data.url;
  }

  async function fetchPages() {
    setLoadingPages(true);
    setError("");
    try {
      const data = await api("/api/facebook/pages");
      setPages(data.pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPages(false);
    }
  }

  async function savePages() {
    await api("/api/facebook/pages/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pages: selectedPages })
    });
    setMessage("Pages saved");
    await loadSelectedPages();
  }

  async function createPost(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.append("pageId", form.pageId);
      body.append("content", form.content);
      body.append("scheduledAt", form.scheduledAt);
      if (form.linkUrl) body.append("linkUrl", form.linkUrl);
      if (file) body.append("image", file);
      await api("/api/posts", { method: "POST", body });
      setForm({ pageId: "", content: "", linkUrl: "", scheduledAt: "" });
      setFile(null);
      await loadPosts();
      setMessage("Post scheduled");
    } catch (err) {
      setError(err.message);
    }
  }

  async function generateCaption() {
    if (!form.content.trim()) return;
    const data = await api("/api/posts/ai-caption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed: form.content })
    });
    setForm((old) => ({ ...old, content: data.caption }));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Facebook Auto Publisher</h1>
        <p className="text-sm text-slate-600">Connect pages, schedule posts, and monitor delivery status.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold">Facebook Connection</h2>
          <div className="flex gap-2">
            <button onClick={connectFacebook} className="rounded bg-blue-600 px-3 py-2 text-white">
              Connect Facebook
            </button>
            <button
              onClick={fetchPages}
              className="rounded border border-slate-300 px-3 py-2"
              disabled={loadingPages}
            >
              {loadingPages ? "Loading..." : "Load Pages"}
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {pages.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedPages.includes(p.id)}
                  onChange={(e) =>
                    setSelectedPages((old) =>
                      e.target.checked ? [...old, p.id] : old.filter((id) => id !== p.id)
                    )
                  }
                />
                {p.name}
              </label>
            ))}
            {pages.length > 0 && (
              <button onClick={savePages} className="mt-2 rounded bg-slate-900 px-3 py-2 text-white">
                Save Selected Pages
              </button>
            )}
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold">Create Scheduled Post</h2>
          <form onSubmit={createPost} className="space-y-3">
            {selectedPages.length === 0 && (
              <p className="rounded bg-amber-100 p-2 text-sm text-amber-800">
                Select and save at least one page before scheduling posts.
              </p>
            )}
            <select
              className="w-full rounded border p-2"
              value={form.pageId}
              onChange={(e) => setForm((old) => ({ ...old, pageId: e.target.value }))}
              required
            >
              <option value="">Select page</option>
              {pages
                .filter((p) => selectedPages.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
            </select>
            <textarea
              className="h-28 w-full rounded border p-2"
              placeholder="Post content"
              value={form.content}
              onChange={(e) => setForm((old) => ({ ...old, content: e.target.value }))}
              required
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                onClick={generateCaption}
              >
                AI Caption
              </button>
            </div>
            <input
              className="w-full rounded border p-2"
              placeholder="Optional link URL"
              value={form.linkUrl}
              onChange={(e) => setForm((old) => ({ ...old, linkUrl: e.target.value }))}
            />
            <input
              className="w-full rounded border p-2"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <input
              className="w-full rounded border p-2"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((old) => ({ ...old, scheduledAt: e.target.value }))}
              required
            />
            <button className="rounded bg-indigo-600 px-3 py-2 text-white">Schedule Post</button>
          </form>
          <div className="mt-4 rounded border bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Preview</p>
            <p className="whitespace-pre-wrap text-sm">{preview}</p>
          </div>
        </section>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold">Posts</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Page</th>
                <th className="py-2">Content</th>
                <th className="py-2">Scheduled</th>
                <th className="py-2">Status</th>
                <th className="py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b align-top">
                  <td className="py-2">{post.page.pageName}</td>
                  <td className="max-w-sm py-2">{post.content}</td>
                  <td className="py-2">{new Date(post.scheduledAt).toLocaleString()}</td>
                  <td className="py-2">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="py-2 text-red-600">{post.errorMessage || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded bg-green-100 p-3 text-sm text-green-700">{message}</p>}
    </div>
  );
}
