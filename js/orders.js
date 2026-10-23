// 내 결제 내역 (RLS 덕분에 본인 주문만 조회됨)
(async () => {
  const user = await requireLogin();
  if (!user) return;

  const box = document.getElementById("orders");
  const { data, error } = await sb
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    box.innerHTML = '<p class="msg" style="padding:12px">내역을 불러오지 못했어요.</p>';
    return;
  }
  if (!data.length) {
    box.innerHTML = '<p class="muted" style="padding:12px">아직 결제 내역이 없어요.</p>';
    return;
  }
  box.innerHTML = `
    <table>
      <thead><tr><th>주문일시</th><th>상품</th><th>금액</th><th>상태</th><th>결제일시</th></tr></thead>
      <tbody>${data
        .map(
          (o) => `<tr>
            <td data-label="주문일시">${dateText(o.created_at)}</td>
            <td data-label="상품">${escapeHtml(o.product_name)}</td>
            <td data-label="금액">${won(o.amount)}</td>
            <td data-label="상태">${statusBadge(o.status)}</td>
            <td data-label="결제일시">${dateText(o.paid_at)}</td>
          </tr>`
        )
        .join("")}</tbody>
    </table>`;
})();
