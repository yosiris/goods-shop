// 앱(PWA) 기능: 서비스 워커 등록 + 휴대폰 첫 방문 때 "홈 화면에 추가" 안내
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

(() => {
  const KEY = "install-bar-closed";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isApp = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  function closed() {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch (_) {
      return false;
    }
  }
  function remember() {
    try {
      localStorage.setItem(KEY, "1");
    } catch (_) {}
  }

  if (!isMobile || isApp || closed()) return;

  function showBar(text, onAdd) {
    const bar = document.createElement("div");
    bar.className = "install-bar";
    bar.innerHTML = `<span>${text}</span>`;
    if (onAdd) {
      const add = document.createElement("button");
      add.className = "btn";
      add.textContent = "추가";
      add.addEventListener("click", () => {
        bar.remove();
        onAdd();
      });
      bar.appendChild(add);
    }
    const close = document.createElement("button");
    close.className = "link-btn";
    close.textContent = "닫기";
    close.addEventListener("click", () => {
      remember();
      bar.remove();
    });
    bar.appendChild(close);
    document.body.appendChild(bar);
  }

  // 아이폰: 자동 설치 창이 없어서 방법만 알려줌
  if (isIOS) {
    showBar("공유 버튼 ⬆ → '홈 화면에 추가'를 누르면 앱처럼 쓸 수 있어요");
    return;
  }

  // 안드로이드: 브라우저가 "설치 가능" 신호를 주면 안내
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    showBar("홈 화면에 goods-shop 추가하기", async () => {
      event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") remember();
    });
  });
})();
