import { Hono } from "hono";
import { ScheduleController } from "../controllers/schedule.controller";
import { renderLiveNews } from "../controllers/webhook.controller";

const dashboardRouter = new Hono();

dashboardRouter.get("/", ScheduleController.getSchedule);
dashboardRouter.get("/live-news", renderLiveNews);

export default dashboardRouter;
