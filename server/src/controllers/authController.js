import { supabase } from "../config/supabase.js";
import { hashPassword, comparePassword, signToken } from "../utils/auth.js";

const STARTING_BALANCE = 10000;

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    balance: Number(user.balance),
    createdAt: user.created_at,
  };
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: "Name, email and password are all required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await hashPassword(password);

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        name: name.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        balance: STARTING_BALANCE,
      })
      .select()
      .single();

    if (error) throw error;

    const token = signToken(user.id);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (!user) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    const passwordMatches = await comparePassword(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    const token = signToken(user.id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "Account not found." });
    }

    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}
