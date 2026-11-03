// src/browse/model.js
var TAB_IDS = ["inicio", "peliculas", "series"];
var MAX_SLIDES = 6;
var MAX_RAILS = 8;
var MAX_RAIL_ITEMS = 20;
var MAX_SLIDE_TEXT = 160;
var HTTPS = /^https:\/\//;
function cardOf(item) {
  const out = { id: item.id, ref: item.ref, title: item.title, kind: item.kind };
  const poster = item.poster || item.logo;
  if (poster && HTTPS.test(poster)) out.poster = poster;
  if (item.backdrop && HTTPS.test(item.backdrop)) out.backdrop = item.backdrop;
  if (item.rating !== void 0) out.rating = item.rating;
  if (item.year !== void 0) out.year = item.year;
  if (item.ids && item.ids.tmdb) out.ids = { tmdb: item.ids.tmdb };
  if (item.adult === true) out.adult = true;
  return out;
}
function slidesOf(rows) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows) {
    for (const item of row.items) {
      if (out.length >= MAX_SLIDES) return out;
      if (item.adult === true || seen.has(item.id) || !item.backdrop || !HTTPS.test(item.backdrop)) continue;
      const text = typeof item.overview === "string" ? item.overview.trim() : "";
      if (text === "") continue;
      seen.add(item.id);
      out.push({
        id: item.id,
        ref: item.ref,
        kind: item.kind,
        title: item.title,
        image: item.backdrop,
        text: text.length <= MAX_SLIDE_TEXT ? text : `${text.slice(0, MAX_SLIDE_TEXT - 1).trimEnd()}\u2026`
      });
    }
  }
  return out;
}
function railsOf(rows) {
  return rows.filter((r) => r.items && r.items.length > 0).slice(0, MAX_RAILS).map((r) => ({
    id: r.id,
    title: r.title,
    ...r.ref ? { ref: r.ref } : {},
    items: r.items.slice(0, MAX_RAIL_ITEMS).map(cardOf)
  }));
}
function tabOf(page) {
  const rows = page && Array.isArray(page.rows) ? page.rows : [];
  const rails = railsOf(rows);
  if (rails.length === 0) return null;
  return { slides: slidesOf(rows), rails };
}
function playedKey(ref, tmdbOfImdb = () => null) {
  const r = String(ref || "");
  let m = /^m:tmdb:(\d{1,10})$/.exec(r);
  if (m) return `m:${m[1]}`;
  m = /^e:(tt\d{5,10}):/.exec(r);
  if (m) {
    const t2 = tmdbOfImdb(m[1]);
    return t2 ? `s:${t2}` : `i:${m[1]}`;
  }
  return "";
}
function recentOf(keys, tabs) {
  if (keys.length === 0) return [];
  const byKey = /* @__PURE__ */ new Map();
  for (const data of tabs) {
    for (const rail2 of data.rails) {
      for (const card of rail2.items) {
        if (card.ids && card.ids.tmdb && !byKey.has(`${card.kind === "series" ? "s" : "m"}:${card.ids.tmdb}`)) byKey.set(`${card.kind === "series" ? "s" : "m"}:${card.ids.tmdb}`, card);
      }
    }
  }
  const out = [];
  const used = /* @__PURE__ */ new Set();
  for (const key of keys) {
    const card = byKey.get(key);
    if (card && !used.has(card.id)) {
      used.add(card.id);
      out.push(card);
    }
  }
  return out;
}

// src/browse/words.js
var WORDS = {
  tabHome: ["Inicio", "Home"],
  tabMovies: ["Pel\xEDculas", "Movies"],
  tabSeries: ["Series", "Series"],
  brWatch: ["Ver", "Watch"],
  brInfo: ["M\xE1s informaci\xF3n", "More info"],
  brRecent: ["Continuar viendo", "Continue watching"],
  brSearch: ["Buscar", "Search"],
  brSearchHint: ["Buscar en PlavioHD", "Search PlavioHD"],
  brSearchTitle: ["Buscar", "Search"],
  brSearchedBefore: ["Buscado recientemente", "Recently searched"],
  brNoResults: ["No encontramos nada con esas palabras.", "Nothing matched those words."],
  brSearchFailed: ["No se pudo buscar. Revisa tu conexi\xF3n e int\xE9ntalo de nuevo.", "The search failed. Check your connection and try again."],
  brFailed: ["No se pudo cargar esta secci\xF3n. Revisa tu conexi\xF3n e int\xE9ntalo de nuevo.", "This section could not be loaded. Check your connection and try again."],
  brRetry: ["Reintentar", "Retry"],
  brEmpty: ["A\xFAn no hay nada aqu\xED.", "Nothing here yet."],
  brBack: ["Atr\xE1s", "Back"],
  brClose: ["Cerrar", "Close"],
  brSettings: ["Configuraci\xF3n", "Settings"],
  brLive: ["En vivo", "Live"],
  brLiveSearchHint: ["Buscar en los canales en vivo", "Search the live channels"],
  brLiveEmpty: ["No hay canales en vivo por ahora.", "No live channels right now."]
};
var both = (key) => ({ es: WORDS[key][0], en: WORDS[key][1] });
var KEYS = Object.keys(WORDS);

// src/browse/logo.js
var LOGO_ASPECT = "3.33:1";
var LOGO_DATA = "data:image/png;base64,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";

