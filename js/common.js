// 모든 페이지 공통: Supabase 연결, 상단 메뉴, 로그인 확인, 표시 도우미
const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function getUser() {
  const { data } = await sb.auth.getSession();
  return data.session ? data.session.user : null;
}

async function isAdmin(user) {
  if (!user) return false;
  const { data } = await sb.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return !!(data && data.is_admin);
}

// 로그인 안 했으면 로그인 페이지로 보냄 (로그인 후 원래 페이지로 돌아옴)
async function requireLogin() {
  const user = await getUser();
  if (!user) {
    const back = encodeURIComponent(location.pathname.split("/").pop() + location.search);
    location.href = "login.html?next=" + back;
    return null;
  }
  return user;
}

async function renderNav() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  const user = await getUser();
  let links = '<a href="index.html">상품</a>';
  if (user) {
    links += '<a href="orders.html">내 결제 내역</a>';
    if (await isAdmin(user)) links += '<a href="admin.html">관리자</a>';
    links += `<span class="nav-user">${escapeHtml(user.email)}</span><button id="logout-btn" class="link-btn">로그아웃</button>`;
  } else {
    links += '<a href="login.html">로그인</a><a href="signup.html">회원가입</a>';
  }
  nav.innerHTML = links;
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await sb.auth.signOut();
      location.href = "index.html";
    });
  }
}

function won(n) {
  return Number(n).toLocaleString("ko-KR") + "원";
}

function dateText(s) {
  return s ? new Date(s).toLocaleString("ko-KR") : "-";
}

const STATUS_TEXT = { pending: "결제 대기", paid: "결제 완료", failed: "결제 실패" };

function statusBadge(status) {
  return `<span class="badge badge-${status}">${STATUS_TEXT[status] || status}</span>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

renderNav();
