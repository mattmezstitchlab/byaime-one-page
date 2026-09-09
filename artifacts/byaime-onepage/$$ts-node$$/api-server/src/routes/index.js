import { Router } from "express";
import healthRouter from "./health";
import aimeRouter from "./aime";
const router = Router();
router.use(healthRouter);
router.use(aimeRouter);
export default router;
//# sourceMappingURL=index.js.map