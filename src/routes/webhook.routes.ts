import { Hono } from "hono";
import {
  registerWebhook,
  tweetWebhook,
  renderLiveNews,
  subscribeToCategories,
} from "../controllers/webhook.controller";
import authMiddleware from "../middleware/auth.middleware";

// Create a Hono router for webhook routes
const router = new Hono();

// Register webhook routes
router.post("/", tweetWebhook); // Webhook Listener
router.post("/register", authMiddleware, registerWebhook); // Webhook Registration
router.get("/live-news", renderLiveNews); // Live News Page
router.post("/categories/subscribe", authMiddleware, subscribeToCategories); // Subscribe to Categories

export default router;
