// @ts-check
/// <reference path="./kino.d.ts" />
// Kino plugin: PlavioHD -- movies, series and live sports from the PlavioHD Stremio addon (plaviohd.vercel.app).
// The addon has no movie or series catalog (it answers streams by IMDb id) and four live-sports catalogs, so:
//   - movies and series are discovered through Kino's own TMDB (search, shelves, genres) and played by IMDb id;
//   - the live catalogs are channels in Kino's En vivo tab.
// Read it top to bottom: 1. constants  2. texts  3. cache  4. addon client  5. items and TMDB  6. search  7. home, browse,
// section, categories  8. episodes and details  9. resolve (movies, series)  10. live  11. settings.
// Declared host: plaviohd.vercel.app (kino.fetch). The video is on other servers: the manifest's `streamHosts: "any"` and
// `liveStreamHosts: "any"`, which the person approves at install.

const HOST = "plaviohd.vercel.app";
const ROW_MAX = 60;
const MAX_TMDB_PAGE = 25;
const IMG = "https://image.tmdb.org/t/p/w342";
const LIST_TIMEOUT_MS = 8000;
const RESOLVE_TIMEOUT_MS = 15000;

const TYPES = [
  { type: "movie", label: "Películas", labelEn: "Movies", genre: "peliculas" },
  { type: "series", label: "Series", labelEn: "Series", genre: "series" },
];

// TMDB genre ids; `vocab` is Kino's closed genre vocabulary for the row.
const GENRES = {
  movie: [
    { id: 28, es: "Acción", en: "Action" }, { id: 35, es: "Comedia", en: "Comedy" }, { id: 18, es: "Drama", en: "Drama" },
    { id: 27, es: "Terror", en: "Horror" }, { id: 878, es: "Ciencia ficción", en: "Sci-Fi" },
    { id: 16, es: "Animación", en: "Animation" }, { id: 53, es: "Suspenso", en: "Thriller" },
    { id: 10749, es: "Romance", en: "Romance" }, { id: 10751, es: "Familia", en: "Family", vocab: "infantil" },
    { id: 12, es: "Aventura", en: "Adventure" }, { id: 99, es: "Documental", en: "Documentary", vocab: "documentales" },
  ],
  series: [
    { id: 10759, es: "Acción y aventura", en: "Action & Adventure" }, { id: 35, es: "Comedia", en: "Comedy" },
    { id: 18, es: "Drama", en: "Drama" }, { id: 9648, es: "Misterio", en: "Mystery" }, { id: 80, es: "Crimen", en: "Crime" },
    { id: 16, es: "Animación", en: "Animation" }, { id: 10765, es: "Ciencia ficción y fantasía", en: "Sci-Fi & Fantasy" },
    { id: 99, es: "Documental", en: "Documentary", vocab: "documentales" },
  ],
};

// The addon's live catalogs. Each lists up to ~170 channels in one answer; they are paged here.
const LIVE = [
  { id: "live", catalog: "plaviohd-live", title: "liveNow" },
  { id: "football", catalog: "plaviohd-football", title: "liveFootball" },
  { id: "cricket", catalog: "plaviohd-cricket", title: "liveCricket" },
  { id: "networks", catalog: "plaviohd-networks", title: "liveNetworks" },
];
const LIVE_PAGE = 100;

// ---- 1. texts -------------------------------------------------------------------------------------------------

