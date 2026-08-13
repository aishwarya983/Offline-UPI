import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "7d";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "Missing JWT_SECRET environment variable. Copy .env.example to .env and set JWT_SECRET to a strong secret. Do NOT commit it."
  );
}

export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
