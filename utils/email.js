const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  //1) CREATE A TRANSPORTER
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  //2) DEFINE THE EMAIL OPTIONS
  const mailOptions = {
    to: 'Tory Oki <hello>',
    from: options.email,
    subject: options.subject,
    text: options.message,
    // html:
  };
  //3) ACTUALlY SEND THE EMAIL
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