// Every text the person reads, in Spanish and English: Kino does not translate a plugin's texts.
const TEXTS = {
  es: {
    unavailable: "PlavioHD no responde ahora. Intenta de nuevo en un rato.",
    noStreams: "Este título no tiene video disponible por ahora. Prueba otro o vuelve más tarde.",
    noEpisodes: "Este título no trae lista de episodios.",
    noTmdb: "Este título no se pudo identificar. Prueba otro.",
    noSignal: "Este canal no tiene señal ahora mismo. Si el evento aún no empieza, vuelve más tarde.",
    copy: "Opción {n}",
    shelfTrend: "Tendencias", shelfPop: "Populares", shelfTop: "Mejor valoradas", shelfNew: "En cartelera / en emisión",
    tabStart: "Inicio", sectionHero: "Lo que está de moda.",
    tileMovies: "Tendencias en cine", tileSeries: "Tendencias en series",
    liveNow: "En vivo ahora", liveFootball: "Fútbol", liveCricket: "Críquet", liveNetworks: "TV deportiva 24/7",
    cacheStatus: "Caché: {n} entradas, {kb} KB", cacheCleared: "Listo: se vació la caché",
    healthOk: "responde", healthFail: "falla", healthNone: "sin datos",
    probeOk: "Listo: el servicio responde", probeFail: "El servicio no responde ahora",
    langEn: "Inglés", langHi: "Hindi", langEs: "Español", langLatino: "Latino", langOriginal: "Original", langPt: "Portugués", langFr: "Francés", langRu: "Ruso", langAr: "Árabe",
  },
  en: {
    unavailable: "PlavioHD isn't responding right now. Try again in a while.",
    noStreams: "This title has no video available right now. Try another or come back later.",
    noEpisodes: "This title has no episode list.",
    noTmdb: "This title could not be identified. Try another.",
    noSignal: "This channel has no signal right now. If the event has not started yet, come back later.",
    copy: "Option {n}",
    shelfTrend: "Trending", shelfPop: "Popular", shelfTop: "Top rated", shelfNew: "Now playing / on the air",
    tabStart: "Start", sectionHero: "What is trending.",
    tileMovies: "Trending movies", tileSeries: "Trending series",
    liveNow: "Live now", liveFootball: "Soccer", liveCricket: "Cricket", liveNetworks: "24/7 sports TV",
    cacheStatus: "Cache: {n} entries, {kb} KB", cacheCleared: "Done: the cache is empty",
    healthOk: "responding", healthFail: "failing", healthNone: "no data",
    probeOk: "Done: the service responds", probeFail: "The service is not responding right now",
    langEn: "English", langHi: "Hindi", langEs: "Spanish", langLatino: "Latin Spanish", langOriginal: "Original", langPt: "Portuguese", langFr: "French", langRu: "Russian", langAr: "Arabic",
  },
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

// ---- 2. cache -------------------------------------------------------------------------------------------------

// kino.storage keeps 256 KB in all. Every entry is `{ at, v }` and lives HARD_TTL_MS; it is "fresh" for the window the
// caller gives. An expired-but-kept one is the fallback when the backend fails (an old list beats an empty screen).
const CACHE_PREFIX = "c1:";
const HARD_TTL_MS = 24 * 60 * 60 * 1000;
const ENTRY_MAX_CHARS = 48 * 1024;
const FRESH_SHELF_MS = 6 * 60 * 60 * 1000;
const FRESH_META_MS = 60 * 60 * 1000;
const FRESH_ART_MS = 12 * 60 * 60 * 1000;
const FRESH_IMDB_MS = 7 * 24 * 60 * 60 * 1000;
const FRESH_LIVE_MS = 60 * 1000;

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
      // unreadable: the first to go
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

// A cache never fails the call it serves: whatever storage refuses is simply not cached.
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

// ---- 3. addon client ------------------------------------------------------------------------------------------

const enc = encodeURIComponent;

// The addon is configurable: its page builds `/c/<base64url JSON>/manifest.json`. Without a configuration it leaves whole
// sources out (Vidy and Cinezo only answer when the full language list is sent), so the plugin always sends one. The
// addon filters nothing else here: quality, language and size are ordered by the plugin, never dropped.
const SOURCES = ["HDHub", "MovieBox", "9xflix", "Vidy", "Cinezo", "Vidzee", "VixSrc"]; // Vegamovies lists download pages only
const REGIONS = ["US", "UK", "CA", "AU", "NZ"];
const ADDON_LANGS = ["English", "Hindi", "Urdu", "Tamil", "Telugu", "Arabic", "Punjabi", "Malayalam", "Kannada", "Bengali", "Marathi", "Spanish", "French"];
const ADDON_CATS = ["Hollywood", "Bollywood", "Anime", "South Indian", "Punjabi", "Pakistani", "Korean", "Chinese", "Turkish"];
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** UTF-8 bytes of [s] as base64url without padding (the engine has neither Buffer nor btoa). */
function base64url(s) {
  const bytes = [];
  for (const ch of unescape(encodeURIComponent(s))) bytes.push(ch.charCodeAt(0));
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64[n & 63];
  }
  return out;
}

