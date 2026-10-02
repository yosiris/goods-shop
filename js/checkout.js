// 결제하기: 주문서 생성(DB 가격 기준) → 토스 결제위젯 → 결제 요청
(async () => {
  const user = await requireLogin();
  if (!user) return;

  const info = document.getElementById("order-info");
  const msg = document.getElementById("msg");
  const payBtn = document.getElementById("pay-btn");
  const productId = Number(new URLSearchParams(location.search).get("product"));

  const { data, error } = await sb.rpc("create_order", { p_product_id: productId });
  if (error || !data || !data.length) {
    info.innerHTML = '<p class="msg">주문서를 만들지 못했어요. 상품 목록에서 다시 선택해 주세요.</p>';
    return;
  }
  const order = data[0];
  info.innerHTML = `
    <div class="summary"><span>상품</span><strong>${escapeHtml(order.product_name)}</strong></div>
    <div class="summary"><span>결제 금액</span><strong>${won(order.amount)}</strong></div>`;

  const widgets = TossPayments(CONFIG.TOSS_CLIENT_KEY).widgets({ customerKey: user.id });
  await widgets.setAmount({ currency: "KRW", value: order.amount });
  await Promise.all([
    widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
    widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
  ]);
  payBtn.disabled = false;

  payBtn.addEventListener("click", async () => {
    msg.textContent = "";
    try {
      await widgets.requestPayment({
        orderId: order.order_id,
        orderName: order.product_name,
        successUrl: new URL("success.html", location.href).href,
        failUrl: new URL("fail.html", location.href).href,
        customerEmail: user.email,
      });
    } catch (err) {
      msg.textContent = err.message || "결제를 시작하지 못했어요.";
    }
  });
})();
