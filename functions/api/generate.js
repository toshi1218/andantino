// Cloudflare Pages Function: 管理画面の「AIで下書きを作る」から呼ばれる。
//
// 設計方針:
// - AIプロバイダの秘密鍵はサーバー側（Cloudflare Pagesの環境変数）にのみ置き、
//   ブラウザ・リポジトリには一切含めない。
// - AI_API_KEY が未設定の場合は { configured: false } を返すだけで、
//   管理画面側は自動的に媒体別テンプレート表示にフォールバックする。
// - 特定のAIサービスに強く依存しないよう、AI_PROVIDER で切り替え可能な
//   簡単なアダプター構成にしている（anthropic / openai）。
// - 呼び出しは、Supabaseの有効なログインセッション（管理画面ユーザー）を
//   持つ場合のみ受け付ける。ここでは「有効なセッションがあるか」までを確認し、
//   admin_users への登録有無まではチェックしていない
//   （記事の保存・公開自体はSupabase側のRLSで別途保護されている）。
const SYSTEM_PROMPT = `あなたはANDANTINO（和歌山の靴・インソール専門店）のスタッフが書く記事の下書きを作るアシスタントです。
店主・五十嵐洋子さんが店頭で伝えている内容をもとに、次のルールを必ず守ってください。
- 医療的な診断・治療・効果を保証すると読める表現は使わない。
- 過度に営業的、AIが書いたような大げさな表現、不安を過剰に煽る表現は避ける。
- お客様の氏名・住所・病歴など個人が特定できる情報は書かない。
- 「一緒に見る・確かめる」という姿勢で、来店やご相談を促す文章にする。
- 出力は説明を付けず、次のJSON形式のみで返す。
{"article_content":"HTMLの見出し(h2)と段落(p)で構成した本文","excerpt":"80字程度の要約","note_version":"note用の長文","facebook_version":"Facebook用の投稿文","instagram_version":"Instagram用の投稿文とハッシュタグ","x_version":"140字以内のX用短文","line_version":"公式LINE配信用の文章","seo_title":"30字程度のSEOタイトル","seo_description":"120字程度のSEO説明文"}`;

function buildUserPrompt(input) {
  const lines = [
    `タイトル案: ${input.title || "（未定）"}`,
    `対象読者: ${input.target_audience || "指定なし"}`,
    `テーマ: ${input.category || "その他"}`,
    `出来事の種類: ${input.source_type || "指定なし"}`,
    `タグ: ${(input.tags || []).join("、") || "なし"}`,
    "",
    "元になった出来事・メモ:",
    input.raw_content || input.excerpt || "（メモなし。タイトルから一般的な内容を作成してください）",
  ];
  return lines.join("\n");
}

async function callAnthropic(env, prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.AI_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.AI_MODEL || "claude-haiku-4-5",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`anthropic responded with ${response.status}`);
  const json = await response.json();
  return json.content?.[0]?.text || "";
}

async function callOpenAI(env, prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.AI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) throw new Error(`openai responded with ${response.status}`);
  const json = await response.json();
  return json.choices?.[0]?.message?.content || "";
}

async function verifySession(env, request) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return true; // Supabase未設定環境では検証をスキップ
  const auth = request.headers.get("Authorization");
  if (!auth) return false;
  try {
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: env.SUPABASE_ANON_KEY },
    });
    if (!response.ok) return false;
    const user = await response.json();
    return Boolean(user && user.id);
  } catch {
    return false;
  }
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.AI_API_KEY) {
    return Response.json({ configured: false });
  }

  const isAuthorized = await verifySession(env, request);
  if (!isAuthorized) {
    return new Response("Unauthorized", { status: 401 });
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const prompt = buildUserPrompt(input);
  const provider = (env.AI_PROVIDER || "anthropic").toLowerCase();

  try {
    const text = provider === "openai" ? await callOpenAI(env, prompt) : await callAnthropic(env, prompt);
    const parsed = extractJson(text);
    if (!parsed) return Response.json({ configured: false });
    return Response.json(parsed);
  } catch (error) {
    return Response.json({ configured: false, error: String(error) });
  }
}

export async function onRequestGet() {
  return new Response("Method Not Allowed", { status: 405 });
}
