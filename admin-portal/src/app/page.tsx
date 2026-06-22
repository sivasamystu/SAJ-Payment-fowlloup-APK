'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Sparkles, Smartphone, Lock, AlertCircle, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = 'http://localhost:3001/api';

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber) {
      setError('Please enter your mobile number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send OTP.');
      }
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Error occurred while sending OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the verification code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invalid OTP code.');
      }

      // Map backend roles (TENANT_ADMIN / STAFF) to web app roles (ADMIN / STAFF)
      const clientRole = data.user.role === 'TENANT_ADMIN' ? 'ADMIN' : 'STAFF';

      localStorage.setItem('saj_role', clientRole);
      localStorage.setItem('saj_user', data.user.name);
      localStorage.setItem('saj_token', data.token);
      localStorage.setItem('saj_company', data.user.company?.name || 'SAJ Surveys Demo Corp');

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="glass-card login-card" style={{ backdropFilter: 'blur(20px)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
            <div className="logo-icon">
              <Shield size={20} />
            </div>
            <span>SAJ Technologies</span>
          </div>
          <p className="login-tagline">
            Quot , Work , Bill, Collection
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '1.5rem',
            color: '#ef4444',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="e.g. +919843258877"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Smartphone size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? 'Sending Code...' : <><Sparkles size={16} /> Send Verification OTP</>}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: '#94a3b8' }}>Sent to: {mobileNumber}</span>
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                style={{ color: '#06b6d4', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Change
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Enter 6-Digit OTP</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  maxLength={6}
                  className="form-control"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '2.5rem', letterSpacing: '4px', fontWeight: 'bold' }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
              >
                <RefreshCw size={14} /> Resend OTP
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
          Secure Authentication powered by 2Factor SMS Services.
        </div>
      </div>
    </div>
  );
}
