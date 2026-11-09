// En vivo follows what the addon declares: it dropped its live catalogs in late October (empty manifest, 404 for each).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKino } from "../sdk/kino-shim.mjs";

const manifest = JSON.parse(readFileSync(new URL("../kino-plugin.json", import.meta.url)));
function install(routes) {
  const dir = mkdtempSync(join(tmpdir(), "pv-"));
  const { kino } = createKino(manifest, { storageFile: join(dir, "s.json"), cookiesFile: join(dir, "c.json"), config: {}, lang: "es-CO", env: {} });
  const calls = [];
  globalThis.kino = Object.freeze({
    ...kino,
    fetch: async (url) => {
      const path = url.replace(/^https:\/\/hd\.plavio\.site\/c\/[^/]+/, "");
      calls.push(path);
      for (const [re, a] of routes) if (re.test(path)) return { ok: (a.status || 200) < 300, status: a.status || 200, url, headers: {}, text: () => JSON.stringify(a.body ?? {}), json: () => a.body ?? {} };
      return { ok: false, status: 404, url, headers: {}, text: () => "", json: () => ({}) };
    },
  });
  return calls;
}
let n = 0;
const load = () => import("../src/plugin.js?x=" + ++n);

test("an addon with no live catalogs offers no live categories and asks for none", async () => {
  const calls = install([[/^\/manifest\.json$/, { body: { catalogs: [], resources: ["stream"] } }]]);
  const p = await load();
  assert.deepEqual(await p.liveCategories(), []);
  assert.deepEqual(await p.liveChannels({ categoryId: "football", cursor: null }), { items: [] });
  assert.ok(!calls.some((c) => c.startsWith("/catalog/")), "no catalog request for a catalog the addon does not declare");
});

test("the live catalogs the addon declares are offered, and only those", async () => {
  install([
    [/^\/manifest\.json$/, { body: { catalogs: [{ id: "plaviohd-football", type: "tv" }] } }],
    [/^\/catalog\/tv\/plaviohd-football\.json$/, { body: { metas: [{ id: "plaviohdtv-m1", name: "Match One", poster: "https://img.example/a.png" }] } }],
  ]);
  const p = await load();
  const cats = await p.liveCategories();
  assert.deepEqual(cats.map((c) => c.id), ["football"]);
  const r = await p.liveChannels({ categoryId: "football", cursor: null });
  assert.equal(r.items.length, 1);
});

test("a manifest that cannot be read keeps the earlier behaviour (all four are offered); a 404 catalog is empty, not an error", async () => {
  install([]);
  const p = await load();
  assert.equal((await p.liveCategories()).length, 4);
  assert.deepEqual(await p.liveChannels({ categoryId: "football", cursor: null }), { items: [], next: null });
});
