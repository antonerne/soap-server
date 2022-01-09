import { connectToDatabase } from "./services/database.service";
import express from 'express';
import { mainRouter } from "./routes/main.router";

const app = express();

connectToDatabase()
    .then((port) => {
        app.use("/api/v1", mainRouter);

        app.listen(port, () => {
            console.log(`Server started at http://localhost:${port}`);
        });
    })
    .catch((error: Error) => {
        console.error("Database connection failed", error);
        process.exit();
    });