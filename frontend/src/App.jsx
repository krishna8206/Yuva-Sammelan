import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import logoImg from './assets/logo.png';
import bannerImg from './assets/banner.jpg';
import phonepeQrImg from './assets/phonepe_qr.png';

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://yuva-sammelan.onrender.com';

function VerifyProfile({ id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/registrations/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <svg className="w-10 h-10 animate-spin text-saffron" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 border-4 border-red-100">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Registration QR</h2>
        <p className="text-gray-500 mb-6">This QR code does not match any registration in our system.</p>
        <button onClick={() => window.location.href = '/'} className="bg-gray-800 text-white px-6 py-2 rounded-lg font-medium">Return Home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-8 animate-slide-up">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden mt-6 md:mt-12 border border-gray-100">
        <div className={`p-8 text-center text-white ${data.paymentStatus === 'Approved' ? 'bg-gradient-to-br from-green-500 to-emerald-700' : data.paymentStatus === 'Rejected' ? 'bg-gradient-to-br from-red-500 to-rose-700' : 'bg-gradient-to-br from-yellow-400 to-orange-500'}`}>
          <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-2 border-white/40 shadow-xl bg-black flex items-center justify-center p-1">
            <img src={logoImg} alt="Yuva Sammelan" className="w-full h-full object-contain" />
          </div>
          <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/30 backdrop-blur-sm">
            {data.paymentStatus}
          </div>
          <h1 className="text-3xl font-bold mb-1">{data.fullName}</h1>
          <p className="opacity-90 font-mono tracking-widest">{data.id}</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Mobile</p>
              <p className="font-semibold text-gray-800">{data.mobileNumber}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Age / Gender</p>
              <p className="font-semibold text-gray-800">{data.age} / {data.gender}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Blood Group</p>
              <p className="font-semibold text-gray-800">{data.bloodGroup || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Profession</p>
              <p className="font-semibold text-gray-800">{data.profession}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Payment & Registration</p>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl mt-2">
              <span className="font-medium text-gray-700">{data.paymentMethod} {data.cashCollectedBy && `(by ${data.cashCollectedBy})`}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${data.registrationStatus === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{data.registrationStatus}</span>
            </div>
          </div>

          <button onClick={() => window.location.href = '/'} className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3.5 px-4 rounded-xl transition-colors">
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const path = window.location.pathname;
  if (path.startsWith('/verify/')) {
    const idToVerify = path.split('/verify/')[1];
    return <VerifyProfile id={idToVerify} />;
  }

  const [registrationId, setRegistrationId] = useState(localStorage.getItem('registrationId') || null);
  const [step, setStep] = useState(registrationId ? 4 : 1);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('registrationFormData');
    return saved ? JSON.parse(saved) : {
      fullName: '',
      mobileNumber: '',
      email: '',
      address: '',
      gender: '',
      dateOfBirth: '',
      age: '',
      bloodGroup: '',
      profession: '',
      institutionName: '',
      companyName: '',
      designation: '',
      businessType: '',
      businessName: '',
      cashCollectedBy: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('registrationFormData', JSON.stringify(formData));
  }, [formData]);

  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? String(age) : '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'dateOfBirth') {
      const calculatedAge = calculateAge(value);
      setFormData(prev => ({
        ...prev,
        dateOfBirth: value,
        age: calculatedAge || prev.age
      }));
      if (errors.dateOfBirth || errors.age) {
        setErrors(prev => ({ ...prev, dateOfBirth: '', age: '' }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // 1. Full Name
    const nameTrimmed = (formData.fullName || '').trim();
    if (!nameTrimmed) {
      newErrors.fullName = 'Full name is required';
    } else if (nameTrimmed.length < 3) {
      newErrors.fullName = 'Full name must be at least 3 characters';
    } else if (!/^[a-zA-Z\s.'-]+$/.test(nameTrimmed)) {
      newErrors.fullName = 'Full name should only contain alphabets';
    }

    // 2. Mobile Number (10 digits starting with 6,7,8,9)
    const rawMobile = (formData.mobileNumber || '').replace(/[\s\-+]/g, '');
    const mobileDigits = rawMobile.startsWith('91') && rawMobile.length === 12 ? rawMobile.slice(2) : rawMobile;
    if (!formData.mobileNumber || !formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(mobileDigits)) {
      newErrors.mobileNumber = 'Enter a valid 10-digit mobile number (e.g. 9876543210)';
    }

    // 3. Email Address
    const emailTrimmed = (formData.email || '').trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailTrimmed) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(emailTrimmed)) {
      newErrors.email = 'Enter a valid email address (e.g. name@example.com)';
    }

    // 4. Date of Birth
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (isNaN(birthDate.getTime()) || birthDate >= today) {
        newErrors.dateOfBirth = 'Date of birth must be a past date';
      }
    }

    // 5. Age
    const ageNum = parseInt(formData.age, 10);
    if (!formData.age || isNaN(ageNum)) {
      newErrors.age = 'Age is required';
    } else if (ageNum < 5 || ageNum > 100) {
      newErrors.age = 'Age must be between 5 and 100';
    }

    // 6. Gender
    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }

    // 7. Blood Group
    if (!formData.bloodGroup) {
      newErrors.bloodGroup = 'Please select your blood group';
    }

    // 8. Profession & specific required sub-fields
    if (!formData.profession) {
      newErrors.profession = 'Please select your profession';
    } else if (formData.profession === 'Study') {
      if (!formData.institutionName || !formData.institutionName.trim()) {
        newErrors.institutionName = 'School / College / University name is required';
      } else if (formData.institutionName.trim().length < 2) {
        newErrors.institutionName = 'Institution name must be at least 2 characters';
      }
    } else if (formData.profession === 'Job') {
      if (!formData.companyName || !formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required';
      } else if (formData.companyName.trim().length < 2) {
        newErrors.companyName = 'Company name must be at least 2 characters';
      }
      if (!formData.designation || !formData.designation.trim()) {
        newErrors.designation = 'Designation / Job Role is required';
      } else if (formData.designation.trim().length < 2) {
        newErrors.designation = 'Designation must be at least 2 characters';
      }
    } else if (formData.profession === 'Business') {
      if (!formData.businessType || !formData.businessType.trim()) {
        newErrors.businessType = 'Business type / category is required';
      } else if (formData.businessType.trim().length < 2) {
        newErrors.businessType = 'Business type must be at least 2 characters';
      }
      if (!formData.businessName || !formData.businessName.trim()) {
        newErrors.businessName = 'Business name is required';
      } else if (formData.businessName.trim().length < 2) {
        newErrors.businessName = 'Business name must be at least 2 characters';
      }
    }

    // 9. Address
    const addressTrimmed = (formData.address || '').trim();
    if (!addressTrimmed) {
      newErrors.address = 'Residential address is required';
    } else if (addressTrimmed.length < 5) {
      newErrors.address = 'Please enter your full address (at least 5 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setStep(2); // Move to Payment Selection
  };

  useEffect(() => {
    const checkStatus = async () => {
      if (!registrationId) return;
      try {
        const res = await fetch(`${API_URL}/registrations/${registrationId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.paymentStatus === 'Approved') {
            setStep(6);
          } else if (data.paymentStatus === 'Rejected') {
            setStep(7);
          }
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    };

    if (registrationId && step === 4) {
      checkStatus(); // Initial immediate check
      const interval = setInterval(checkStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [registrationId, step]);

  const saveRegistration = async (method) => {
    const newId = `REG-${Math.floor(10000 + Math.random() * 90000)}`;
    const payload = {
      ...formData,
      id: newId,
      paymentMethod: method,
      cashCollectedBy: formData.cashCollectedBy,
      paymentStatus: 'Pending',
      registrationStatus: 'Pending',
      timestamp: new Date().toISOString()
    };
    try {
      await fetch(`${API_URL}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      localStorage.setItem('registrationId', newId);
      setRegistrationId(newId);
    } catch (e) {
      console.error("Failed to save registration", e);
    }
  };

  const handlePayment = (method) => {
    if (method === 'Online') {
      setStep(3); // Show QR Code Screen
    } else {
      setStep(5); // Show Cash Collection Details Screen
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-saffron/20 blur-3xl animate-float" style={{ animationDelay: '0s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-india-green/20 blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

      {/* Top Left Corner Logo Branding */}
      <div className="absolute top-3 left-3 sm:top-5 sm:left-6 md:top-6 md:left-8 z-20 flex items-center gap-3 animate-slide-up">
        <div className="relative group cursor-pointer" onClick={() => window.location.href = '/'}>
          <div className="absolute -inset-1 bg-gradient-to-r from-saffron via-amber-500 to-india-green rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-black p-1 shadow-2xl border-2 border-white">
            <img
              src={logoImg}
              alt="Yuva Sammelan Logo"
              className="w-full h-full object-contain rounded-full transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>
      </div>

      {/* Main Event Title */}
      <div className="relative z-10 text-center mb-6 md:mb-8 animate-slide-up">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-3 text-gray-800 tracking-tight drop-shadow-sm">
          Yuva <span className="text-transparent bg-clip-text bg-gradient-to-r from-saffron via-[#d48c3e] to-india-green">Sammelan</span>
        </h1>
        <p className="text-gray-600 font-medium sm:text-lg max-w-2xl mx-auto px-4">
          Empowering the youth to build a stronger, brighter future for the nation.
        </p>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 flex flex-col md:flex-row animate-slide-up relative z-10" style={{ animationDelay: '0.1s' }}>

        {/* Left Side - Image & Banner */}
        <div className="w-full md:w-5/12 relative overflow-hidden group min-h-[320px] md:min-h-full bg-slate-900 flex items-center justify-center">
          <img
            src={bannerImg}
            alt="Yuva Sammelan 2026 Poster"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-12 bg-white flex flex-col">
          <div className="mb-6 text-center md:text-left border-b border-gray-100 pb-5">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              {step === 1 ? 'Registration Form' :
                step === 2 ? 'Payment Method' :
                  step === 3 ? 'Complete Payment' :
                    step === 4 ? 'Verification Pending' :
                      step === 5 ? 'Cash Details' :
                        step === 6 ? 'Success' : 'Registration Failed'}
            </h2>
            <p className="text-gray-500 text-sm">
              {step === 1 ? 'Join the movement. Fill in your details below.' :
                step === 2 ? 'Please select your preferred payment method.' :
                  step === 3 ? 'Scan the QR code below to pay the registration fee.' :
                    step === 4 ? 'Your registration is currently under review.' :
                      step === 5 ? 'Provide collector details' :
                        step === 6 ? 'You are successfully registered.' : 'Your registration was rejected.'}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg text-xs text-red-700 font-medium animate-slide-up flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  <span>Please fill in all required fields accurately before proceeding.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 pl-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Rahul Kumar"
                    className={`input-field py-2 px-3 ${errors.fullName ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                  />
                  {errors.fullName && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.fullName}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 pl-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    maxLength="10"
                    placeholder="9876543210"
                    className={`input-field py-2 px-3 ${errors.mobileNumber ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                  />
                  {errors.mobileNumber && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.mobileNumber}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 pl-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="rahul@example.com"
                    className={`input-field py-2 px-3 ${errors.email ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                  />
                  {errors.email && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.email}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 pl-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className={`input-field py-2 px-3 text-gray-600 ${errors.dateOfBirth ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                  />
                  {errors.dateOfBirth && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.dateOfBirth}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 pl-1">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    min="5"
                    max="100"
                    placeholder="18"
                    className={`input-field py-2 px-3 ${errors.age ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                  />
                  {errors.age && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.age}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 pl-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={`input-field py-2 px-3 bg-white ${errors.gender ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.gender && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.gender}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 pl-1">
                    Blood Group <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    className={`input-field py-2 px-3 bg-white ${errors.bloodGroup ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                  >
                    <option value="" disabled>Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                  {errors.bloodGroup && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.bloodGroup}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 pl-1">
                    Profession <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="profession"
                    value={formData.profession}
                    onChange={handleChange}
                    className={`input-field py-2 px-3 bg-white ${errors.profession ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                  >
                    <option value="" disabled>Select Profession</option>
                    <option value="Study">Study</option>
                    <option value="Job">Job</option>
                    <option value="Business">Business</option>
                  </select>
                  {errors.profession && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.profession}</p>}
                </div>
              </div>

              {/* Dynamic Profession-Based Fields - All Required */}
              {formData.profession === 'Study' && (
                <div className="space-y-1 animate-slide-up">
                  <label className="text-sm font-semibold text-gray-700 pl-1">
                    School / College / University Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="institutionName"
                    value={formData.institutionName}
                    onChange={handleChange}
                    placeholder="Where do you study?"
                    className={`input-field py-2 px-3 ${errors.institutionName ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                  />
                  {errors.institutionName && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.institutionName}</p>}
                </div>
              )}

              {formData.profession === 'Job' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 pl-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Enter company name"
                      className={`input-field py-2 px-3 ${errors.companyName ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                    />
                    {errors.companyName && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.companyName}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 pl-1">
                      Designation / Role <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      placeholder="E.g. Software Engineer"
                      className={`input-field py-2 px-3 ${errors.designation ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                    />
                    {errors.designation && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.designation}</p>}
                  </div>
                </div>
              )}

              {formData.profession === 'Business' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 pl-1">
                      Business Type / Industry <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      placeholder="E.g. Retail, Tech, Food"
                      className={`input-field py-2 px-3 ${errors.businessType ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                    />
                    {errors.businessType && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.businessType}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 pl-1">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="Enter business name"
                      className={`input-field py-2 px-3 ${errors.businessName ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                    />
                    {errors.businessName && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.businessName}</p>}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 pl-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Enter your full residential address..."
                  className={`input-field resize-none py-2 px-3 ${errors.address ? 'border-red-500 bg-red-50/20 focus:ring-red-400' : ''}`}
                ></textarea>
                {errors.address && <p className="text-xs text-red-500 font-medium pl-1 mt-0.5">{errors.address}</p>}
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-gradient-to-r from-saffron via-[#ffb066] to-india-green hover:from-saffron-dark hover:to-india-green-light text-white font-bold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center">
                  Continue to Payment
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                  </svg>
                </span>
                <div className="absolute inset-0 bg-white/20 group-hover:bg-transparent transition-colors duration-300"></div>
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                By submitting this form, you agree to our terms and conditions.
              </p>
            </form>
          ) : step === 2 ? (
            <div className="flex flex-col flex-1 justify-center space-y-6 max-w-sm mx-auto w-full animate-slide-up">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6 text-center shadow-sm relative overflow-hidden">
                <p className="text-gray-500 text-sm font-medium mb-1 uppercase tracking-wider">Registration Amount</p>
                <p className="text-4xl font-black text-gray-800">₹20</p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => handlePayment('Online')}
                  className="w-full group relative bg-white border-2 border-gray-100 hover:border-saffron/50 rounded-2xl p-5 flex items-center text-left transition-all duration-300 hover:shadow-lg overflow-hidden"
                >
                  <div className="absolute inset-0 bg-saffron/5 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></div>
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                  </div>
                  <div className="flex-1 relative z-10">
                    <h3 className="font-bold text-gray-800 text-lg">Pay Online</h3>
                    <p className="text-gray-500 text-sm">UPI, GPay, PhonePe, Paytm</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-saffron transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>

                <button
                  onClick={() => handlePayment('Cash')}
                  className="w-full group relative bg-white border-2 border-gray-100 hover:border-india-green/50 rounded-2xl p-5 flex items-center text-left transition-all duration-300 hover:shadow-lg overflow-hidden"
                >
                  <div className="absolute inset-0 bg-india-green/5 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></div>
                  <div className="bg-green-50 text-green-600 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                  </div>
                  <div className="flex-1 relative z-10">
                    <h3 className="font-bold text-gray-800 text-lg">Pay with Cash</h3>
                    <p className="text-gray-500 text-sm">Pay physically at the venue</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-india-green transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
              </div>

              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center text-gray-500 hover:text-gray-800 font-medium py-2 px-4 transition-colors mt-2 w-max mx-auto group"
              >
                <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                Back to Registration
              </button>
            </div>
          ) : step === 3 ? (
            <div className="flex flex-col flex-1 justify-center space-y-6 max-w-sm mx-auto w-full items-center animate-slide-up">
              <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-lg relative overflow-hidden w-full text-center">
                <div className="rounded-2xl overflow-hidden shadow-inner border border-gray-100 bg-gray-50/50 p-4 flex justify-center items-center">
                  <img
                    src={phonepeQrImg}
                    alt="Payment QR Code"
                    className="w-full max-w-[260px] h-auto object-contain rounded-xl"
                  />
                </div>
              </div>

              <button
                onClick={() => { saveRegistration('Online'); setStep(4); }}
                className="w-full bg-gradient-to-r from-saffron via-[#ffb066] to-india-green hover:from-saffron-dark hover:to-india-green-light text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center text-lg">
                  I have paid ₹20
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </span>
              </button>

              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center justify-center text-gray-500 hover:text-gray-800 font-medium py-2 px-4 transition-colors w-max mx-auto group text-sm"
              >
                <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                Choose another method
              </button>
            </div>
          ) : step === 5 ? (
            <div className="flex flex-col flex-1 justify-center space-y-6 max-w-sm mx-auto w-full animate-slide-up">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Cash Collection Details</h3>
                <p className="text-gray-500 text-sm">Please enter the name of the volunteer or person who collected your cash.</p>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 pl-1">Cash Collected By</label>
                  <input
                    type="text"
                    name="cashCollectedBy"
                    value={formData.cashCollectedBy}
                    onChange={handleChange}
                    required
                    placeholder="Enter collector's name"
                    className="input-field py-3 px-4 w-full"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!formData.cashCollectedBy) {
                    alert('Please enter who collected the cash');
                    return;
                  }
                  saveRegistration('Cash');
                  setStep(4);
                }}
                className="w-full bg-gradient-to-r from-india-green via-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center text-lg">
                  Submit Payment Details
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </span>
              </button>

              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center justify-center text-gray-500 hover:text-gray-800 font-medium py-2 px-4 transition-colors w-max mx-auto group mt-2"
              >
                <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                Choose another method
              </button>
            </div>
          ) : step === 6 ? (
            <div className="flex flex-col flex-1 justify-center space-y-5 max-w-sm mx-auto w-full items-center animate-slide-up text-center">
              <h3 className="text-2xl font-bold text-gray-800">Registration Approved!</h3>

              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 shadow-sm w-full">
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Congratulations! Your registration is confirmed. Please present this QR code at the venue.
                </p>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 inline-block">
                  <QRCode value={`YS2026:${registrationId}`} size={160} />
                </div>
                <p className="font-mono font-bold text-gray-700 tracking-wider text-sm mt-3">{registrationId}</p>
              </div>

              <button
                onClick={() => {
                  localStorage.removeItem('registrationId');
                  localStorage.removeItem('registrationFormData');
                  setRegistrationId(null);
                  setStep(1);
                  window.location.reload();
                }}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg mt-2 transition-all duration-300"
              >
                Register Another Person
              </button>
            </div>
          ) : step === 7 ? (
            <div className="flex flex-col flex-1 justify-center space-y-6 max-w-sm mx-auto w-full items-center animate-slide-up text-center">
              <div className="w-24 h-24 bg-red-50 border-4 border-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-800">Registration Rejected</h3>

              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 shadow-sm">
                <p className="text-gray-600 text-sm leading-relaxed">
                  We're sorry, but your payment could not be verified by the admin. Please try again or contact support.
                </p>
              </div>

              <button
                onClick={() => {
                  localStorage.removeItem('registrationId');
                  localStorage.removeItem('registrationFormData');
                  setRegistrationId(null);
                  setStep(1);
                  window.location.reload();
                }}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg mt-2 transition-all duration-300"
              >
                Start Over
              </button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 justify-center space-y-5 max-w-sm mx-auto w-full items-center animate-slide-up text-center">
              <div className="w-20 h-20 bg-blue-50 border-4 border-blue-100 rounded-full flex items-center justify-center mb-1">
                <svg className="w-10 h-10 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">Payment Under Verification</h3>
                {registrationId && (
                  <p className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full inline-block border border-blue-200">
                    ID: {registrationId}
                  </p>
                )}
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="text-gray-600 text-sm leading-relaxed">
                  Your registration is submitted and currently under review. This page will automatically update once the admin approves or rejects your payment.
                </p>
              </div>

              <div className="text-gray-500 text-xs flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin text-saffron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Waiting for Admin approval...
              </div>

              <div className="pt-2 w-full">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('registrationId');
                    localStorage.removeItem('registrationFormData');
                    setRegistrationId(null);
                    setStep(1);
                  }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  <span>Start New Registration / Back to Form</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
