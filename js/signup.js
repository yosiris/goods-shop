// 회원가입 (이메일 인증 없이 바로 로그인됨)
document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("msg");
  msg.textContent = "";
  const password = document.getElementById("password").value;
  if (password !== document.getElementById("password2").value) {
    msg.textContent = "비밀번호가 서로 달라요.";
    return;
  }
  const { error } = await sb.auth.signUp({
    email: document.getElementById("email").value.trim(),
    password,
  });
  if (error) {
    msg.textContent = error.message.includes("registered") ? "이미 가입된 이메일이에요." : "가입에 실패했어요: " + error.message;
    return;
  }
  alert("가입이 완료됐어요!");
  location.href = "index.html";
});
