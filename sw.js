// 서비스 워커: 방문한 페이지와 CSS/JS 를 저장해 두었다가 인터넷이 끊기면 대신 보여줌
// ※ CSS/JS/HTML 을 고치면 아래 버전 숫자를 하나 올려야 휴대폰에 새 파일이 반영됨
const CACHE = "goods-shop-v1";

// 처음 설치할 때 미리 저장해 둘 파일
const PRECACHE = [
  "index.html",
  "css/style.css",
  "js/config.js",
  "js/common.js",
  "js/index.js",
  "js/pwa.js",
  "icons/icon-192.png",
];

// 결제 페이지는 저장하지 않음 (매번 새로 열어야 함)
const NO_CACHE_PAGES = ["checkout.html", "success.html", "fail.html"];

const OFFLINE_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>오프라인 | 굿즈샵</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px 16px;color:#1f2330;background:#f7f7fb">
<h1 style="font-size:22px">인터넷 연결을 확인해 주세요</h1>
<p style="color:#6b7280">연결되면 다시 시도해 주세요.</p>
<p><a href="index.html" style="color:#3d5afe">상품 목록으로</a></p></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

// 옛 버전 저장소 지우기
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameSite = url.origin === location.origin;
  const supabaseLib = url.hostname === "cdn.jsdelivr.net" && url.pathname.startsWith("/npm/@supabase/");
  // Supabase 서버, 토스 등 나머지 주소는 건드리지 않음
  if (!sameSite && !supabaseLib) return;

  // 페이지: 인터넷 먼저 → 실패하면 저장해 둔 것
  if (req.mode === "navigate") {
    const page = url.pathname.split("/").pop();
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (!NO_CACHE_PAGES.includes(page)) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true }).then(
            (saved) => saved || new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })
          )
        )
    );
    return;
  }

  // CSS/JS/아이콘: 저장해 둔 것 먼저 → 없으면 받아서 저장
  event.respondWith(
    caches.match(req).then(
      (saved) =>
        saved ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
    )
  );
});