// src/browse/view.js
var TAB_KEYS = { inicio: "tabHome", peliculas: "tabMovies", series: "tabSeries" };
var POLL_MS = 1500;
var SEARCH_CAP = 60;
var twin = (key, field = "text", vars) => {
  const w = both(key, vars);
  return { [field]: w.es, [field + "En"]: w.en };
};
var logo = () => ({
  type: "Image",
  key: "logo",
  url: LOGO_DATA,
  aspect: LOGO_ASPECT,
  fit: "contain",
  h: 40,
  alt: "PlavioHD",
  altEn: "PlavioHD",
  fallback: { type: "Text", text: "PlavioHD", textEn: "PlavioHD", style: "h4" }
});
var tabBar = (active) => ({ type: "TabBar", key: "tabs", divider: false, value: active, onChanged: "tab", tabs: TAB_IDS.map((id) => ({ value: id, ...twin(TAB_KEYS[id], "label") })) });
var railSkeleton = (n) => ({
  type: "Column",
  key: "skel" + n,
  gap: 8,
  children: [
    { type: "Skeleton", shape: "line", width: 120 },
    { type: "Row", gap: 12, sizes: ["compact"], children: [1, 2, 3].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}c${i}`, flex: 1 })) },
    { type: "Row", gap: 12, sizes: ["medium", "expanded"], children: [1, 2, 3, 4, 5, 6].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}w${i}`, flex: 1 })) }
  ]
});
var gridSkeleton = () => ({
  type: "Column",
  key: "gridSkeleton",
  gap: 12,
  children: [
    ...[1, 2].map((r) => ({ type: "Row", gap: 12, sizes: ["compact"], key: `gc${r}`, children: [1, 2, 3].map((i) => ({ type: "Skeleton", shape: "card", key: `gc${r}-${i}`, flex: 1 })) })),
    ...[1, 2].map((r) => ({ type: "Row", gap: 12, sizes: ["medium", "expanded"], key: `gw${r}`, children: [1, 2, 3, 4, 5, 6].map((i) => ({ type: "Skeleton", shape: "card", key: `gw${r}-${i}`, flex: 1 })) }))
  ]
});
var heroSkeleton = () => ({ type: "Skeleton", key: "heroSkeleton", shape: "block", height: { compact: 200, expanded: 320 } });
var slideNode = (s) => ({
  type: "heroCard",
  key: "slide-" + s.id,
  h: { compact: 200, expanded: 240 },
  ...s.logo ? { logo: s.logo } : {},
  title: s.title,
  text: s.text,
  image: s.image,
  buttons: [
    {
      type: "ElevatedButton",
      key: "watch-" + s.id,
      ...twin("brWatch", "labelText"),
      icon: "play",
      onPressed: { go: { play: { ref: s.ref, kind: s.kind, id: s.id, title: s.title } } }
    },
    {
      type: "TextButton",
      key: "info-" + s.id,
      ...twin("brInfo", "labelText"),
      onPressed: { go: { title: { ref: s.ref, kind: s.kind, id: s.id, title: s.title } } }
    }
  ]
});
var hero = (slides) => slides.length === 1 ? slideNode(slides[0]) : {
  type: "PageView",
  key: "hero",
  autoPlayMs: 6e3,
  children: slides.map(slideNode)
};
var roundChannel = (c, n) => ({
  type: "Column",
  key: "ch-" + n,
  w: 120,
  gap: 8,
  crossAxisAlignment: "center",
  onTap: { go: { play: { ref: c.ref, kind: "live", id: c.id, title: c.title } } },
  children: [
    { type: "CircleAvatar", key: "chl-" + n, radius: 44, ...c.poster ? { image: c.poster } : { text: String(c.title).slice(0, 2).toUpperCase() }, labelText: c.title, labelTextEn: c.title },
    { type: "Text", text: c.title, textEn: c.title, style: "caption", maxLines: 1, textAlign: "center" }
  ]
});
var roundRail = (items, titleOverride) => ({
  type: "Column",
  key: "live",
  gap: 8,
  children: [
    { type: "Text", ...titleOverride, style: "h4" },
    { type: "SingleChildScrollView", key: "liveScroll", direction: "horizontal", children: [{ type: "Row", gap: 24, children: items.slice(0, 20).map(roundChannel) }] }
  ]
});
var rail = (r, key, titleOverride) => ({
  type: "titleRail",
  key,
  ...titleOverride || { title: r.title },
  ...r.ref ? { ref: r.ref } : {},
  items: r.items,
  size: "medium"
});
function liveView({ tiles, cat, items, query = "", searching = false, device = "phone" }) {
  const tv = device === "tv";
  const liveForm = () => ({
    type: "Form",
    key: "liveSearch",
    onSubmitted: "lsearch",
    gap: 8,
    children: tv ? [{ type: "Row", key: "liveSearchRow", gap: 16, crossAxisAlignment: "center", children: [
      { type: "TextField", key: "lq", kind: "text", value: query, ...twin("brLiveSearchHint", "labelText"), maxLength: 100, weight: 1 },
      { type: "ElevatedButton", key: "lsearchGo", ...twin("brSearch", "labelText"), icon: "search", submit: true }
    ] }] : [
      { type: "TextField", key: "lq", kind: "text", value: query, ...twin("brLiveSearchHint", "labelText"), maxLength: 100 },
      { type: "ElevatedButton", key: "lsearchGo", ...twin("brSearch", "labelText"), icon: "search", submit: true }
    ]
  });
  const body = tv ? [] : [liveForm()];
  if (tiles && tiles.length === 0) body.push({ type: "Text", ...twin("brLiveEmpty", "text"), color: "muted" });
  else if (items && items.length === 0) body.push({ type: "Text", ...twin("brLiveEmpty", "text"), color: "muted" });
  else if (items && device === "tv") body.push({ type: "Row", key: "channels", wrap: true, gap: 24, children: items.slice(0, 40).map(roundChannel) });
  else if (items) body.push({ type: "titleGrid", key: "channels", columns: { compact: 3, expanded: 6 }, items: items.slice(0, SEARCH_CAP) });
  else body.push(gridSkeleton());
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar",
      mergeWithKinoBar: true,
      dense: true,
      divider: false,
      leading: { type: "IconButton", key: "back", icon: "arrow_back", ...twin("brBack", "labelText"), ...twin("brBack", "tooltip"), onPressed: "back" },
      ...tv ? { title: liveForm() } : twin("brLive", "title")
    },
    body: { type: "Column", key: "livePage", children: [
      ...tiles && tiles.length > 1 && query === "" ? [{ type: "TabBar", key: "genres", divider: false, value: cat, onChanged: "lcat", tabs: tiles.map((t2) => ({ value: t2.ref, label: t2.title, labelEn: t2.title })) }] : [],
      { type: "SingleChildScrollView", key: "live-" + String(cat).replace(/[^A-Za-z0-9_-]/g, "_"), flex: 1, children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: body }] }
    ] },
    ...searching || query === "" && (!tiles || !items) ? { every: { ms: 1e3, event: "ltick" } } : {}
  };
}
function browseView({ tab, data, recent, live = [], pending, failed, device = "phone" }) {
  const tv = device === "tv";
  const liveButton = { type: "IconButton", key: "liveButton", icon: "tv", ...twin("brLive", "labelText"), ...twin("brLive", "tooltip"), onPressed: { event: "go", arg: "live" } };
  const gear = { type: "IconButton", key: "settingsButton", icon: "settings", ...twin("brSettings", "labelText"), ...twin("brSettings", "tooltip"), onPressed: { event: "go", arg: "settings" } };
  const active = TAB_IDS.includes(tab) ? tab : TAB_IDS[0];
  const body = [];
  if (data) {
    if (data.slides.length > 0) body.push(hero(data.slides));
    if (recent.length > 0) body.push(rail({ items: recent }, "recent", twin("brRecent", "title")));
    if (live.length > 0) body.push(tv ? roundRail(live, twin("brLive", "text")) : rail({ items: live }, "live", twin("brLive", "title")));
    for (const r of data.rails) body.push(rail(r, "rail-" + String(r.id).replace(/[^A-Za-z0-9_-]/g, "_")));
    if (data.rails.length === 0) body.push({ type: "Text", ...twin("brEmpty", "text"), color: "muted" });
  } else if (failed) {
    body.push({
      type: "MaterialBanner",
      key: "loadFailed",
      role: "error",
      ...twin("brFailed"),
      action: { ...twin("brRetry", "label"), onTap: "retry" }
    });
  } else {
    body.push(heroSkeleton(), railSkeleton(1), railSkeleton(2), railSkeleton(3));
  }
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar",
      // One bar instead of two (Kino 0.9.81+; an older Kino draws its own bar above and this one under it): the close button where
      // Kino's was and the plugin's logo where its name was (its name when the logo cannot be drawn), with no line under it.
      mergeWithKinoBar: true,
      dense: true,
      divider: false,
      leading: { type: "IconButton", key: "close", icon: "close", ...twin("brClose", "labelText"), ...twin("brClose", "tooltip"), onPressed: { go: { close: true } } },
      // On a TV the search is a button of the bar (a floating one is hard to reach with a remote); elsewhere it floats.
      actions: tv ? [{ type: "IconButton", key: "searchButton", icon: "search", ...twin("brSearch", "labelText"), ...twin("brSearch", "tooltip"), onPressed: "openSearch" }, liveButton, gear] : [liveButton, gear],
      title: tv ? { type: "Row", key: "titleRow", gap: 24, crossAxisAlignment: "center", children: [logo(), tabBar(active)] } : logo()
    },
    ...tv ? {} : { floatingActionButton: { type: "FloatingActionButton", key: "searchFab", icon: "search", ...twin("brSearch", "tooltip"), onPressed: "openSearch" } },
    // The tabs stay pinned under the bar; only the rows scroll.
    body: { type: "Column", key: "page", children: [
      // The tabs line up with the bar's buttons and the cards below (a wide window and the TV pad their content by 24).
      ...tv ? [] : [{ type: "Column", key: "tabsRow", padding: { compact: 0, expanded: 24 }, children: [tabBar(active)] }],
      { type: "SingleChildScrollView", key: "browse-" + active, flex: 1, children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: body }] }
    ] },
    ...pending ? { every: { ms: POLL_MS, event: "tick" } } : {}
  };
}
function settingsView() {
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar",
      mergeWithKinoBar: true,
      dense: true,
      divider: false,
      leading: { type: "IconButton", key: "back", icon: "arrow_back", ...twin("brBack", "labelText"), ...twin("brBack", "tooltip"), onPressed: "back" },
      title: logo()
    },
    body: { type: "SingleChildScrollView", key: "settings-page", children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: [{ type: "settings", key: "form" }] }] }
  };
}
function searchView({ query, status, items, history = [], device = "phone" }) {
  const tv = device === "tv";
  const searchForm = () => ({
    type: "Form",
    key: "searchForm",
    onSubmitted: "search",
    gap: 8,
    children: tv ? [{ type: "Row", key: "searchRow", gap: 16, crossAxisAlignment: "center", children: [
      { type: "TextField", key: "q", kind: "text", value: query, ...twin("brSearchHint", "labelText"), maxLength: 100, autofocus: true, weight: 1 },
      { type: "ElevatedButton", key: "searchGo", ...twin("brSearch", "labelText"), icon: "search", submit: true }
    ] }] : [
      { type: "TextField", key: "q", kind: "text", value: query, ...twin("brSearchHint", "labelText"), maxLength: 100, autofocus: true },
      { type: "ElevatedButton", key: "searchGo", ...twin("brSearch", "labelText"), icon: "search", submit: true }
    ]
  });
  const body = tv ? [] : [searchForm()];
  if (status === "fail") {
    body.push({ type: "MaterialBanner", key: "searchFailed", role: "error", ...twin("brSearchFailed"), action: { ...twin("brRetry", "label"), onTap: "sretry" } });
  } else if (status === "done" && items) {
    if (items.length === 0) body.push({ type: "Text", ...twin("brNoResults", "text"), color: "muted" });
    else body.push({ type: "titleGrid", key: "results", columns: { compact: 3, expanded: 6 }, items: items.slice(0, SEARCH_CAP) });
  } else if (status !== "idle") {
    body.push(gridSkeleton());
  } else if (history.length > 0) {
    body.push({ type: "Text", ...twin("brSearchedBefore", "text"), style: "h4" });
    body.push({ type: "titleGrid", key: "history", columns: { compact: 3, expanded: 6 }, items: history.slice(0, SEARCH_CAP) });
  }
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar",
      mergeWithKinoBar: true,
      dense: true,
      divider: false,
      leading: { type: "IconButton", key: "back", icon: "arrow_back", ...twin("brBack", "labelText"), ...twin("brBack", "tooltip"), onPressed: "back" },
      ...tv ? { title: searchForm() } : twin("brSearchTitle", "title")
    },
    body: { type: "SingleChildScrollView", key: "search-page", children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: body }] },
    ...status === "loading" ? { every: { ms: 1e3, event: "stick" } } : {}
  };
}

