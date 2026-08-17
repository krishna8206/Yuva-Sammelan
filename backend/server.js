require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 5000;

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
  timestamp: { type: Date, default: Date.now }
});

const Registration = mongoose.model('Registration', registrationSchema);

// Email Setup (Ethereal for testing, can be swapped to real SMTP)
let transporter;
nodemailer.createTestAccount((err, account) => {
  if (err) {
    console.error('Failed to create a testing email account. ' + err.message);
    return;
  }
  transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass
    }
  });
  console.log('✅ Ethereal Email Transporter Ready (Simulated Emails)');
});

const sendConfirmationEmail = async (user) => {
  if (!transporter) return;
  
  try {
    const verifyUrl = `${process.env.FRONTEND_URL || 'https://yuva-sammelan.vercel.app'}/verify/${user.id}`;
    const qrBuffer = await QRCode.toBuffer(verifyUrl, { type: 'png', width: 300 });

    const mailOptions = {
      from: '"Yuva Sammelan 2026" <noreply@yuvasammelan.com>',
      to: user.email,
      subject: `Registration Confirmed - ${user.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
          <h2 style="color: #2e7d32; text-align: center;">Registration Approved!</h2>
          <p>Dear <strong>${user.fullName}</strong>,</p>
          <p>Congratulations! Your payment has been successfully verified, and your registration for Yuva Sammelan 2026 is confirmed.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Registration ID:</strong> ${user.id}</p>
            <p><strong>Mobile:</strong> ${user.mobileNumber}</p>
            <p><strong>Payment Method:</strong> ${user.paymentMethod}</p>
          </div>
          <p style="text-align: center; color: #555;">Please present the attached QR Code at the venue for quick attendance verification.</p>
          
          <div style="text-align: center; margin-top: 20px;">
            <img src="cid:qrcode" alt="Registration QR Code" style="width: 200px; height: 200px; border-radius: 10px; border: 1px solid #ddd;" />
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
    console.log(`📧 Simulated Email sent to ${user.email}`);
    console.log(`🔗 PREVIEW IN BROWSER: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

// Routes

// Get all registrations (For Admin Panel)
app.get('/registrations', async (req, res) => {
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
app.patch('/registrations/:id', async (req, res) => {
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

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
