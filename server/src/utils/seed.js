// Creates two demo accounts so you can try a payment end to end without
// registering by hand. Safe to re-run - it skips accounts that already exist.
import { supabase } from "../config/supabase.js";
import { hashPassword } from "./auth.js";

const DEMO_USERS = [
  { name: "Aditi Rao", email: "aditi@example.com", password: "password123" },
  { name: "Rahul Mehta", email: "rahul@example.com", password: "password123" },
];

async function seed() {
  for (const user of DEMO_USERS) {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (existing) {
      console.log(`Skipping ${user.email}, already exists.`);
      continue;
    }

    const password_hash = await hashPassword(user.password);
    const { error } = await supabase.from("users").insert({
      name: user.name,
      email: user.email,
      password_hash,
      balance: 10000,
    });

    if (error) {
      console.error(`Failed to create ${user.email}:`, error.message);
    } else {
      console.log(`Created ${user.email} / password: ${user.password}`);
    }
  }
  process.exit(0);
}

seed();
