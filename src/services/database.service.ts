// External Dependencies
import * as mongo from 'mongodb';
import * as dotenv from 'dotenv';

// Global Variables
export const collections: { entries?: mongo.Collection, 
    users?: mongo.Collection, readings?: mongo.Collection } = {}

// Initialize Connection
export async function connectToDatabase(): Promise<number> {
    dotenv.config();

    const uri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWD}`
        + `@${process.env.MONGO_SERVER}:${process.env.MONGO_PORT}`;

    const client: mongo.MongoClient = new mongo.MongoClient(uri);

    await client.connect();

    const db: mongo.Db = client.db(process.env.MONGO_DB_NAME);

    const usersCollection: mongo.Collection = db.collection("users");
    collections.users = usersCollection;

    const entriesCollection: mongo.Collection = db.collection("entries");
    collections.entries = entriesCollection;

    const readingsCollection: mongo.Collection = db.collection("readings");
    collections.readings = readingsCollection;

    console.log(`Successfully connected to database: ${db.databaseName}`);

    if (process.env.SERVER_PORT) {
        return Number(process.env.SERVER_PORT);
    } 
    return 3000;
}