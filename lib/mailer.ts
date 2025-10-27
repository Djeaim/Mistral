import nodemailer from 'nodemailer';

export function createTransportFromCreds(creds: {
  host: string;
  port: number;
  user: string;
  pass: string;
}) {
  return nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.port === 465,
    auth: { user: creds.user, pass: creds.pass }
  });
}


