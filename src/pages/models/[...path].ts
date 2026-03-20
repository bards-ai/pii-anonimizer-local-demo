import type { APIRoute } from "astro";

const HF_BASE = "https://huggingface.co";
const ALLOWED_REPO = "bardsai/eu-pii-anonimization-multilang";
const HF_REVISION = "327c24b6e6bc54cd3802aef6b4b454abe5dd44cf";
const NON_IMMUTABLE_FILES = new Set([
  "config.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "generation_config.json",
]);

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const path = params.path;
  if (!path) {
    return new Response("Not found", { status: 404 });
  }

  if (!path.startsWith(ALLOWED_REPO + "/")) {
    return new Response("Forbidden", { status: 403 });
  }

  // Transformers.js remote loading sends: {model_id}/resolve/main/{filename}
  // Direct local loading sends: {model_id}/{filename}
  // Normalize both patterns to a pinned revision for deterministic downloads.
  let hfPath: string;
  if (path.includes("/resolve/")) {
    hfPath = path.replace(
      /^(bardsai\/eu-pii-anonimization-multilang)\/resolve\/[^/]+\//,
      `$1/resolve/${HF_REVISION}/`
    );
  } else {
    hfPath = path.replace(
      ALLOWED_REPO + "/",
      `${ALLOWED_REPO}/resolve/${HF_REVISION}/`
    );
  }

  const url = `${HF_BASE}/${hfPath}`;
  const fileName = hfPath.split("/").pop() || "";
  const shouldBypassCache = NON_IMMUTABLE_FILES.has(fileName);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "pii-anonimizer-demo/1.0",
    },
    ...(shouldBypassCache ? { cache: "no-store" as const } : {}),
    redirect: "follow",
  });

  if (!response.ok) {
    return new Response(`Upstream error: ${response.status}`, {
      status: response.status,
    });
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": shouldBypassCache
        ? "no-store, max-age=0"
        : "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
