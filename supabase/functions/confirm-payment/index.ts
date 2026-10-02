// 결제 확정: 토스 결제 성공 후 브라우저가 호출. 금액을 DB 주문과 대조한 뒤 토스 승인 API 호출.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 누가 요청했는지 확인
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return json({ message: "로그인이 필요해요." }, 401);

  const { paymentKey, orderId, amount } = await req.json();

  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order || order.user_id !== user.id) return json({ message: "주문을 찾을 수 없어요." }, 404);
  if (order.status === "paid") return json({ message: "이미 결제가 완료된 주문이에요.", order });
  if (order.status !== "pending") return json({ message: "결제할 수 없는 주문이에요." }, 400);
  if (Number(amount) !== order.amount) return json({ message: "결제 금액이 주문 금액과 달라요." }, 400);

  const secretKey = Deno.env.get("TOSS_SECRET_KEY")!;
  const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(secretKey + ":"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount: order.amount }),
  });
  const toss = await tossRes.json();

  if (!tossRes.ok) {
    await admin.from("orders").update({ status: "failed" }).eq("id", orderId);
    return json({ message: toss.message ?? "결제 승인에 실패했어요." }, 400);
  }

  const { data: paid } = await admin
    .from("orders")
    .update({ status: "paid", payment_key: paymentKey, method: toss.method, paid_at: toss.approvedAt })
    .eq("id", orderId)
    .select()
    .single();

  return json({ message: "결제가 완료됐어요.", order: paid });
});
