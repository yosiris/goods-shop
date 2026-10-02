// 결제 실패/취소 안내
const reason = new URLSearchParams(location.search).get("message");
document.getElementById("reason").textContent = reason || "결제가 취소되었거나 실패했어요.";
