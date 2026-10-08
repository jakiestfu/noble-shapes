import { DEFAULT_DESIGN_OPTIONS, stringToOptions, type DesignOptions } from "@noble-shapes/render";
import { PLAYGROUND_DESCRIPTION, renderOgCard, shapeName } from "./og-card.ts";

const PREFIX = "/api/image/";
const CODE_PATTERN = /^np[1-4]_[A-Za-z0-9_-]{1,4092}$/;

type Request = { rawPath?: string; requestContext?: { http?: { method?: string } } };
type Response = { statusCode: number; headers: Record<string, string>; body: string; isBase64Encoded?: boolean };

const error = (statusCode: number, body: string): Response => ({
  statusCode, body, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
});

/** Function URL handler for the one dynamic image route in the static workbench. */
export async function handler(event: Request): Promise<Response> {
  const method = event.requestContext?.http?.method;
  if (method !== "GET" && method !== "HEAD") return error(405, "Method not allowed");
  const rawPath = event.rawPath ?? "";
  if (!rawPath.startsWith(PREFIX)) return error(404, "Image not found");
  const code = rawPath.slice(PREFIX.length);
  if (code !== "default" && !CODE_PATTERN.test(code)) return error(400, "Invalid design code");

  let design: DesignOptions;
  try {
    design = code === "default" ? DEFAULT_DESIGN_OPTIONS : stringToOptions(code);
  } catch {
    return error(400, "Invalid design code");
  }
  const headers = {
    "content-type": "image/png",
    "cache-control": "public, max-age=86400, s-maxage=604800",
    "x-content-type-options": "nosniff",
  };
  if (method === "HEAD") return { statusCode: 200, headers, body: "" };

  try {
    const png = await renderOgCard(design, code === "default" ? PLAYGROUND_DESCRIPTION : shapeName(design),
      code === "default" ? undefined : PLAYGROUND_DESCRIPTION);
    return {
      statusCode: 200,
      headers,
      body: Buffer.from(png).toString("base64"),
      isBase64Encoded: true,
    };
  } catch {
    return error(500, "Image could not be rendered");
  }
}
