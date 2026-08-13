import { supabase } from "../config/supabase.js";

export async function getAccount(req, res, next) {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, balance, created_at")
      .eq("id", req.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "Account not found." });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      balance: Number(user.balance),
      memberSince: user.created_at,
    });
  } catch (err) {
    next(err);
  }
}
