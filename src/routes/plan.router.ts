import express, { Request, Response} from 'express';

// Global constants
export const planRouter = express.Router();
planRouter.use(express.json());

// get all reading plans

// get reading plan by id

// create new reading plan to include a title and start type, the storage will
// provide an empty array of PlanPeriods

// create a new plan period with a title and the next id in the list (id + 1).
// Also, provide a super period, if this will be a sub.

// add a book, chapter, and optional verses to a period.

// make changes to reading plan title or start type.

// make changes to book, chapter, verses list for a period