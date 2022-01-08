import { connectToDatabase } from "./services/database.service";
import express from 'express';
import { userRouter } from "./routes/user.router";

const app = express();

connectToDatabase()
    .then((port) => {
        app.use("/api/v1/user", userRouter);

        app.listen(port, () => {
            console.log(`Server started at http://localhost:${port}`);
        });
    })
    .catch((error: Error) => {
        console.error("Database connection failed", error);
        process.exit();
    });