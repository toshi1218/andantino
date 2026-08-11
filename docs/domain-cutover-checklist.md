# andantino-shoes.jp 本番切替チェックリスト

## 現在地

- 汎用JPドメイン `andantino-shoes.jp` のValue-Domain移管は完了。
- 新サイトはCloudflare Pagesでステージング中。
- 本番切替までは `noindex,nofollow,nosnippet` と `X-Robots-Tag` を維持する。
- 旧ファイズ制作サイトの主要PHP URLは `_redirects` に301対応済み。

## 本番切替前

1. `npm run validate` を成功させる。
2. PageSpeed、スマホ表示、主要リンク、LINE、電話、問い合わせフォームを確認する。
3. `_redirects` の旧URL対応表を確認する。
4. Cloudflare Pagesに `andantino-shoes.jp` と採用する正規ホスト（`www`を使う場合は `www.andantino-shoes.jp`）をCustom Domainとして追加する。
5. Cloudflareが案内するDNS/ネームサーバー設定を確認する。旧サイトが稼働中の間は切り替えない。

## 切替当日

1. Value-Domain側でCloudflareの指定ネームサーバーへ変更する。
2. Cloudflare側でSSLがActiveになり、トップページと主要ページがHTTPSで表示されることを確認する。
3. 以下の旧URLが301で正しい新URLへ移動することを確認する。
   - `/index.php` → `/`
   - `/index.html` → `/`
   - `/about.php` → `/about.html`
   - `/selection.php` → `/adult-shoes.html`
   - `/childrenshoes.php` → `/childrens-shoes.html`
   - `/product.php` → `/products.html`
   - `/insole.php` → `/insoles.html`
   - `/seminar.php` → `/seminars.html`
   - `/contact.php` → `/contact.html`
   - `/dimoco-insole.html` → `/dymoco-insole.html`
4. 404、リダイレクトループ、HTTP→HTTPS、www/非wwwの統一を確認する。
5. 本番表示に問題がないことを確認してから `npm run indexing:live` を実行する。
6. `npm run validate` を再実行し、変更をコミットしてCloudflareへ再デプロイする。
7. 本番レスポンスから `X-Robots-Tag: noindex` が消えていること、HTMLのrobots metaが `index,follow` になっていることを確認する。
8. `sitemap.xml` とcanonicalが `https://www.andantino-shoes.jp` の正規URLを指していることを確認する。

## 公開後

1. Google Search Consoleでドメイン所有権を確認し、`sitemap.xml` を送信する。
2. トップ、子ども靴、大人靴、インソール、料金、問い合わせ等の主要URLをURL検査する。
3. 旧PHP URLを数件再確認し、301が維持されていることを確認する。
4. 404やクロールエラーをSearch Consoleで監視する。

## 旧Jimdoサイト

旧Jimdoサイトは、先に削除しない。

1. 公開URLを一覧化する。
2. Jimdo側で外部URLへの301が利用できる場合は、内容が最も近い新サイトURLへ個別転送する。
3. 外部301が利用できない場合は、各ページに公式サイト移転案内と `https://www.andantino-shoes.jp/` への明確なリンクを掲載する。
4. 検索結果・被リンク・アクセスの移行を確認した後に非公開または削除する。

JimdoのURLはCloudflare側の `_redirects` では制御できないため、Jimdo管理画面側での作業が必要。

## ロールバック

DNS切替後に重大な不具合が出た場合は、Value-Domainのネームサーバーを切替前の値へ戻す。そのため、切替前のネームサーバー値はスクリーンショット等で必ず保存する。
