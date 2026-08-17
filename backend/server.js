require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

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
    // The `:id` from frontend is our custom string `REG-XXXX`, not the MongoDB ObjectId
    const updatedReg = await Registration.findOneAndUpdate(
      { id: req.params.id }, 
      req.body, 
      { new: true }
    );
    if (!updatedReg) {
      return res.status(404).json({ error: 'Registration not found' });
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
