// MUST be first - force IPv4 before any module loads to prevent ENETUNREACH on Render
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'yuva_sammelan_super_secret_2026';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Registration Schema
const registrationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Keeping custom ID from frontend for consistency
  fullName: String,
  mobileNumber: String,
  email: String,
  dateOfBirth: String,
  age: String,
  gender: String,
  bloodGroup: String,
  profession: String,
  institutionName: String,
  companyName: String,
  designation: String,
  businessType: String,
  businessName: String,
  address: String,
  paymentMethod: String,
  cashCollectedBy: String,
  paymentStatus: { type: String, default: 'Pending' },
  registrationStatus: { type: String, default: 'Pending' },
  attendanceStatus: { type: Boolean, default: false },
  emailStatus: { type: String, default: 'Pending' },
  timestamp: { type: Date, default: Date.now }
});

const Registration = mongoose.model('Registration', registrationSchema);

// Email Setup
// family:4 forces IPv4 at TCP socket level - critical fix for Render (IPv6 blocked)
// service:'gmail' was bypassing dns.setDefaultResultOrder, so we use explicit host
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  family: 4, // <-- Force IPv4 at socket level, prevents ENETUNREACH 2607:f8b0... on Render
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    ciphers: 'SSLv3'
  }
});

const sendConfirmationEmail = async (user) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials missing from environment variables');
    }

    const qrPayload = `YS2026:${user.id}`;
    const qrBuffer = await QRCode.toBuffer(qrPayload, { type: 'png', width: 200, margin: 1, errorCorrectionLevel: 'M' });

    const mailOptions = {
      from: `"Yuva Sammelan 2026" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Registration Confirmed - ${user.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
          <h2 style="color: #2e7d32; text-align: center;">Registration Approved!</h2>
          <p>Dear <strong>${user.fullName}</strong>,</p>
          <p>Congratulations! Your payment has been successfully verified, and your registration for Yuva Sammelan 2026 is confirmed.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Registration ID:</strong> ${user.id}</p>
            <p><strong>Mobile:</strong> ${user.mobileNumber}</p>
            <p><strong>Payment Status:</strong> Confirmed</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <h3 style="color: #333; margin-bottom: 10px;">Your Entry Pass</h3>
            <img src="cid:qrcode" alt="Registration QR Code" style="width: 200px; height: 200px; border-radius: 10px; border: 1px solid #ddd;" />
          </div>

          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 25px;">
            <h4 style="margin-top: 0; color: #1565c0;">Basic QR Usage Instructions:</h4>
            <ol style="margin-bottom: 0; color: #333; font-size: 14px; padding-left: 20px; line-height: 1.5;">
              <li>Save this email or take a screenshot of the QR code above.</li>
              <li>When you arrive at the venue, open the QR code on your phone.</li>
              <li>Present it to the volunteers at the entrance desk.</li>
              <li>They will scan it to automatically mark your attendance and grant you entry!</li>
            </ol>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: 'registration-qrcode.png',
          content: qrBuffer,
          cid: 'qrcode'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${user.email} [${info.messageId}]`);
    await Registration.findOneAndUpdate({ id: user.id }, { emailStatus: 'Sent' });
  } catch (error) {
    console.error('Failed to send email:', error);
    const errorMsg = error.message ? error.message.substring(0, 80) : 'Unknown Error';
    await Registration.findOneAndUpdate({ id: user.id }, { emailStatus: `Failed: ${errorMsg}` });
  }
};

// Routes

// Auth Middleware
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    next();
  });
};

// Admin Login
app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@123' && password === 'admin123') {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// Get all registrations (For Admin Panel)
app.get('/registrations', verifyAdmin, async (req, res) => {
  try {
    const registrations = await Registration.find().sort({ timestamp: -1 });
    // Transform _id to id if frontend relies on it, or just pass as is
    // The frontend was using our custom `id` field (REG-XXXX), which we kept in the schema
    res.json(registrations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Get single registration (For Frontend Polling)
app.get('/registrations/:id', async (req, res) => {
  try {
    const reg = await Registration.findOne({ id: req.params.id });
    if (!reg) return res.status(404).json({ error: 'Not found' });
    res.json(reg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch registration' });
  }
});

// Create new registration (For Registration App)
app.post('/registrations', async (req, res) => {
  try {
    const newReg = new Registration(req.body);
    const savedReg = await newReg.save();
    res.status(201).json(savedReg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save registration' });
  }
});

// Update registration (For Admin Panel approval/rejection)
app.patch('/registrations/:id', verifyAdmin, async (req, res) => {
  try {
    const oldReg = await Registration.findOne({ id: req.params.id });
    if (!oldReg) return res.status(404).json({ error: 'Registration not found' });

    const updatedReg = await Registration.findOneAndUpdate(
      { id: req.params.id }, 
      req.body, 
      { new: true }
    );
    
    // Check if it just transitioned to Approved
    if (oldReg.paymentStatus !== 'Approved' && updatedReg.paymentStatus === 'Approved') {
      sendConfirmationEmail(updatedReg);
    }
    
    res.json(updatedReg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update registration' });
  }
});

// Resend Email manually (For Admin Panel)
app.post('/registrations/:id/resend-email', verifyAdmin, async (req, res) => {
  try {
    const reg = await Registration.findOne({ id: req.params.id });
    if (!reg) return res.status(404).json({ error: 'Registration not found' });
    
    if (reg.paymentStatus !== 'Approved') {
      return res.status(400).json({ error: 'Cannot send email before payment is approved' });
    }

    // Set to pending initially so UI can show a loading state if we want, but sendConfirmationEmail will set it to Sent/Failed anyway
    await Registration.findOneAndUpdate({ id: req.params.id }, { emailStatus: 'Pending' });
    
    // We intentionally do not await the email sending so the HTTP request completes quickly
    sendConfirmationEmail(reg);

    res.json({ success: true, message: 'Email sending initiated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend email' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
