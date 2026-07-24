# ANDANTINO

和歌山市の子ども靴・婦人靴専門店「ANDANTINO」の公式サイトです。静的HTMLをそのまま配信し、旧公式サイトの全ページを新しい情報設計へ移植しています。

## ローカル確認

```bash
npm run validate
python3 -m http.server 8000
```

`npm run build` はまず `news.html` のお知らせ欄をmicroCMSから再生成し、次に23ページ分の `sitemap.xml` をページ定義から生成し、メタ情報、canonical、OGP/Twitter Card、JSON-LD、パンくず、画像、内部リンク、robots、旧URLリダイレクトを監査します。

制作中は `npm run indexing:staging`、本公開直前は `npm run indexing:live` で、全ページのrobots metaとCloudflare PagesのHTTPヘッダーを一括切替します。現在は制作中のため `noindex,nofollow,nosnippet` を維持しています。

## お知らせ欄（microCMS）

`news.html` の「最新のお知らせ」は、ビルド時に `scripts/generate-news.mjs` がmicroCMSから記事一覧を取得して静的HTMLへ書き込みます（Cloudflare Pages Functionsは使わず、静的サイトのまま更新できる方式）。

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
5. ローカルで確認する場合は `.env.example` を `.env` にコピーして値を設定し、`npm run news:sync` を実行する（`.env` はコミットしないこと、`.gitignore` 済み）。
6. microCMSの管理画面で記事を公開してもすぐにはサイトへ反映されません（Functionsを使わない静的生成のため）。microCMSの「Webhook」設定からCloudflare PagesのDeploy Hook URLを登録しておくと、記事の公開・更新のたびに自動で再ビルド・再デプロイされます。

環境変数が未設定のままビルドすると `generate-news.mjs` は警告を出して既存の `news.html` をそのまま残し、ビルド自体は失敗しません。

## お問い合わせフォーム（Web3Forms）

`contact.html` のフォームは [Web3Forms](https://web3forms.com/) を使っています。バックエンド不要で、フォームのHTML自体はサイトのデザインをそのまま使えます。

1. Web3Formsのサイトでメールアドレスを送信し、届いたアクセスキーを取得する。
2. `contact.html` 内の `<input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY">` を実際のアクセスキーに差し替える。

## Cloudflare Pages

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `.`
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

旧公式サイトから再利用した人物・商品・セミナー写真の移行元は `ASSET_SOURCES.md` に記録しています。

五十嵐洋子本人の旧公式サイト・公式ブログをもとにした理念、文体、医療表現の編集基準は `VOICE_GUIDE.md` に記録しています。
