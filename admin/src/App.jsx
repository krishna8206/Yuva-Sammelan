import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';
import * as XLSX from 'xlsx';
// Dynamically point to localhost when testing locally, and Render when live
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://yuva-sammelan.onrender.com';
function App() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedReg, setScannedReg] = useState(null);
  const [lastScannedId, setLastScannedId] = useState(null);
  const [activeTab, setActiveTab] = useState('approvals');
  const [sendingEmailIds, setSendingEmailIds] = useState(new Set());

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Check for token on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAuthenticated(true);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchRegistrations = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/registrations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
        return;
      }

      const data = await response.json();
      setRegistrations(data);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRegistrations();
    }
  }, [isAuthenticated]);

  const updatePaymentStatus = async (id, status, extraData = {}) => {
    const token = localStorage.getItem('adminToken');
    try {
      // Optimistically update if approved
      if (status === 'Approved') {
        setRegistrations(prev => prev.map(r => r.id === id ? { ...r, paymentStatus: 'Approved', emailStatus: 'Pending' } : r));
        setSendingEmailIds(prev => new Set(prev).add(id));
      }
      
      await fetch(`${API_URL}/registrations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          paymentStatus: status,
          registrationStatus: status === 'Approved' ? 'Confirmed' : 'Pending',
          ...extraData
        }),
      });
      
      if (status === 'Approved') {
        // Fast targeted polling for status update
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const res = await fetch(`${API_URL}/registrations/${id}`);
            if (res.ok) {
              const updated = await res.json();
              if (updated && updated.emailStatus !== 'Pending') {
                setRegistrations(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
                setSendingEmailIds(prev => {
                  const next = new Set(prev);
                  next.delete(id);
                  return next;
                });
                clearInterval(interval);
                return;
              }
            }
          } catch (e) {
            console.error(e);
          }
          if (attempts >= 6) {
            clearInterval(interval);
            setSendingEmailIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            fetchRegistrations();
          }
        }, 1200);
      } else {
        fetchRegistrations();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setSendingEmailIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchRegistrations();
    }
  };

  const updateAttendance = async (id, status) => {
    const token = localStorage.getItem('adminToken');
    try {
      await fetch(`${API_URL}/registrations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ attendanceStatus: status }),
      });
      fetchRegistrations();
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  const resendEmail = async (id) => {
    const token = localStorage.getItem('adminToken');
    try {
      setSendingEmailIds(prev => new Set(prev).add(id));
      
      const response = await fetch(`${API_URL}/registrations/${id}/resend-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to resend');
      }
      
      // Fast targeted polling
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch(`${API_URL}/registrations/${id}`);
          if (res.ok) {
            const updated = await res.json();
            if (updated && updated.emailStatus !== 'Pending') {
              setRegistrations(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
              setSendingEmailIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
              clearInterval(interval);
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }
        if (attempts >= 6) {
          clearInterval(interval);
          setSendingEmailIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          fetchRegistrations();
        }
      }, 1200);
      
    } catch (error) {
      console.error('Error resending email:', error);
      setSendingEmailIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchRegistrations();
    }
  };

  const exportToExcel = () => {
    if (registrations.length === 0) {
      alert('No registration data available to export.');
      return;
    }

    const formatRow = (reg, index) => ({
      'S.No': index + 1,
      'Registration ID': reg.id || '',
      'Registration Date': reg.timestamp ? new Date(reg.timestamp).toLocaleDateString() : '',
      'Full Name': reg.fullName || '',
      'Mobile Number': reg.mobileNumber || '',
      'Email': reg.email || '',
      'Date of Birth': reg.dateOfBirth || '',
      'Age': reg.age || '',
      'Gender': reg.gender || '',
      'Blood Group': reg.bloodGroup || '',
      'Profession': reg.profession || '',
      'Institution Name': reg.institutionName || '',
      'Company Name': reg.companyName || '',
      'Designation': reg.designation || '',
      'Business Name': reg.businessName || '',
      'Business Type': reg.businessType || '',
      'Address': reg.address || '',
      'Payment Method': reg.paymentMethod || '',
      'Cash Collected By': reg.cashCollectedBy || '',
      'Payment Status': reg.paymentStatus || '',
      'Registration Status': reg.registrationStatus || '',
      'Attendance': reg.attendanceStatus ? 'Present' : 'Absent',
      'Email Status': reg.emailStatus || ''
    });

    const createSheetWithColWidths = (data) => {
      const worksheet = XLSX.utils.json_to_sheet(data);
      if (data.length > 0 && !data[0].Message) {
        const colWidths = Object.keys(data[0]).map(key => {
          const maxLen = Math.max(
            key.length,
            ...data.map(row => (row[key] ? String(row[key]).length : 0))
          );
          return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
        });
        worksheet['!cols'] = colWidths;
      }
      return worksheet;
    };

    const workbook = XLSX.utils.book_new();

    // Sheet 1: All Registrations
    const allFormatted = registrations.map(formatRow);
    const regWorksheet = createSheetWithColWidths(allFormatted);
    XLSX.utils.book_append_sheet(workbook, regWorksheet, 'All Registrations');

    // Sheet 2: Marked Attendance (Present students)
    const attendedList = registrations.filter(r => r.attendanceStatus);
    const attendedFormatted = attendedList.map(formatRow);
    const attWorksheet = createSheetWithColWidths(
      attendedFormatted.length > 0 ? attendedFormatted : [{ Message: 'No attendees checked in yet' }]
    );
    XLSX.utils.book_append_sheet(workbook, attWorksheet, 'Marked Attendance');

    // Sheet 3: Approved Registrations
    const approvedList = registrations.filter(r => r.paymentStatus === 'Approved');
    const approvedFormatted = approvedList.map(formatRow);
    const appWorksheet = createSheetWithColWidths(
      approvedFormatted.length > 0 ? approvedFormatted : [{ Message: 'No approved registrations yet' }]
    );
    XLSX.utils.book_append_sheet(workbook, appWorksheet, 'Approved Registrations');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Yuva_Sammelan_Report_${dateStr}.xlsx`);
  };

  const handleScan = (result) => {
    if (!result) return;
    const code = Array.isArray(result) ? result[0].rawValue : result;
    if (code.startsWith('YS2026:')) {
      const id = code.split(':')[1];
      if (id === lastScannedId) return; // Prevent multiple scans
      
      setLastScannedId(id);
      
      const reg = registrations.find(r => r.id === id);
      if (reg) {
        setScannedReg(reg);
        setScannerOpen(false); // Close the scanner modal
        // Automatically check in if not already checked in
        if (!reg.attendanceStatus) {
          updateAttendance(id, true);
        }
      } else {
        alert('Registration not found for this QR code.');
      }
    } else {
      alert('Invalid QR code format. Expected Yuva Sammelan QR.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('adminToken', data.token);
        setIsAuthenticated(true);
        setLoginError('');
      } else {
        setLoginError('Invalid email or password');
      }
    } catch (err) {
      setLoginError('Network error. Backend might not be running.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
          <div className="text-center mb-8">
            <div className="bg-saffron text-white p-3 rounded-xl shadow-sm inline-block mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Login</h1>
            <p className="text-gray-500 mt-2 text-sm">Please enter your credentials to continue</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="admin@123"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            
            {loginError && <p className="text-red-500 text-sm text-center font-medium">{loginError}</p>}
            
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  const displayedRegistrations = activeTab === 'approvals' 
    ? registrations 
    : registrations.filter(r => r.attendanceStatus);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-saffron text-white p-1.5 sm:p-2 rounded-lg shadow-sm">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <h1 className="text-base sm:text-xl font-bold text-gray-800 leading-tight">Yuva<br className="sm:hidden" /> Sammelan</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md shadow-sm hover:bg-blue-700 font-medium text-xs sm:text-sm"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span>Scan QR</span>
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('adminToken');
                setIsAuthenticated(false);
                setEmail('');
                setPassword('');
              }}
              className="text-gray-500 hover:text-red-600 font-medium text-xs sm:text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        
        {/* Metric Cards Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Registrations</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{registrations.length}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Marked Attendance</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{registrations.filter(r => r.attendanceStatus).length}</p>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex w-full sm:w-auto bg-gray-200/50 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('approvals')}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === 'approvals' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Registration<span className="hidden sm:inline"> Approvals</span>
              </button>
              <button 
                onClick={() => setActiveTab('attendance')}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === 'attendance' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Attendance
              </button>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
              <button 
                onClick={exportToExcel}
                title="Download Excel Report with All Registrations & Attendance"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-medium shadow-sm transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span>Download Excel</span>
              </button>
              <button 
                onClick={fetchRegistrations} 
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium px-2 py-1.5 rounded hover:bg-blue-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>
          
          <div className="bg-white">
            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-gray-100">
              {loading ? (
                 <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
              ) : displayedRegistrations.length === 0 ? (
                 <div className="p-8 text-center text-gray-500 text-sm">No registrations found.</div>
              ) : (
                displayedRegistrations.map((reg) => (
                  <div key={reg.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-800">{reg.fullName}</div>
                        <div className="text-gray-500 text-xs">{reg.mobileNumber}</div>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                        {reg.profession}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      <span className="font-mono">{reg.id}</span>
                      <span>{new Date(reg.timestamp).toLocaleDateString()}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400">Payment Method</span>
                        <span className="font-medium text-gray-700 flex items-center gap-1">
                          {reg.paymentMethod}
                        </span>
                        {reg.paymentMethod === 'Cash' && reg.paymentStatus === 'Pending' && !reg.cashCollectedBy && (
                          <input 
                            type="text" 
                            placeholder="Collected By" 
                            className="mt-1 border border-gray-200 rounded p-1 w-full text-[10px]"
                            id={`mobile-collector-${reg.id}`}
                          />
                        )}
                        {reg.cashCollectedBy && (
                          <div className="text-[10px] text-gray-500 mt-1">By: {reg.cashCollectedBy}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex w-max items-center px-2 py-0.5 rounded font-medium ${
                          reg.paymentStatus === 'Approved' ? 'bg-green-100 text-green-700' :
                          reg.paymentStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          Pay: {reg.paymentStatus}
                        </span>
                        <span className={`inline-flex w-max items-center px-2 py-0.5 rounded font-medium ${
                          reg.registrationStatus === 'Confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          Reg: {reg.registrationStatus}
                        </span>
                        {reg.attendanceStatus && (
                          <span className="inline-flex w-max items-center px-2 py-0.5 rounded font-medium bg-indigo-100 text-indigo-700">
                            Attended: Yes
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100 flex justify-end gap-2 items-center">
                      {reg.paymentStatus === 'Pending' ? (
                        <>
                          <button
                            onClick={() => {
                              const collector = reg.paymentMethod === 'Cash' 
                                ? (reg.cashCollectedBy || document.getElementById(`mobile-collector-${reg.id}`)?.value)
                                : '';
                              if (reg.paymentMethod === 'Cash' && !collector) {
                                alert('Please enter who collected the cash before approving.');
                                return;
                              }
                              updatePaymentStatus(reg.id, 'Approved', { cashCollectedBy: collector });
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updatePaymentStatus(reg.id, 'Rejected')}
                            className="px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <>
                          {reg.paymentStatus === 'Approved' && (
                            <button
                              onClick={() => resendEmail(reg.id)}
                              disabled={sendingEmailIds.has(reg.id)}
                              className="px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                              {sendingEmailIds.has(reg.id) ? 'Sending...' : 'Resend Email'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold text-xs">
                <tr>
                  <th className="px-6 py-4">ID / Date</th>
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Profession</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Status & Attendance</th>
                  <th className="px-6 py-4 text-center">QR Code</th>
                  <th className="px-6 py-4 text-right">Approval Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      Loading registrations...
                    </td>
                  </tr>
                ) : displayedRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No registrations found in this section.
                    </td>
                  </tr>
                ) : (
                  displayedRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono text-gray-800 font-medium">{reg.id}</div>
                        <div className="text-xs text-gray-400 mt-1">{new Date(reg.timestamp).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800">{reg.fullName}</div>
                        <div className="text-gray-500 text-xs mt-1">{reg.mobileNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {reg.profession}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {reg.paymentMethod === 'Online' ? (
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                          ) : (
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                          )}
                          <span className="font-medium text-gray-700">{reg.paymentMethod}</span>
                        </div>
                        {reg.paymentMethod === 'Cash' && reg.paymentStatus === 'Pending' && !reg.cashCollectedBy && (
                          <input 
                            type="text" 
                            placeholder="Collected By (Name)" 
                            className="mt-2 text-xs border border-gray-200 rounded p-1 w-full"
                            id={`collector-${reg.id}`}
                          />
                        )}
                        {reg.cashCollectedBy && (
                          <div className="text-xs text-gray-500 mt-1">Collected by: {reg.cashCollectedBy}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex w-max items-center px-2 py-1 rounded text-xs font-medium ${
                            reg.paymentStatus === 'Approved' ? 'bg-green-100 text-green-700' :
                            reg.paymentStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            Pay: {reg.paymentStatus}
                          </span>
                          <span className={`inline-flex w-max items-center px-2 py-1 rounded text-xs font-medium ${
                            reg.registrationStatus === 'Confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            Reg: {reg.registrationStatus}
                          </span>
                          <span className={`inline-flex w-max items-center px-2 py-1 rounded text-xs font-medium ${
                            reg.attendanceStatus ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            Attended: {reg.attendanceStatus ? 'Yes' : 'No'}
                          </span>
                          {reg.paymentStatus === 'Approved' && (
                            <span className={`inline-flex w-max items-center px-2 py-1 rounded text-xs font-medium ${
                              reg.emailStatus === 'Sent' ? 'bg-green-100 text-green-700' : 
                              reg.emailStatus === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              Email: {reg.emailStatus || 'Pending'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center align-middle">
                        {reg.registrationStatus === 'Confirmed' ? (
                          <div className="flex justify-center bg-white p-1 rounded border border-gray-200 inline-block">
                            <QRCode value={`YS2026:${reg.id}`} size={64} />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {reg.paymentStatus === 'Pending' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                const collector = reg.paymentMethod === 'Cash' 
                                  ? (reg.cashCollectedBy || document.getElementById(`collector-${reg.id}`)?.value)
                                  : '';
                                if (reg.paymentMethod === 'Cash' && !collector) {
                                  alert('Please enter who collected the cash before approving.');
                                  return;
                                }
                                updatePaymentStatus(reg.id, 'Approved', { cashCollectedBy: collector });
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updatePaymentStatus(reg.id, 'Rejected')}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 hover:text-red-600 hover:border-red-300 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2 items-center">
                            {reg.paymentStatus === 'Approved' && (
                              <button
                                onClick={() => resendEmail(reg.id)}
                                disabled={sendingEmailIds.has(reg.id)}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50 transition-colors"
                              >
                                {sendingEmailIds.has(reg.id) ? 'Sending...' : 'Resend Email'}
                              </button>
                            )}
                            <span className="text-gray-400 text-xs italic">Action taken</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </main>

      {/* Scanner Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="font-semibold text-lg">Scan Student QR</h3>
              <button onClick={() => { setScannerOpen(false); setLastScannedId(null); }} className="text-gray-500 hover:text-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-4 bg-black">
              <Scanner onScan={handleScan} />
            </div>
          </div>
        </div>
      )}

      {/* Scanned Result Modal */}
      {scannedReg && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden p-6">
            <h3 className="font-bold text-xl mb-4 text-center">Scan Successful!</h3>
            <div className="space-y-3 mb-6">
              <p><strong>Name:</strong> {scannedReg.fullName}</p>
              <p><strong>ID:</strong> {scannedReg.id}</p>
              <p><strong>Payment Status:</strong> {scannedReg.paymentStatus}</p>
              <p><strong>Registration Status:</strong> {scannedReg.registrationStatus}</p>
              <p><strong>Attendance:</strong> <span className="text-green-600 font-bold">Successfully Checked In!</span></p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setScannedReg(null); setLastScannedId(null); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