// src/browse/metaCache.js
var KEY = "meta1";
var MAX = 120;
var CALL_MS = 8e3;
var HTTPS2 = /^https:\/\//;
function makeMetaCache({ kino: kino2, clock = { now: () => Date.now() } }) {
  const usable = () => {
    try {
      return typeof kino2.meta === "function" && kino2.meta.byTitle === true;
    } catch (_) {
      return false;
    }
  };
  let book = null;
  function read() {
    if (book) return book;
    try {
      const o = JSON.parse(kino2.storage.get(KEY) || "null");
      book = o && typeof o === "object" && !Array.isArray(o) ? o : {};
    } catch (_) {
      book = {};
    }
    return book;
  }
  function write() {
    try {
      const ids = Object.keys(book);
      if (ids.length > MAX) for (const id of ids.slice(0, ids.length - MAX)) delete book[id];
      kino2.storage.set(KEY, JSON.stringify(book));
    } catch (_) {
    }
  }
  function known(id) {
    const e = read()[id];
    if (!e) return {};
    return { ...e.t > 0 ? { tmdb: e.t } : {}, ...e.l && HTTPS2.test(e.l) ? { logo: e.l } : {} };
  }
  function dress(cards) {
    return cards.map((c) => {
      const k = known(c.id);
      return k.tmdb && !(c.ids && c.ids.tmdb) ? { ...c, ids: { ...c.ids || {}, tmdb: k.tmdb } } : c;
    });
  }
  async function fill(cards, budgetMs) {
    if (!usable()) return 0;
    const b = read();
    const end = clock.now() + budgetMs;
    let asked = 0;
    for (const c of cards) {
      if (clock.now() + CALL_MS > end) break;
      if (!c || typeof c.id !== "string" || Object.hasOwn(b, c.id) || c.ids && c.ids.tmdb && c.noLogo) continue;
      const year = c.year !== void 0 ? { year: c.year } : {};
      try {
        const a = await kino2.meta({ type: c.kind === "series" ? "series" : "movie", title: c.title, ...year });
        b[c.id] = { t: a && a.ids && Number.isInteger(a.ids.tmdb) ? a.ids.tmdb : 0, l: a && typeof a.logo === "string" ? a.logo : "" };
      } catch (e) {
        if (e && e.code === "rate_limited") break;
        continue;
      }
      asked++;
    }
    if (asked > 0) write();
    return asked;
  }
  return { known, dress, fill, usable };
}

// src/browse/index.js
var TAB_KEY = "browseTab";
var SNAP_PREFIX = "browse1:";
var SNAP_TTL_MS = 12 * 3600 * 1e3;
var SNAP_MAX = 20 * 1024;
var RECENT_KEY = "recent1";
var RECENT_MAX = 12;
var HIST_KEY = "searchHist1";
var HIST_MAX = 24;
function makeBrowse({ kino: kino2, loadTab, searchTitles, live = null, tmdbOfImdb = () => null }) {
  const meta = makeMetaCache({ kino: kino2 });
  const enrich = (data) => data ? {
    slides: data.slides.map((s) => {
      const k = meta.known(s.id);
      return k.logo ? { ...s, logo: k.logo } : s;
    }),
    rails: data.rails.map((r) => ({ ...r, items: meta.dress(r.items) }))
  } : data;
  const memo = /* @__PURE__ */ new Map();
  const log = (...a) => {
    try {
      kino2.log("[plaviohd]", ...a);
    } catch (_) {
    }
  };
  const get = (k) => {
    try {
      return kino2.storage.get(k);
    } catch (_) {
      return null;
    }
  };
  const set = (k, v, opts) => {
    try {
      kino2.storage.set(k, v, opts);
    } catch (_) {
    }
  };
  function readSnap(tab) {
    try {
      const o = JSON.parse(get(SNAP_PREFIX + tab) || "null");
      return o && Date.now() - o.at < SNAP_TTL_MS && o.data && Array.isArray(o.data.rails) ? o.data : null;
    } catch (_) {
      return null;
    }
  }
  function writeSnap(tab, data) {
    for (let per = 10; per >= 3; per -= 2) {
      const slim2 = { slides: data.slides.slice(0, 4), rails: data.rails.map((r) => ({ ...r, items: r.items.slice(0, per) })) };
      const text = JSON.stringify({ at: Date.now(), data: slim2 });
      if (text.length <= SNAP_MAX) {
        set(SNAP_PREFIX + tab, text, { ttlMs: SNAP_TTL_MS });
        return;
      }
    }
  }
  const stored = () => {
    const t2 = get(TAB_KEY);
    return TAB_IDS.includes(t2) ? t2 : null;
  };
  const remember = (tab) => set(TAB_KEY, tab);
  function dataOf(tab) {
    if (memo.has(tab)) return memo.get(tab).data;
    const snap = readSnap(tab);
    if (snap) {
      memo.set(tab, { data: snap, whole: false });
      return snap;
    }
    return null;
  }
  const readKeys = () => {
    try {
      const a = JSON.parse(get(RECENT_KEY) || "[]");
      return Array.isArray(a) ? a.filter((k) => typeof k === "string") : [];
    } catch (_) {
      return [];
    }
  };
  function notePlayed(ref) {
    try {
      const key = playedKey(ref, tmdbOfImdb);
      if (key === "") return;
      const keys = readKeys();
      if (keys[0] === key) return;
      set(RECENT_KEY, JSON.stringify([key, ...keys.filter((k) => k !== key)].slice(0, RECENT_MAX)));
    } catch (_) {
    }
  }
  const slim = (c) => ({ id: c.id, ref: c.ref, title: c.title, kind: c.kind, ...c.poster ? { poster: c.poster } : {} });
  function readHistory() {
    try {
      const a = JSON.parse(get(HIST_KEY) || "[]");
      return Array.isArray(a) ? a.filter((c) => c && typeof c.id === "string" && typeof c.ref === "string" && typeof c.title === "string").slice(0, HIST_MAX) : [];
    } catch (_) {
      return [];
    }
  }
  function rememberFound(cards) {
    try {
      const fresh = cards.filter((c) => c.adult !== true).slice(0, 12).map(slim);
      const ids = new Set(fresh.map((c) => c.id));
      set(HIST_KEY, JSON.stringify([...fresh, ...readHistory().filter((c) => !ids.has(c.id))].slice(0, HIST_MAX)));
    } catch (_) {
    }
  }
  const CHANNELS_CAP = 60;
  let liveRow = null;
  let liveTilesList = null;
  let liveFound = null;
  const liveChannels2 = /* @__PURE__ */ new Map();
  const liveCards = (items) => (Array.isArray(items) ? items : []).filter((i) => i && typeof i.id === "string" && typeof i.ref === "string").slice(0, CHANNELS_CAP).map((i) => cardOf({ ...i, kind: "live" }));
  async function loadLiveTiles() {
    let tiles = [];
    try {
      tiles = live ? await live.categories() : [];
    } catch (_) {
      tiles = [];
    }
    liveTilesList = (Array.isArray(tiles) ? tiles : []).filter((t2) => t2 && typeof t2.id === "string" && typeof t2.title === "string").map((t2) => ({ ref: t2.id, title: t2.title }));
  }
  async function loadCategory(cat) {
    let page = null;
    try {
      page = await live.channels(cat);
    } catch (e) {
      log("live page", e && e.code || "error");
    }
    liveChannels2.set(cat, liveCards(page && page.items));
  }
  async function loadLiveRow() {
    try {
      if (!liveTilesList) await loadLiveTiles();
      const first = liveTilesList && liveTilesList[0] ? liveTilesList[0].ref : null;
      if (first !== null) {
        if (!liveChannels2.has(first)) await loadCategory(first);
        liveRow = (liveChannels2.get(first) || []).slice(0, 20);
      } else liveRow = [];
    } catch (e) {
      log("live row", e && e.code || "error");
      liveRow = [];
    }
  }
  let found = null;
  const tabFromArgs = (route) => {
    const a = route && route.args && typeof route.args === "object" ? route.args : {};
    return TAB_IDS.includes(a.tab) ? a.tab : null;
  };
  function needed(tab, device) {
    const order = [tab, ...TAB_IDS.filter((t2) => t2 !== tab)];
    return order.filter((t2, i) => (i === 0 || device !== "tv") && !(memo.get(t2) && memo.get(t2).whole));
  }
  function view(ctx) {
    const st = ctx.state && typeof ctx.state === "object" ? ctx.state : {};
    if (ctx.route && ctx.route.name === "settings") return settingsView();
    if (ctx.route && ctx.route.name === "live") {
      const cat = typeof st.lcat === "string" ? st.lcat : liveTilesList && liveTilesList[0] ? liveTilesList[0].ref : null;
      const lq = typeof st.lq === "string" ? st.lq : "";
      if (lq !== "") {
        const done = liveFound && liveFound.q === lq;
        return liveView({ tiles: liveTilesList, cat, items: done ? liveFound.items : null, query: lq, searching: !done, device: ctx.device });
      }
      return liveView({ tiles: liveTilesList, cat, items: cat && liveChannels2.has(cat) ? liveChannels2.get(cat) : null, device: ctx.device });
    }
    if (ctx.route && ctx.route.name === "search") {
      const query = typeof st.sq === "string" ? st.sq : "";
      const items = found && found.q === query ? found.items : null;
      const status = query === "" ? "idle" : st.sstate === "fail" ? "fail" : items ? "done" : "loading";
      return searchView({ query, status, items, history: query === "" ? readHistory() : [], device: ctx.device });
    }
    const tab = TAB_IDS.includes(st.tab) ? st.tab : tabFromArgs(ctx.route) ?? stored() ?? TAB_IDS[0];
    const data = enrich(dataOf(tab));
    const loaded = TAB_IDS.map((t2) => memo.get(t2)).filter(Boolean).map((m) => m.data);
    const pending = Array.isArray(st.pending) && st.pending.length > 0;
    return browseView({ tab, data, recent: meta.dress(recentOf(readKeys(), loaded)), live: liveRow || [], pending, failed: !!(st.failed && st.failed[tab]), device: ctx.device });
  }
  async function load(tab) {
    const page = await loadTab(tab);
    const data = tabOf(page);
    if (data) {
      memo.set(tab, { data, whole: true });
      writeSnap(tab, data);
    }
    return data !== null;
  }
  const events = {
    open({ route, state, device }) {
      const tab = tabFromArgs(route) ?? (TAB_IDS.includes(state.tab) ? state.tab : stored() ?? TAB_IDS[0]);
      for (const t2 of TAB_IDS) dataOf(t2);
      const list = needed(tab, device);
      return { state: { tab, pending: live && liveRow === null ? [...list.slice(0, 1), "live", ...list.slice(1)] : list, failed: null } };
    },
    tab({ value, arg, state }) {
      const tab = TAB_IDS.includes(value) ? value : TAB_IDS.includes(arg) ? arg : null;
      if (!tab) return null;
      remember(tab);
      dataOf(tab);
      const failed = { ...state.failed || {} };
      delete failed[tab];
      const pending = [tab, ...Array.isArray(state.pending) ? state.pending.filter((t2) => t2 !== tab) : []];
      return { state: { tab, pending: memo.get(tab) && memo.get(tab).whole ? pending.slice(1) : pending, failed } };
    },
    retry({ state, device }) {
      const tab = TAB_IDS.includes(state.tab) ? state.tab : TAB_IDS[0];
      return { state: { failed: null, pending: [tab, ...needed(tab, device).filter((t2) => t2 !== tab)] } };
    },
    async tick({ state }) {
      const pending = Array.isArray(state.pending) ? state.pending : [];
      if (pending.length === 0) return null;
      const [next, ...rest] = pending;
      const failed = { ...state.failed || {} };
      if (next.startsWith("meta:")) {
        const m = memo.get(next.slice(5));
        if (m) await meta.fill([...m.data.slides.map((s) => ({ id: s.id, title: s.title, kind: s.kind })), ...m.data.rails.flatMap((r) => r.items.slice(0, 6).map((c) => ({ id: c.id, title: c.title, kind: c.kind })))], 12e3);
        return { state: { pending: rest } };
      }
      if (next === "live") {
        await loadLiveRow();
        return { state: { pending: rest } };
      }
      try {
        const ok = await load(next);
        if (!ok) failed[next] = true;
        else delete failed[next];
        if (ok && meta.usable()) rest.unshift("meta:" + next);
      } catch (e) {
        log("browse tab", e && e.code || "error");
        failed[next] = true;
      }
      return { state: { pending: rest, failed } };
    },
    // The floating button: straight to the search page, empty and ready for the words.
    openSearch() {
      return { route: { push: "search" }, state: { sq: "", sstate: null } };
    },
    search({ value, route }) {
      const q = value && typeof value.q === "string" ? value.q.trim().slice(0, 100) : "";
      if (q === "") return null;
      const state = { sq: q, sstate: "loading" };
      return route && route.name === "search" ? { state } : { route: { push: "search" }, state };
    },
    // The search page's timer: one search per press, then no timer.
    async stick({ state }) {
      const q = typeof state.sq === "string" ? state.sq : "";
      if (q === "" || state.sstate !== "loading") return null;
      try {
        const out = await searchTitles(q);
        found = { q, items: (Array.isArray(out) ? out : []).slice(0, 60).map(cardOf) };
        rememberFound(found.items);
        return { state: { sstate: "done" } };
      } catch (e) {
        log("browse search", e && e.code || "error");
        return { state: { sstate: "fail" } };
      }
    },
    sretry({ state }) {
      return typeof state.sq === "string" && state.sq !== "" ? { state: { sstate: "loading" } } : null;
    },
    // The live page's timer: the categories, then the picked one's channels, one load per tick.
    async ltick({ state }) {
      const lq = typeof state.lq === "string" ? state.lq : "";
      if (lq !== "") {
        if (!(liveFound && liveFound.q === lq)) {
          let out = null;
          try {
            out = live ? await live.search(lq) : null;
          } catch (e) {
            log("live search", e && e.code || "error");
          }
          liveFound = { q: lq, items: liveCards(out && out.items) };
        }
        return { state: { lq } };
      }
      if (!liveTilesList) {
        await loadLiveTiles();
        return { state: { lcat: typeof state.lcat === "string" ? state.lcat : null } };
      }
      const cat = typeof state.lcat === "string" ? state.lcat : liveTilesList[0] ? liveTilesList[0].ref : null;
      if (cat === null) {
        liveChannels2.set("", []);
        return { state: { lcat: null } };
      }
      if (!liveChannels2.has(cat)) await loadCategory(cat);
      return { state: { lcat: cat } };
    },
    lsearch({ value }) {
      const q = value && typeof value.lq === "string" ? value.lq.trim().slice(0, 100) : "";
      return { state: { lq: q === "" ? null : q } };
    },
    lcat({ value }) {
      return typeof value === "string" && value !== "" ? { state: { lcat: value } } : null;
    },
    // The gear: the plugin's settings are a page of their own, one Back away.
    go({ arg }) {
      if (arg === "live") return { route: { push: "live" }, state: { lcat: null } };
      return arg === "settings" ? { route: { push: "settings" }, state: { fromBrowse: true } } : null;
    },
    back({ state, route }) {
      if (route && route.name === "settings" && !state.fromBrowse) return { close: true };
      return { route: { pop: true }, state: { sq: null, sstate: null, lq: null } };
    }
  };
  async function event(ev) {
    const handler = Object.hasOwn(events, ev.name) ? events[ev.name] : null;
    return handler ? await handler({ ...ev, state: ev.state || {} }) ?? null : null;
  }
  return { view, event, notePlayed };
}

