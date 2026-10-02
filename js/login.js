// 로그인 (관리자도 같은 화면 사용)
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("msg");
  msg.textContent = "";
  const { error } = await sb.auth.signInWithPassword({
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
  });
  if (error) {
    msg.textContent = "이메일 또는 비밀번호가 맞지 않아요.";
    return;
  }
  const next = new URLSearchParams(location.search).get("next");
  // 우리 사이트 페이지로만 이동 (예: checkout.html?product=1)
  location.href = next && /^[\w-]+\.html(\?[\w=&-]*)?$/.test(next) ? next : "index.html";
});
