export interface ITokenMail {
    created: Date;
    expires: Date;
    purpose: string;
    sendTo: string;
    token: string;
}