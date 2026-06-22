'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, ClipboardList, Receipt, LogOut, ShieldAlert } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('saj_token');
    const role = localStorage.getItem('saj_role');
    const user = localStorage.getItem('saj_user');
    const company = localStorage.getItem('saj_company');

    if (!token || !role) {
      router.push('/');
    } else {
      setUserName(user || '');
      setUserRole(role || '');
      setCompanyName(company || '');
      setLoading(false);
    }
  }, [router]);

  const API_URL = 'http://localhost:3001/api';

  const handleLogoutDevice = async () => {
    const token = localStorage.getItem('saj_token');
    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout-device`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.clear();
      router.push('/');
    }
  };

  const handleLogoutAll = async () => {
    const token = localStorage.getItem('saj_token');
    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error('Logout all error:', err);
    } finally {
      localStorage.clear();
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="logo-icon" style={{ margin: '0 auto 1rem', width: '48px', height: '48px' }}>
            <LayoutDashboard size={24} />
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading Workspace...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Customers', path: '/customers', icon: <Users size={18} /> },
    { name: 'Survey Works', path: '/survey-works', icon: <ClipboardList size={18} /> },
    { name: 'Invoices', path: '/invoices', icon: <Receipt size={18} /> },
  ];

  return (
    <div className="app-container">
      {/* Sidebar Nav */}
      <aside className="sidebar">
        <div>
          <div className="logo">
            <div className="logo-icon">
              <ClipboardList size={18} color="#fff" />
            </div>
            <span style={{ fontSize: '1.25rem' }}>SAJ Admin</span>
          </div>

          <div style={{ marginBottom: '2rem', padding: '0 0.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Company</p>
            <p style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {companyName}
            </p>
          </div>

          <nav className="nav-menu">
            {navItems.map((item) => {
              // Staff cannot view certain links if needed, but they can see all for collection follow-ups
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#06b6d4', fontWeight: 600, fontSize: '0.9rem' }}>
                {userName.charAt(0) || 'U'}
              </span>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#06b6d4', fontWeight: 600 }}>
                <ShieldAlert size={10} /> {userRole}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="btn btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem' }}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">{children}</main>

      {showLogoutModal && (
        <div 
          className="soft-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <style>{`
            @keyframes modalFadeIn {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes overlayFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .soft-modal-overlay {
              animation: overlayFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .soft-modal-card {
              animation: modalFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            .soft-modal-btn-secondary {
              background: rgba(255, 255, 255, 0.03) !important;
              border: 1px solid rgba(255, 255, 255, 0.08) !important;
              color: #cbd5e1 !important;
              border-radius: 12px !important;
              padding: 0.75rem 1rem !important;
              font-weight: 600 !important;
              font-size: 0.875rem !important;
              transition: all 0.2s ease !important;
              cursor: pointer !important;
              display: flex !important;
              alignItems: 'center' !important;
              justifyContent: 'center' !important;
            }
            .soft-modal-btn-secondary:hover {
              background: rgba(255, 255, 255, 0.08) !important;
              border-color: rgba(255, 255, 255, 0.15) !important;
              color: #fff !important;
            }
            .soft-modal-btn-primary {
              background: #f43f5e !important;
              border: 1px solid #f43f5e !important;
              color: #fff !important;
              border-radius: 12px !important;
              padding: 0.75rem 1rem !important;
              font-weight: 600 !important;
              font-size: 0.875rem !important;
              transition: all 0.2s ease !important;
              cursor: pointer !important;
              display: flex !important;
              alignItems: 'center' !important;
              justifyContent: 'center' !important;
              box-shadow: 0 4px 12px rgba(244, 63, 94, 0.25) !important;
            }
            .soft-modal-btn-primary:hover {
              background: #e11d48 !important;
              border-color: #e11d48 !important;
              box-shadow: 0 6px 16px rgba(244, 63, 94, 0.4) !important;
            }
            .soft-modal-btn-cancel {
              background: transparent !important;
              border: 1px solid transparent !important;
              color: #64748b !important;
              border-radius: 12px !important;
              padding: 0.5rem 1rem !important;
              font-weight: 600 !important;
              font-size: 0.875rem !important;
              transition: all 0.2s ease !important;
              cursor: pointer !important;
              display: flex !important;
              alignItems: 'center' !important;
              justifyContent: 'center' !important;
            }
            .soft-modal-btn-cancel:hover {
              color: #e2e8f0 !important;
            }
          `}</style>
          <div 
            className="soft-modal-card"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '2.5rem 2rem',
              maxWidth: '380px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px 0 rgba(6, 182, 212, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Log Out</h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>Select how you want to sign out of your account:</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogoutDevice();
                }}
                className="soft-modal-btn-secondary"
              >
                Logout This Device
              </button>
              
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogoutAll();
                }}
                className="soft-modal-btn-primary"
              >
                Logout All Devices
              </button>
              
              <button
                onClick={() => setShowLogoutModal(false)}
                className="soft-modal-btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
