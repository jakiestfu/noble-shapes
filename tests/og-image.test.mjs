import assert from "node:assert/strict";
import { test } from "node:test";
import { handler } from "../apps/workbench/src/server/og-image.ts";
import { DEFAULT_DESIGN_OPTIONS, optionsToString } from "../packages/render/dist/index.js";

const request = (code, method = "GET") => ({
  rawPath: `/api/image/${code}`, requestContext: { http: { method } },
});

test("Open Graph image endpoint renders the default and an encoded design", async () => {
  const code = optionsToString({ ...DEFAULT_DESIGN_OPTIONS, shape: "cube", color: "#ff0000", paletteLinked: false });
  const standard = await handler(request("default"));
  const custom = await handler(request(code));
  for (const response of [standard, custom]) {
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "image/png");
    assert.equal(response.isBase64Encoded, true);
    const png = Buffer.from(response.body, "base64");
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
  }
  assert.notEqual(custom.body, standard.body);
});

test("Open Graph image endpoint rejects malformed codes and handles HEAD", async () => {
  assert.equal((await handler(request("invalid"))).statusCode, 400);
  assert.equal((await handler(request("default", "POST"))).statusCode, 405);
  const head = await handler(request("default", "HEAD"));
  assert.equal(head.statusCode, 200);
  assert.equal(head.body, "");
});
