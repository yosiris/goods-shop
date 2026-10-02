// 상품 목록
(async () => {
  const box = document.getElementById("products");
  const { data, error } = await sb.from("products").select("*").order("id");
  if (error) {
    box.innerHTML = '<p class="msg">상품을 불러오지 못했어요.</p>';
    return;
  }
  box.innerHTML = data
    .map(
      (p) => `
      <div class="card">
        <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" />
        <div class="card-body">
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.description)}</p>
          <div class="price">${won(p.price)}</div>
          <a class="btn" href="checkout.html?product=${p.id}">구매하기</a>
        </div>
      </div>`
    )
    .join("");
})();
