import * as dotenv from 'dotenv';
import * as mailer from 'nodemailer';
import { ITokenMail } from '../model/mail';

export async function sendMail(message: ITokenMail ): Promise<mailer.SentMessageInfo> {
    dotenv.config();

    const mailConfig = {
        host: (process.env.SMTP_SERVER) ? process.env.SMTP_SERVER : "node-server",
        port: (process.env.SMTP_PORT) ? Number(process.env.SMTP_PORT) : 25,
        secure: true,
        auth: {
            user: (process.env.SMTP_USER) ? process.env.SMTP_USER : "anom",
            pass: (process.env.SMTP_PASSWORD) ? process.env.SMTP_PASSWORD : ""
        }
    }

    const transporter = mailer.createTransport(mailConfig)

    const fromName = (process.env.SMTP_FROM_NAME) 
        ? process.env.SMTP_FROM_NAME : "administration";
    const fromEmail = (process.env.SMTP_FROM_EMAIL) 
        ? process.env.SMTP_FROM_EMAIL : "administration@osanscheduler.com";
    
    const text = `
    Soap Journaler ${message.purpose} Token
    
    Use the token below to authenticate the action: ${message.purpose}\n
    Created: ${message.created}\n
    Expires: ${message.expires}\n
    Token: ${message.token}`;
    const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>Document</title>
      <style>
        .card {
          border-width: 1px;
          border-style: solid;
          border-color: #E0E0E0;
          border-radius: 3px;
          padding: 16px;
          max-width: 512px;
          margin-left: auto;
          margin-right: auto;
        }
        .title {
          color: #202124;
          width: 100%;
        }
        ul {
          color: #202124;
        }
        .token {
            color: blue;
            font-size: 14pt;
            font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="title">
          <h2> Soap Journaler ${message.purpose} Token</h2>
        </div>
      
        <strong>Use the token below to authenticate the action: ${message.purpose}</strong>
        <ul>
          <li> <strong>Created: </strong>${message.created}</li>
          <li> <strong>Token Expires: </strong>${message.expires}</li>
          <li> <strong>Purpose: </strong>${message.purpose}</li>
        </ul>
        <br>
        <div class="token">${message.token}</div> 
        <br>
        <div style="color: #757575; margin-left: auto;  margin-right: auto; text-align: center;">
          <small>This email was automatically created, DON'T REPLY!</small>
        </div>
      </div>
    </body>
    </html>`;

    const mailOptions = {
        from: fromName + ' <' + fromEmail + '>',
        to: message.sendTo,
        subject: `${message.purpose} Token`,
        text: text,
        hmtl: html,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
}