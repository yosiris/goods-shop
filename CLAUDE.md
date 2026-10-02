# CLAUDE.md

## 프로젝트 핵심: 굿즈샵 (goods-shop)

굿즈를 파는 작은 쇼핑몰. 사용자는 코딩 입문자이므로 설명은 쉬운 한국어로 한다.
세부 구조(결제 흐름, DB, 페이지별 역할)는 **[ARCH.md](ARCH.md)** 참고.

- **사이트 주소**: https://yosiris.github.io/goods-shop/
- **GitHub 저장소**: https://github.com/yosiris/goods-shop (public, `main` 브랜치 루트를 GitHub Pages로 배포)
- **Supabase 프로젝트**: `goods-shop` (ref `dcndxktswkpnliyrrpna`, 서울 리전)

### 기술 구성
- 프론트: 순수 HTML/CSS/JS (빌드 없음). 라이브러리는 CDN: `@supabase/supabase-js@2`, 토스 SDK `js.tosspayments.com/v2/standard`
- 백엔드: Supabase (Auth + Postgres + RLS + Edge Function `confirm-payment`)
- 결제: 토스페이먼츠 결제위젯 **테스트 모드** (토스 문서용 공개 테스트 키)

### 페이지
회원가입 `signup.html` · 로그인 `login.html` · 상품 `index.html` → 결제 `checkout.html` → `success.html` / `fail.html` · 내 결제 내역 `orders.html` · 관리자 `admin.html`

### 배포 방법
- 웹페이지: `git push` 하면 GitHub Pages가 자동 반영 (1~2분)
- DB 변경: `supabase/migrations/`에 새 SQL 파일 추가 → Management API `database/query`로 적용
- Edge Function: `supabase functions deploy confirm-payment --project-ref dcndxktswkpnliyrrpna --use-api`
- CLI 위치: Supabase `%LOCALAPPDATA%\supabase-cli\supabase.exe`, GitHub `C:\Program Files\GitHub CLI\gh.exe`

### 꼭 지킬 규칙
1. **비밀값은 저장소에 절대 넣지 않는다.** (토스 시크릿키, service_role 키, DB 비밀번호, 관리자 비밀번호) 저장소가 public이다. 웹페이지(`js/config.js`)에는 공개 키(anon 키, 토스 클라이언트 키)만 둔다.
2. **가격은 항상 DB 기준.** 주문은 `create_order()` DB 함수로만 만들고, 결제 확정은 Edge Function이 주문 금액과 대조한 뒤 토스 승인 API를 호출한다.
3. **데이터 보호는 RLS가 담당.** 화면에서 숨기는 것만으로 막았다고 생각하지 않는다. 관리자 판별은 `profiles.is_admin` / `is_admin()`.
4. **Supabase 이메일 인증은 꺼둔다** (`mailer_autoconfirm = true`). 가입 즉시 로그인.
5. 관리자 계정은 `admin@admin.com` (비밀번호는 사용자가 알고 있음, 문서에 적지 않음).

---

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
