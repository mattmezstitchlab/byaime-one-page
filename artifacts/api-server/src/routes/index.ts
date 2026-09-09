import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aimeRouter from "./aime";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aimeRouter);
router.use((_req, res) => {
  res.status(404).json({ error: "Ressource introuvable" });
});

export default router;
