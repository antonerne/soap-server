import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Bible, Book, IBible, IBook, SwapRequest } from 'soap-model';
import { IVersion, Version } from 'soap-model/dist/bible/version';
import { verifyToken as auth } from '../middleware/auth';
import { collections } from '../services/database.service';

// Global constants
export const bibleRouter = express.Router();
bibleRouter.use(express.json());

// Get - get all bible references
bibleRouter.get("/", auth, async(req: Request, res: Response) => {
    try {
        const query = { "reading_type": "bible"};
        const iBibles = await collections.readings?.find(query).toArray() as IBible[];

        res.status(200).json(iBibles);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// post - add a new book to the bible
bibleRouter.post("/book", auth, async (req: Request, res: Response) => {
    try {
        const newbook = req.body as IBook;
        const query = { "reading_type": "bible"};
        const iBibles = await collections.readings?.find(query).toArray() as IBible[];
        if (iBibles && iBibles.length > 0) {
            const bible = new Bible(iBibles[0]);
            let found = false;
            let newID = 0;
            for (let i=0; i < bible.books.length && !found; i++) {
                const book = bible.books[i];
                if (newbook.id && newbook.id > 0) {
                    if (book.id === newbook.id) {
                        found = true;
                        book.abbrev = newbook.abbrev;
                        book.title = newbook.title;
                        bible.books[i] = book;
                    }
                }
                if (book.title === newbook.title 
                    && book.abbrev === newbook.abbrev) {
                    found = true;
                }
                if (book.id && book.id > newID) {
                    newID = book.id;
                }
            }
            if (!found) {
                const nBook = new Book(newbook);
                nBook.id = newID + 1;
                bible.books.push(nBook);
            }
            const bquery = { _id: new ObjectId(bible._id)};
            const result = await collections.readings?.updateOne(bquery, {$set: bible});
            if (result && result.modifiedCount) {
                res.status(201).json(bible);
                return;
            }
        }
        res.status(204).send("No Change");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// post - add a new version to the bible
bibleRouter.post("/version", auth, async (req: Request, res: Response) => {
    try {
        const newVersion = req.body as IVersion;
        const query = { "reading_type": "bible"};
        const iBibles = await collections.readings?.find(query).toArray() as IBible[];
        if (iBibles && iBibles.length > 0) {
            const bible = new Bible(iBibles[0]);
            let found = false;
            if (bible.versions) {
                for (let i=0; i < bible.versions.length; i++) {
                    const ver = bible.versions[i]
                    if (ver.num === newVersion.num) {
                        found = true;
                        ver.id = newVersion.id;
                        ver.title = newVersion.title;
                        bible.versions[i] = ver;
                    }
                }
            } else {
                bible.versions = new Array();
            }
            if (!found) {
                const ver = new Version(newVersion);
                bible.versions.push(ver);
            }
            const bquery = { _id: bible._id };
            const result = await collections.readings?.updateOne(bquery, { $set: bible });
            if (result && result.modifiedCount) {
                res.status(200).json(bible);
                return;
            }
        }
        res.status(204).send("No Change");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// put - change sort position of a book of the bible
bibleRouter.put("/book/:id", auth, async (req: Request, res: Response) => {
    const oldID = Number(req.params.id);

    try {
        const swapRequest = req.body as SwapRequest;
        const query = { "reading_type": "bible"};
        const iBibles = await collections.readings?.find(query).toArray() as IBible[];
        if (iBibles && iBibles.length > 0) {
            const bible = new Bible(iBibles[0]);
            let moveBook = undefined;
            for (let i=0; i < bible.books.length; i++) {
                const book = bible.books[i];
                if (book.id && book.id === oldID) {
                    moveBook = book;
                }
            }
            const books: Book[] = new Array();
            bible.books.sort((a,b) => a.compareTo(b));
            if (moveBook) {
                while (bible.books.length > 0) {
                    const book = bible.books.shift();
                    if (book) {
                        if (book.id !== moveBook.id) {
                            if (book.id === swapRequest.id) {
                                if (swapRequest.direction.toLowerCase() === "before") {
                                    books.push(moveBook);
                                    books.push(book);
                                } else {
                                    books.push(book);
                                    books.push(moveBook);
                                }
                            }
                        }
                    }
                }
                for (let i = 0; i < books.length; i++) {
                    books[i].id = i + 1;
                }
                bible.books = books;
                const bquery = { _id: bible._id};
                const result = await collections.readings?.updateOne(bquery, { $set: bible});
                if (result && result.modifiedCount) {
                    res.status(200).json(bible);
                    return
                }
            }
        }
        res.status(204).send("No Change");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// delete - remove a book from the bible
bibleRouter.delete("/book/:id", auth, async(req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        const query = { "reading_type": "bible"};
        const iBibles = await collections.readings?.find(query).toArray() as IBible[];
        if (iBibles && iBibles.length > 0) {
            const bible = new Bible(iBibles[0]);
            let pos = -1;
            for (let i=0; i < bible.books.length; i++) {
                if (bible.books[i].id === id) {
                    pos = i;
                }
            }
            if (pos >= 0) {
                bible.books.splice(pos, 1);
                for (let i=0; i < bible.books.length; i++) {
                    bible.books[i].id = i + 1;
                }
            }
            const bquery = { _id: bible._id };
            const result = await collections.readings?.updateOne(bquery, 
                { $set: bible });
            if (result && result.modifiedCount) {
                res.status(200).json(bible);
            }
        }
        res.status(204).send("No Change");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});

// delete - remove a version of the bible
bibleRouter.delete("/version/:id", auth, async(req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        const query = { "reading_type": "bible"};
        const iBibles = await collections.readings?.find(query).toArray() as IBible[];
        if (iBibles && iBibles.length > 0) {
            const bible = new Bible(iBibles[0]);
            if (bible.versions) {
                let pos = -1;
                for (let i=0; i < bible.versions.length; i++) {
                    if (bible.versions[i].num === id) {
                        pos = i;
                    }
                }
                if (pos >= 0) {
                    bible.versions.splice(pos, 1);
                }
                const bquery = { _id: bible._id };
                const result = await collections.readings?.updateOne(bquery, 
                    { $set: bible });
                if (result && result.modifiedCount) {
                    res.status(200).json(bible);
                }
            }
        }
        res.status(204).send("No Change");
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
            return
        }
        res.status(500).send(error);
    }
});