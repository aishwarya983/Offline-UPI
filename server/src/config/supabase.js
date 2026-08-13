import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Copy .env.example to .env and fill them in."
  );
}

// The service key is used because this server does its own auth (JWT +
// bcrypt) instead of Supabase Auth, so it needs to bypass row-level
// security and enforce access rules itself. Never send this key to the
// frontend.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
