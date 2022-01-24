import express, { Request, Response} from 'express';
import { ObjectId } from 'mongodb';
import { AddNewPlanPeriod, AddNewPlanReading, AddNewReadingPlan, IPlanReading, IReadingPlan, PlanPeriod, ReadingPlan, UpdateReadingPlan } from 'soap-model';
import { verifyToken as auth } from '../middleware/auth';
import { collections } from '../services/database.service';

// Global constants
export const planRouter = express.Router();
planRouter.use(express.json());

// get all reading plans
planRouter.get("/", auth, async(req: Request, res: Response) => {
    try {
        let query = { reading_type: "readingplan" };
        const iPlans = await collections.readings?.find(
            query).toArray() as IReadingPlan[];
        res.status(200).json(iPlans);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// get reading plan by id
planRouter.get("/:id", auth, async(req: Request, res: Response) => {
    const id = req.params.id;
    try {
        let query = { reading_type: "readingplan", _id: new ObjectId(id)};
        const iPlan = await collections.readings?.findOne(query) as IReadingPlan;
        if (iPlan) {
            res.status(200).json(iPlan);
            return
        }
        res.status(404).send("Plan Not Found");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// create new reading plan to include a title and start type, the storage will
// provide an empty array of PlanPeriods
planRouter.post("/plan", auth, async(req: Request, res: Response) => {
    try {
        const newplan = req.body as AddNewReadingPlan;

        const plan = new ReadingPlan();
        plan.title = newplan.title;
        plan.start_type = newplan.start_type;

        const result = await collections.readings?.insertOne(plan);
        if (result) {
            plan._id = result.insertedId;
            res.status(201).json(plan);
            return;
        }
        res.status(400).send("Problem creating plan");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// create a new plan period with a title and the next id in the list (id + 1).
// Also, provide a super period, if this will be a sub.
planRouter.post("/period", auth, async(req: Request, res: Response) => {
    try {
        const form = req.body as AddNewPlanReading;
        const query = { _id: new ObjectId(form.planid) };
        let subs = form.parents.split("-")
        const iPlan = await collections.readings?.findOne(query) as IReadingPlan;
        if (iPlan) {
            const plan = new ReadingPlan(iPlan);
            const update = "period";
            if (plan.sections && plan.sections.length > 0) {
                const sub = Number(subs.shift());
                for (let i = 0; i < plan.sections.length; i++) {
                    if (plan.sections[i].id === sub) {
                        plan.sections[i].updateSubPeriod(subs, update, form);
                    }
                }
            }
            const result = await collections.readings?.updateOne(query, plan);
            if (result && result.modifiedCount > 0) {
                res.status(201).json(plan);
                return;
            }
        }
        res.status(404).send("Plan not found");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// add a book, chapter, and optional verses to a period.
planRouter.post("/reading", auth, async(req: Request, res: Response) => {
    try {
        const form = req.body as AddNewPlanReading;
        const query = { _id: new ObjectId(form.planid) };
        let subs = form.parents.split("-")
        const iPlan = await collections.readings?.findOne(query) as IReadingPlan;
        if (iPlan) {
            const plan = new ReadingPlan(iPlan);
            const update = "reading";
            if (plan.sections && plan.sections.length > 0) {
                const sub = Number(subs.shift());
                for (let i = 0; i < plan.sections.length; i++) {
                    if (plan.sections[i].id === sub) {
                        plan.sections[i].updateSubPeriod(subs, update, form);
                    }
                }
            }
            const result = await collections.readings?.updateOne(query, plan);
            if (result && result.modifiedCount > 0) {
                res.status(201).json(plan);
                return;
            }
        }
        res.status(404).send("Plan not found");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// make changes to reading plan title or start type.
planRouter.put("/plan", auth, async(req: Request, res: Response) => {
    try {
        const form = req.body as UpdateReadingPlan;
        const query = { _id: new ObjectId(form.planid)};

        const iPlan = await collections.readings?.findOne(query) as IReadingPlan;
        if (iPlan) {
            const plan = new ReadingPlan(iPlan);
            if (form.title) {
                plan.title = form.title;
            }
            if (form.start_type) {
                plan.start_type = form.start_type;
            }
            const result = await collections.readings?.updateOne(query, plan);
            if (result && result.modifiedCount > 0) {
                res.status(200).json(plan);
                return;
            }
        }
        res.status(404).send("Plan not found");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// delete reading plan
planRouter.delete("/plan/:planid", auth, async(req: Request, res: Response) => {
    try {
        const planID = req.params.planid;

        const query = { _id: new ObjectId(planID)};

        const result = await collections.readings?.deleteOne(query);
        if (result && result.deletedCount > 0) {
            res.status(202).send("Plan deleted");
        }
        res.status(404).send("Plan not found");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// delete reading plan period
planRouter.delete("/period/:planid/:parents/:id", auth,
    async(req: Request, res: Response) => {
    try {
        const planID = req.params.planid;
        const parents = req.params.parents;
        const id = Number(req.params.id);

        const query = { _id: new ObjectId(planID)};

        const iPlan = await collections.readings?.findOne(query) as IReadingPlan;
        if (iPlan) {
            const plan = new ReadingPlan(iPlan);

            const subs = parents.split("-");
            let found = false;
            if (subs.length > 0) {
                const subid = Number(subs.shift());
                for (let i=0; i < plan.sections.length && !found; i++) {
                    if (plan.sections[i].id === subid) {
                        const child = DeletePeriod(plan.sections[i], subs, id);
                        plan.sections[i] = child;
                    }
                }
            }
            const result = await collections.readings?.updateOne(query, plan);
            if (result && result.modifiedCount) {
                res.status(200).json(plan);
            }
        }
        res.status(400).send("Plan not found");

    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// delete a book, chapter, versses from a period.
planRouter.delete("/reading/:planid/:parents/:book/:chapter", auth,
    async(req: Request, res: Response) => {
    try {
        const planID = req.params.planid;
        const parents = req.params.parents;
        const bookID = Number(req.params.book);
        const chapterID = Number(req.params.chapter);

        const query = { _id: new ObjectId(planID)};

        const iPlan = await collections.readings?.findOne(query) as IReadingPlan;
        if (iPlan) {
            const plan = new ReadingPlan(iPlan);

            const subs = parents.split("-");
            let found = false;
            if (subs.length > 0) {
                const subid = Number(subs.shift());
                for (let i=0; i < plan.sections.length && !found; i++) {
                    if (plan.sections[i].id === subid) {
                        const child = DeleteReading(plan.sections[i], subs, 
                            bookID, chapterID);
                        plan.sections[i] = child;
                    }
                }
            }
            const result = await collections.readings?.updateOne(query, plan);
            if (result && result.modifiedCount) {
                res.status(200).json(plan);
            }
        }
        res.status(400).send("Plan not found");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

function DeleteReading(period: PlanPeriod, subs: string[] | undefined, 
    book: number, chapter: number): PlanPeriod {
    if (subs && subs.length > 0) {
        const subid = Number(subs.shift());
        if (period.periods) {
            for (let i=0; i < period.periods.length; i++) {
                if (period.periods[i].id === subid) {
                    period.periods[i] = DeleteReading(period.periods[i], subs, 
                        book, chapter);
                }
            }
        }
    } else {
        if (period.readings) {
            for (let i=0; i < period.readings.length; i++) {
                const reading = period.readings[i];
                if (reading.book === book && reading.chapter === chapter) {
                    period.readings.splice(i, 1);
                }
            }
        }
    }
    return period;
}

function DeletePeriod(period: PlanPeriod, subs: string[], 
    id: number): PlanPeriod {
        if (subs && subs.length > 0) {
            const subid = Number(subs.shift());
            if (period.periods) {
                for (let i=0; i < period.periods.length; i++) {
                    if (period.periods[i].id === subid) {
                        period.periods[i] = DeletePeriod(period.periods[i], subs, id);
                    }
                }
            }
        } else {
            if (period.periods) {
                for (let i=0; i < period.periods.length; i++) {
                    const p = period.periods[i];
                    if (p.id === id) {
                        period.periods.splice(i, 1);
                    }
                }
            }
        }
        return period;

}