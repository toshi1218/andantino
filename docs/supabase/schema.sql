-- ANDANTINO 管理画面用 Supabase スキーマ
--
-- 記事はこのデータベースでは管理しない。記事の元データは
-- リポジトリ内の content/articles/*.md で、ChatGPT(Codex)が直接更新する（AGENTS.md参照）。
-- ここで扱うのは、オンライン相談の受付設定・PDF商品・アクセス計測の3つ。
--
-- 使い方:
-- 1. https://supabase.com で新規プロジェクトを作成する（無料枠で開始できる）。
-- 2. プロジェクトの SQL Editor を開き、このファイルの内容をそのまま実行する。
-- 3. Authentication > Providers で Email を有効にし、
--    Authentication > Settings で「Allow new users to sign up」を無効にする
--    （管理画面を使う本人だけがログインできるようにするため）。
-- 4. Authentication > Users で洋子さん（および必要な家族）のアカウントを
--    管理者自身が作成する（メールアドレス＋パスワード）。
-- 5. 作成したメールアドレスを、下の admin_users テーブルへ登録する。
--    例: insert into admin_users (email) values ('yoko@example.com');
--    登録されていないメールアドレスでログインしても、設定の保存はできない
--    （閲覧専用にもならず、書き込み操作がすべて拒否される）。
-- 6. Project Settings > API から Project URL と anon public key を控え、
--    .env の SUPABASE_URL / SUPABASE_ANON_KEY に設定する。
--    anon key は「公開されても問題ない」設計のキーで、実際のアクセス制御は
--    このファイルで定義する RLS（行単位セキュリティ）が担う。
--
-- 個人情報の方針:
--   このスキーマは、氏名・住所・病歴などお客様を特定できる情報を保存する
--   前提で設計していない。将来、顧客管理を行う場合は別テーブルとして設計し、
--   アクセス制御と保管期間を改めて定めること。

create extension if not exists pgcrypto;

-- ============================================================
-- 管理者アカウントの許可リスト
-- ============================================================
-- Supabase Auth 自体にアカウントがあっても、このテーブルに
-- メールアドレスが登録されていない限り、管理画面からの書き込みはできない。
create table if not exists admin_users (
  email text primary key
);

alter table admin_users enable row level security;
-- admin_users 自体は誰からも直接参照・変更できない（SQL Editorから管理する）。

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users
    where email = (auth.jwt() ->> 'email')
  );
$$;

-- ============================================================
-- site_settings: オンライン相談の公開/非公開・料金など（1行のみ）
-- ============================================================
create table if not exists site_settings (
  id smallint primary key default 1 check (id = 1),
  online_consultation_enabled boolean not null default false,
  online_consultation_price text not null default '8,800円（税込・30分）',
  online_consultation_duration_minutes int not null default 30,
  online_consultation_note text not null default '',
  updated_at timestamptz not null default now()
);

insert into site_settings (id) values (1)
  on conflict (id) do nothing;

drop trigger if exists site_settings_set_updated_at on site_settings;
create trigger site_settings_set_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

alter table site_settings enable row level security;

drop policy if exists "public can read site settings" on site_settings;
create policy "public can read site settings"
  on site_settings for select
  to anon
  using (true);

drop policy if exists "admins can update site settings" on site_settings;
create policy "admins can update site settings"
  on site_settings for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- pdf_products: 将来のPDF商品（決済は未実装、土台のみ）
-- ============================================================
create table if not exists pdf_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price text not null default '',
  sample_image text,
  status text not null default 'preparing' check (status in ('selling', 'preparing')),
  line_message text not null default '',      -- LINEで問い合わせる際の定型文
  payment_url text,                           -- 将来、決済サービスのリンクを設定する欄
  display_order int not null default 0,
  version_label text not null default '',     -- 例: 2026年7月版 / v1.0（更新のたびに変える）
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists pdf_products_set_updated_at on pdf_products;
create trigger pdf_products_set_updated_at
  before update on pdf_products
  for each row execute function set_updated_at();

alter table pdf_products enable row level security;

drop policy if exists "public can read pdf products" on pdf_products;
create policy "public can read pdf products"
  on pdf_products for select
  to anon
  using (true);

drop policy if exists "admins can write pdf products" on pdf_products;
create policy "admins can write pdf products"
  on pdf_products for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- analytics_events: 最低限の行動計測（個人情報を含めない）
-- ============================================================
create table if not exists analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null
    check (event_type in ('page_view', 'article_view', 'line_click', 'reservation_click', 'consultation_view', 'pdf_view', 'sns_click')),
  page_path text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx on analytics_events (created_at desc);

alter table analytics_events enable row level security;

drop policy if exists "anyone can record an event" on analytics_events;
create policy "anyone can record an event"
  on analytics_events for insert
  to anon
  with check (true);

drop policy if exists "admins can read events" on analytics_events;
create policy "admins can read events"
  on analytics_events for select
  to authenticated
  using (is_admin());

-- anon には select/update/delete のポリシーを一切与えないため、
-- 匿名ユーザーは書き込み専用（自分の投稿した行すら読み返せない）。

-- ============================================================
-- 追加マイグレーション（このファイルを最初に実行した後に追加された変更）
-- 新規セットアップでは上のcreate tableに含まれているため実質何もしない。
-- 既に一度schema.sqlを実行済みのプロジェクトでは、このブロックだけを
-- 追加でSQL Editorに貼り付けて実行すれば最新の状態になる。
-- ============================================================
alter table pdf_products add column if not exists version_label text not null default '';

-- 記事はSupabaseで管理しなくなったため（content/articles/*.md へ移行）、
-- articles テーブルと pdf_products.article_ids は使われていない。
-- 以前のバージョンをセットアップ済みで、中身を残す必要がなければ、
-- 次の2行を実行して削除できる（実行は任意。消すと元に戻せない）。
--   drop table if exists articles;
--   alter table pdf_products drop column if exists article_ids;
