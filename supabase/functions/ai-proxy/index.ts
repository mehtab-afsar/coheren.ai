// ai-proxy — multi-provider passthrough gateway (Supabase Edge Function, Deno).
//
// Keeps the real Groq / Anthropic / Jina API keys server-side. The browser SDKs
// point their baseURL here and send the user's Supabase JWT; this function:
//   1. handles CORS preflight,
//   2. verifies the JWT (401 if anonymous),
//   3. enforces a per-user fixed-window rate limit (429 if exceeded),
//   4. injects the real provider key and forwards the request,
//   5. streams the upstream response body straight back (SSE preserved).
//
// config.toml sets `verify_jwt = false` so WE own the 401/429 JSON responses.

import { createClient } from 'jsr:@supabase/supabase-js@2';

// ── Provider routing ──────────────────────────────────────────────────────────
// Map the path prefix after /ai-proxy/<provider>/ to the real upstream base.
interface ProviderRoute {
  base: string;
  auth: (req: Headers) => void; // mutate headers to add the provider secret
}

const PROVIDERS: Record<string, ProviderRoute> = {
  groq: {
    base: 'https://api.groq.com',
    auth: (h) => h.set('Authorization', `Bearer ${Deno.env.get('GROQ_API_KEY') ?? ''}`),
  },
  anthropic: {
    base: 'https://api.anthropic.com',
    auth: (h) => {
      h.set('x-api-key', Deno.env.get('ANTHROPIC_API_KEY') ?? '');
      if (!h.has('anthropic-version')) h.set('anthropic-version', '2023-06-01');
    },
  },
  jina: {
    base: 'https://api.jina.ai',
    auth: (h) => h.set('Authorization', `Bearer ${Deno.env.get('JINA_API_KEY') ?? ''}`),
  },
};

const RATE_LIMIT_PER_MIN = Number(Deno.env.get('AI_PROXY_RATE_LIMIT') ?? '60');

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, anthropic-version, x-api-key',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // 1. CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  // Path looks like /functions/v1/ai-proxy/<provider>/<...rest>
  const marker = '/ai-proxy/';
  const idx = url.pathname.indexOf(marker);
  if (idx === -1) return json(404, { error: 'not found' });
  const rest = url.pathname.slice(idx + marker.length); // e.g. "groq/openai/v1/chat/completions"
  const slash = rest.indexOf('/');
  const providerKey = slash === -1 ? rest : rest.slice(0, slash);
  const upstreamPath = slash === -1 ? '' : rest.slice(slash); // includes leading "/"
  const provider = PROVIDERS[providerKey];
  if (!provider) return json(404, { error: `unknown provider: ${providerKey}` });

  // 2. Verify JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const authed = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await authed.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: 'unauthorized' });
  }
  const userId = userData.user.id;

  // 3. Rate limit (fixed window per minute, Postgres-backed)
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (serviceKey) {
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: allowed, error: rlErr } = await admin.rpc('check_and_increment_rate_limit', {
      p_user: userId,
      p_limit: RATE_LIMIT_PER_MIN,
    });
    if (!rlErr && allowed === false) {
      return json(429, { error: 'rate limit exceeded', limit: RATE_LIMIT_PER_MIN });
    }
    // On rlErr we fail-open (don't block real users on limiter hiccups).
  }

  // 4. Build the upstream request with the real provider key injected.
  const targetUrl = `${provider.base}${upstreamPath}${url.search}`;
  const fwdHeaders = new Headers();
  // Forward only safe content headers; drop the client's auth entirely.
  const ct = req.headers.get('content-type');
  if (ct) fwdHeaders.set('content-type', ct);
  const accept = req.headers.get('accept');
  if (accept) fwdHeaders.set('accept', accept);
  const anthropicVersion = req.headers.get('anthropic-version');
  if (anthropicVersion) fwdHeaders.set('anthropic-version', anthropicVersion);
  provider.auth(fwdHeaders);

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers: fwdHeaders,
    body: hasBody ? await req.arrayBuffer() : undefined,
  });

  // 5. Stream the response body straight back (never buffer — preserves SSE).
  const respHeaders = new Headers(CORS_HEADERS);
  const upstreamCt = upstream.headers.get('content-type');
  if (upstreamCt) respHeaders.set('content-type', upstreamCt);
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
});
