# ANDANTINO サイト構築監査

監査日: 2026-07-21

添付の `site-build-checklist.md` と `site-playbook.md` を基準に、新サイトへ適用した内容と公開後に必要な作業を記録します。

## 実装済み

- 旧公式サイトのトップと全7下層ページを新しいページ構成へ移植
- 旧PHP URL 8本の301リダイレクト
- 19ページの静的HTML、404、内部リンク、CTA、パンくず
- ページ固有のtitle、meta description、self-canonical、OGP、Twitter Card
- 1200×630 OGP画像、SVG/ICO favicon、Apple touch icon、Web App Manifest
- H1を各ページ1つに統一し、H2/H3の階層を監査
- ShoeStore、WebSite、WebPage、Person、Service、OfferCatalog、FAQPage、HowTo、BreadcrumbList等のJSON-LD
- 公式LINE、Facebook、Livedoorブログ、Googleマップ、電話、メール
- `sitemap.xml` 自動生成、`robots.txt`、AIクローラーの明示Allow
- `llms.txt`、`llms-full.txt`
- 店舗・個人事業概要、五十嵐洋子プロフィール、編集方針、外部リンク
- 料金、相談の流れ、インソール、子ども靴、足育、外反母趾・内反小趾・足の3アーチ等の解説
- プライバシーポリシー、利用規約、特定商取引法に基づく表記
- セキュリティヘッダー、画像alt/寸法、キーボードフォーカス、レスポンシブCSS

## 意図的に実装しない項目

- **hreflang**: 日本語のみの単一言語サイトなので不要。言語版を追加する時点でHTMLとsitemapへ相互参照を追加する。
- **wrangler.toml**: Functionsを使わないGit連携の静的Cloudflare Pagesサイトでは不要。ダッシュボード設定との二重管理を避ける。
- **サイト内フォーム**: 足の写真や相談内容を安全に送信・保存するバックエンド、スパム対策、通知先の秘密情報が未設定のため、見かけだけのフォームは設置しない。公式LINE・電話・メールを案内し、流入元を尋ねる項目を連絡内容に含めた。
- **Cookie同意**: 独自の解析・広告Cookieを置いていないため不要。GA4等を導入する際に方針と同意要否を再確認する。
- **オンライン決済**: サイト上では行わず、注文ごとに金額、送料、納期、返品条件を確認する。
- **Amebaブログへのリンク**: 公式アカウントだと確認できるURLが見つからないため掲載しない。確認できた公式ブログはLivedoor。

## 公開環境でのみ行える確認

- Cloudflare Pagesのcustom domain、DNS、SSL、`andantino.pages.dev` からの正規化
- 旧PHP URL 8本の本番301応答
- Search Consoleのドメイン確認、sitemap送信、主要ページの登録リクエスト
- Rich Results TestとSchema Markup Validatorによる公開URL検証
- Facebook/LINE等の共有プレビュー更新
- PageSpeed Insights、実端末、Chrome/Safari/Firefox、iOS Safariでの表示確認
- 電話・LINE・メール導線の実機確認

## 公開判定

今回の変更はURL、canonical、robots、sitemap、redirects、JSON-LD、共通ナビを含む全体リニューアルです。判定は **🟡 単独デプロイ＋14〜28日観察**。マージ・本番反映後は構造と共通部品を凍結し、同じ観察期間中に別の大規模構造変更を重ねません。
