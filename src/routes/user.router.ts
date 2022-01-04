// External Dependencies
import express, {Request, Response} from 'express';
import { ObjectId } from 'mongodb';
import { collections } from '../services/database.service';
import { Authorization, IUser, User } from 'soap-model'

// Global Config
export const userRouter = express.Router();
userRouter.use(express.json());

// Get - retries a single user information
// Get all users
userRouter.get("/", async(req: Request, res: Response) => {
    try {
        if (collections.users) {
            const users = (await collections.users.find({}).toArray()) as IUser[];
            res.status(200).send(users);
            return
        }
        res.status(404).send("No users found in database!");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// get user from id
userRouter.get("/:id", async(req: Request, res: Response) => {
    const id = req.params.id;

    try {
        const query = { _id: new ObjectId(id)};
        
        if (collections.users) {
            const user = (await collections.users.findOne(query)) as IUser;
            res.status(200).send(user);
            return
        }
        res.status(404).send(`User: ${id} not found in database!`);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
})

// Post - two functions
// 1)  Create a new user
userRouter.post("/", async(req: Request, res: Response) => {
    try {
        const tuser = req.body as IUser
        const newuser: User = new User(tuser);

        const query = { email: tuser.email }
        const ouser = (await collections.users?.findOne(query)) as IUser;

        if (!ouser) {
            const result = await collections.users?.insertOne(newuser);

            result 
                ? res.status(202).send(`Successfully create new user with id: ${result.insertedId}`)
                : res.status(500).send("Failed to create a new user");
        } else {
            // user for email address already in system.
            res.status(403).send(`User already present for email address: ${tuser.email}`);
        }
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// 2)  Authenticate user
userRouter.post("/login/", async(req: Request, res: Response) => {
    try {
        const authReq = req.body as Authorization

        const query = { email: authReq.email };
        const tuser = (await collections.users?.findOne(query)) as IUser;
        const user = new User(tuser);

        if (user) {
            if (user.creds?.Authenticate(authReq.password)) {
                
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// Put - update the user, to include password

// Delete - delete a user, along with their respective soap entries