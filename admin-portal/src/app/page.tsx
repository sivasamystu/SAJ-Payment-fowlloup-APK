'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Sparkles, User, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent, role: 'ADMIN' | 'STAFF') => {
    e.preventDefault();
    
    // Save mocked credentials & role in localStorage for dashboard check
    localStorage.setItem('saj_role', role);
    localStorage.setItem('saj_user', role === 'ADMIN' ? 'SAJ Tenant Admin' : 'SAJ Field Staff');
    localStorage.setItem('saj_token', role === 'ADMIN' ? 'mock_admin_uid_123' : 'mock_staff_uid_456');
    localStorage.setItem('saj_company', 'SAJ Surveys India Pvt Ltd');
    
    router.push('/dashboard');
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
            Payment Collection & Follow-up Platform for Surveying Services
          </p>
        </div>

        <form onSubmit={(e) => handleLogin(e, 'ADMIN')}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-control"
                placeholder="you@sajsurveys.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
            <button
              onClick={(e) => handleLogin(e, 'ADMIN')}
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Sparkles size={16} /> Sign In as Tenant Admin
            </button>
            
            <button
              onClick={(e) => handleLogin(e, 'STAFF')}
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Sign In as Field Staff User
            </button>
          </div>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
          Secure Authentication powered by Firebase Access Control.
        </div>
      </div>
    </div>
  );
}
