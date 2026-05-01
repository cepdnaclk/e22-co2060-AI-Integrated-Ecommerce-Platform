const TEMPLATE_PATTERN = /\{\{\s*([a-zA-Z0-9._-]+)\s*\}\}/g;

export const getPathValue = (obj, path) => {
  const segments = path.split(".");
  let cursor = obj;
  for (const segment of segments) {
    if (cursor === null || typeof cursor !== "object" || !(segment in cursor)) {
      throw new Error(`Missing required payload path: ${path}`);
    }
    cursor = cursor[segment];
  }
  return cursor;
};

export const renderTemplate = (template, payload) =>
  template.replace(TEMPLATE_PATTERN, (_, key) => {
    const value = getPathValue(payload, key);
    return value === null || value === undefined ? "" : String(value);
  });

