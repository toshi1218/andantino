# ANDANTINO サイト構築監査

監査日: 2026-07-21

添付の `site-build-checklist.md` と `site-playbook.md` を基準に、新サイトへ適用した内容と公開後に必要な作業を記録します。

## 実装済み

- 旧公式サイトのトップと全7下層ページを新しいページ構成へ移植
- 旧PHP URL 8本の301リダイレクト
- 20ページの静的HTML、404、内部リンク、CTA、パンくず
- ページ固有のtitle、meta description、self-canonical、OGP、Twitter Card（画像代替テキストを含む）
- 1200×630 OGP画像、SVG/ICO favicon、Apple touch icon、Web App Manifest
- H1を各ページ1つに統一し、H2/H3の階層を監査
- ShoeStore、WebSite、WebPage、Person、Service、OfferCatalog、FAQPage、HowTo、BreadcrumbList等のJSON-LD
- 公式LINE、Facebook、Livedoorブログ、Googleマップ、電話、メール
- `sitemap.xml` 自動生成、`robots.txt`、AIクローラーの明示Allow
- `llms.txt`、`llms-full.txt`
- 店舗・個人事業概要、五十嵐洋子プロフィール、編集方針、外部リンク
- 料金、相談の流れ、インソール、子ども靴、足育、外反母趾・内反小趾・足の3アーチ等の解説
- プライバシーポリシー、利用規約、特定商取引法に基づく表記
- 制作中の全20ページに `noindex,nofollow,nosnippet` を設定し、Cloudflare Pagesの `X-Robots-Tag` でも二重化
- 制作中／本公開のrobots設定を一括で切り替えるコマンドと、解除漏れを検出する自動監査
- セキュリティヘッダー、画像alt/寸法、キーボードフォーカス、レスポンシブCSS

## 文章・情報設計の監査所見

- 本文は主要ページで約710〜1,697文字、外部リンク集で約483文字。検索順位のための一律な最低文字数は設けず、相談前の不安解消、判断材料、五十嵐洋子の経験・考え方が必要なページに情報を集約した。
- トップ、外反母趾・内反小趾、靴の選び方、子ども靴、足・歩行チェックは特に詳しく、サービスページから関連解説と相談導線へ移動できる。
- 料金・FAQ・お問い合わせにも、必要なものを一緒に見極める姿勢と、相談内容がまとまっていなくてもよいことを反映した。
- 法務・外部リンクは本人らしさを無理に足さず、確認しやすさと正確性を優先した。
- 公式Facebookの最近の公開発信も確認し、「足に合うこと」に加えて、色・デザイン・パンプス・履いて出かける楽しさをトップと商品ページへ反映した。
- 公式Facebookで公開された13歳の学校靴相談例（足23.0cm・D/E相当、購入靴24.5cm）を、個別事例であることを明記して子ども靴ページへ追加した。
- 本人が直接述べたと確認できない一人称・署名文は店舗の説明へ変更した。本人発言、公開情報の要約、編集文を分ける基準を編集方針と `VOICE_GUIDE.md` に明記した。
- 公式と確認できた情報源は旧公式サイト、公式Livedoorブログ、公式Facebook。公式Amebaブログは確認できないため引用元にしない。

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
