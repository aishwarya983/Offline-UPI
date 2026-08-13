import { supabase } from "../config/supabase.js";

export async function listUsers(req, res, next) {
  try {
    const search = (req.query.search || "").trim();

    let query = supabase
      .from("users")
      .select("id, name, email")
      .neq("id", req.userId)
      .order("name")
      .limit(20);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ users: data });
  } catch (err) {
    next(err);
  }
}
