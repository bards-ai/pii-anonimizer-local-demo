import type { APIRoute } from "astro";

const HF_BASE = "https://huggingface.co";
const ALLOWED_REPO = "bardsai/eu-pii-anonimization";

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
  // Handle both patterns
  let hfPath: string;
  if (path.includes("/resolve/")) {
    hfPath = path;
  } else {
    hfPath = path.replace(
      ALLOWED_REPO + "/",
      ALLOWED_REPO + "/resolve/main/"
    );
  }

  const url = `${HF_BASE}/${hfPath}`;

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
