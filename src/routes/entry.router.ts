import express, {Request, Response} from 'express';
import { ObjectId } from 'mongodb';
import { Entry, IEntry, IUser, Scripture } from 'soap-model';
import { verifyToken as auth } from '../middleware/auth';
import { collections } from '../services/database.service';

// Global constants
export const entryRouter = express.Router();
entryRouter.use(express.json());

// Get - single entry 
entryRouter.get("/:id", auth,  async(req: Request, res: Response) => {
    const id = req.params.id;
    let uid = res.getHeader("userid") as string;
    
    try {
        const query = { _id: new ObjectId(id) };
        const uquery = { _id: new ObjectId(uid) };
        const user = await collections.users?.findOne(uquery) as IUser;
        const key = (user.keys) ? user.keys.key : "";
        const iv = (user.keys) ? user.keys.iv : "";
        const iEntry = await collections.entries?.findOne(query) as IEntry;
        if (iEntry) {
            if (iEntry.user_id === new ObjectId(uid)) {
                const entry = new Entry(iEntry);
                entry.observations.text = entry.observations.GetText(key, iv);
                entry.applications.text = entry.applications.GetText(key, iv);
                entry.prayer.text = entry.prayer.GetText(key, iv);
                res.status(200).json(entry);
                return
            }
            res.status(401).send(`Entry only for ${iEntry.user_id.toString()}`);
            return
        }
        res.status(404).send(`Entry not found: ${id}`)
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// Get user's entries over the last number of days
entryRouter.get("/days/:num", auth, async(req: Request, res: Response) => {
    const num = Number(req.params.num);
    const now = new Date();
    let startDate = new Date(now.getTime() - (num * 24 * 60 * 60 * 1000));
    const uid = res.getHeader("userid") as string;

    try {
        const query = { "user_id": new ObjectId(uid),
            "entry_date": { $gte: startDate.toISOString()}}
        const iEntries = await (collections.entries?.find(query).toArray()) as IEntry[];
        const uquery = { _id: new ObjectId(uid) };
        const user = await collections.users?.findOne(query) as IUser;
        const key = (user && user.keys ) ? user.keys.key : "";
        const iv = (user && user.keys) ? user.keys.iv : "";

        let entries = new Array();
        for (let iEntry of iEntries) {
            const entry = new Entry(iEntry);
            entry.decrypt(key, iv);
            entries.push(entry);
        }
        const answer = { entries: entries };
        res.status(200).json(answer);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// post - open a new empty entry for the user.  The user's id is pulled from the
// authorization token in the header.
entryRouter.post("/", auth, async(req: Request, res: Response) => {
    const uid = res.getHeader("userid") as string;

    try {
        const newentry = new Entry();
        newentry.user_id = new ObjectId(uid);
        newentry.entry_date = new Date();
        const result = await collections.entries?.insertOne(newentry);
        if (result && result.insertedId) {
            newentry._id = result.insertedId;
            res.status(202).json(newentry);
            return
        }
        res.status(400).send("New entry not created");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// put - update an entry for the user.
entryRouter.put("/:id", auth, async(req: Request, res: Response) => {
    const id = req.params.id;
    const uid = res.getHeader("userid") as string;
    const iEntry = req.body as IEntry;

    try {
        const query = { _id: new ObjectId(id) };
        const uquery = { _id: new ObjectId(uid) };
        const oEntry = await collections.entries?.findOne(query) as IEntry;
        const entry = new Entry(oEntry);

        const user = await collections.users?.findOne(uquery) as IUser;
        const key = (user && user.keys) ? user.keys.key : "";
        const iv = (user && user.keys) ? user.keys.iv : "";

        entry.title = iEntry.title;
        entry.scripture = new Scripture(iEntry.scripture);
        entry.observations.SetText(key, iv, 
            (iEntry.observations.text) ? iEntry.observations.text : "");
        entry.applications.SetText(key, iv, 
            (iEntry.applications.text) ? iEntry.applications.text : "");
        entry.prayer.SetText(key, iv, 
            (iEntry.prayer.text) ? iEntry.prayer.text : "");
        
        const result = await collections.entries?.updateOne(query, entry);
        if (result && result.modifiedCount) {
            res.status(200).json(entry);
            return;
        }
        res.status(500).send("Problem updating entry");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// delete - delete an entry
entryRouter.delete("/:id", auth, async(req: Request, res: Response) => {
    const id = req.params.id;

    try {

    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});