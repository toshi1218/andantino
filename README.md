# ANDANTINO

和歌山市の子ども靴・婦人靴専門店「ANDANTINO」の公式サイトです。静的HTMLをそのまま配信し、旧公式サイトの全ページを新しい情報設計へ移植しています。

## ローカル確認

```bash
npm run validate
python3 -m http.server 8000
```

`npm run build` はまず `news.html` のお知らせ欄をmicroCMSから再生成し、次に `assets/supabase-config.js` を環境変数から再生成し、お役立ち記事CMS（Supabase）の公開済み記事を `articles/` 配下と一覧・カテゴリページへ反映し、ページ定義から `sitemap.xml` を生成し、メタ情報、canonical、OGP/Twitter Card、JSON-LD、パンくず、画像、内部リンク、robots、AIクローラー設定、旧URLリダイレクトを監査します。

`npm run build` は**手元で実行するコマンド**です。Cloudflare Pages側のBuild commandは `exit 0` で、デプロイ時には何も実行されません（「Cloudflare Pages」の項を参照）。生成物は手元で作ってコミットします。

制作中は `npm run indexing:staging`、本公開直前は `npm run indexing:live` で、全ページのrobots metaとCloudflare PagesのHTTPヘッダーを一括切替します。現在は制作中のため `noindex,nofollow,nosnippet` を維持しています。

## AI検索・LLMO

- `robots.txt` で OAI-SearchBot、ChatGPT-User、Claude-SearchBot、PerplexityBot などの検索・ユーザー取得クローラーを許可しています。
- `llms.txt` は店舗の公式情報、専門記事、医療との境界を簡潔に案内する補助ファイルです。通常のHTML、robots、sitemap、構造化データの代わりにはしません。
- 専門記事では、担当者の五十嵐洋子、最終更新日、FAQ、医療機関へ相談すべき目安を見える形で示します。

AI検索から流入させるには、本番公開後に `noindex` を解除することが必須です。次の順番を守ります。

1. Cloudflare Pagesへ `www.andantino-shoes.jp` と必要なルートドメインを接続し、新サイトが表示されることを確認する。
2. canonical、OGP、sitemapが本番ドメインを指していることを確認する。
3. `npm run indexing:live` を実行してコミットし、全ページを `index,follow` へ切り替える。
4. 本番のHTTPレスポンスから `X-Robots-Tag: noindex` が消えたことを確認する。
5. Google Search ConsoleとBing Webmaster Toolsへ `sitemap.xml` を送信する。
6. 本番ドメインでキー確認ファイルが表示されることを確認し、`npm run indexnow:submit` で39ページをIndexNowへ通知する。

旧サイトが本番ドメインに残っている間は、Pagesプレビュー側の `noindex` を解除しません。

## お知らせ欄（microCMS）

`news.html` の「最新のお知らせ」は、`scripts/generate-news.mjs` がmicroCMSから記事一覧を取得して静的HTMLへ書き込みます（Cloudflare Pages Functionsは使わず、静的サイトのまま更新できる方式）。

**更新は手元で行い、結果をコミットします。** Cloudflare PagesのBuild commandが `exit 0` のため、デプロイ時に自動生成は走りません。

```bash
npm run news:sync   # microCMSから取得して news.html を書き換える
git add news.html && git commit -m "お知らせを更新" && git push
```

セットアップ手順:

