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

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
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
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem' }}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">{children}</main>
    </div>
  );
}
