import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { AiNotConfigured, AiRequestError, chatJson, checkBaseUrl, extractJson } from "../src/lib/reports/llm-client.ts";
import { generateWithRetry, narrativeJsonSchema } from "../src/lib/reports/narrative.ts";

const GOOD = {
  summary: "Trong kỳ có 2 cảnh báo.",
  trends: [{ title: "Dồn vào cuối tuần", observation: "Hai cảnh báo xảy ra cuối tuần.", evidence_refs: ["E1"] }],
  discuss_with_doctor: [],
  questions_for_doctor: ["Có cần theo dõi thêm không?"],
  non_medical_suggestions: [],
  data_quality_note: "Dữ liệu đầy đủ.",
};

// A fake OpenAI-compatible gateway. `handler(reqInfo, res)` decides the response.
async function withServer(handler, fn) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const info = { method: req.method, url: req.url, headers: req.headers, body: raw ? JSON.parse(raw) : null };
      seen.push(info);
      handler(info, res, seen.length);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/v1`;
  try {
    await fn(base, seen);
  } finally {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
}
const ok = (res, content) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }));
};
const msgs = [{ role: "system", content: "s" }, { role: "user", content: "u" }];

test("checkBaseUrl allows https anywhere and http only for local/private hosts", () => {
  assert.equal(checkBaseUrl("https://router.example.com/v1/"), "https://router.example.com/v1");
  assert.equal(checkBaseUrl("http://localhost:20128/v1"), "http://localhost:20128/v1");
  assert.equal(checkBaseUrl("http://host.docker.internal:20128/v1"), "http://host.docker.internal:20128/v1");
  assert.equal(checkBaseUrl("http://192.168.1.5:20128/v1"), "http://192.168.1.5:20128/v1");
  assert.equal(checkBaseUrl("http://10.0.0.4/v1"), "http://10.0.0.4/v1");
  assert.equal(checkBaseUrl("http://172.20.0.2:3000/v1"), "http://172.20.0.2:3000/v1");
  assert.equal(checkBaseUrl("http://9router:20128/v1"), "http://9router:20128/v1"); // Docker service name
  assert.throws(() => checkBaseUrl("http://example.com/v1"), AiNotConfigured);
  assert.throws(() => checkBaseUrl("http://8.8.8.8/v1"), AiNotConfigured);
  assert.throws(() => checkBaseUrl("http://172.32.0.1/v1"), AiNotConfigured); // outside 172.16/12
  assert.throws(() => checkBaseUrl("ftp://localhost/v1"), AiNotConfigured);
  assert.throws(() => checkBaseUrl("not a url"), AiNotConfigured);
});

test("extractJson strips fences and surrounding prose", () => {
  assert.equal(extractJson('{"a":1}'), '{"a":1}');
  assert.equal(extractJson('```json\n{"a":1}\n```'), '{"a":1}');
  assert.equal(extractJson('Đây là kết quả:\n{"a":{"b":2}}\nHết.'), '{"a":{"b":2}}');
  assert.equal(extractJson("no json here"), "no json here");
});

test("chatJson sends an OpenAI-style request and returns the extracted JSON", async () => {
  await withServer((_i, res) => ok(res, "```json\n" + JSON.stringify(GOOD) + "\n```"), async (base, seen) => {
    const out = await chatJson({ baseUrl: base, apiKey: "k-123", model: "gemini/flash" }, msgs);
    assert.deepEqual(JSON.parse(out), GOOD);
    const r = seen[0];
    assert.equal(r.method, "POST");
    assert.equal(r.url, "/v1/chat/completions");
    assert.equal(r.headers.authorization, "Bearer k-123");
    assert.equal(r.body.model, "gemini/flash");
    assert.equal(r.body.stream, false);
    assert.deepEqual(r.body.messages, msgs);
    assert.equal("response_format" in r.body, false); // default "none" works with any upstream
  });
});

test("chatJson sets response_format only when asked", async () => {
  await withServer((_i, res) => ok(res, JSON.stringify(GOOD)), async (base, seen) => {
    await chatJson({ baseUrl: base, apiKey: "k", model: "m", responseFormat: "json_object" }, msgs);
    assert.deepEqual(seen[0].body.response_format, { type: "json_object" });
    await chatJson({ baseUrl: base, apiKey: "k", model: "m", responseFormat: "json_schema" }, msgs, narrativeJsonSchema);
    assert.equal(seen[1].body.response_format.type, "json_schema");
    assert.equal(seen[1].body.response_format.json_schema.strict, true);
    assert.equal(seen[1].body.response_format.json_schema.schema.additionalProperties, false);
  });
});

test("chatJson accepts content returned as an array of text parts", async () => {
  await withServer((_i, res) => ok(res, [{ type: "text", text: '{"a":' }, { type: "text", text: "1}" }]), async (base) => {
    assert.equal(await chatJson({ baseUrl: base, apiKey: "k", model: "m" }, msgs), '{"a":1}');
  });
});

test("HTTP errors surface only the status, never the provider's body", async () => {
  await withServer((_i, res) => { res.writeHead(401, { "content-type": "application/json" }); res.end(JSON.stringify({ error: "bad key; request was: DỮ LIỆU sức khỏe" })); }, async (base) => {
    await assert.rejects(chatJson({ baseUrl: base, apiKey: "k", model: "m" }, msgs), (e) => {
      assert.ok(e instanceof AiRequestError);
      assert.equal(e.status, 401);
      assert.ok(!/DỮ LIỆU|sức khỏe/.test(e.message));
      return true;
    });
  });
  await withServer((_i, res) => { res.writeHead(500); res.end("boom"); }, async (base) => {
    await assert.rejects(chatJson({ baseUrl: base, apiKey: "k", model: "m" }, msgs), (e) => e instanceof AiRequestError && e.status === 500);
  });
});

test("malformed or empty completions are request errors", async () => {
  await withServer((_i, res) => { res.writeHead(200); res.end("<html>gateway</html>"); }, async (base) => {
    await assert.rejects(chatJson({ baseUrl: base, apiKey: "k", model: "m" }, msgs), AiRequestError);
  });
  await withServer((_i, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ choices: [] })); }, async (base) => {
    await assert.rejects(chatJson({ baseUrl: base, apiKey: "k", model: "m" }, msgs), AiRequestError);
  });
  await withServer((_i, res) => ok(res, ""), async (base) => {
    await assert.rejects(chatJson({ baseUrl: base, apiKey: "k", model: "m" }, msgs), AiRequestError);
  });
});

test("a slow upstream times out", async () => {
  await withServer(() => { /* never answers */ }, async (base) => {
    await assert.rejects(chatJson({ baseUrl: base, apiKey: "k", model: "m", timeoutMs: 150 }, msgs), (e) => e instanceof AiRequestError && /timeout/i.test(e.message));
  });
});

test("an unreachable gateway is a request error, not a crash", async () => {
  await assert.rejects(chatJson({ baseUrl: "http://127.0.0.1:1/v1", apiKey: "k", model: "m", timeoutMs: 1000 }, msgs), (e) => e instanceof AiRequestError && /unreachable/i.test(e.message));
});

test("a public http base URL is refused before any request is made", async () => {
  await assert.rejects(chatJson({ baseUrl: "http://example.com/v1", apiKey: "k", model: "m" }, msgs), AiNotConfigured);
});

test("end to end: invalid first answer is retried with feedback and the second one is accepted", async () => {
  await withServer((_i, res, n) => ok(res, n === 1 ? "xin lỗi, tôi không thể" : JSON.stringify(GOOD)), async (base, seen) => {
    const cfg = { baseUrl: base, apiKey: "k", model: "m" };
    const out = await generateWithRetry(
      (feedback) => chatJson(cfg, [{ role: "system", content: "s" }, { role: "user", content: feedback ? `data\n${feedback}` : "data" }]),
      ["E1"],
    );
    assert.equal(out.attempts, 2);
    assert.equal(out.narrative.summary, GOOD.summary);
    assert.equal(seen.length, 2);
    assert.equal(seen[0].body.messages[1].content, "data");
    assert.match(seen[1].body.messages[1].content, /data\n.+/s);
  });
});

test("end to end: a narrative citing an unknown event is rejected even if the gateway answers 200", async () => {
  const bad = { ...GOOD, trends: [{ ...GOOD.trends[0], evidence_refs: ["E9"] }] };
  await withServer((_i, res) => ok(res, JSON.stringify(bad)), async (base) => {
    await assert.rejects(generateWithRetry(() => chatJson({ baseUrl: base, apiKey: "k", model: "m" }, msgs), ["E1"]), /hợp lệ/);
  });
});
