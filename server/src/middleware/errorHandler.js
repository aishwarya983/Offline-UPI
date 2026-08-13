const FRIENDLY_MESSAGES = {
  INSUFFICIENT_BALANCE: "Insufficient balance.",
  RECEIVER_NOT_FOUND: "Receiver not found.",
  SENDER_NOT_FOUND: "Sender account could not be found.",
  SELF_PAYMENT: "You can't send money to yourself.",
  INVALID_AMOUNT: "Enter a valid payment amount.",
};

// Supabase wraps Postgres "raise exception" messages inside err.message,
// usually as something like: "INSUFFICIENT_BALANCE" or with extra context.
export function toFriendlyMessage(rawMessage = "") {
  const code = Object.keys(FRIENDLY_MESSAGES).find((key) =>
    rawMessage.includes(key)
  );
  return code ? FRIENDLY_MESSAGES[code] : null;
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const friendly = toFriendlyMessage(err.message);
  if (friendly) {
    return res.status(400).json({ error: friendly });
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}
