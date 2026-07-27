// オンライン相談ページの受付状況・料金を、Supabaseの site_settings から反映する。
// Supabase未設定、または通信に失敗した場合は、静的な既定表示（準備中）のまま何もしない。
(function () {
  const badge = document.querySelector("[data-consult-badge]");
  const note = document.querySelector("[data-consult-note]");
  const price = document.querySelector("[data-consult-price]");
  const duration = document.querySelector("[data-consult-duration]");
  if (!badge) return;

  async function apply() {
    const client = window.andantinoSupabaseClient;
    if (!client) return;

    const { data, error } = await client
      .from("site_settings")
      .select("online_consultation_enabled, online_consultation_price, online_consultation_duration_minutes, online_consultation_note")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return;

    if (data.online_consultation_enabled) {
      badge.textContent = "只今受付中です";
      badge.classList.remove("status-badge--closed");
      badge.classList.add("status-badge--open");
      if (note) {
        note.textContent = data.online_consultation_note || "公式LINEからお申込みください。";
      }
    } else {
      badge.textContent = "現在ご案内を準備中です";
      badge.classList.remove("status-badge--open");
      badge.classList.add("status-badge--closed");
      if (note && data.online_consultation_note) {
        note.textContent = data.online_consultation_note;
      }
    }

    if (price && data.online_consultation_price) {
      price.textContent = data.online_consultation_price;
    }
    if (duration && data.online_consultation_duration_minutes) {
      duration.textContent = `${data.online_consultation_duration_minutes}分程度`;
    }
  }

  apply().catch(() => {
    // 通信に失敗しても、静的な既定表示のまま画面は成立する。
  });
})();
