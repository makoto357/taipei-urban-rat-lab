import assert from "node:assert/strict";
import { test } from "node:test";

import { sanitizeContent } from "../scripts/sanitize-literature.mts";

test("strips scripts, handlers, javascript: links and interactive widgets", () => {
  const out = sanitizeContent(
    '<p onclick="x()">hi<script>alert(1)</script></p><a href="javascript:alert(1)">bad</a><button>go</button><input value="1"><img src=x onerror=alert(1)><iframe src="https://evil"></iframe>',
  );
  for (const bad of ["script", "onclick", "javascript:", "<button", "<input", "<img", "<iframe", "onerror"]) {
    assert.ok(!out.includes(bad), `still contains ${bad}: ${out}`);
  }
  assert.ok(out.includes("hi"));
});

test("keeps figure captions and accessible svg", () => {
  const out = sanitizeContent(
    '<figure><svg viewBox="0 0 1 1" role="img" aria-labelledby="t"><title id="t">圖</title><rect x="0" y="0" width="1" height="1"/></svg><figcaption>說明</figcaption></figure>',
  );
  assert.ok(out.includes("<figcaption>說明</figcaption>"));
  assert.ok(out.includes('aria-labelledby="t"') && out.includes("<rect"));
});

test("rewrites internal links and hardens external ones", () => {
  const out = sanitizeContent(
    '<a data-resource-id="abc" data-section-id="s1" href="#">in</a><a href="https://example.com">out</a>',
  );
  assert.ok(out.includes('href="/literature/abc#s1"'));
  assert.ok(out.includes('rel="noopener noreferrer"') && out.includes('target="_blank"'));
});
