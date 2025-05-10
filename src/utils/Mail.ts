import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'Gmail', // or any email service you are using
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTP = async (email: string, tempToken: string) => {
  const loginUrl = `${process.env.FRONTEND_URL}/initial-login/${tempToken}`;
    
  const message = `
    <h1>Welcome to Hospital Task Management System</h1>
    <p>You have been registered by an administrator.</p>
    <p>Please click the link below to log in and set your password:</p>
    <a href="${loginUrl}" target="_blank">Login Now</a>
    <p>This link is valid for 24 hours.</p>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Welcome to Wale Hospital Task Management System',
    html: message, // Changed from text to html to render the HTML content
  });
};
