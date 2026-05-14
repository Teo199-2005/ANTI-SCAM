/**
 * Read a fetch Response body as JSON for Laravel BFF routes.
 * Avoids throwing when the upstream returns HTML or empty bodies (common on 5xx / proxy misconfig).
 */
export async function readBackendResponseJson(res: Response): Promise<{
  ok: boolean;
  status: number;
  parsed: unknown;
  rawSnippet: string;
  parseFailed: boolean;
}> {
  const raw = await res.text();
  const rawSnippet = raw.length > 240 ? `${raw.slice(0, 240)}…` : raw;
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: res.ok, status: res.status, parsed: null, rawSnippet: "", parseFailed: false };
  }
  try {
    return { ok: res.ok, status: res.status, parsed: JSON.parse(trimmed) as unknown, rawSnippet, parseFailed: false };
  } catch {
    return { ok: res.ok, status: res.status, parsed: null, rawSnippet, parseFailed: true };
  }
}
