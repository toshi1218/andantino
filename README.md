# ANDANTINO

和歌山市の子ども靴・婦人靴専門店「ANDANTINO」の公式サイトです。静的HTMLをそのまま配信し、旧公式サイトの全ページを新しい情報設計へ移植しています。

## ローカル確認

```bash
npm run validate
python3 -m http.server 8000
```

`npm run build` はまず `news.html` のお知らせ欄をmicroCMSから再生成し、次に39ページ分の `sitemap.xml` をページ定義から生成し、メタ情報、canonical、OGP/Twitter Card、JSON-LD、パンくず、画像、内部リンク、robots、AIクローラー設定、旧URLリダイレクトを監査します。

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

## お問い合わせ導線

ご予約・お問い合わせは、公式LINE・電話・メールで受け付けます。送信先を設定していないフォームを公開しない方針です。将来フォームを追加する場合は、送信先・スパム対策・送信完了画面まで設定してから公開してください。

## Cloudflare Pages

- Production branch: `main`
- Build command: `exit 0`（**ビルドは実行しない**。`npm run build` 等の生成物はすべて手元で作りコミットする運用）
- Build output directory: `.`（リポジトリ直下をそのまま配信するため、公開してよいファイルだけをルートに置く。`docs/` や `scripts/` などサイトの一部でないものは `_redirects` で塞いでいる）
- Canonical/custom domain: `www.andantino-shoes.jp`
- Preview domain: `andantino.pages.dev`

Cloudflare PagesのGit連携で配信する、Functionsを使用しない静的サイトです。そのため `wrangler.toml` は意図的に置いていません。将来Functions等を導入してWrangler設定を正本にする場合は、既存ダッシュボード設定を上書きしないよう `npx wrangler pages download config` から開始してください。

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