/** The names the person typed that are in [valid] (case-insensitive), or all of them for "all", empty or nothing valid. */
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
    sort: "desc",
  };
  return "https://" + HOST + "/c/" + base64url(JSON.stringify(cfg));
}

const HEALTH_KEY = "health";
const DOWN_AFTER = 3;

function readHealth() {
  try {
    const h = JSON.parse(kino.storage.get(HEALTH_KEY) || "{}");
    return h && typeof h === "object" && !Array.isArray(h) ? h : {};
  } catch {
    return {};
  }
}

// Three failed requests in a row are reported once (the third only); an ok answer resets the count.
function recordHealth(ok) {
  try {
    const prev = readHealth();
    const fails = ok ? 0 : (Number.isFinite(prev.fails) ? prev.fails : 0) + 1;
    kino.storage.set(HEALTH_KEY, JSON.stringify({ ok, fails, at: Date.now() }));
    if (fails === DOWN_AFTER) kino.log.report("plaviohd:down", "addon");
  } catch {
    // a full storage: the next request records again
  }
}

async function getJson(path, timeoutMs) {
  let r;
  try {
    r = await kino.fetch(base() + path, { timeoutMs: timeoutMs || 15000, headers: { Accept: "application/json" } });
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

// ---- 4. items and TMDB ----------------------------------------------------------------------------------------

const IMDB = /^tt\d{5,10}$/;

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

// A shelf is "trend", "new", "pop", "top" or "g<TMDB genre id>". `path` + `params` are what kino.tmdb is asked.
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

// The addon knows IMDb ids only, so every item carries "tmdb:<n>" until it is played. An item's id keeps the kind: a
// movie and a series can share a TMDB number.
function tmdbItem(m, type, needPoster) {
  const poster = m.poster_path ? IMG + m.poster_path : "";
  const title = String(m.title || m.name || "").trim();
  if ((needPoster && !poster) || !title || !Number.isInteger(m.id)) return null;
  const movie = type === "movie";
  const item = { id: `tmdb-${movie ? "m" : "s"}-${m.id}`, ref: (movie ? "m:" : "i:") + "tmdb:" + m.id, title: title.slice(0, 200), kind: movie ? "movie" : "series", ids: { tmdb: m.id } };
  if (poster) item.poster = poster;
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
    more: Number(body && body.total_pages) > page && page < MAX_TMDB_PAGE,
  };
}

// A shelf's first page, cached; a shelf nobody could read is null and never takes the other rows with it.
async function shelfRow(type, shelf, prefixed) {
  const info = shelfInfo(type, shelf);
  if (!info || !hasTmdb()) return null;
  try {
    const lang = isSpanish() ? "es" : "en";
    const first = await cached(`shelf:${type}:${shelf}:${lang}`, FRESH_SHELF_MS, async () => (await shelfPage(type, shelf, 1)).items);
    if (!first.length) return null;
    const name = typeLabel(typeOf(type));
    return { id: `d-${type}-${shelf}`, title: prefixed ? `${info.title} — ${name}` : info.title, ref: `d:${type}:${shelf}`, items: first.slice(0, ROW_MAX), genre: info.genre };
  } catch (e) {
    kino.log(`shelf ${type}:${shelf} failed: ` + (e && e.message));
    return null;
  }
}

// ---- 5. search ------------------------------------------------------------------------------------------------

// Movies and series at once (or only the kind Kino asked for) from TMDB's search, ORDERED (never filtered) by how much
// each title resembles what was typed.
export async function search(query) {
  const q = kino.rank.shortQuery(String(query.q || "").trim());
  if (!q || !hasTmdb()) return [];
  const wanted = TYPES.filter((x) => (query.type !== "movie" && query.type !== "series" ? true : x.type === query.type));
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

// ---- 6. home, browse, section and categories ------------------------------------------------------------------

export async function home() {
  if (kino.config.get("homeRows") === false) return [];
  const jobs = [
    () => shelfRow("movie", "trend", true), () => shelfRow("series", "trend", true),
    () => shelfRow("movie", "new", true), () => shelfRow("series", "pop", true),
  ];
  return (await mapLimit(jobs, 4, (job) => job())).filter(Boolean);
}

export async function browse(ref, cursor) {
  const d = /^d:(movie|series):([a-z0-9]+)$/.exec(String(ref || ""));
  if (!d) throw kino.error("not_found", "unknown browse ref: " + String(ref).slice(0, 60));
  const page = Math.min(MAX_TMDB_PAGE, Math.max(1, parseInt(cursor || "1", 10) || 1));
  const r = await shelfPage(d[1], d[2], page);
  return r.more ? { items: r.items, next: String(page + 1) } : { items: r.items };
}

function shelvesOf(type) {
  return ["trend", "new", "pop", "top"].concat((GENRES[type] || []).map((g) => "g" + g.id));
}

// The plugin's own section: Start (trending of both kinds), Movies and Series.
export async function section({ tab }) {
  const tabs = [{ id: "start", label: t("tabStart") }, ...TYPES.map((x) => ({ id: x.type, label: typeLabel(x) }))];
  const chosen = tabs.some((x) => x.id === tab) ? tab : tabs[0].id;
  const jobs = chosen === "start"
    ? [() => shelfRow("movie", "trend", true), () => shelfRow("series", "trend", true), () => shelfRow("movie", "new", true), () => shelfRow("series", "new", true)]
    : shelvesOf(chosen).map((shelf) => () => shelfRow(chosen, shelf, false));
  const rows = (await mapLimit(jobs, 4, (job) => job())).filter(Boolean);
  const answer = { tabs, tab: chosen, rows };
  if (rows.length && rows[0].items.length) {
    // Today's pick: the same all day, a different one tomorrow.
    const items = rows[0].items;
    const pick = items[Math.floor(Date.now() / 86400000) % items.length];
    answer.hero = { title: pick.title, text: t("sectionHero") };
    if (pick.poster) answer.hero.image = pick.poster;
  }
  return answer;
}

// Categorías: trending of both kinds, then one tile per genre (at most 24). The art is the first title's poster.
export async function categories() {
  const tiles = [
    { id: "movie-trend", title: t("tileMovies"), ref: "d:movie:trend", type: "movie", shelf: "trend" },
    { id: "series-trend", title: t("tileSeries"), ref: "d:series:trend", type: "series", shelf: "trend" },
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
  return (await mapLimit(tiles.slice(0, 24), 4, async (tile) => {
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
  }));
}

// ---- 7. episodes and details ----------------------------------------------------------------------------------

function idOf(ref, prefix) {
  const s = String(ref || "");
  return s.startsWith(prefix) && s.length > prefix.length ? s.slice(prefix.length) : null;
}

// A shelf title carries "tmdb:<n>": its IMDb id is asked once from Kino's own TMDB and kept.
async function imdbOf(type, id) {
  if (IMDB.test(id)) return id;
  const m = /^tmdb:(\d{1,9})$/.exec(String(id));
  if (!m || !hasTmdb()) return null;
  const found = await cached(`imdb:${type}:${m[1]}`, FRESH_IMDB_MS, async () => {
    const body = await kino.tmdb(`/${tmdbPath(type)}/${m[1]}/external_ids`);
    return body && IMDB.test(String(body.imdb_id || "")) ? String(body.imdb_id) : "";
  });
  return found || null;
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
      overview: String(m.overview || "").slice(0, 2000),
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
        String(e.airDate || "").slice(0, 10),
      ]),
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

// Seasons, then numbers, ascending; specials and episodes that have not aired yet are left out. An episode's ref carries
// the IMDb id: that is what the addon is asked for.
export async function episodes(ref) {
  const id = idOf(ref, "i:");
  if (!id) throw kino.error("not_found", "not a series ref: " + String(ref).slice(0, 80));
  const meta = await metaOf("series", id);
  if (!meta || !meta.episodes.length) throw kino.error("not_found", "no episode list for " + id.slice(0, 80), { userMessage: t("noEpisodes") });
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set();
  const eps = [];
  for (const [season, number, title, overview, still, date] of meta.episodes.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    if (season < 1 || (/^\d{4}-\d{2}-\d{2}$/.test(date) && date > today)) continue;
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

export async function details(ref) {
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

// ---- 8. resolve: copies ---------------------------------------------------------------------------------------

// What the addon lists is a mix of file lockers. Measured on eight titles: pages that need a browser to get to the file
// (hubcloud, hubdrive, fastdl.beer's dl.php) and a private bucket that answers 403 cannot play; pixeldrain, the
// `*.workers.dev/download` relays, public r2.dev buckets, Google video downloads, MovieBox mp4 (with its Referer), Vidy and
// Vidzee HLS and Cinezo's DASH (with its Referer) do.
const UNPLAYABLE_HOSTS = [/(^|\.)hubcloud\./, /(^|\.)hubdrive\./, /(^|\.)fastdl\.beer$/, /\.r2\.cloudflarestorage\.com$/, /(^|\.)gdflix\./, /(^|\.)filepress\./];

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

// Lower plays first, within a quality: a direct file host with range support, then the relays, then everything else.
function tierOf(url) {
  const h = hostOf(url);
  if (h === "pixeldrain.dev" || h === "pixeldrain.com") return 0;
  if (/\.workers\.dev$/.test(h)) return 1;
  return 2;
}

// The addon writes "<Source> · 1080p · <language> · 8.94 GB" (the language part may be missing). Measured language
// labels: English, Hindi, "Hindi, English", "Original Audio", and MovieBox's "<Language> dub" where "esla" is Latin American
// Spanish and "Spanish" is Castilian. `rank` is the position when the person prefers Spanish; English-first swaps 0-2.
const LANG_WORDS = [
  { re: /\besla\b|latino|latam/i, key: "langLatino" },
  { re: /\bspanish\b|espa[ñn]ol|castellano/i, key: "langEs" },
  { re: /\boriginal\b/i, key: "langOriginal" },
  { re: /\benglish\b/i, key: "langEn" },
  { re: /\bhindi\b/i, key: "langHi" },
  { re: /\bptbr\b|portugu/i, key: "langPt" },
  { re: /\bfrench\b/i, key: "langFr" },
  { re: /\brussian\b/i, key: "langRu" },
  { re: /\barabic\b/i, key: "langAr" },
  { re: /\b(tamil|telugu|bengali|punjabi|malayalam|kannada|marathi|urdu|indonesian|tagalog)\b/i, key: "" },
];

function describe(s) {
  const text = String(s.description || s.title || "") + " " + String(s.name || "");
  const quality = /2160|4k|uhd/i.test(text) ? 2160 : /1440/.test(text) ? 1440 : /1080/.test(text) ? 1080 : /720/.test(text) ? 720 : /480/.test(text) ? 480 : 0;
  const size = /(\d+(?:\.\d+)?)\s*(GB|MB)\b/i.exec(text);
  const gb = size ? parseFloat(size[1]) / (size[2].toUpperCase() === "MB" ? 1024 : 1) : 0;
  // The language is read from the descriptor line only: a file name above it may name languages the audio is not in.
  const line = String(s.description || s.title || "").split("\n").pop();
  const hit = LANG_WORDS.find((l) => l.re.test(line));
  const raw = /·\s*(?:\d{3,4}p\s*·\s*)?([A-Za-z][A-Za-z ,]{1,40}?)\s*(?:dub)?\s*·/.exec(line);
  return { quality, gb, lang: hit ? hit.key : "", rawLang: hit && !hit.key && raw ? raw[1].trim() : "" };
}

// Audio order: the person's choice (setting "audio": Spanish or English first; "auto" follows the app's language).
// Latin American Spanish is always the first Spanish; Hindi and the other languages go last; an unlabelled copy sits between.
let LANG_RANK = {};

function setLangRank() {
  const pref = String(kino.config.get("audio") || "auto");
  const english = pref === "en" || (pref === "auto" && !isSpanish());
  LANG_RANK = english
    ? { langEn: 0, langOriginal: 0, langLatino: 1, langEs: 1, langHi: 4 }
    : { langLatino: 0, langEs: 1, langOriginal: 2, langEn: 2, langHi: 4 };
}

function qualityName(q) {
  return q === 2160 ? "4K" : q ? q + "p" : "";
}

function qualityRank(q, pref) {
  if (pref === "max") return -q;
  const cap = pref === "720" ? 720 : 1080;
  const v = q || cap;
  return v <= cap ? cap - v : 100000 + (v - cap);
}

function headersOf(s) {
  const req = s.behaviorHints && s.behaviorHints.proxyHeaders && s.behaviorHints.proxyHeaders.request;
  const out = {};
  if (req && typeof req === "object") for (const k of ["Referer", "Origin", "User-Agent"]) if (typeof req[k] === "string" && req[k]) out[k] = req[k];
  return out;
}

function mimeOf(url) {
  if (/\.m3u8(\?|$)/i.test(url)) return "application/vnd.apple.mpegurl";
  if (/\.mpd(\?|$)/i.test(url)) return "application/dash+xml";
  return undefined;
}

function toStream(s, index) {
  const d = describe(s);
  const url = String(s.url);
  const parts = [t("copy", { n: index + 1 })];
  if (d.quality) parts.push(qualityName(d.quality));
  if (d.lang) parts.push(t(d.lang));
  else if (d.rawLang) parts.push(d.rawLang);
  if (d.gb) parts.push(d.gb >= 1 ? d.gb.toFixed(1).replace(/\.0$/, "") + " GB" : Math.round(d.gb * 1024) + " MB");
  const stream = { url, label: parts.join(" · ").slice(0, 48) };
  const headers = headersOf(s);
  if (Object.keys(headers).length) stream.headers = headers;
  const mime = mimeOf(url);
  if (mime) stream.mime = mime;
  return { stream, quality: d.quality, gb: d.gb, langRank: d.lang ? (LANG_RANK[d.lang] != null ? LANG_RANK[d.lang] : 3) : d.rawLang ? 5 : 3, tier: tierOf(url), index, key: "h:" + hostOf(url) + ":" + (/\/api\/file\/([\w-]+)/.exec(url) || /\/download\/([\w-]{0,40})/.exec(url) || [])[1] };
}

// ---- 8b. what failed before -------------------------------------------------------------------------------------

// Kino only tells a plugin a copy failed when the origin REFUSED it (`options.retry`: 401, 403, 409); a dead link just moves
// the player on. So a second resolve of the same title soon after the first is read as "that copy did not work" too: the
// copy served first goes last for a while (this title only: the keys are per file, not per host).
const SERVED_PREFIX = "served:";
const BAD_KEY = "bad";
const REOPEN_WINDOW_MS = 2 * 60 * 1000;
const BAD_FOR_MS = 10 * 60 * 1000;
const BAD_MAX = 40;

function readBad() {
  try {
    const raw = JSON.parse(kino.storage.get(BAD_KEY) || "{}");
    const now = Date.now();
    const out = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) for (const [k, until] of Object.entries(raw)) if (Number(until) > now) out[k] = Number(until);
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
    // a full storage: the order just is not learned this time
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
  const seen = new Set();
  const pref = String(kino.config.get("quality") || "1080");
  const capGb = parseFloat(String(kino.config.get("maxSize") || "10")) || 0;
  const bad = readBad();
  const servedKey = SERVED_PREFIX + String(ref).slice(0, 120);
  let prev = null;
  try {
    prev = JSON.parse(kino.storage.get(servedKey) || "null");
  } catch {
    prev = null;
  }
  const now = Date.now();
  const reopened = (options && options.retry) || (prev && typeof prev.t === "number" && now - prev.t < REOPEN_WINDOW_MS);
  if (reopened && prev && prev.key) {
    bad[prev.key] = now + BAD_FOR_MS;
    writeBad(bad);
  }
  const heavy = (x) => (capGb > 0 && x.gb > capGb ? 1 : 0);
  const pool = raw
    .map((s, i) => toStream(s, i))
    .filter((x) => (seen.has(x.stream.url) ? false : (seen.add(x.stream.url), true)))
    .sort(
      (a, b) =>
        (bad[a.key] ? 1 : 0) - (bad[b.key] ? 1 : 0) ||
        a.langRank - b.langRank ||
        heavy(a) - heavy(b) ||
        qualityRank(a.quality, pref) - qualityRank(b.quality, pref) ||
        a.tier - b.tier ||
        (a.gb || 99) - (b.gb || 99) ||
        a.index - b.index,
    );
  if (!pool.length) throw kino.error("not_found", "no playable streams for " + String(ref).slice(0, 80), { userMessage: t("noStreams") });
  const [first, ...rest] = pool;
  try {
    kino.storage.set(servedKey, JSON.stringify({ t: now, key: first.key }), { ttlMs: BAD_FOR_MS });
  } catch {
    // not remembered: the next play just starts from the same order
  }
  const main = { ...first.stream, expiresInSeconds: 1800 };
  const alternatives = rest.slice(0, 8).map((x) => x.stream);
  if (alternatives.length) main.alternatives = alternatives;
  return main;
}

// ---- 9. live --------------------------------------------------------------------------------------------------

const LIVE_ID = /^plaviohdtv-[\w:.~-]{1,100}$/;

// The poster of a Nuvio-sourced match is an image URL that carries the competition in `lg`.
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
    title: (league && !name.includes(league) ? `${name} · ${league}` : name).slice(0, 120),
    ref: m.id,
    categoryId,
    logo: [m.logo, m.poster].find((u) => typeof u === "string" && u.startsWith("https://")),
  };
}

async function liveCatalog(cat) {
  return cached("live:" + cat.id, FRESH_LIVE_MS, async () => {
    const body = await getJson(`/catalog/tv/${cat.catalog}.json`, 12000);
    return (Array.isArray(body.metas) ? body.metas : [])
      .filter((m) => m && typeof m.id === "string" && LIVE_ID.test(m.id))
      .map((m) => ({ id: m.id, name: m.name, logo: m.logo, poster: m.poster }));
  });
}

export async function liveCategories() {
  return LIVE.map((c) => ({ id: c.id, title: t(c.title), genre: "deportes" }));
}

export async function liveChannels({ categoryId, cursor }) {
  const cat = LIVE.find((c) => c.id === categoryId);
  if (!cat) return { items: [] };
  const metas = await liveCatalog(cat);
  const from = cursor ? Math.max(0, parseInt(cursor, 10) || 0) : 0;
  const page = metas.slice(from, from + LIVE_PAGE);
  return { items: page.map((m) => channelOf(m, cat.id)), next: from + LIVE_PAGE < metas.length ? String(from + LIVE_PAGE) : null };
}

export async function liveSearch({ query }) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return { items: [] };
  const lists = await mapLimit(LIVE, 2, async (c) => {
    try {
      return [c, await liveCatalog(c)];
    } catch {
      return [c, []];
    }
  });
  const seen = new Set();
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

const LIVE_RETRY_MS = 2 * 60 * 1000;

async function resolveLive(ref) {
  const data = await getJson("/stream/tv/" + enc(ref) + ".json", RESOLVE_TIMEOUT_MS);
  const streams = (Array.isArray(data.streams) ? data.streams : []).filter((s) => s && typeof s.url === "string" && /^https?:\/\//.test(s.url));
  if (!streams.length) throw kino.error("not_found", "no streams", { userMessage: t("noSignal") });
  // Opening the same channel again within LIVE_RETRY_MS means the copy served last did not play: it is remembered as bad.
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
    // the memory is a nicety: the channel plays without it
  }
  return { url: pick.url, mime: "application/vnd.apple.mpegurl", headers: headersOf(pick) };
}

// ---- 10. resolve ----------------------------------------------------------------------------------------------

export async function resolve(ref, options) {
  const r = String(ref || "");
  if (LIVE_ID.test(r)) return resolveLive(r);
  return resolveVideo(r, options);
}

// ---- 11. settings ---------------------------------------------------------------------------------------------

export async function settingsStatus() {
  const keys = cacheKeys();
  let chars = 0;
  for (const k of keys) chars += k.length + (kino.storage.get(k) || "").length;
  const h = readHealth();
  const state = !h || h.ok === undefined ? "healthNone" : h.ok ? "healthOk" : "healthFail";
  return { cache: t("cacheStatus", { n: keys.length, kb: Math.ceil(chars / 1024) }), health: t(state) };
}

export async function action(key) {
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
