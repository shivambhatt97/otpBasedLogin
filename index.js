require('dotenv').config()
const express = require('express');
const mongoose= require('mongoose');
const db= require('./config/mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');



const app = express();
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());
const OTP = require('./models/otpschema');
const User = require('./models/userSchema');

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'kory.aufderhar5@ethereal.email',
        pass: 'Z7JaPBr7Fe7r1b2WpH'
    }
});
  function generateJWTToken(email) {
    const secretKey = process.env.YOUR_SECRET_KEY;
  
    const payload = {
      email,
      // Add additional payload data if needed
    };
  
    const options = {
      expiresIn: '1h', // Token expiration time
    };
  
    const token = jwt.sign(payload, secretKey, options);
  
    return token;
  }
  


  app.post('/generate-otp', async (req, res) => {
    const { email } = req.body;
  
    // Check if there is an existing OTP for the email in the last 1 minute
    const lastMinute = new Date(Date.now() - 1 * 60 * 1000);
    const existingOTP = await OTP.findOne({ email, createdAt: { $gte: lastMinute }, isUsed: false });
  
    if (existingOTP) {
      return res.status(400).json({ message: 'Please wait for 1 minute before generating a new OTP.' });
    }
  
    // Check if the user is blocked
    const user = await User.findOne({ email });
  
    if (user && user.blockedUntil && user.blockedUntil > new Date()) {
      return res.status(403).json({ message: 'User is blocked. Please try again after 1 hour.' });
    }
  
    // Generate a new OTP
    const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
  
    // Save the email and OTP in the database
    const otpData = new OTP({ email, otp });
    await otpData.save();
  
    // Send the OTP to the user via email
    const mailOptions = {
      from: 'kory.aufderhar5@ethereal.email',
      to: email,
      subject: 'OTP Verification',
      text: `Your OTP is: ${otp}`,
    };
  
    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Error sending OTP email.' });
      }
  
      return res.status(200).json({ message: 'OTP generated successfully.' });
    });
  });
  
  app.post('/login', async (req, res) => {
    const { email, otp } = req.body;
  
    // Find the latest unused OTP for the email
    const latestOTP = await OTP.findOne({ email, isUsed: false }).sort({ createdAt: -1 });
  
    if (!latestOTP) {
      return res.status(400).json({ message: 'OTP not found. Please generate a new OTP.' });
    }
  
    // Check if OTP is valid
    const otpValidityDuration = 5 * 60 * 1000; // 5 minutes
    const otpExpirationTime = new Date(latestOTP.createdAt.getTime() + otpValidityDuration);
  
    if (otpExpirationTime < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please generate a new OTP.' });
    }
  
    if (otp !== latestOTP.otp) {
      // Increment consecutive wrong attempts
      await User.findOneAndUpdate({ email }, { $inc: { consecutiveWrongAttempts: 1 } });
  
      // Check if the user reached the maximum wrong attempts
      const maxWrongAttempts = 5;
      const user = await User.findOneAndUpdate(
        { email, consecutiveWrongAttempts: { $gte: maxWrongAttempts - 1 } },
        { $set: { blockedUntil: new Date(Date.now() + 1 * 60 * 60 * 1000) } },
      );
  
      if (user) {
        return res.status(403).json({ message: 'User is blocked. Please try again after 1 hour.' });
      }
  
      return res.status(400).json({ message: 'Invalid OTP.' });
    }
  
    // Mark OTP as used
    await OTP.findByIdAndUpdate(latestOTP._id, { isUsed: true });
  
    // Reset consecutive wrong attempts
    await User.findOneAndUpdate({ email }, { consecutiveWrongAttempts: 0 });
  
    // Generate JWT token (implement your logic here)
    const token = generateJWTToken(email);
  
    return res.status(200).json({ token });
  });
  
  // Start the server
  app.listen(3000, () => {
    console.log('Server is running on port 3000');
  });