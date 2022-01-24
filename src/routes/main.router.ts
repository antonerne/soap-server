import express, {Request, Response} from 'express';
import { bibleRouter } from './bible.router';
import { entryRouter } from './entry.router';
import { planRouter } from './plan.router';
import { userRouter } from './user.router';

// Global Config
export const mainRouter = express.Router();
mainRouter.use(express.json());
mainRouter.use("/user", userRouter)
mainRouter.use("/entries", entryRouter);
mainRouter.use("/bible", bibleRouter);
mainRouter.use("/plans", planRouter);