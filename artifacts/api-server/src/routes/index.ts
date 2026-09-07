import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aimeRouter from "./aime";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aimeRouter);

export default router;
