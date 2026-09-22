from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)


class OllamaService:
    def __init__(self, base_url: str, model: str, timeout_seconds: int) -> None:
        self.base_url = base_url
        self.model = model
        self._client = httpx.AsyncClient(timeout=timeout_seconds)

    async def generate_response(self, prompt: str, system_message: str) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
        }

        response = await self._client.post(self.base_url, json=payload)
        response.raise_for_status()

        data = response.json()
        answer = (data.get("message") or {}).get("content", "").strip()
        if not answer:
            raise RuntimeError("Ollama returned an empty response.")
        return answer

    async def close(self) -> None:
        await self._client.aclose()

