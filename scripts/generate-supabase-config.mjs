import { writeFile } from "node:fs/promises";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const configFile = new URL("../assets/supabase-config.js", import.meta.url);

function render(url, anonKey) {
  return `// このファイルは scripts/generate-supabase-config.mjs が生成します。手で編集しないでください。
// SUPABASE_URL / SUPABASE_ANON_KEY が未設定の間は null のままです。
// anon key は公開されても問題ない設計のキーで、実際のアクセス制御は
// docs/supabase/schema.sql のRLS（行単位セキュリティ）が担います。
window.ANDANTINO_SUPABASE = {
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)},
};
`;
}

async function main() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log(
      "generate-supabase-config: SUPABASE_URL / SUPABASE_ANON_KEY is not set — writing an unconfigured assets/supabase-config.js."
    );
    await writeFile(configFile, render(null, null), "utf8");
    return;
  }

  await writeFile(configFile, render(supabaseUrl, supabaseAnonKey), "utf8");
  console.log("generate-supabase-config: wrote assets/supabase-config.js.");
}

await main();
