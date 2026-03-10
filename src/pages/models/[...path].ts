import type { APIRoute } from "astro";

const HF_BASE = "https://huggingface.co";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const path = params.path;
  if (!path) {
    return new Response("Not found", { status: 404 });
  }

  // Only allow requests to the specific model repo
  if (!path.startsWith("bardsai/eu-pii-anonimization/")) {
    return new Response("Forbidden", { status: 403 });
  }

  // Map to HuggingFace resolve URL
  const modelPath = path.replace(
    "bardsai/eu-pii-anonimization/",
    "bardsai/eu-pii-anonimization/resolve/main/"
  );
  const url = `${HF_BASE}/${modelPath}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "pii-anonimizer-demo/1.0",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    return new Response(`Upstream error: ${response.status}`, {
      status: response.status,
    });
  }

  // Stream the response back with proper headers
  const contentType =
    response.headers.get("content-type") || "application/octet-stream";

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
