import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { User, Token } from 'soap-model';

const config = process.env;

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.body.token || req.query.token 
        || req.headers["x-access-token"] || req.headers["authorization"];

    if (!token) {
        return res.status(403).send("A token is required for authentication");
    }
    try {
        const jwtkey = (process.env.JWT_SECRET) ? process.env.JWT_SECRET : "";
        const decoded  = jwt.verify(token, jwtkey) as Token;
        console.log(decoded);
        res.setHeader('userid', decoded.userid);
        res.setHeader('email', decoded.email);
    } catch (err) {
        console.log(err);
    }
}