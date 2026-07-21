# ANDANTINO

和歌山市の子ども靴・婦人靴専門店「ANDANTINO」の公式サイトです。静的HTMLをそのまま配信し、旧公式サイトの全ページを新しい情報設計へ移植しています。

## ローカル確認

```bash
npm run validate
python3 -m http.server 8000
```

`npm run build` は20ページ分の `sitemap.xml` をページ定義から生成し、メタ情報、canonical、OGP/Twitter Card、JSON-LD、パンくず、画像、内部リンク、robots、旧URLリダイレクトを監査します。

制作中は `npm run indexing:staging`、本公開直前は `npm run indexing:live` で、全ページのrobots metaとCloudflare PagesのHTTPヘッダーを一括切替します。現在は制作中のため `noindex,nofollow,nosnippet` を維持しています。

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