// src/plugin.js
var HOST = "hd.plavio.site";
var ROW_MAX = 60;
var MAX_TMDB_PAGE = 25;
var IMG = "https://image.tmdb.org/t/p/w342";
var IMG_WIDE = "https://image.tmdb.org/t/p/w780";
var LIST_TIMEOUT_MS = 8e3;
var RESOLVE_TIMEOUT_MS = 15e3;
var TYPES = [
  { type: "movie", label: "Pel\xEDculas", labelEn: "Movies", genre: "peliculas" },
  { type: "series", label: "Series", labelEn: "Series", genre: "series" }
];
var GENRES = {
  movie: [
    { id: 28, es: "Acci\xF3n", en: "Action" },
    { id: 35, es: "Comedia", en: "Comedy" },
    { id: 18, es: "Drama", en: "Drama" },
    { id: 27, es: "Terror", en: "Horror" },
    { id: 878, es: "Ciencia ficci\xF3n", en: "Sci-Fi" },
    { id: 16, es: "Animaci\xF3n", en: "Animation" },
    { id: 53, es: "Suspenso", en: "Thriller" },
    { id: 10749, es: "Romance", en: "Romance" },
    { id: 10751, es: "Familia", en: "Family", vocab: "infantil" },
    { id: 12, es: "Aventura", en: "Adventure" },
    { id: 99, es: "Documental", en: "Documentary", vocab: "documentales" }
  ],
  series: [
    { id: 10759, es: "Acci\xF3n y aventura", en: "Action & Adventure" },
    { id: 35, es: "Comedia", en: "Comedy" },
    { id: 18, es: "Drama", en: "Drama" },
    { id: 9648, es: "Misterio", en: "Mystery" },
    { id: 80, es: "Crimen", en: "Crime" },
    { id: 16, es: "Animaci\xF3n", en: "Animation" },
    { id: 10765, es: "Ciencia ficci\xF3n y fantas\xEDa", en: "Sci-Fi & Fantasy" },
    { id: 99, es: "Documental", en: "Documentary", vocab: "documentales" }
  ]
};
var LIVE = [
  { id: "live", catalog: "plaviohd-live", title: "liveNow" },
  { id: "football", catalog: "plaviohd-football", title: "liveFootball" },
  { id: "cricket", catalog: "plaviohd-cricket", title: "liveCricket" },
  { id: "networks", catalog: "plaviohd-networks", title: "liveNetworks" }
];
var LIVE_PAGE = 100;
var TEXTS = {
  es: {
    unavailable: "PlavioHD no responde ahora. Intenta de nuevo en un rato.",
    noStreams: "Este t\xEDtulo no tiene video disponible por ahora. Prueba otro o vuelve m\xE1s tarde.",
    noEpisodes: "Este t\xEDtulo no trae lista de episodios.",
    noTmdb: "Este t\xEDtulo no se pudo identificar. Prueba otro.",
    noSignal: "Este canal no tiene se\xF1al ahora mismo. Si el evento a\xFAn no empieza, vuelve m\xE1s tarde.",
    copy: "Opci\xF3n {n}",
    shelfTrend: "Tendencias",
    shelfPop: "Populares",
    shelfTop: "Mejor valoradas",
    shelfNew: "En cartelera / en emisi\xF3n",
    tabStart: "Inicio",
    sectionHero: "Lo que est\xE1 de moda.",
    tileMovies: "Tendencias en cine",
    tileSeries: "Tendencias en series",
    liveNow: "En vivo ahora",
    liveFootball: "F\xFAtbol",
    liveCricket: "Cr\xEDquet",
    liveNetworks: "TV deportiva 24/7",
    cacheStatus: "Cach\xE9: {n} entradas, {kb} KB",
    cacheCleared: "Listo: se vaci\xF3 la cach\xE9",
    healthOk: "responde",
    healthFail: "falla",
    healthNone: "sin datos",
    probeOk: "Listo: el servicio responde",
    probeFail: "El servicio no responde ahora",
    langEn: "Ingl\xE9s",
    langHi: "Hindi",
    langEs: "Espa\xF1ol",
    langLatino: "Latino",
    langOriginal: "Original",
    langPt: "Portugu\xE9s",
    langFr: "Franc\xE9s",
    langRu: "Ruso",
    langAr: "\xC1rabe"
  },
  en: {
    unavailable: "PlavioHD isn't responding right now. Try again in a while.",
    noStreams: "This title has no video available right now. Try another or come back later.",
    noEpisodes: "This title has no episode list.",
    noTmdb: "This title could not be identified. Try another.",
    noSignal: "This channel has no signal right now. If the event has not started yet, come back later.",
    copy: "Option {n}",
    shelfTrend: "Trending",
    shelfPop: "Popular",
    shelfTop: "Top rated",
    shelfNew: "Now playing / on the air",
    tabStart: "Start",
    sectionHero: "What is trending.",
    tileMovies: "Trending movies",
    tileSeries: "Trending series",
    liveNow: "Live now",
    liveFootball: "Soccer",
    liveCricket: "Cricket",
    liveNetworks: "24/7 sports TV",
    cacheStatus: "Cache: {n} entries, {kb} KB",
    cacheCleared: "Done: the cache is empty",
    healthOk: "responding",
    healthFail: "failing",
    healthNone: "no data",
    probeOk: "Done: the service responds",
    probeFail: "The service is not responding right now",
    langEn: "English",
    langHi: "Hindi",
    langEs: "Spanish",
    langLatino: "Latin Spanish",
    langOriginal: "Original",
    langPt: "Portuguese",
    langFr: "French",
    langRu: "Russian",
    langAr: "Arabic"
  }
};
function isSpanish() {
  return String(kino.lang || "").toLowerCase().startsWith("es");
}
function t(key, vars) {
  const template = TEXTS[isSpanish() ? "es" : "en"][key] || TEXTS.es[key] || key;
  return vars ? template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] != null ? vars[k] : "")) : template;
}
function typeLabel(x) {
  return isSpanish() ? x.label : x.labelEn;
}
var CACHE_PREFIX = "c1:";
var HARD_TTL_MS = 24 * 60 * 60 * 1e3;
var ENTRY_MAX_CHARS = 48 * 1024;
var FRESH_SHELF_MS = 6 * 60 * 60 * 1e3;
var FRESH_META_MS = 60 * 60 * 1e3;
var FRESH_ART_MS = 12 * 60 * 60 * 1e3;
var FRESH_IMDB_MS = 7 * 24 * 60 * 60 * 1e3;
var FRESH_LIVE_MS = 60 * 1e3;
function cacheKeys() {
  return kino.storage.keys().filter((k) => k.startsWith(CACHE_PREFIX));
}
function cacheRead(key) {
  const raw = kino.storage.get(CACHE_PREFIX + key);
  if (!raw) return null;
  try {
    const e = JSON.parse(raw);
    return e && typeof e.at === "number" ? e : null;
  } catch {
    kino.storage.remove(CACHE_PREFIX + key);
    return null;
  }
}
function evictOldest() {
  let victim = null;
  let oldest = Infinity;
  for (const k of cacheKeys()) {
    let at = 0;
    try {
      at = JSON.parse(kino.storage.get(k) || "{}").at || 0;
    } catch {
    }
    if (at < oldest) {
      oldest = at;
      victim = k;
    }
  }
  if (!victim) return false;
  kino.storage.remove(victim);
  return true;
}
function cacheWrite(key, v) {
  const raw = JSON.stringify({ at: Date.now(), v });
  if (raw.length > ENTRY_MAX_CHARS) return;
  for (let tries = 0; tries < 20; tries++) {
    try {
      kino.storage.set(CACHE_PREFIX + key, raw, { ttlMs: HARD_TTL_MS });
      return;
    } catch (e) {
      if (!e || e.code !== "too_large" || !evictOldest()) return;
    }
  }
}
async function cached(key, freshMs, load) {
  const hit = cacheRead(key);
  if (hit && Date.now() - hit.at < freshMs) return hit.v;
  try {
    const v = await load();
    cacheWrite(key, v);
    return v;
  } catch (e) {
    if (hit) {
      kino.log("serving stale " + key + ": " + (e && e.message));
      return hit.v;
    }
    throw e;
  }
}
var enc = encodeURIComponent;
var SOURCES = ["HDHub", "MovieBox", "9xflix", "Vidy", "Cinezo", "Vidzee", "VixSrc"];
var REGIONS = ["US", "UK", "CA", "AU", "NZ"];
var ADDON_LANGS = ["English", "Hindi", "Urdu", "Tamil", "Telugu", "Arabic", "Punjabi", "Malayalam", "Kannada", "Bengali", "Marathi", "Spanish", "French"];
var ADDON_CATS = ["Hollywood", "Bollywood", "Anime", "South Indian", "Punjabi", "Pakistani", "Korean", "Chinese", "Turkish"];
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function base64url(s) {
  const bytes = [];
  for (const ch of unescape(encodeURIComponent(s))) bytes.push(ch.charCodeAt(0));
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = bytes[i] << 16 | (bytes[i + 1] || 0) << 8 | (bytes[i + 2] || 0);
    out += B64[n >> 18 & 63] + B64[n >> 12 & 63];
    if (i + 1 < bytes.length) out += B64[n >> 6 & 63];
    if (i + 2 < bytes.length) out += B64[n & 63];
  }
  return out;
}
function picked(key, valid) {
  const v = String(kino.config.get(key) || "all").trim().toLowerCase();
  if (!v || v === "all") return valid;
  const want = v.split(",").map((x) => x.trim());
  const on = valid.filter((n) => want.includes(n.toLowerCase()));
  return on.length ? on : valid;
}
function base() {
  const cfg = {
    sources: picked("sources", SOURCES).concat("LiveTV"),
    q: ["2160p", "1080p", "720p", "480p"],
    lang: ADDON_LANGS,
    cat: ADDON_CATS,
    tvregion: picked("regions", REGIONS),
    sort: "desc"
  };
  return "https://" + HOST + "/c/" + base64url(JSON.stringify(cfg));
}
var HEALTH_KEY = "health";
var DOWN_AFTER = 3;
function readHealth() {
  try {
    const h = JSON.parse(kino.storage.get(HEALTH_KEY) || "{}");
    return h && typeof h === "object" && !Array.isArray(h) ? h : {};
  } catch {
    return {};
  }
}
function recordHealth(ok) {
  try {
    const prev = readHealth();
    const fails = ok ? 0 : (Number.isFinite(prev.fails) ? prev.fails : 0) + 1;
    kino.storage.set(HEALTH_KEY, JSON.stringify({ ok, fails, at: Date.now() }));
    if (fails === DOWN_AFTER) kino.log.report("plaviohd:down", "addon");
  } catch {
  }
}
async function getJson(path, timeoutMs) {
  let r;
  try {
    r = await kino.fetch(base() + path, { timeoutMs: timeoutMs || 15e3, headers: { Accept: "application/json" } });
  } catch (e) {
    recordHealth(false);
    throw e;
  }
  if (!r.ok) {
    recordHealth(false);
    throw kino.error("unavailable", "PlavioHD answered " + r.status, { userMessage: t("unavailable") });
  }
  try {
    const body = await r.json();
    recordHealth(true);
    return body;
  } catch {
    recordHealth(false);
    throw kino.error("unavailable", "PlavioHD answered something that is not JSON", { userMessage: t("unavailable") });
  }
}
async function mapLimit(list, limit, fn) {
  const out = new Array(list.length);
  let next = 0;
  async function worker() {
    while (next < list.length) {
      const i = next++;
      out[i] = await fn(list[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
  return out;
}
var IMDB = /^tt\d{5,10}$/;
function hasTmdb() {
  return typeof kino.tmdb === "function";
}
function tmdbLang() {
  return isSpanish() ? "es-MX" : "en-US";
}
function typeOf(type) {
  return TYPES.find((x) => x.type === type);
}
function tmdbPath(type) {
  return type === "movie" ? "movie" : "tv";
}
function shelfInfo(type, shelf) {
  const genre = typeOf(type).genre;
  if (shelf === "trend") return { title: t("shelfTrend"), genre, path: `/trending/${tmdbPath(type)}/week`, params: {} };
  if (shelf === "new") return { title: t("shelfNew"), genre, path: type === "movie" ? "/movie/now_playing" : "/tv/on_the_air", params: {} };
  if (shelf === "pop") return { title: t("shelfPop"), genre, path: `/discover/${tmdbPath(type)}`, params: { sort_by: "popularity.desc", "vote_count.gte": 50 } };
  if (shelf === "top") return { title: t("shelfTop"), genre, path: `/discover/${tmdbPath(type)}`, params: { sort_by: "vote_average.desc", "vote_count.gte": 1500 } };
  const m = /^g(\d{1,6})$/.exec(String(shelf));
  const g = m && GENRES[type] && GENRES[type].find((x) => x.id === parseInt(m[1], 10));
  if (!g) return null;
  return { title: isSpanish() ? g.es : g.en, genre: g.vocab || genre, path: `/discover/${tmdbPath(type)}`, params: { sort_by: "popularity.desc", "vote_count.gte": 100, with_genres: g.id } };
}
function tmdbItem(m, type, needPoster) {
  const poster = m.poster_path ? IMG + m.poster_path : "";
  const title = String(m.title || m.name || "").trim();
  if (needPoster && !poster || !title || !Number.isInteger(m.id)) return null;
  const movie = type === "movie";
  const item = { id: `tmdb-${movie ? "m" : "s"}-${m.id}`, ref: (movie ? "m:" : "i:") + "tmdb:" + m.id, title: title.slice(0, 200), kind: movie ? "movie" : "series", ids: { tmdb: m.id } };
  if (poster) item.poster = poster;
  if (m.backdrop_path) item.backdrop = IMG_WIDE + m.backdrop_path;
  const year = /^(\d{4})/.exec(String(m.release_date || m.first_air_date || ""));
  if (year) item.year = year[1];
  if (m.overview) item.overview = String(m.overview).slice(0, 300);
  if (typeof m.vote_average === "number" && m.vote_average > 0) item.rating = Math.round(m.vote_average * 10) / 10;
  return item;
}
async function shelfPage(type, shelf, page) {
  const info = shelfInfo(type, shelf);
  if (!info || !hasTmdb()) throw kino.error("not_found", "unknown shelf " + type + ":" + String(shelf).slice(0, 20));
  const body = await kino.tmdb(info.path, { ...info.params, language: tmdbLang(), page, include_adult: false });
  const results = body && Array.isArray(body.results) ? body.results : [];
  return {
    items: results.map((m) => tmdbItem(m, type, true)).filter(Boolean),
    more: Number(body && body.total_pages) > page && page < MAX_TMDB_PAGE
  };
}
async function shelfRow(type, shelf, prefixed) {
  const info = shelfInfo(type, shelf);
  if (!info || !hasTmdb()) return null;
  try {
    const lang = isSpanish() ? "es" : "en";
    const first = await cached(`shelf2:${type}:${shelf}:${lang}`, FRESH_SHELF_MS, async () => (await shelfPage(type, shelf, 1)).items);
    if (!first.length) return null;
    const name = typeLabel(typeOf(type));
    return { id: `d-${type}-${shelf}`, title: prefixed ? `${info.title} \u2014 ${name}` : info.title, ref: `d:${type}:${shelf}`, items: first.slice(0, ROW_MAX), genre: info.genre };
  } catch (e) {
    kino.log(`shelf ${type}:${shelf} failed: ` + (e && e.message));
    return null;
  }
}
async function search(query) {
  const q = kino.rank.shortQuery(String(query.q || "").trim());
  if (!q || !hasTmdb()) return [];
  const wanted = TYPES.filter((x) => query.type !== "movie" && query.type !== "series" ? true : x.type === query.type);
  const titles = [query.q, query.originalTitle].concat(Array.isArray(query.altTitles) ? query.altTitles : []).filter((x) => typeof x === "string" && x.trim());
  const lists = await mapLimit(wanted, 2, async (x) => {
    try {
      const body = await kino.tmdb("/search/" + tmdbPath(x.type), { query: q, language: tmdbLang(), include_adult: false, page: 1 });
      const results = body && Array.isArray(body.results) ? body.results : [];
      return results.map((m) => tmdbItem(m, x.type, false)).filter(Boolean);
    } catch (e) {
      kino.log("search " + x.type + " failed: " + (e && e.message));
      return [];
    }
  });
  const merged = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) for (const l of lists) if (l[i]) merged.push(l[i]);
  return kino.rank.sortBySimilarity(merged, titles);
}
async function home() {
  if (kino.config.get("homeRows") === false) return [];
  const jobs = [
    () => shelfRow("movie", "trend", true),
    () => shelfRow("series", "trend", true),
    () => shelfRow("movie", "new", true),
    () => shelfRow("series", "pop", true)
  ];
  return (await mapLimit(jobs, 4, (job) => job())).filter(Boolean);
}
async function browse(ref, cursor) {
  const d = /^d:(movie|series):([a-z0-9]+)$/.exec(String(ref || ""));
  if (!d) throw kino.error("not_found", "unknown browse ref: " + String(ref).slice(0, 60));
  const page = Math.min(MAX_TMDB_PAGE, Math.max(1, parseInt(cursor || "1", 10) || 1));
  const r = await shelfPage(d[1], d[2], page);
  return r.more ? { items: r.items, next: String(page + 1) } : { items: r.items };
}
function shelvesOf(type) {
  return ["trend", "new", "pop", "top"].concat((GENRES[type] || []).map((g) => "g" + g.id));
}
async function section({ tab }) {
  const tabs = [{ id: "start", label: t("tabStart") }, ...TYPES.map((x) => ({ id: x.type, label: typeLabel(x) }))];
  const chosen = tabs.some((x) => x.id === tab) ? tab : tabs[0].id;
  const jobs = chosen === "start" ? [() => shelfRow("movie", "trend", true), () => shelfRow("series", "trend", true), () => shelfRow("movie", "new", true), () => shelfRow("series", "new", true)] : shelvesOf(chosen).map((shelf) => () => shelfRow(chosen, shelf, false));
  const rows = (await mapLimit(jobs, 4, (job) => job())).filter(Boolean);
  const answer = { tabs, tab: chosen, rows };
  if (rows.length && rows[0].items.length) {
    const items = rows[0].items;
    const pick = items[Math.floor(Date.now() / 864e5) % items.length];
    answer.hero = { title: pick.title, text: t("sectionHero") };
    if (pick.poster) answer.hero.image = pick.poster;
  }
  return answer;
}
async function tabPage(tab) {
  const type = tab === "peliculas" ? "movie" : tab === "series" ? "series" : null;
  const jobs = type === null ? [() => shelfRow("movie", "trend", true), () => shelfRow("series", "trend", true), () => shelfRow("movie", "new", true), () => shelfRow("series", "new", true)] : shelvesOf(type).slice(0, 8).map((shelf) => () => shelfRow(type, shelf, false));
  return { rows: (await mapLimit(jobs, 4, (job) => job())).filter(Boolean) };
}
var browseInstance = null;
var browseScreen = () => browseInstance ?? (browseInstance = makeBrowse({
  kino,
  loadTab: (tab) => tabPage(tab),
  searchTitles: (q) => search({ q }),
  live: {
    categories: () => liveCategories(),
    channels: (categoryId) => liveChannels({ categoryId }),
    search: (q) => liveSearch({ query: q })
  },
  tmdbOfImdb: (imdb) => readRev()[imdb] || null
}));
async function screen(ctx) {
  await null;
  return browseScreen().view(ctx && typeof ctx === "object" ? ctx : {});
}
async function screenEvent(ev) {
  await null;
  return browseScreen().event(ev && typeof ev === "object" ? ev : {});
}
async function categories() {
  const tiles = [
    { id: "movie-trend", title: t("tileMovies"), ref: "d:movie:trend", type: "movie", shelf: "trend" },
    { id: "series-trend", title: t("tileSeries"), ref: "d:series:trend", type: "series", shelf: "trend" }
  ];
  for (const x of TYPES) {
    const name = typeLabel(x);
    for (const shelf of ["pop"].concat((GENRES[x.type] || []).map((g) => "g" + g.id))) {
      const info = shelfInfo(x.type, shelf);
      tiles.push({ id: `${x.type}-${shelf}`, title: `${name}: ${info.title}`.slice(0, 40), ref: `d:${x.type}:${shelf}`, type: x.type, shelf });
    }
  }
  if (!hasTmdb()) return [];
  const lang = isSpanish() ? "es" : "en";
  return await mapLimit(tiles.slice(0, 24), 4, async (tile) => {
    let art = "";
    try {
      art = await cached(`art:${tile.id}:${lang}`, FRESH_ART_MS, async () => {
        const first = (await shelfPage(tile.type, tile.shelf, 1)).items[0];
        return first && first.poster ? first.poster : "";
      });
    } catch (e) {
      kino.log("art " + tile.id + " failed: " + (e && e.message));
    }
    const out = { id: tile.id, title: tile.title, ref: tile.ref };
    if (art) out.art = art;
    return out;
  });
}
function idOf(ref, prefix) {
  const s = String(ref || "");
  return s.startsWith(prefix) && s.length > prefix.length ? s.slice(prefix.length) : null;
}
async function imdbOf(type, id) {
  if (IMDB.test(id)) return id;
  const m = /^tmdb:(\d{1,9})$/.exec(String(id));
  if (!m || !hasTmdb()) return null;
  const found = await cached(`imdb:${type}:${m[1]}`, FRESH_IMDB_MS, async () => {
    const body = await kino.tmdb(`/${tmdbPath(type)}/${m[1]}/external_ids`);
    return body && IMDB.test(String(body.imdb_id || "")) ? String(body.imdb_id) : "";
  });
  if (found) rememberImdb(found, m[1]);
  return found || null;
}
var REV_KEY = "rev1";
var REV_MAX = 80;
function readRev() {
  try {
    const o = JSON.parse(kino.storage.get(REV_KEY) || "{}");
    return o && typeof o === "object" && !Array.isArray(o) ? o : {};
  } catch {
    return {};
  }
}
function rememberImdb(imdb, tmdb) {
  try {
    const rev = readRev();
    if (rev[imdb] === tmdb) return;
    delete rev[imdb];
    rev[imdb] = tmdb;
    const keys = Object.keys(rev);
    for (const k of keys.slice(0, Math.max(0, keys.length - REV_MAX))) delete rev[k];
    kino.storage.set(REV_KEY, JSON.stringify(rev));
  } catch {
  }
}
async function metaOf(type, id) {
  const imdb = await imdbOf(type, id);
  if (!imdb || typeof kino.meta !== "function") return null;
  return cached(`meta:${type}:${imdb}`, FRESH_META_MS, async () => {
    const m = await kino.meta({ type, ids: { imdb }, lang: kino.lang });
    if (!m) throw kino.error("not_found", "Kino knows nothing about " + imdb);
    return {
      imdb,
      title: m.title || "",
      poster: m.poster || "",
      backdrop: m.backdrop || "",
      overview: String(m.overview || "").slice(0, 2e3),
      genres: Array.isArray(m.genres) ? m.genres.slice(0, 5) : [],
      year: m.year || "",
      runtimeMinutes: m.runtimeMinutes || 0,
      // [season, number, title, overview, still, air date]
      episodes: (Array.isArray(m.episodes) ? m.episodes : []).map((e) => [
        Math.max(0, parseInt(e.season, 10) || 0),
        Math.max(1, parseInt(e.number, 10) || 1),
        String(e.title || "").slice(0, 120),
        String(e.overview || "").slice(0, 300),
        e.still || "",
        String(e.airDate || "").slice(0, 10)
      ])
    };
  });
}
function infoOf(meta) {
  const info = {};
  if (meta.title) info.title = meta.title;
  if (meta.poster) info.poster = meta.poster;
  if (meta.backdrop) info.backdrop = meta.backdrop;
  if (meta.overview) info.overview = meta.overview;
  if (meta.genres && meta.genres.length) info.genres = meta.genres;
  if (meta.year) info.year = meta.year;
  return info;
}
async function episodes(ref) {
  const id = idOf(ref, "i:");
  if (!id) throw kino.error("not_found", "not a series ref: " + String(ref).slice(0, 80));
  const meta = await metaOf("series", id);
  if (!meta || !meta.episodes.length) throw kino.error("not_found", "no episode list for " + id.slice(0, 80), { userMessage: t("noEpisodes") });
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const seen = /* @__PURE__ */ new Set();
  const eps = [];
  for (const [season, number, title, overview, still, date] of meta.episodes.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    if (season < 1 || /^\d{4}-\d{2}-\d{2}$/.test(date) && date > today) continue;
    const key = season + ":" + number;
    if (seen.has(key)) continue;
    seen.add(key);
    const ep = { season, number, ref: `e:${meta.imdb}:${season}:${number}` };
    if (title) ep.title = title;
    if (overview) ep.overview = overview;
    if (still) ep.still = still;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) ep.airDate = date;
    eps.push(ep);
  }
  if (!eps.length) throw kino.error("not_found", "no aired episodes for " + id.slice(0, 80), { userMessage: t("noEpisodes") });
  return { series: infoOf(meta), episodes: eps };
}
async function details(ref) {
  const movie = idOf(ref, "m:");
  const id = movie || idOf(ref, "i:");
  if (!id) return null;
  try {
    const meta = await metaOf(movie ? "movie" : "series", id);
    if (!meta) return null;
    const info = infoOf(meta);
    if (movie && meta.runtimeMinutes) info.runtimeMinutes = meta.runtimeMinutes;
    return info;
  } catch (e) {
    kino.log("details failed: " + (e && e.message));
    return null;
  }
}
var UNPLAYABLE_HOSTS = [/(^|\.)hubcloud\./, /(^|\.)hubdrive\./, /(^|\.)fastdl\.beer$/, /\.r2\.cloudflarestorage\.com$/, /(^|\.)gdflix\./, /(^|\.)filepress\./];
function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
function playable(url) {
  const h = hostOf(url);
  return !!h && !UNPLAYABLE_HOSTS.some((re) => re.test(h));
}
function tierOf(url) {
  const h = hostOf(url);
  if (h === "pixeldrain.dev" || h === "pixeldrain.com") return 0;
  if (/\.workers\.dev$/.test(h)) return 1;
  return 2;
}
var LANG_WORDS = [
  { re: /\besla\b|latino|latam/i, key: "langLatino" },
  { re: /\bspanish\b|espa[ñn]ol|castellano/i, key: "langEs" },
  { re: /\boriginal\b/i, key: "langOriginal" },
  { re: /\benglish\b/i, key: "langEn" },
  { re: /\bhindi\b/i, key: "langHi" },
  { re: /\bptbr\b|portugu/i, key: "langPt" },
  { re: /\bfrench\b/i, key: "langFr" },
  { re: /\brussian\b/i, key: "langRu" },
  { re: /\barabic\b/i, key: "langAr" },
  { re: /\b(tamil|telugu|bengali|punjabi|malayalam|kannada|marathi|urdu|indonesian|tagalog)\b/i, key: "" }
];
function describe(s) {
  const text = String(s.description || s.title || "") + " " + String(s.name || "");
  const quality = /2160|4k|uhd/i.test(text) ? 2160 : /1440/.test(text) ? 1440 : /1080/.test(text) ? 1080 : /720/.test(text) ? 720 : /480/.test(text) ? 480 : 0;
  const size = /(\d+(?:\.\d+)?)\s*(GB|MB)\b/i.exec(text);
  const gb = size ? parseFloat(size[1]) / (size[2].toUpperCase() === "MB" ? 1024 : 1) : 0;
  const line = String(s.description || s.title || "").split("\n").pop();
  const hit = LANG_WORDS.find((l) => l.re.test(line));
  const raw = /·\s*(?:\d{3,4}p\s*·\s*)?([A-Za-z][A-Za-z ,]{1,40}?)\s*(?:dub)?\s*·/.exec(line);
  return { quality, gb, lang: hit ? hit.key : "", rawLang: hit && !hit.key && raw ? raw[1].trim() : "" };
}
var LANG_RANK = {};
function setLangRank() {
  const pref = String(kino.config.get("audio") || "auto");
  const english = pref === "en" || pref === "auto" && !isSpanish();
  LANG_RANK = english ? { langEn: 0, langOriginal: 0, langLatino: 1, langEs: 1, langHi: 4 } : { langLatino: 0, langEs: 1, langOriginal: 2, langEn: 2, langHi: 4 };
}
function qualityName(q) {
  return q === 2160 ? "4K" : q ? q + "p" : "";
}
function qualityRank(q, pref) {
  if (pref === "max") return -q;
  const cap = pref === "720" ? 720 : 1080;
  const v = q || cap;
  return v <= cap ? cap - v : 1e5 + (v - cap);
}
function headersOf(s) {
  const req = s.behaviorHints && s.behaviorHints.proxyHeaders && s.behaviorHints.proxyHeaders.request;
  const out = {};
  if (req && typeof req === "object") {
    for (const k of ["Referer", "Origin", "User-Agent"]) if (typeof req[k] === "string" && req[k]) out[k] = req[k];
  }
  return out;
}
function mimeOf(url) {
  if (/\.m3u8(\?|$)/i.test(url)) return "application/vnd.apple.mpegurl";
  if (/\.mpd(\?|$)/i.test(url)) return "application/dash+xml";
  return void 0;
}
function toStream(s, index) {
  const d = describe(s);
  const url = String(s.url);
  const parts = [t("copy", { n: index + 1 })];
  if (d.quality) parts.push(qualityName(d.quality));
  if (d.lang) parts.push(t(d.lang));
  else if (d.rawLang) parts.push(d.rawLang);
  if (d.gb) parts.push(d.gb >= 1 ? d.gb.toFixed(1).replace(/\.0$/, "") + " GB" : Math.round(d.gb * 1024) + " MB");
  const stream = { url, label: parts.join(" \xB7 ").slice(0, 48) };
  const headers = headersOf(s);
  if (Object.keys(headers).length) stream.headers = headers;
  const mime = mimeOf(url);
  if (mime) stream.mime = mime;
  const other = !!d.lang && !["langEs", "langLatino", "langEn", "langOriginal"].includes(d.lang) || !!d.rawLang;
  return { stream, other, quality: d.quality, gb: d.gb, langRank: d.lang ? LANG_RANK[d.lang] != null ? LANG_RANK[d.lang] : 3 : d.rawLang ? 5 : 3, tier: tierOf(url), index, key: "h:" + hostOf(url) + ":" + (/\/api\/file\/([\w-]+)/.exec(url) || /\/download\/([\w-]{0,40})/.exec(url) || [])[1] };
}
var SERVED_PREFIX = "served:";
var BAD_KEY = "bad";
var REOPEN_WINDOW_MS = 2 * 60 * 1e3;
var BAD_FOR_MS = 10 * 60 * 1e3;
var BAD_MAX = 40;
function readBad() {
  try {
    const raw = JSON.parse(kino.storage.get(BAD_KEY) || "{}");
    const now = Date.now();
    const out = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [k, until] of Object.entries(raw)) if (Number(until) > now) out[k] = Number(until);
    }
    return out;
  } catch {
    return {};
  }
}
function writeBad(bad) {
  try {
    const entries = Object.entries(bad).sort((a, b) => b[1] - a[1]).slice(0, BAD_MAX);
    kino.storage.set(BAD_KEY, JSON.stringify(Object.fromEntries(entries)), { ttlMs: BAD_FOR_MS });
  } catch {
  }
}
async function streamsOf(path) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const body = await getJson(path, RESOLVE_TIMEOUT_MS);
    const list = Array.isArray(body.streams) ? body.streams.filter((s) => s && typeof s.url === "string" && /^https?:\/\//.test(s.url)) : [];
    if (list.length) return list;
    if (attempt < 1) await kino.sleep(800);
  }
  return [];
}
async function resolveVideo(ref, options) {
  const movieId = idOf(ref, "m:");
  let path;
  if (movieId) {
    const movie = await imdbOf("movie", movieId);
    if (!movie) throw kino.error("not_found", "no IMDb id for " + movieId.slice(0, 40), { userMessage: t("noTmdb") });
    path = `/stream/movie/${enc(movie)}.json`;
  } else {
    const m = /^e:(tt\d{5,10}):(\d{1,3}):(\d{1,5})$/.exec(String(ref || ""));
    if (!m) throw kino.error("not_found", "not a playable ref: " + String(ref).slice(0, 80));
    path = `/stream/series/${enc(`${m[1]}:${m[2]}:${m[3]}`)}.json`;
  }
  setLangRank();
  const raw = (await streamsOf(path)).filter((s) => playable(s.url));
  const seen = /* @__PURE__ */ new Set();
  const pref = String(kino.config.get("quality") || "1080");
  const capGb = parseFloat(String(kino.config.get("maxSize") || "10")) || 0;
  const showOther = kino.config.get("otherLangs") === true;
  const bad = readBad();
  const servedKey = SERVED_PREFIX + String(ref).slice(0, 120);
  let prev = null;
  try {
    prev = JSON.parse(kino.storage.get(servedKey) || "null");
  } catch {
    prev = null;
  }
  const now = Date.now();
  const reopened = options && options.retry || prev && typeof prev.t === "number" && now - prev.t < REOPEN_WINDOW_MS;
  if (reopened && prev && prev.key) {
    bad[prev.key] = now + BAD_FOR_MS;
    writeBad(bad);
  }
  const heavy = (x) => capGb > 0 && x.gb > capGb ? 1 : 0;
  const pool = raw.map((s, i) => toStream(s, i)).filter((x) => showOther || !x.other).filter((x) => seen.has(x.stream.url) ? false : (seen.add(x.stream.url), true)).sort(
    (a, b) => (bad[a.key] ? 1 : 0) - (bad[b.key] ? 1 : 0) || a.langRank - b.langRank || heavy(a) - heavy(b) || qualityRank(a.quality, pref) - qualityRank(b.quality, pref) || a.tier - b.tier || (a.gb || 99) - (b.gb || 99) || a.index - b.index
  );
  if (!pool.length) throw kino.error("not_found", "no playable streams for " + String(ref).slice(0, 80), { userMessage: t("noStreams") });
  const [first, ...rest] = pool;
  try {
    kino.storage.set(servedKey, JSON.stringify({ t: now, key: first.key }), { ttlMs: BAD_FOR_MS });
  } catch {
  }
  const main = { ...first.stream, expiresInSeconds: 1800 };
  const alternatives = rest.slice(0, 8).map((x) => x.stream);
  if (alternatives.length) main.alternatives = alternatives;
  return main;
}
var LIVE_ID = /^plaviohdtv-[\w:.~-]{1,100}$/;
function leagueOf(m) {
  const mm = /[?&]lg=([^&]+)/.exec(String(m.poster || ""));
  if (!mm) return "";
  try {
    return decodeURIComponent(mm[1].replace(/\+/g, " ")).trim().slice(0, 40);
  } catch {
    return "";
  }
}
function channelOf(m, categoryId) {
  const name = String(m.name || m.id).replace(/^[^\p{L}\p{N}(\[]+/u, "");
  const league = leagueOf(m);
  return {
    id: String(m.id).replace(/^plaviohdtv-/, "").replace(/[^A-Za-z0-9._~-]/g, "-").slice(0, 100) || "channel",
    title: (league && !name.includes(league) ? `${name} \xB7 ${league}` : name).slice(0, 120),
    ref: m.id,
    categoryId,
    logo: [m.logo, m.poster].find((u) => typeof u === "string" && u.startsWith("https://"))
  };
}
async function liveCatalog(cat) {
  return cached("live:" + cat.id, FRESH_LIVE_MS, async () => {
    const body = await getJson(`/catalog/tv/${cat.catalog}.json`, 12e3);
    return (Array.isArray(body.metas) ? body.metas : []).filter((m) => m && typeof m.id === "string" && LIVE_ID.test(m.id)).map((m) => ({ id: m.id, name: m.name, logo: m.logo, poster: m.poster }));
  });
}
async function liveCategories() {
  return LIVE.map((c) => ({ id: c.id, title: t(c.title), genre: "deportes" }));
}
async function liveChannels({ categoryId, cursor }) {
  const cat = LIVE.find((c) => c.id === categoryId);
  if (!cat) return { items: [] };
  const metas = await liveCatalog(cat);
  const from = cursor ? Math.max(0, parseInt(cursor, 10) || 0) : 0;
  const page = metas.slice(from, from + LIVE_PAGE);
  return { items: page.map((m) => channelOf(m, cat.id)), next: from + LIVE_PAGE < metas.length ? String(from + LIVE_PAGE) : null };
}
async function liveSearch({ query }) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return { items: [] };
  const lists = await mapLimit(LIVE, 2, async (c) => {
    try {
      return [c, await liveCatalog(c)];
    } catch {
      return [c, []];
    }
  });
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  for (const [c, metas] of lists) {
    for (const m of metas) {
      if (seen.has(m.id) || !String(m.name || "").toLowerCase().includes(q)) continue;
      seen.add(m.id);
      items.push({ ...channelOf(m, c.id), adult: false });
    }
  }
  return { items: items.slice(0, 100) };
}
var LIVE_RETRY_MS = 2 * 60 * 1e3;
async function resolveLive(ref) {
  const data = await getJson("/stream/tv/" + enc(ref) + ".json", RESOLVE_TIMEOUT_MS);
  const streams = (Array.isArray(data.streams) ? data.streams : []).filter((s) => s && typeof s.url === "string" && /^https?:\/\//.test(s.url));
  if (!streams.length) throw kino.error("not_found", "no streams", { userMessage: t("noSignal") });
  const key = "try:" + ref.slice(0, 100);
  let bad = [];
  try {
    const last = JSON.parse(kino.storage.get(key) || "null");
    if (last && Array.isArray(last.bad)) bad = last.bad.filter((x) => Date.now() - x.t < BAD_FOR_MS);
    if (last && last.url && Date.now() - last.t < LIVE_RETRY_MS) bad.push({ url: last.url, t: Date.now() });
  } catch {
    bad = [];
  }
  let fresh = streams.filter((s) => !bad.some((x) => x.url === s.url));
  if (!fresh.length) {
    bad = [];
    fresh = streams;
  }
  const pick = fresh[0];
  try {
    kino.storage.set(key, JSON.stringify({ t: Date.now(), url: pick.url, bad: bad.slice(-8) }), { ttlMs: BAD_FOR_MS });
  } catch {
  }
  return { url: pick.url, mime: "application/vnd.apple.mpegurl", headers: headersOf(pick) };
}
async function resolve(ref, options) {
  const r = String(ref || "");
  if (LIVE_ID.test(r)) return resolveLive(r);
  const out = await resolveVideo(r, options);
  try {
    browseScreen().notePlayed(r);
  } catch {
  }
  return out;
}
async function settingsStatus() {
  const keys = cacheKeys();
  let chars = 0;
  for (const k of keys) chars += k.length + (kino.storage.get(k) || "").length;
  const h = readHealth();
  const state = !h || h.ok === void 0 ? "healthNone" : h.ok ? "healthOk" : "healthFail";
  return { cache: t("cacheStatus", { n: keys.length, kb: Math.ceil(chars / 1024) }), health: t(state) };
}
async function action(key) {
  if (key === "clearCache") {
    for (const k of cacheKeys()) kino.storage.remove(k);
    return { message: t("cacheCleared") };
  }
  if (key === "probe") {
    try {
      await getJson("/manifest.json", LIST_TIMEOUT_MS);
      return { message: t("probeOk") };
    } catch {
      return { message: t("probeFail") };
    }
  }
  throw kino.error("not_found", "unknown action " + String(key).slice(0, 40));
}
export {
  action,
  browse,
  categories,
  details,
  episodes,
  home,
  liveCategories,
  liveChannels,
  liveSearch,
  resolve,
  screen,
  screenEvent,
  search,
  section,
  settingsStatus
};
