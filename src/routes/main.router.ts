import express, {Request, Response} from 'express';
import { entryRouter } from './entry.router';
import { userRouter } from './user.router';

// Global Config
export const mainRouter = express.Router();
mainRouter.use(express.json());
mainRouter.use("/user", userRouter)
mainRouter.use("/entries", entryRouter);