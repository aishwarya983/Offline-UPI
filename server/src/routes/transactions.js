import { Router } from "express";
import {
  createTransaction,
  syncTransactions,
  listTransactions,
  getTransaction,
} from "../controllers/transactionsController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.use(requireAuth);

router.get("/", listTransactions);
router.post("/sync", syncTransactions);
router.post("/", createTransaction);
router.get("/:id", getTransaction);

export default router;
