import { createClient } from "@supabase/supabase-js";

// 서버 전용. service_role 키는 RLS를 우회하는 전체 권한 키라 클라이언트 컴포넌트에서
// 절대 import하면 안 된다 (§8.2, §15.4).
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
