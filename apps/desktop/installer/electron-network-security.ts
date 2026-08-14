const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_JSON_BYTES = 1_048_576;

export async function readBoundedJson(
  response: Response,
  maxBytes = DEFAULT_MAX_JSON_BYTES,
): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("application/json") && !contentType.includes("+json")) {
    throw new Error("Remote response is not JSON");
  }

  const declaredLength = response.headers.get("content-length");
  if (declaredLength) {
    if (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maxBytes) {
      throw new Error("Remote JSON response exceeds the allowed size");
    }
  }

  if (!response.body) {
    throw new Error("Remote JSON response is empty");
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error("Remote JSON response exceeds the allowed size");
    }
    chunks.push(Buffer.from(value));
  }

  if (totalBytes === 0) {
    throw new Error("Remote JSON response is empty");
  }

  return JSON.parse(Buffer.concat(chunks, totalBytes).toString("utf8"));
}

export async function fetchBoundedJson(
  url: string,
  init: RequestInit = {},
  options: {
    timeoutMs?: number;
    maxBytes?: number;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<{ response: Response; data: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("Remote request timed out")),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      ...init,
      redirect: "error",
      signal: controller.signal,
    });
    const data = await readBoundedJson(
      response,
      options.maxBytes ?? DEFAULT_MAX_JSON_BYTES,
    );
    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}
