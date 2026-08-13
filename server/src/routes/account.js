import { Router } from "express";
import { getAccount } from "../controllers/accountController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/", requireAuth, getAccount);

export default router;
