export class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Bound streamed input too; Content-Length may be absent or untrusted. */
export async function readJsonBody(request: Request, limit: number): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new RequestError("Use application/json", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("Missing JSON body", 400);
  let text = "";
  let size = 0;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new RequestError("Body too large", 413); }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError("Invalid JSON body", 400);
  } finally { reader.releaseLock(); }
}
