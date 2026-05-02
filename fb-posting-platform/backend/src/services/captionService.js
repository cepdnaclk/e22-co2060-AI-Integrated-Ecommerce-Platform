const env = require("../config/env");
const { httpRequest } = require("../utils/http");

function hashtagsFromContent(content) {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 5);
  return [...new Set(words)].map((w) => `#${w}`).join(" ");
}

async function generateCaption(seed) {
  if (!env.OPENAI_API_KEY) {
    return {
      caption: `${seed}\n\n${hashtagsFromContent(seed)}`,
      source: "local-fallback"
    };
  }

  const data = await httpRequest("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You generate short social captions for Facebook pages with tasteful hashtags."
        },
        { role: "user", content: `Create a Facebook page caption for: ${seed}` }
      ],
      temperature: 0.7
    })
  });

  const caption = data?.choices?.[0]?.message?.content?.trim();
  return {
    caption: caption || `${seed}\n\n${hashtagsFromContent(seed)}`,
    source: "openai"
  };
}

module.exports = { generateCaption };
