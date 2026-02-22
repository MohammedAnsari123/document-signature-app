const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text, html }) => {
    // For development, we'll log the email to console if no SMTP vars are set
    if (!process.env.SMTP_HOST) {
        console.log('--- MOCK EMAIL SEND ---');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${text}`);
        console.log('--- END MOCK EMAIL ---');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const info = await transporter.sendMail({
        from: '"DocSign App" <no-reply@docsign.com>',
        to: to,
        subject: subject,
        text: text,
        html: html,
    });

    console.log("Message sent: %s", info.messageId);
};

module.exports = sendEmail;
