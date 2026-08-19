/** Lowercase hex SHA-256 — same format as Apps Script's sha256_ (Code.gs).
 * Used to compute public_token_hash client-side after Supabase's create_claim
 * RPC returns the raw public_token, so the Sheets mirror can store the same
 * hash Apps Script would have computed itself. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
