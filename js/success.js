// 결제 성공 후 돌아온 페이지: 서버(Edge Function)에 결제 확정 요청
(async () => {
  const user = await requireLogin();
  if (!user) return;

  const title = document.getElementById("title");
  const result = document.getElementById("result");
  const q = new URLSearchParams(location.search);

  const { data, error } = await sb.functions.invoke("confirm-payment", {
    body: { paymentKey: q.get("paymentKey"), orderId: q.get("orderId"), amount: Number(q.get("amount")) },
  });

  if (error) {
    let message = "결제 확인에 실패했어요.";
    try {
      message = (await error.context.json()).message || message;
    } catch (_) {}
    title.textContent = "결제 실패";
    result.innerHTML = `<p class="msg">${escapeHtml(message)}</p>`;
    return;
  }

  title.textContent = "결제 완료 🎉";
  result.innerHTML = `
    <div class="summary"><span>상품</span><strong>${escapeHtml(data.order.product_name)}</strong></div>
    <div class="summary"><span>결제 금액</span><strong>${won(data.order.amount)}</strong></div>`;
})();
