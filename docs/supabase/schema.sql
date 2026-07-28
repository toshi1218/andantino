-- ANDANTINO コンテンツ管理（CMS）用 Supabase スキーマ
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
--    登録されていないメールアドレスでログインしても、記事の保存・公開はできない
--    （閲覧専用にもならず、書き込み操作がすべて拒否される）。
-- 6. Project Settings > API から Project URL と anon public key を控え、
--    .env の SUPABASE_URL / SUPABASE_ANON_KEY に設定する。
--    anon key は「公開されても問題ない」設計のキーで、実際のアクセス制御は
--    このファイルで定義する RLS（行単位セキュリティ）が担う。
--
-- 個人情報の方針:
--   このスキーマは、氏名・住所・病歴などお客様を特定できる情報を保存する
--   前提で設計していない。raw_content・article_content には、匿名化した
--   接客事例・気づきのみを入力すること。

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
-- articles: 記事（接客事例・気づき → 原稿 → 承認 → 公開）
-- ============================================================
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),

  title text not null default '',
  raw_content text not null default '',       -- 洋子さんが入力した原文・メモ
  article_content text not null default '',   -- ホームページ用に整えた本文（HTML可）
  excerpt text not null default '',           -- 一覧・OGP用の要約

  target_audience text,                       -- 例: 子育て中の保護者 / 大人の靴でお悩みの方
  category text not null default 'other'
    check (category in ('children', 'adult', 'foot-problems', 'insoles', 'shoe-wearing', 'seasonal', 'other')),
  tags text[] not null default '{}',

  status text not null default 'idea'
    check (status in ('idea', 'draft', 'review', 'approved', 'published', 'archived')),
  source_type text,                           -- 例: 接客事例 / 気づき / 季節ネタ / その他

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  published_at timestamptz,

  -- 媒体別の投稿文（コピーして手動投稿する。自動投稿はしない）
  note_version text,
  facebook_version text,
  instagram_version text,
  x_version text,
  line_version text,

  seo_title text,
  seo_description text,
  slug text unique,
  featured_image text,
  related_service text,                       -- 例: pricing.html / insoles.html など関連ページ
  call_to_action text,                        -- 例: line / reservation / services / children / insoles

  source_id text unique                       -- ChatGPT履歴取り込み時の会話ID（重複取り込み防止用。手入力の記事はnullのまま）
);

create index if not exists articles_status_idx on articles (status);
create index if not exists articles_category_idx on articles (category);
create index if not exists articles_published_at_idx on articles (published_at desc);
create index if not exists articles_source_id_idx on articles (source_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_set_updated_at on articles;
create trigger articles_set_updated_at
  before update on articles
  for each row execute function set_updated_at();

alter table articles enable row level security;

drop policy if exists "public can read published articles" on articles;
create policy "public can read published articles"
  on articles for select
  to anon
  using (status = 'published');

drop policy if exists "admins can read all articles" on articles;
create policy "admins can read all articles"
  on articles for select
  to authenticated
  using (is_admin());

drop policy if exists "admins can insert articles" on articles;
create policy "admins can insert articles"
  on articles for insert
  to authenticated
  with check (is_admin());

drop policy if exists "admins can update articles" on articles;
create policy "admins can update articles"
  on articles for update
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "admins can delete articles" on articles;
create policy "admins can delete articles"
  on articles for delete
  to authenticated
  using (is_admin());

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
  article_ids uuid[] not null default '{}',   -- このガイドに収録する記事（articles.id）
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
alter table articles add column if not exists source_id text;
create unique index if not exists articles_source_id_key on articles (source_id);
create index if not exists articles_source_id_idx on articles (source_id);

alter table pdf_products add column if not exists version_label text not null default '';
alter table pdf_products add column if not exists article_ids uuid[] not null default '{}';
