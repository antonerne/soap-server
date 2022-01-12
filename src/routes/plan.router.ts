import express, { Request, Response} from 'express';

// Global constants
export const planRouter = express.Router();
planRouter.use(express.json());