const DEFAULT_TIMEOUT_MS = 10_000;

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

function getBaseUrl(): string {
  const baseUrl = process.env.PARENT_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("PARENT_API_BASE_URL is not set");
  }

  return baseUrl.replace(/\/+$/, "");
}

export async function parentGet<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const url = `${getBaseUrl()}/${path.replace(/^\/+/, "")}`;
    const token = process.env.PARENT_API_TOKEN;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      cache: "no-store",
      signal: controller.signal
    });

    const body = await response
      .json()
      .catch(() => ({ message: "Upstream returned non-JSON response" }));

    if (!response.ok) {
      throw new UpstreamError("Upstream API request failed", response.status, body);
    }

    return body as T;
  } catch (error) {
    if (error instanceof UpstreamError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new UpstreamError("Upstream API request timed out", 504);
    }

    throw new UpstreamError("Unexpected upstream API error", 502, {
      message: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    clearTimeout(timeout);
  }
}
