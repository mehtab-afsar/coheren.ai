/**
 * proxyFetch — the browser side of the ai-proxy gateway.
 *
 * Provider SDKs (groq-sdk, @anthropic-ai/sdk) are pointed at the ai-proxy edge
 * function via `baseURL`, and given this fetch implementation. Per request it:
 *   1. reads a FRESH Supabase access token (handles token refresh),
 *   2. overwrites whatever auth header the SDK set (the SDK's `apiKey` is a
 *      dummy) with `Authorization: Bearer <jwt>`,
 *   3. strips `x-api-key` (the Anthropic SDK sets this; the gateway injects the
 *      real one server-side).
 *
 * The gateway verifies the JWT, enforces the per-user rate limit, injects the
 * real provider key, and forwards — so the real keys never reach the browser.
 */

import { supabase } from './supabase';

export async function proxyFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init?.headers);
  // The SDK put a dummy key here; replace with the caller's Supabase JWT.
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.delete('Authorization');
  }
  // Anthropic SDK auth header — the gateway supplies the real one.
  headers.delete('x-api-key');

  return fetch(input, { ...init, headers });
}
