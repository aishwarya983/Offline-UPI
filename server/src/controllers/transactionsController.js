import { supabase } from "../config/supabase.js";
import { toFriendlyMessage } from "../middleware/errorHandler.js";

function serialize(tx) {
  return {
    id: tx.id,
    clientTransactionId: tx.client_transaction_id,
    senderId: tx.sender_id,
    receiverId: tx.receiver_id,
    amount: Number(tx.amount),
    currency: tx.currency,
    note: tx.note,
    status: tx.status,
    createdAt: tx.created_at,
    processedAt: tx.processed_at,
  };
}

async function runPayment({ clientTransactionId, senderId, receiverId, amount, note }) {
  const { data, error } = await supabase.rpc("process_transaction", {
    p_client_transaction_id: clientTransactionId,
    p_sender_id: senderId,
    p_receiver_id: receiverId,
    p_amount: amount,
    p_note: note || null,
  });

  if (error) throw error;
  return data;
}

function validatePaymentInput({ clientTransactionId, receiverId, amount }) {
  if (!clientTransactionId) return "Missing transaction id.";
  if (!receiverId) return "Choose someone to pay.";
  if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
    return "Enter a valid payment amount.";
  }
  return null;
}

// POST /api/transactions - used for a normal, online payment
export async function createTransaction(req, res, next) {
  try {
    const { receiverId, amount, note, clientTransactionId } = req.body;
    const validationError = validatePaymentInput({ clientTransactionId, receiverId, amount });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const tx = await runPayment({
      clientTransactionId,
      senderId: req.userId,
      receiverId,
      amount: Number(amount),
      note,
    });

    res.status(201).json({ transaction: serialize(tx) });
  } catch (err) {
    next(err);
  }
}

// POST /api/transactions/sync - used when the frontend replays payments
// that were queued in IndexedDB while offline. Same underlying logic as
// createTransaction; kept as a separate endpoint because the client needs
// to send a batch and get a per-item result back.
export async function syncTransactions(req, res, next) {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: "No transactions to sync." });
    }

    const results = [];
    for (const item of transactions) {
      const validationError = validatePaymentInput(item);
      if (validationError) {
        results.push({
          clientTransactionId: item.clientTransactionId,
          success: false,
          error: validationError,
        });
        continue;
      }

      try {
        const tx = await runPayment({
          clientTransactionId: item.clientTransactionId,
          senderId: req.userId,
          receiverId: item.receiverId,
          amount: Number(item.amount),
          note: item.note,
        });
        results.push({
          clientTransactionId: item.clientTransactionId,
          success: true,
          transaction: serialize(tx),
        });
      } catch (err) {
        results.push({
          clientTransactionId: item.clientTransactionId,
          success: false,
          error: toFriendlyMessage(err.message) || "Unable to synchronize this payment.",
        });
      }
    }

    res.json({ results });
  } catch (err) {
    next(err);
  }
}

// GET /api/transactions
export async function listTransactions(req, res, next) {
  try {
    const { status, search } = req.query;

    let query = supabase
      .from("transactions")
      .select(
        "*, sender:sender_id(id, name, email), receiver:receiver_id(id, name, email)"
      )
      .or(`sender_id.eq.${req.userId},receiver_id.eq.${req.userId}`)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    let results = data.map((tx) => ({
      ...serialize(tx),
      sender: tx.sender,
      receiver: tx.receiver,
      direction: tx.sender_id === req.userId ? "sent" : "received",
    }));

    if (search) {
      const term = search.toLowerCase();
      results = results.filter(
        (tx) =>
          tx.sender?.name?.toLowerCase().includes(term) ||
          tx.receiver?.name?.toLowerCase().includes(term) ||
          tx.sender?.email?.toLowerCase().includes(term) ||
          tx.receiver?.email?.toLowerCase().includes(term) ||
          tx.note?.toLowerCase().includes(term)
      );
    }

    res.json({ transactions: results });
  } catch (err) {
    next(err);
  }
}

// GET /api/transactions/:id
export async function getTransaction(req, res, next) {
  try {
    const { data: tx, error } = await supabase
      .from("transactions")
      .select(
        "*, sender:sender_id(id, name, email), receiver:receiver_id(id, name, email)"
      )
      .eq("id", req.params.id)
      .single();

    if (error || !tx) {
      return res.status(404).json({ error: "Transaction not found." });
    }

    if (tx.sender_id !== req.userId && tx.receiver_id !== req.userId) {
      return res.status(403).json({ error: "You don't have access to this transaction." });
    }

    res.json({
      transaction: { ...serialize(tx), sender: tx.sender, receiver: tx.receiver },
    });
  } catch (err) {
    next(err);
  }
}
