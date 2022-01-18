// External Dependencies
import express, {Request, Response} from 'express';
import { ConnectionPoolClearedEvent, ObjectId } from 'mongodb';
import { collections } from '../services/database.service';
import { Authorization, IUser, LoginResponse, User, Token, ForgotPassword, UserPlanRequest, IReadingPlan, ReadingPlan, UpdateUserPlanRequest } from 'soap-model';
import * as jwt from 'jsonwebtoken';
import { verifyToken as auth } from '../middleware/auth';
import { ITokenMail } from '../model/mail';
import { sendMail } from '../services/mailer.service';

// Global Config
export const userRouter = express.Router();
userRouter.use(express.json());

// Get - retries a single user information
// Get all users
userRouter.get("/", auth, async(req: Request, res: Response) => {
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
userRouter.get("/:id", auth, async(req: Request, res: Response) => {
    let uid: string = ""
    if (!req.params.id || req.params.id === "") {
        uid = res.getHeader("userid") as string;
    } else {
        uid = req.params.id;
    }

    try {
        const query = { _id: new ObjectId(uid)};
        
        if (collections.users) {
            const user = (await collections.users.findOne(query)) as IUser;
            res.status(200).send(user);
            return
        }
        res.status(404).send(`User: ${uid} not found in database!`);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});



// Post - four functions
// 1)  Create a new user
userRouter.post("/", async(req: Request, res: Response) => {
    try {
        const tuser = req.body as IUser
        const newuser: User = new User();
        await newuser.newUser(tuser.email, tuser.user_name.first, 
            (tuser.user_name.middle) ? tuser.user_name.middle : "" , 
            tuser.user_name.last, 
            (tuser.creds?.password) ? tuser.creds.password : "TemporaryPassword");

        const query = { email: tuser.email }
        const ouser = (await collections.users?.findOne(query)) as IUser;

        if (!ouser) {
            const result = await collections.users?.insertOne(newuser);

            if (result && newuser && newuser.creds) {
                newuser._id = result.insertedId;
                const chg = { _id: result.insertedId}
                const verifyToken: string = newuser.creds?.getToken();
                if (verifyToken) {
                    let now = new Date();
                    let expires = new Date(now.getTime() + (60 * 60 * 1000));
                    newuser.creds.verification_token = verifyToken;
                    newuser.creds.tokenExpires = expires;
                    await collections.users?.updateOne(chg, { $set: newuser });
                    const mail: ITokenMail = {
                        sendTo: tuser.email,
                        created: now,
                        expires: expires,
                        purpose: "Email Verification",
                        token: verifyToken
                    };
                    let info = await sendMail(mail);

                    console.log(`Message send: ${info.messageId}`);
                    console.log(info);
                }
                res.status(202).send(`Successfully create new user with id: ${result.insertedId}`)
            } else {
                res.status(500).send("Failed to create a new user");
            }
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
        const user: User = new User(tuser);

        if (user) {
            let login = await user.creds?.Authenticate(authReq.password);
            await collections.users?.updateOne(query, { $set: user });
            if (login) {
                if (login.status === 200) {
                    const { JWT_SECRET } = process.env;
                    let jwtsecret = "";
                    if (JWT_SECRET) {
                        jwtsecret = JWT_SECRET;
                    }
                    let oToken: Token = {
                        userid: (user && user._id) ? user._id.toString() : "",
                        email: authReq.email
                    };
                    
                    const token = jwt.sign(
                        oToken,
                        jwtsecret,
                        {
                            expiresIn: "2h",
                        }
                    );

                    user.token = token;

                    res.status(200).json(user);
                    return
                } else if (login.message.toLowerCase() === "account not verified") {
                    const chg = { _id: user._id}
                    if (user.creds) {
                        const verifyToken: string = user.creds?.getToken();
                        if (verifyToken) {
                            let now = new Date();
                            let expires = new Date(now.getTime() + (60 * 60 * 1000));
                            user.creds.verification_token = verifyToken;
                            user.creds.tokenExpires = expires;
                            await collections.users?.updateOne(chg, { $set: user });
                            const mail: ITokenMail = {
                                sendTo: tuser.email,
                                created: now,
                                expires: expires,
                                purpose: "Email Verification",
                                token: verifyToken
                            };
                            let info = await sendMail(mail);
        
                            console.log(`Message send: ${info.messageId}`);
                            console.log(info);
                        }
                    }
                }
                res.status(login.status).send(login.message);
                return
            }
            res.status(401).send("Unknown problems");
        }
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// 3) Verify User email
userRouter.post("/verify/", async(req: Request, res: Response) => {
    try {
        const auth: Authorization = req.body as Authorization;
        const query = { email: auth.email};
        const tuser = (await collections.users?.findOne(query)) as IUser;
        const user: User = new User(tuser);

        if (user.creds?.Verify(auth.password)) {
            const result = await collections.users?.updateOne(query, { $set: user});
            if (result && result.modifiedCount) {
                res.status(200).send("Account Verified");
                return;
            }
        }
        res.status(500).send("Account failed verification");
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).send(error.message);
            return
        }
        res.status(400).send(error);
    }
});

// Post - user forgot his/her password, so this process will provide the 
// initial step by sending an email with the reset token to the user.
userRouter.post("/forgot/", async(req: Request, res: Response) => {
    try {
        const chg: Authorization = req.body as Authorization;
        const query = { email: chg.email };
        const tuser = (await collections.users?.findOne(query)) as IUser;
        const user: User = new User(tuser);

        if (user && user.creds) {
            const token = user.creds.getToken();
            user.creds.reset_token = token;
            let now = new Date();
            let expires = new Date(now.getTime() + (60 * 60 * 1000));
            user.creds.tokenExpires = expires;
            await collections.users?.updateOne(chg, { $set: user });
            const mail: ITokenMail = {
                sendTo: tuser.email,
                created: now,
                expires: expires,
                purpose: "Forgot Password Token",
                token: token
            };
            let info = await sendMail(mail);

            console.log(`Message send: ${info.messageId}`);
            console.log(info);

            res.status(200).send("Token sent");
            return;
        }
        res.status(500).send("forgot password token failure");
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).send(error.message);
            return
        }
        res.status(400).send(error);
    }
});

// post - sets the user's plan 
userRouter.post("/plan", auth, async(req: Request, res: Response) => {
    try {
        const chg: UserPlanRequest = req.body as UserPlanRequest;
        const query = { _id: chg.userID };
        const tuser = (await collections.users?.findOne(query)) as IUser;
        const user: User = new User(tuser);

        const planQuery = { _id: chg.planID, reading_type: "readingplan" };
        const tPlan = (await collections.readings?.findOne(planQuery)) as IReadingPlan;
        const userPlan = new ReadingPlan(tPlan);

        user.readingPlan = userPlan;
        user.readingPlan.setDueDates(chg.start_date);

        const result = (await collections.users?.updateOne(query, { $set: user}));
        if (result && result.modifiedCount) {
            res.status(200).send("User Reading Plan set");
            return;
        }
        res.status(500).send("Error setting User Reading Plan")
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).send(error.message);
            return
        }
        res.status(400).send(error);
    }
});

// Put - forgot - changes user's password if the data passed (email, 
// new password and authentication token) matches the data in the database
// plus the token hasn't expired.
userRouter.put("/forgot/", async(req: Request, res: Response) => {
    try {
        const chg: ForgotPassword = req.body as ForgotPassword;
        const query = { email: chg.email };
        const tuser = (await collections.users?.findOne(query)) as IUser;
        const user: User = new User(tuser);

        if (user && user.creds) {
            let answer: boolean = await user.creds.ResetPassword(chg.token, 
                chg.password);
            if (answer) {
                await collections.users?.updateOne(query, { $set: user });
                res.status(200).send("Password Changed");
                return;
            }
        }
        res.status(500).send("Password Change Failure");
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).send(error.message);
            return
        }
        res.status(400).send(error);
    }
});

