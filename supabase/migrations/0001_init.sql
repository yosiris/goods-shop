-- 굿즈샵 DB 구조: 상품, 회원 프로필, 주문

-- 상품
create table public.products (
  id bigint generated always as identity primary key,
  name text not null,
  description text not null default '',
  price integer not null check (price > 0),
  image_url text not null default '',
  created_at timestamptz not null default now()
);

-- 회원 프로필 (auth.users 와 1:1)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- 주문 (id 를 토스 orderId 로 사용)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  product_id bigint not null references public.products(id),
  product_name text not null,
  amount integer not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  payment_key text,
  method text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index orders_user_id_idx on public.orders(user_id);

-- 가입하면 프로필 자동 생성
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 지금 로그인한 사람이 관리자인지
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- 주문서 만들기: 가격은 반드시 DB 의 상품 가격을 사용
create function public.create_order(p_product_id bigint)
returns table (order_id uuid, amount integer, product_name text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_product public.products;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;
  select * into v_product from public.products where id = p_product_id;
  if not found then
    raise exception 'product not found';
  end if;
  select email into v_email from public.profiles where id = auth.uid();

  return query
  insert into public.orders (user_id, user_email, product_id, product_name, amount)
  values (auth.uid(), v_email, v_product.id, v_product.name, v_product.price)
  returning orders.id, orders.amount, orders.product_name;
end;
$$;
revoke execute on function public.create_order(bigint) from public, anon;
grant execute on function public.create_order(bigint) to authenticated;

-- 접근 규칙 (RLS)
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;

create policy "누구나 상품 조회" on public.products
  for select using (true);

create policy "본인 프로필 조회" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "본인 주문 또는 관리자 조회" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- 주문 생성/수정 정책은 일부러 없음: create_order 함수와 Edge Function(service role)만 가능

-- 예시 상품
insert into public.products (name, description, price, image_url) values
  ('로고 스티커 세트', '노트북, 다이어리에 붙이기 좋은 방수 스티커 5종', 3000, 'https://picsum.photos/seed/sticker/400/300'),
  ('머그컵', '매일 쓰기 좋은 350ml 세라믹 머그컵', 12000, 'https://picsum.photos/seed/mug/400/300'),
  ('티셔츠', '부드러운 면 100% 반팔 티셔츠', 25000, 'https://picsum.photos/seed/tshirt/400/300'),
  ('아크릴 키링', '가방에 달기 좋은 양면 아크릴 키링', 6000, 'https://picsum.photos/seed/keyring/400/300'),
  ('에코백', '튼튼한 캔버스 소재의 데일리 에코백', 15000, 'https://picsum.photos/seed/ecobag/400/300');
