// 公開ページから、承認済みデータ（site_settings / pdf_products / articles）を
// 読み取るための小さなヘルパー。Supabase未設定・CDN読み込み失敗時は
// window.andantinoSupabaseClient が null になり、各ページは静的な既定表示のまま動作する。
(function () {
  try {
    const config = window.ANDANTINO_SUPABASE || {};
    if (!config.url || !config.anonKey || !window.supabase || typeof window.supabase.createClient !== "function") {
      window.andantinoSupabaseClient = null;
      return;
    }
    window.andantinoSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
  } catch {
    window.andantinoSupabaseClient = null;
  }
})();
