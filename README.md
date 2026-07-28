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

## お役立ち記事CMS・管理画面（Supabase）

洋子さんが接客での気づきを入力し、内容を確認・承認した記事だけをサイトに公開する仕組みです。**承認なしの自動公開・自動SNS投稿はありません。**

運用の流れ（1回あたり5〜10分想定）:

1. 洋子さんが管理画面（`/admin/`）にログインし、「＋ 新しい記事」から出来事・気づきを入力する（`idea` → `draft`）。
2. 「AIで下書きを作る／テンプレートを表示」を押すと、本文案とnote・Facebook・Instagram・X・公式LINE用の文章案が入る（AI未設定の環境では、媒体別テンプレートが自動的に表示される）。
3. 洋子さんが内容を読み、必要な箇所を書き直す。
4. 「確認待ちにする」→「承認する」→「公開する」の順にボタンを押す（`review` → `approved` → `published`）。公開にはSEO設定欄の「URL」入力が必要。
5. 開発担当者が `npm run articles:sync` を実行し、生成された記事ページ・一覧ページの差分をコミット・プッシュする（`news:sync` と同じ「手元で生成してコミット」方式）。

各媒体の投稿文は、テキストエリア横の「コピー」ボタンでコピーし、各サービスへ手動で貼り付けます。自動投稿機能はありません。

### セットアップ

1. [Supabase](https://supabase.com) でプロジェクトを作成し、`docs/supabase/schema.sql` の内容をSQL Editorで実行する（テーブル・RLSポリシーが一括で作成される）。
2. Authentication > Providers で Email を有効にし、Authentication > Settings で新規登録を無効にする。
3. Authentication > Users で、洋子さん（および必要な家族）のログインアカウントを作成する。
4. 作成したメールアドレスを `admin_users` テーブルへ登録する（SQL Editorで `insert into admin_users (email) values ('...');`）。ここに登録されていないアカウントは、ログインできても記事の保存・公開はできない。
5. Project Settings > API から Project URL と anon public key を取得し、`.env` の `SUPABASE_URL` / `SUPABASE_ANON_KEY` に設定する。Cloudflare Pages側にも同じ値を Production / Preview 両方の環境変数として設定する（`npm run build` を実行するローカル環境用）。
6. `npm run cms:config` を実行し、`assets/supabase-config.js` を生成してコミットする（anon keyは公開されても問題ない設計のキーで、実際のアクセス制御はSupabaseのRLSが担う）。

管理画面は `https://<公開ドメイン>/admin/` からアクセスする。ログインには、手順3で作成したメールアドレス・パスワードを使う。

### AIによる下書き作成（任意）

Cloudflare Pages Functions（`functions/api/generate.js`）を使い、AIプロバイダの秘密鍵はサーバー側の環境変数にのみ置く。Cloudflare Pagesダッシュボードの Settings > Environment variables で以下を設定すると有効になる（未設定なら管理画面は自動的にテンプレート表示に切り替わる）。

- `AI_PROVIDER`（`anthropic` または `openai`）
- `AI_API_KEY`
- `AI_MODEL`（省略可）

### ChatGPT履歴の取り込み

洋子さんが普段使っているChatGPTの使い方は一切変えず、記事のアイデア出しの負担だけを減らすための機能。

1. ChatGPT（chatgpt.com）の「設定 → データ管理 → データのエクスポート」から、会話履歴一式（.zip）をダウンロードする（メールで届く）。
2. 管理画面の「ChatGPT履歴の取り込み」タブを開き、そのzipファイルをそのままアップロードして「ファイルを読み込む」を押す。
3. 会話の一覧（タイトル・日付・内容の一部）がチェックボックス付きで表示されるので、記事の元にしたいものだけ選ぶ。
4. 「選択した会話を取り込む」を押すと、選んだものが `status: idea` の記事候補としてSupabaseへ保存される。

ファイルの解析はすべてブラウザ内で行われ、サーバーやコマンド実行は不要。取り込みは会話ごとのID（`source_id`）で重複防止されるため、同じエクスポートファイルを何度アップロードしても二重に登録されない。取り込んだだけでは記事は完成しないため、通常の記事編集と同じく「記事」タブから内容を確認・編集し、承認・公開のフローに乗せる。

### オンライン相談・PDF商品の公開設定

管理画面の「設定」タブから、オンライン相談の受付有効/無効・料金・所要時間、PDF商品の販売中/準備中を切り替えられる。コードの編集は不要。

### 効果測定

`analytics_events` テーブルに、記事閲覧・LINEボタンクリック・来店予約ボタンクリック・オンライン相談ページ閲覧・PDF商品ページ閲覧・外部SNSクリックのイベント種別とページパスのみを記録する（`script.js` から送信）。個人を特定できる情報は収集しない。匿名ユーザーは書き込み専用で、自分が送った内容も読み返せない。

## お問い合わせ導線

ご予約・お問い合わせは、公式LINE・電話・メールで受け付けます。送信先を設定していないフォームを公開しない方針です。将来フォームを追加する場合は、送信先・スパム対策・送信完了画面まで設定してから公開してください。

## Cloudflare Pages

- Production branch: `main`
- Build command: `exit 0`（**ビルドは実行しない**。`npm run build` 等の生成物はすべて手元で作りコミットする運用）
- Build output directory: `.`（リポジトリ直下をそのまま配信するため、公開してよいファイルだけをルートに置く。`docs/` や `scripts/` などサイトの一部でないものは `_redirects` で塞いでいる）
- Canonical/custom domain: `www.andantino-shoes.jp`
- Preview domain: `andantino.pages.dev`

Cloudflare PagesのGit連携で配信する静的サイトです。`functions/api/generate.js` のみ、管理画面のAI下書き作成用にCloudflare Pages Functionsを使用します（ファイルベースルーティングのため `wrangler.toml` は不要）。これ以外のページ・導線はすべて静的HTMLで、デプロイ時のビルドは行いません。`AI_API_KEY` を設定しない限りこの関数は `{ configured: false }` を返すだけで、サイトの他の部分には影響しません。

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

サイト運用ルール、監査記録、企画資料などは `docs/` にまとめています。`_redirects` で `/docs/*` を塞いでいるため、サイトの一部としては配信されません。新しい資料は必ず `docs/` に置いてください（ルート直下は `Build output directory: .` によりそのまま公開されます）。
