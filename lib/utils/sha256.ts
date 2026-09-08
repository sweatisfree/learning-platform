// Web Crypto's subtle.digest is available globally in both the browser and
// Node 19+, so this one implementation works for client-side token
// generation and server-side verification without duplicating hash logic
// across two different crypto APIs.
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
