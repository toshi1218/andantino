# ANDANTINO 本公開チェックリスト

ドメイン移管の完了後、新サイトを本番公開するまでの手順です。
**順番が重要です。** 特に「noindexの解除」は独自ドメインで正常表示を確認したあとに行います。
先に解除すると、まだ本番で開けないURLをGoogleがインデックスしようとします。

旧URL→新URLの対応表とその根拠は `docs/URL_MIGRATION_MAP.md` にあります。

---

## 手順の全体像

| 段階 | 内容 | この時点のnoindex |
|---|---|---|
| 1 | ドメイン移管の完了確認 | noindexのまま |
| 2 | 新サイトの最終確認（表示・導線・PageSpeed） | noindexのまま |
| 3 | 301の実装と確認 | noindexのまま |
| 4 | Cloudflare Pagesへ独自ドメインを追加 | noindexのまま |
| 5 | DNS（ネームサーバー）をCloudflareへ切替 | noindexのまま |
| 6 | 本番ドメインでの動作確認 | noindexのまま |
| 7 | **noindexを解除** | ここで解除 |
| 8 | Search Console・Bing・IndexNow | 解除済み |
| 9 | 外部サービスのURL更新、旧サイトの整理 | 解除済み |

---

## 1. ドメイン移管の完了確認

- [ ] `andantino-shoes.jp` がValue-Domainの五十嵐洋子名義アカウントに表示される
- [ ] 現在のネームサーバーが旧制作会社のものであることを確認した（**この段階ではまだ変更しません**）
- [ ] 旧サイトが今までどおり表示されている

## 2. 新サイトの最終確認

`andantino.pages.dev` で確認します。noindexは付けたままです。

- [ ] `npm run validate` が通る
- [ ] 代表的なAndroid端末で確認
- [ ] iPhone相当の幅で確認
- [ ] PCで確認
- [ ] 主要画像の人物・靴が見切れていない
- [ ] リンク切れがない
- [ ] PageSpeed Insights（モバイル）を主要ページで確認した
- [ ] LINEボタンが開く
- [ ] 電話リンクが発信画面を開く
- [ ] メールリンクが正しい
- [ ] LINE用の大人・子ども・インソールの相談ひな形をコピーできる
- [ ] スマートフォン下部のクイックアクションが本文を隠さない
- [ ] 404ページが表示される
- [ ] `/admin/` が認証なしで操作できない
- [ ] SupabaseのRLSが有効
- [ ] 公開不要な `docs/`、設定ファイル、秘密情報へアクセスできない
- [ ] APIキーやパスワードがリポジトリへ入っていない
- [ ] 管理画面へのリンクが一般向けメニューに出ていない

### 店舗情報の一致

本文、フッター、FAQ、料金ページ、構造化データで一致していることを確認します。

- [ ] 店名 / 住所 / 電話番号
- [ ] 営業時間・定休日 / 予約制の範囲 / 支払方法
- [ ] カウンセリング料金 / インソール料金 / オンライン相談料金・所要時間

## 3. 301の実装と確認

- [ ] `_redirects` の対応表が `docs/URL_MIGRATION_MAP.md` と一致している
- [ ] `npm run validate` が301の対応表チェックを通る
- [ ] `npm run redirects:verify -- https://andantino.pages.dev` で、Pages側の301が期待どおり
- [ ] apexドメイン→wwwの規則が `_redirects` の先頭にある

## 4. Cloudflare Pagesへ独自ドメインを追加

DNS切替の前に済ませます。この時点ではまだ旧サイトが表示されたままで問題ありません。

- [ ] Custom Domainsへ `www.andantino-shoes.jp` を追加した
- [ ] Custom Domainsへ `andantino-shoes.jp`（apex）を追加した

## 5. DNSをCloudflareへ切替

ここが本番切替です。

- [ ] Value-DomainのネームサーバーをCloudflare指定のものへ変更した
- [ ] Cloudflare側でゾーンがアクティブになった
- [ ] SSL/TLSモードが Full (strict) になっている

## 6. 本番ドメインでの動作確認

まだnoindexのままです。この段階で不具合が見つかっても、検索結果は汚れません。

- [ ] `https://www.andantino-shoes.jp/` が新サイトを表示する
- [ ] HTTPSで開ける／証明書が有効
- [ ] `http://` が `https://` へ転送される
- [ ] `andantino-shoes.jp`（www無し）が `www` 付きへ301される
- [ ] `npm run redirects:verify` が全項目成功する
- [ ] 主要ページ（トップ、店舗概要、子どもの靴、大人の靴、インソール、料金、ご予約）が開く
- [ ] LINE・電話・メールの導線が本番ドメインでも動く
- [ ] 404ページが表示される

## 7. noindexを解除

**6がすべて済んでから実行します。**

```bash
npm run indexing:live
npm run validate
git add -A && git commit -m "検索エンジンへの公開を開始する" && git push
```

- [ ] `npm run indexing:live` を実行した
- [ ] HTMLのrobots metaからnoindexが消えている（`curl -s https://www.andantino-shoes.jp/ | grep robots`）
- [ ] HTTPレスポンスの `X-Robots-Tag` が消えている（`curl -sI https://www.andantino-shoes.jp/ | grep -i robots`）
- [ ] 404ページだけはnoindexのまま残っている
- [ ] `robots.txt` が表示される
- [ ] `sitemap.xml` が表示され、全URLが拡張子なしの本番URLになっている
- [ ] canonicalが `https://www.andantino-shoes.jp/...` に統一されている

片方だけ解除するとインデックスされません。HTMLとHTTPヘッダーの両方を確認してください。

## 8. 検索エンジンへの登録

- [ ] Google Search Consoleへ登録した
- [ ] Search Consoleへ `sitemap.xml` を送信した
- [ ] トップページをURL検査した
- [ ] 主要ページのインデックス登録をリクエストした
- [ ] Bing Webmaster Toolsへ登録しsitemapを送信した
- [ ] `npm run indexnow:submit` を実行した
- [ ] 数日後、Search Consoleで「リダイレクトあり」「代替ページ」の警告が出ていないか確認した

## 9. 外部サービスと旧サイトの整理

- [ ] GoogleビジネスプロフィールのURLを更新した
- [ ] LINE、Facebook、YouTube、Instagram、Livedoorブログの公式サイトURLを更新した
- [ ] Jimdoの旧サイトに移転案内を掲載した（`docs/URL_MIGRATION_MAP.md` の手順に従う。**すぐに削除しない**）
- [ ] 公式Livedoorブログは閉鎖しない（新サイトから参照している情報発信先です）

---

## 10. 引き渡しテスト

洋子さん本人のアカウントから、次の3つを実施します。

- [ ] 写真を1枚変更し、プレビュー確認後に公開
- [ ] 営業時間または文章を変更し、全ページの矛盾を確認
- [ ] 記事を下書き作成し、確認後に公開

3つを本人だけで完了できた時点を運用引き渡し完了とします。
