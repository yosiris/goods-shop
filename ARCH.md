# ARCH.md — 굿즈샵 세부 구조

## 1. 전체 그림

```
[브라우저: GitHub Pages 의 HTML/JS]
   │ ① 회원가입/로그인, 상품·주문 조회 ────────► Supabase Auth / DB (RLS 로 보호)
   │ ② 주문서 만들기 rpc('create_order') ──────► DB 함수: DB 가격으로 pending 주문 생성
   │ ③ 결제창 (requestPayment) ────────────────► 토스페이먼츠 (테스트)
   │ ④ success.html 로 돌아옴 (paymentKey, orderId, amount)
   │ ⑤ functions.invoke('confirm-payment') ────► Edge Function
   │                                              ├ 로그인 사용자 = 주문 주인? pending? 금액 일치?
   │                                              ├ 토스 POST /v1/payments/confirm (시크릿키)
   │                                              └ 주문 status → paid / failed
```

## 2. 폴더 구조

```
index.html / login.html / signup.html / checkout.html
success.html / fail.html / orders.html / admin.html
css/style.css                 공통 디자인
js/config.js                  공개 설정값 (Supabase URL, anon 키, 토스 클라이언트 키)
js/common.js                  Supabase 클라이언트(sb), 상단 메뉴, requireLogin, isAdmin, 표시 도우미
js/<페이지>.js                 페이지별 동작
supabase/migrations/0001_init.sql        테이블, RLS, 함수, 예시 상품
supabase/functions/confirm-payment/index.ts   결제 확정 서버
```

각 HTML 은 같은 레이아웃(헤더 + `#nav` + `main`)이고, 스크립트 순서는
`supabase-js CDN → (토스 SDK) → config.js → common.js → 페이지.js`.
GitHub Pages 주소에 `/goods-shop/` 가 붙으므로 링크는 모두 **상대경로**.

## 3. 페이지별 역할

| 페이지 | 로그인 필요 | 하는 일 |
|---|---|---|
| `index.html` | X | `products` 조회 → 카드 목록, "구매하기" → `checkout.html?product=<id>` |
| `signup.html` | X | `auth.signUp` (이메일 인증 없음 → 즉시 로그인) |
| `login.html` | X | `auth.signInWithPassword`, `?next=` 로 원래 페이지 복귀 (사이트 내부 .html 만 허용) |
| `checkout.html` | O | `create_order` 호출 → 토스 위젯 렌더 → `requestPayment` (orderId = 주문 uuid) |
| `success.html` | O | `confirm-payment` 호출 → 결과 표시 |
| `fail.html` | X | 토스가 넘겨준 `message` 표시 |
| `orders.html` | O | 내 주문 목록 |
| `admin.html` | O + 관리자 | 전체 주문 + 요약(건수/매출). 관리자가 아니면 안내만 표시 |

관리자는 별도 로그인 화면 없이 `login.html` 사용. 관리자면 메뉴에 "관리자" 링크가 나타남.

## 4. 데이터베이스 (`supabase/migrations/0001_init.sql`)

| 테이블 | 주요 컬럼 | RLS |
|---|---|---|
| `products` | id, name, description, price, image_url | 누구나 조회 |
| `profiles` | id(=auth.users.id), email, is_admin | 본인만 조회 |
| `orders` | id(uuid=토스 orderId), user_id, user_email, product_id, product_name, amount, status, payment_key, method, created_at, paid_at | 본인 또는 관리자만 조회 |

- `orders` / `profiles` 에는 **INSERT/UPDATE 정책이 없음** → 브라우저에서 직접 수정 불가.
- `handle_new_user()` 트리거: 가입 시 `profiles` 자동 생성.
- `is_admin()`: 현재 사용자의 `profiles.is_admin` 반환 (RLS 에서 사용).
- `create_order(p_product_id)`: 로그인 사용자만 실행 가능. DB 가격으로 `pending` 주문 생성 후 `(order_id, amount, product_name)` 반환.
- 주문 상태: `pending`(주문서 생성) → `paid`(승인 성공) / `failed`(승인 실패).

## 5. Edge Function `confirm-payment`

- 요청: `POST { paymentKey, orderId, amount }` + 로그인 토큰
- 검사: 토큰 사용자 확인 → 주문 존재 & 본인 소유 → `pending` 인지 (`paid` 면 그대로 성공 응답) → `amount == orders.amount`
- 토스 승인: `POST https://api.tosspayments.com/v1/payments/confirm`, `Authorization: Basic base64(시크릿키 + ":")`
- 성공: `status=paid, payment_key, method, paid_at` 저장 / 실패: `status=failed`
- 환경변수: `TOSS_SECRET_KEY` (`supabase secrets set` 으로 저장), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (자동 제공)

## 6. 설정값 위치

| 값 | 위치 | 공개 여부 |
|---|---|---|
| Supabase URL, anon 키 | `js/config.js` | 공개 OK |
| 토스 클라이언트 키 `test_gck_docs_...` | `js/config.js` | 공개 OK |
| 토스 시크릿 키 | Supabase secrets `TOSS_SECRET_KEY` | **비공개** |
| service_role 키 | Supabase 대시보드 / Edge Function 환경 | **비공개** |
| DB 비밀번호 | 로컬 `%USERPROFILE%\.goods-shop-secrets\` | **비공개** |
| 이메일 인증 OFF, site_url | Supabase Auth 설정 (Management API `config/auth`) | - |

## 7. 실제 결제로 바꾸려면 (나중에)
토스 개발자센터에서 받은 **라이브 키**로 `js/config.js` 의 클라이언트 키와 `TOSS_SECRET_KEY` 를 교체. 사업자 등록 및 토스 계약이 필요.
