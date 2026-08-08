# 旧URL → 新URL 対応表（301リダイレクト設計）

旧サイト（ファイズ制作のPHP版 `andantino-shoes.jp`）から、Cloudflare Pages版の新サイトへ
移行するときのURL対応表です。実装は `_redirects`、静的チェックは `npm run validate`、
本番での実測確認は `npm run redirects:verify` が担当します。

この表を壊すと、旧サイトが積み上げた検索評価と外部からの被リンクを失います。
`_redirects` を編集するときは必ずこの資料も更新してください。

---

## 1. 公開URLの形（重要）

**新サイトの公開URLは拡張子なしです。** `about.html` というファイルは
`https://www.andantino-shoes.jp/about` として配信されます。

Cloudflare Pagesは `/about.html` へのアクセスを `/about` へ308リダイレクトします。
これはPages側の仕様で、設定で止められません。そのため canonical・og:url・sitemap・
内部リンク・301の転送先を `.html` 付きにすると、次の問題が起きます。

- canonicalが「リダイレクトするURL」を指すことになり、Googleが指定を無視する
- sitemapに載せた全URLがSearch Consoleで「リダイレクトあり」として未登録になる
- 旧URLからの流入が 301 → 308 の2段になる
- サイト内のクリックが毎回1往復ぶん遅くなる

これを避けるため、リポジトリ内のファイル名は `.html` のまま、
**公開URLとして表に出るものはすべて拡張子なし**に統一しています。
`scripts/site-pages.mjs` の `path` が唯一の正で、canonical・og:url・sitemapは
そこから組み立てられ、`scripts/audit-site.mjs` が全ページで一致を検査します。

記事ページも同じで、`articles/foo.html` は `/articles/foo` として公開します。
記事本文（Markdown）に `../childrens-shoes.html` と書かれていても、
`scripts/generate-articles.mjs` が生成時に `.html` を落とします。

---

## 2. 旧URLの洗い出し方法

2026年8月8日時点で、旧サイトがまだ稼働している状態で次のように収集しました。

1. `https://www.andantino-shoes.jp/sitemap.xml`（旧サイトが配信しているsitemap）
2. トップページから3階層のリンクを辿った巡回
3. よくある構成のURL（`/news.php`、`/company.php`、`/faq.php` など）の直接確認

3の結果はすべて404で、旧サイトに隠れたページは見つかりませんでした。
`http://andantino-shoes.jp/`（www無し）は旧サーバー側で `www` へ301しています。

### 見つかった旧URLの全量

| 旧URL | 応答 | 旧ページのタイトル・内容 |
|---|---|---|
| `/` | 200 | トップ |
| `/index.php` | 301 → `/` | 旧サーバー側で既に正規化済み |
| `/about.php` | 200 | ANDANTINOについて |
| `/selection.php` | 200 | 30代からはじめる靴選び |
| `/childrenshoes.php` | 200 | 子どもの足育と靴 |
| `/insole.php` | 200 | インソール作製・料金 |
| `/product.php` | 200 | おすすめ商品 |
| `/seminar.php` | 200 | 足育・靴選びセミナー |
| `/contact.php` | 200 | お問い合わせ |
| `/torihiki.php` | 200 | 特定商取引法に基づく表記 |
| `/entry.php?eid=…` | 200 | 新着情報の個別記事（13件、いずれも取扱商品の紹介） |
| `/entry_list.php?d=2020-07` | 200 | 新着情報一覧（アーカイブは2020年7月のみ） |
| `/rss.php` | 200 | 公式Livedoorブログを取り込んだRSS |
| `/common.php` `/head.php` `/contactbnr.php` | 200 | 単独ページではないテンプレート断片。旧sitemapに載っているためインデックスの可能性あり |
| `/robots.txt` | 404 | 旧サイトには存在しない |

`/entry.php?eid=…` の13件は
67023 / 67024 / 67025 / 67027 / 67028 / 67029 / 67030 / 67032 / 67033 / 67034 / 67035 / 69920 で、
内容はタナー社Fiori、フィンコンフォート“Fes”、ニューバランス、ミズノ、ケンプランター、
パラマウント・ワーカーズ・コープ、あゆみシューズの紹介です。

---

## 3. 対応表

`_redirects` の実装と1対1で対応します。`scripts/audit-site.mjs` がこの組み合わせを検査するため、
片方だけ変更すると `npm run validate` が失敗します。