1. [microCMS](https://microcms.io/) でアカウントを作成し、サービスを1つ作成する。
2. API を作成する（エンドポイント名は `news` を推奨。`MICROCMS_NEWS_ENDPOINT` で変更可）。リスト形式、フィールドは以下を推奨:
   - `title`（テキストフィールド、お知らせのタイトル）
   - `body`（リッチエディタ、本文）
   - 公開日時はmicroCMSの標準フィールド `publishedAt` をそのまま使用します。
3. サービスドメイン（`https://<ここ>.microcms.io`の`<ここ>`部分）と、コンテンツ配信用のAPIキー（読み取り専用で十分）を取得する。
4. Cloudflare Pages の Settings → Environment variables で、Production と Preview の両方に以下を設定する。
   - `MICROCMS_SERVICE_DOMAIN`
   - `MICROCMS_API_KEY`
5. `.env.example` を `.env` にコピーして値を設定する（`.env` はコミットしないこと、`.gitignore` 済み）。
6. microCMSの管理画面で記事を公開しても、自動ではサイトへ反映されません。**上記の `npm run news:sync` を実行し、`news.html` の差分をコミット・プッシュするまでが1セットの更新作業です。**

環境変数が未設定のままローカルで実行すると `generate-news.mjs` は警告を出して既存の `news.html` をそのまま残し、コマンド自体は失敗しません。

## お役立ち記事（content/articles/）

記事の元データは、リポジトリ内の `content/articles/*.md` です。外部サービスには保存しません。1ファイル＝1記事で、ファイル名がそのままURLになります。

```
content/articles/shingakki-kodomo-kutsu-check.md
  ↓  npm run build
articles/shingakki-kodomo-kutsu-check.html
  ＋ 一覧ページ6種・sitemap-articles.xml を自動更新
```

### 運用の流れ

洋子さんは、普段どおりChatGPTで記事を書き、そのままChatGPT（Codex）に「この記事をサイトに載せて」と伝えます。Codexが記事ファイルを追加し、`npm run build` を実行して、コミット・プッシュします。Cloudflare Pagesが自動でデプロイするため、**開発担当者の作業は発生しません。**

Codex向けの作業手順は `AGENTS.md` に書かれています。記事の書式、frontmatterの項目、使えるMarkdown記法、触ってはいけない箇所はすべてそちらを参照してください。

手元で記事を追加する場合も同じです。

```bash
# content/articles/ に .md ファイルを置いてから
npm run build
```

### 下書きにする

frontmatter に `draft: true` を書くと生成対象から外れます。公開済みの記事に後から `draft: true` を足して `npm run build` すると、生成済みのHTML・一覧・sitemapから自動的に取り除かれます。

### 安全網

- `npm run build` には `scripts/audit-site.mjs` のサイト監査（78項目）が含まれ、見出し階層の誤り・メタ情報の重複・リンク切れ・sitemapの不整合があると失敗します。
- GitHub Actions（`.github/workflows/validate.yml`）が、push時に同じ監査を実行します。さらに、記事ファイルだけ更新して `npm run build` を忘れた場合も検出します。
- 記事ページのHTML構造・SEOタグ・パンくず・構造化データは、すべて `scripts/generate-articles.mjs` が生成します。記事ファイル側の書き方が多少ぶれても、サイト全体の規約は保たれます。

### 管理画面（Supabase）について

`/admin/` に残っているのは、**オンライン相談の受付設定**と**PDF商品の管理**だけです。記事の追加・編集機能は持っていません。

セットアップ:

1. [Supabase](https://supabase.com) でプロジェクトを作成し、`docs/supabase/schema.sql` の内容をSQL Editorで実行する。
2. Authentication > Providers で Email を有効にし、Authentication > Settings で新規登録を無効にする。
3. Authentication > Users で、洋子さん（および必要な家族）のログインアカウントを作成する。
4. 作成したメールアドレスを `admin_users` テーブルへ登録する（SQL Editorで `insert into admin_users (email) values ('...');`）。
5. Project Settings > API から Project URL と anon public key を取得し、`.env` の `SUPABASE_URL` / `SUPABASE_ANON_KEY` に設定する。
6. `npm run cms:config` を実行し、`assets/supabase-config.js` を生成してコミットする（anon keyは公開されても問題ない設計のキーで、アクセス制御はSupabaseのRLSが担う）。

### オンライン相談・PDF商品の公開設定

管理画面の「設定」タブから、オンライン相談の受付有効/無効・料金・所要時間、PDF商品の販売中/準備中を切り替えられる。コードの編集は不要。

### 効果測定

`analytics_events` テーブルに、記事閲覧・LINEボタンクリック・来店予約ボタンクリック・オンライン相談ページ閲覧・PDF商品ページ閲覧・外部SNSクリックのイベント種別とページパスのみを記録する（`script.js` から送信）。個人を特定できる情報は収集しない。匿名ユーザーは書き込み専用で、自分が送った内容も読み返せない。

## お問い合わせ導線

ご予約・お問い合わせは、公式LINE・電話・メールで受け付けます。送信先を設定していないフォームを公開しない方針です。将来フォームを追加する場合は、送信先・スパム対策・送信完了画面まで設定してから公開してください。

## Cloudflare Pages

- Production branch: `main`
- Build command: `exit 0`（**ビルドは実行しない**。`npm run build` の生成物はすべてコミットして配信する運用）
- Build output directory: `.`（リポジトリ直下をそのまま配信するため、公開してよいファイルだけをルートに置く。`docs/` や `scripts/` などサイトの一部でないものは `_redirects` で塞いでいる）
- Canonical/custom domain: `www.andantino-shoes.jp`
- Preview domain: `andantino.pages.dev`

Cloudflare PagesのGit連携で配信する静的サイトです。サーバー側で動くコードはありません。記事ページを含むすべてのHTMLは、コミット済みの静的ファイルをそのまま配信します。

### 本公開までの手順

現在は全ページ `noindex,nofollow,nosnippet` の状態です（`npm run indexing:staging`）。独自ドメイン `www.andantino-shoes.jp` は旧サイトの制作会社が管理しているため、**ドメインを移管してから公開します。**

サイト内の `<link rel="canonical">` はすべて `https://andantino-shoes.jp/` を指しています。このままプレビュードメイン（`andantino.pages.dev`）をインデックス可にすると、検索エンジンに対して「正式版は別ドメインにある」と宣言することになり、旧サイト側へ評価が渡ります。**プレビュードメインでの先行公開は行いません。**

1. 旧サイトの制作会社に、ドメインの登録者名義・レジストラ・認証コード（AuthCode）の発行可否を確認する。
2. 洋子さん名義のレジストラ口座を用意し、ドメインを移管する（DNSの向き先変更だけでは、ドメインの主導権が相手に残ります）。
3. Cloudflareにドメインを接続する。
4. `npm run indexing:live` を実行し、差分をコミット・プッシュする（全ページとCloudflareのHTTPヘッダーのrobots設定が一括で切り替わります）。
5. Google Search Consoleに登録し、`sitemap.xml` を送信する。
6. 旧サイトのURLからの301リダイレクトを確認する（「旧サイト移行」の表を参照）。

## 旧サイト移行

| 旧URL | 新URL |
|---|---|
| `/index.php` | `/` |
| `/about.php` | `/about.html`、`/owner.html`、`/links.html` |
| `/selection.php` | `/adult-shoes.html` |
| `/childrenshoes.php` | `/childrens-shoes.html` |
| `/product.php` | `/products.html` |
| `/insole.php` | `/insoles.html`、`/pricing.html` |
| `/seminar.php` | `/seminars.html` |
| `/contact.php` | `/contact.html`、`/privacy.html`、`/legal.html` |

旧URLから代表ページへの301は `_redirects` で維持します。公開後はSearch Consoleへ `sitemap.xml` を送信し、本番で301・robots・sitemap・構造化データを確認してください。

旧公式サイトから再利用した人物・商品・セミナー写真の移行元は `docs/ASSET_SOURCES.md` に記録しています。

五十嵐洋子本人の旧公式サイト・公式ブログをもとにした理念、文体、医療表現の編集基準は `docs/VOICE_GUIDE.md` に記録しています。

## 制作用ドキュメント

**`docs/SITE_PLAYBOOK.md`** は、静的サイトの構築・運営を通じて得た知見をまとめた運用の教科書です。変更の危険度分類（Lv1〜4）、爆発半径の考え方、デプロイ前チェック、事故対応の手順が書かれています。**サイトに手を入れる前に、まずこれを読んでください。** `AGENTS.md`（AIエージェント向けの手順書）も、この分類に沿っています。

サイト運用ルール、監査記録、企画資料などは `docs/` にまとめています。`_redirects` で `/docs/*` を塞いでいるため、サイトの一部としては配信されません。新しい資料は必ず `docs/` に置いてください（ルート直下は `Build output directory: .` によりそのまま公開されます）。
