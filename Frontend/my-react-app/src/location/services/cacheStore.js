export class TTLCache {
  constructor({ ttlMs = 10 * 60 * 1000, maxEntries = 500 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    entry.lastAccessedAt = Date.now();
    return entry.value;
  }

  set(key, value) {
    this.evictExpired();

    if (this.store.size >= this.maxEntries) {
      this.evictLeastRecentlyUsed();
    }

    this.store.set(key, {
      value,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  evictExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestAccess = Number.POSITIVE_INFINITY;

    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessedAt < oldestAccess) {
        oldestAccess = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.store.delete(oldestKey);
    }
  }
}