| 旧URL | 新URL | そう決めた理由 |
|---|---|---|
| `/index.php` | `/` | トップ同士 |
| `/about.php` | `/about` | 店舗概要。人物は `/owner`、関連団体は `/links` に分割したが、旧ページの主題は店舗紹介 |
| `/selection.php` | `/adult-shoes` | 「30代からはじめる靴選び」＝大人の靴選び |
| `/childrenshoes.php` | `/childrens-shoes` | 子どもの足育と靴 |
| `/insole.php` | `/insoles` | インソール作製。料金は `/pricing` にもあるが、旧ページの主題は作製内容 |
| `/product.php` | `/products` | おすすめ商品 → 取扱商品 |
| `/seminar.php` | `/seminars` | セミナー同士 |
| `/contact.php` | `/contact` | お問い合わせ同士 |
| `/torihiki.php` | `/legal` | 特定商取引法に基づく表記同士 |
| `/entry.php` | `/products` | 個別記事の中身が取扱商品の紹介のため。Pagesはクエリ文字列で振り分けられないので `eid` 単位には分けない |
| `/entry_list.php` | `/news` | 新着情報一覧 → お知らせ |
| `/rss.php` | `/news` | 記事本体は公式Livedoorブログにあり、新サイト側で最も近いのはお知らせ（ブログへは `/links` から辿れる） |
| `/common.php` `/head.php` | `/` | 単独の対応先がないテンプレート断片 |
| `/contactbnr.php` | `/contact` | 問い合わせ誘導バナーの断片 |

**すべてトップへまとめる301にはしていません。** 内容が対応するページがある限り、
そのページへ送ります。トップへ集約すると、Googleは301をsoft 404として扱い、
旧ページの評価を引き継がないことがあります。

### 併せて設定しているもの

| 規則 | 目的 |
|---|---|
| `https://andantino-shoes.jp/*` → `https://www.andantino-shoes.jp/:splat` | canonicalがwww付きのため、apexドメインをwwwへ寄せる。**パス単位の規則より前に置く必要があります**（後ろに置くとapex側でも本文が配信され、重複コンテンツになります） |
| `/dimoco-insole.html` → `/dymoco-insole` | 新サイト内の綴り違い対策 |
| `/docs/*` `/scripts/*` `/package.json` など | サイトの一部でないファイルを配信しない |

---

## 4. 移行のあと、新サイト側で確認すること

### 拡張子なしURLと `articles/` の関係

`articles.html` は `/articles` として公開され、記事ページは `/articles/{slug}` です。
Cloudflare Pagesは拡張子なしのリクエストに対してまず `articles.html` を探すため、
両者は共存します。記事を初めて公開したあとに `/articles` が正しく一覧を返すか、
`npm run redirects:verify` の実行と併せて一度目視で確認してください。

### 確認コマンド

```bash
npm run validate                 # 対応表・canonical・sitemapの静的チェック
npm run redirects:verify         # 本番ドメインへ実際にアクセスして301を確認
npm run redirects:verify -- https://andantino.pages.dev   # DNS切替前にPages側だけ確認
```

`redirects:verify` は `_redirects` を読んで確認対象を自動で組み立てます。
転送が301であること、転送先が期待どおりであること、転送先が200で開けることの3点を見ます。

---

## 5. 自分のドメインの外にあるもの

301で対応できるのは `andantino-shoes.jp` に来たアクセスだけです。
次の3つは別ドメインなので、それぞれ個別の対応が必要です。

### 公式Livedoorブログ（`blog.livedoor.jp/andantino7110/`）

記事本体はこちらにあり、新サイトの複数ページから参照しています。
**閉鎖しないでください。** 移行対象ではなく、継続して運用する情報発信先です。

### Jimdoの旧サイト

Jimdoは外部への301リダイレクトを設定できません。いきなり削除すると、
そのURLへの被リンクと検索結果からの流入がすべて404になります。手順は次のとおりです。

1. Jimdo側の全ページURLを一覧にする
2. 各ページの先頭に「ANDANTINOの公式サイトは移転しました」と新サイトの該当ページへのリンクを置く
3. トップページにも同じ案内を置く
4. その状態を最低3か月維持し、検索結果からJimdoのページが消えたことを確認する
5. 被リンク元があれば、リンク先の変更を依頼する
6. 以上を終えてから閉鎖する

### 外部サービスに登録しているURL

Googleビジネスプロフィール、公式LINE、Facebook、YouTube、Instagram、
名刺・チラシ・領収書などに載っているURLを `https://www.andantino-shoes.jp/` へ更新します。
Googleビジネスプロフィールのウェブサイト欄は、ローカル検索の流入に直結するため最優先です。