// put - plan - This changes the status of a particular date in the user's
// reading plan.
userRouter.put("/plan/", auth, async(req: Request, res: Response) => {
    try {
        const chg: UpdateUserPlanRequest = req.body as UpdateUserPlanRequest;
        const query = { _id: chg.userID };
        const tUser = (await collections.users?.findOne(query)) as IUser;
        const user = new User(tUser);

        if (user.readingPlan) {
            let found = user.readingPlan.setComplete(chg.date_changed, chg.book, 
                chg.chapter, chg.completed);
            if (found) {
                const result = await collections.users?.updateOne(
                    query, { $set: user});
            }
        }
        res.status(500).send("Plan not updated");
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).send(error.message);
            return
        }
        res.status(400).send(error);
    }
});

// Put - update the user, including the possibility of password change
userRouter.put("/:id", auth, async(req: Request, res: Response) => {
    const id = req?.params?.id;

    try {
        const uUser: IUser = req.body as IUser;
        const query = { _id: new ObjectId(id) };
        const tuser = (await collections.users?.findOne(query)) as IUser;
        const user = new User(tuser);

        user.email = uUser.email;
        user.user_name.first = uUser.user_name.first;
        user.user_name.middle = uUser.user_name.middle;
        user.user_name.last = uUser.user_name.last;

        if (uUser.creds && uUser.creds?.password !== "") {
            user.creds?.SetPassword(uUser.creds?.password);
        }
        const result = await collections.users?.updateOne(query, { $set: user });

        result 
            ? res.status(200).send(`Successfully update user with id ${id}`)
            : res.status(304).send(`User with id: ${id} not updated`);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).send(error.message);
            return
        }
        res.status(400).send(error);
    }
});

// Delete - delete a user, along with their respective soap entries
userRouter.delete("/:id", auth, async(req: Request, res: Response) => {
    const id = req?.params?.id;

    try {
        const query = { _id: new ObjectId(id)};
        const result = await collections.users?.deleteOne(query);

        if (result && result.deletedCount) {
            const entryquery = { user_id: new ObjectId(id) };
            const result2 = await collections.entries?.deleteMany(entryquery);
            if (result2 && result2.deletedCount) {
                res.status(200).send(`Deleted User and associated entries: 
                    ${result2.deletedCount} entries`);
            } else if (!result2) {
                res.status(400).send(`Deleted User, but failed to delete any
                    associated entries.`);
            } else if (!result2.deletedCount) {
                res.status(404).send(`Deleted User, but no entries existed`);
            }
        } else if (!result) {
            res.status(400).send(`Failed to delete user with id: ${id}`);
        } else if (!result.deletedCount) {
            res.status(404).send(`User with id ${id} does not exist.`);
        }
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).send(error.message);
            return
        }
        res.status(400).send(error);
    }
});