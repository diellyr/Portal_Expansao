// Estratégia AI -- secure relay for AI provider calls.
//
// WHY THIS EXISTS: the Portal Expansão front-end is a static site (no
// Node/server runtime of its own). Most AI provider APIs (OpenAI,
// Anthropic, Gemini, etc.) block direct browser CORS requests regardless
// of credentials, and a permanently-configured API key must never reach
// the browser. This function is the one server-side hop that makes both
// of those true at once, without adding or altering anything in the
// Supabase database (no table/column/RLS/trigger changes anywhere).
//
// TWO KEY-HANDLING MODES (see MANUAL_DO_USUARIO.md's Estratégia AI section
// and js/services/ai/session-config-store.js for the matching front-end
// half of this):
//   - "Production" mode: the administrator sets provider secrets as this
//     function's environment variables (Supabase project settings ->
//     Edge Functions -> Secrets), e.g. OPENAI_API_KEY, ANTHROPIC_API_KEY.
//     The browser never sends a key at all; this function injects the
//     secret into the forwarded request itself.
//   - "Temporary/test" mode: the browser sends a session-only key (never
//     persisted in localStorage/sessionStorage -- see session-config-
//     store.js) inside `request.headers`, already shaped correctly by the
//     matching provider adapter in js/services/ai/providers/*. This
//     function only forwards it over HTTPS to the real provider; it is
//     never logged, echoed back, or written anywhere.
//
// This function does not know what a "youth record" or "cidade" is -- it
// only forwards an already-built HTTP request to a third-party AI API and
// returns the result. All data-shaping/redaction happens in the front-end
// (js/services/ai/context-functions.js, privacy-utils.js) before a request
// ever reaches here.
//
// DEPLOYMENT: this file is provided ready to deploy but is NOT deployed by
// this codebase automatically -- an administrator must run
// `supabase functions deploy ai-strategy-proxy` against their own linked
// Supabase project and configure whichever provider secrets they intend to
// use in production mode. See MANUAL_DO_USUARIO.md for the full walkthrough.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Maps a provider id (see js/services/ai/provider-catalog.js) to the name
// of the environment variable holding its production secret, and which
// header/query mechanism that secret must be injected into. Kept in sync
// manually with provider-catalog.js's `authType`/`authHeaderName` --
// duplicated here on purpose: this function must never import front-end
// application code, and this mapping is pure protocol convention, not
// business logic.
const PROVIDER_ENV = {
  openai: { envVar: "OPENAI_API_KEY", inject: "bearer" },
  gemini: { envVar: "GEMINI_API_KEY", inject: "query", queryParam: "key" },
  anthropic: { envVar: "ANTHROPIC_API_KEY", inject: "header", headerName: "x-api-key" },
  deepseek: { envVar: "DEEPSEEK_API_KEY", inject: "bearer" },
  xai: { envVar: "XAI_API_KEY", inject: "bearer" },
  mistral: { envVar: "MISTRAL_API_KEY", inject: "bearer" },
  cohere: { envVar: "COHERE_API_KEY", inject: "bearer" },
  perplexity: { envVar: "PERPLEXITY_API_KEY", inject: "bearer" },
  manus: { envVar: "MANUS_API_KEY", inject: "bearer" },
  openrouter: { envVar: "OPENROUTER_API_KEY", inject: "bearer" },
  groq: { envVar: "GROQ_API_KEY", inject: "bearer" },
  together: { envVar: "TOGETHER_API_KEY", inject: "bearer" },
  fireworks: { envVar: "FIREWORKS_API_KEY", inject: "bearer" },
  azure_openai: { envVar: "AZURE_OPENAI_API_KEY", inject: "header", headerName: "api-key" },
  custom_openai: { envVar: "CUSTOM_OPENAI_API_KEY", inject: "bearer" },
};

function hasAuth(headers) {
  const keys = Object.keys(headers || {}).map((k) => k.toLowerCase());
  return keys.includes("authorization") || keys.includes("x-api-key") || keys.includes("api-key");
}

function injectServerSecret(providerId, targetUrl, headers) {
  const cfg = PROVIDER_ENV[providerId];
  if (!cfg) return { url: targetUrl, headers };
  const secret = Deno.env.get(cfg.envVar);
  if (!secret) return { url: targetUrl, headers, missingSecret: true };

  if (cfg.inject === "bearer") return { url: targetUrl, headers: { ...headers, Authorization: `Bearer ${secret}` } };
  if (cfg.inject === "header") return { url: targetUrl, headers: { ...headers, [cfg.headerName]: secret } };
  if (cfg.inject === "query") {
    const url = new URL(targetUrl);
    url.searchParams.set(cfg.queryParam, secret);
    return { url: url.toString(), headers };
  }
  return { url: targetUrl, headers };
}

function isServerSecretConfigured(providerId) {
  const cfg = PROVIDER_ENV[providerId];
  return !!(cfg && Deno.env.get(cfg.envVar));
}

async function forward(targetUrl, headers, body, stream) {
  const hasBody = body !== undefined && body !== null;
  const res = await fetch(targetUrl, {
    method: hasBody ? "POST" : "GET",
    headers: hasBody ? { "Content-Type": "application/json", ...headers } : headers,
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  if (stream && res.body) {
    return new Response(res.body, {
      status: res.status,
      headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream" },
    });
  }

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const payload = await req.json();
    const { mode, providerId, request } = payload;

    if (mode === "status") {
      return new Response(JSON.stringify({ configured: isServerSecretConfigured(providerId) }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!request?.url) {
      return new Response(JSON.stringify({ error: "Requisição malformada." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let { url, headers } = request;
    // Only inject a server secret if the browser did not already attach one
    // itself (temporary/test mode) -- production mode never sends a key.
    if (!hasAuth(headers)) {
      const injected = injectServerSecret(providerId, url, headers || {});
      if (injected.missingSecret) {
        return new Response(
          JSON.stringify({ error: "Nenhuma credencial configurada para este provedor (nem enviada pela sessão, nem configurada como secret no backend)." }),
          { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      url = injected.url;
      headers = injected.headers;
    }

    return await forward(url, headers, request.body, mode === "generate" && payload.stream === true);
  } catch (err) {
    return new Response(JSON.stringify({ error: "Não foi possível processar a solicitação." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
