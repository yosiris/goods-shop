// 관리자: 모든 사람의 결제 내역 (RLS 의 is_admin() 으로 보호됨)
(async () => {
  const user = await requireLogin();
  if (!user) return;

  const box = document.getElementById("orders");
  if (!(await isAdmin(user))) {
    box.innerHTML = '<p class="msg" style="padding:12px">관리자만 볼 수 있는 페이지예요.</p>';
    return;
  }

  const { data, error } = await sb.from("orders").select("*").order("created_at", { ascending: false });
  if (error) {
    box.innerHTML = '<p class="msg" style="padding:12px">내역을 불러오지 못했어요.</p>';
    return;
  }

  const paid = data.filter((o) => o.status === "paid");
  const total = paid.reduce((sum, o) => sum + o.amount, 0);
  document.getElementById("summary").textContent = `전체 주문 ${data.length}건 · 결제 완료 ${paid.length}건 · 매출 ${won(total)}`;

  if (!data.length) {
    box.innerHTML = '<p class="muted" style="padding:12px">아직 주문이 없어요.</p>';
    return;
  }
  box.innerHTML = `
    <table>
      <thead><tr><th>주문일시</th><th>회원</th><th>상품</th><th>금액</th><th>상태</th><th>결제수단</th><th>결제일시</th></tr></thead>
      <tbody>${data
        .map(
          (o) => `<tr>
            <td data-label="주문일시">${dateText(o.created_at)}</td>
            <td data-label="회원">${escapeHtml(o.user_email)}</td>
            <td data-label="상품">${escapeHtml(o.product_name)}</td>
            <td data-label="금액">${won(o.amount)}</td>
            <td data-label="상태">${statusBadge(o.status)}</td>
            <td data-label="결제수단">${escapeHtml(o.method || "-")}</td>
            <td data-label="결제일시">${dateText(o.paid_at)}</td>
          </tr>`
        )
        .join("")}</tbody>
    </table>`;
})();
