'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Receipt,
  UserCheck,
  Calendar,
  Hourglass,
  ArrowUpRight
} from 'lucide-react';

interface MetricState {
  totalInvoices: number;
  totalCollection: number;
  totalPending: number;
  totalOverdue: number;
  collectionThisMonth: number;
  collectionThisYear: number;
  recoveryPercentage: number;
}

interface AgingState {
  days_0_7: number;
  days_8_15: number;
  days_16_30: number;
  days_31_60: number;
  days_above_60: number;
}

// Fallback Mock Data for demo stability
const MOCK_METRICS: MetricState = {
  totalInvoices: 48,
  totalCollection: 580000,
  totalPending: 220000,
  totalOverdue: 85000,
  collectionThisMonth: 125000,
  collectionThisYear: 580000,
  recoveryPercentage: 65.5,
};

const MOCK_AGING: AgingState = {
  days_0_7: 45000,
  days_8_15: 35000,
  days_16_30: 25000,
  days_31_60: 15000,
  days_above_60: 85000,
};

const MOCK_PENDING_CUSTOMERS = [
  { name: 'Apex Infrastructure Ltd', pendingAmount: 85000 },
  { name: 'Greenwood Builders', pendingAmount: 45000 },
  { name: 'Vertex Land Developers', pendingAmount: 35000 },
  { name: 'Skyline Surveyors Co', pendingAmount: 25000 },
  { name: 'Precision Engineering', pendingAmount: 15000 },
];

const MOCK_RECENT_PAYMENTS = [
  { id: '1', invoiceNumber: 'INV-20260619-0012', customerName: 'Matrix Townships', amount: 48000, paymentDate: '2026-06-19T10:30:00Z', ref: 'pay_P1oJka7d9asL' },
  { id: '2', invoiceNumber: 'INV-20260618-0008', customerName: 'Rohan Construction', amount: 32000, paymentDate: '2026-06-18T14:45:00Z', ref: 'pay_P1jHka8u7bNz' },
  { id: '3', invoiceNumber: 'INV-20260616-0003', customerName: 'Apex Infrastructure Ltd', amount: 15000, paymentDate: '2026-06-16T11:15:00Z', ref: 'pay_P1fTka9q2kOs' },
];

const MOCK_TREND = [
  { name: 'Jan', collected: 60000, pending: 20000 },
  { name: 'Feb', collected: 80000, pending: 30000 },
  { name: 'Mar', collected: 110000, pending: 15000 },
  { name: 'Apr', collected: 95000, pending: 40000 },
  { name: 'May', collected: 110000, pending: 30000 },
  { name: 'Jun', collected: 125000, pending: 85000 },
];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<MetricState>(MOCK_METRICS);
  const [aging, setAging] = useState<AgingState>(MOCK_AGING);
  const [pendingCustomers, setPendingCustomers] = useState(MOCK_PENDING_CUSTOMERS);
  const [recentPayments, setRecentPayments] = useState(MOCK_RECENT_PAYMENTS);
  const [trendData, setTrendData] = useState(MOCK_TREND);
  const [apiActive, setApiActive] = useState(false);

  useEffect(() => {
    async function fetchDashboard() {
      const token = localStorage.getItem('saj_token');
      try {
        const res = await fetch('http://localhost:3001/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
          setAging(data.agingBuckets);
          setPendingCustomers(data.topPendingCustomers);
          setRecentPayments(data.recentPayments);
          setTrendData(data.monthlyCollection);
          setApiActive(true);
        }
      } catch (err) {
        console.warn('Backend server connection failed, showing mock analytics data.');
      }
    }
    fetchDashboard();
  }, []);

  const totalOutstanding = metrics.totalPending + metrics.totalOverdue;

  // Aging total for bucket percentage division
  const maxAgingAmount = Math.max(
    aging.days_0_7,
    aging.days_8_15,
    aging.days_16_30,
    aging.days_31_60,
    aging.days_above_60,
    1
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Collection Analytics Dashboard</h1>
          <p className="page-subtitle">
            Overview of payments, collection performance, and aging accounts.
            {apiActive ? (
              <span className="badge success" style={{ marginLeft: '10px', verticalAlign: 'middle' }}>Connected to Live Server</span>
            ) : (
              <span className="badge warning" style={{ marginLeft: '10px', verticalAlign: 'middle' }}>Demo Mode (Mock Data)</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <Calendar size={14} color="#06b6d4" />
            <span>Today: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card">
          <div>
            <span className="kpi-label">Total Invoiced</span>
            <h3 className="kpi-value">INR {(metrics.totalCollection + totalOutstanding).toLocaleString()}</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total billing output</span>
          </div>
          <div className="kpi-icon-wrapper primary">
            <Receipt size={20} />
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div>
            <span className="kpi-label">Total Collection</span>
            <h3 className="kpi-value" style={{ color: 'var(--success)' }}>INR {metrics.totalCollection.toLocaleString()}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>{metrics.recoveryPercentage}% Recovery Rate</span>
          </div>
          <div className="kpi-icon-wrapper success">
            <CreditCard size={20} />
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div>
            <span className="kpi-label">Total Pending</span>
            <h3 className="kpi-value" style={{ color: 'var(--warning)' }}>INR {metrics.totalPending.toLocaleString()}</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Active billing cycles</span>
          </div>
          <div className="kpi-icon-wrapper warning">
            <Hourglass size={20} />
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div>
            <span className="kpi-label">Total Overdue</span>
            <h3 className="kpi-value" style={{ color: 'var(--danger)' }}>INR {metrics.totalOverdue.toLocaleString()}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Requires follow-up</span>
          </div>
          <div className="kpi-icon-wrapper danger">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Charts & Aging Section */}
      <div className="charts-grid">
        {/* Trend Area Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Monthly Collection Trend</h3>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--success)' }}>
              <TrendingUp size={14} /> Revenue +8.4%
            </span>
          </div>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--warning)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--warning)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontFamily: 'var(--font-body)',
                  }}
                />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="var(--success)" fillOpacity={1} fill="url(#colorCollected)" strokeWidth={2} />
                <Area type="monotone" dataKey="pending" name="Pending" stroke="var(--warning)" fillOpacity={1} fill="url(#colorPending)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Aging Recovery Dashboard */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>Aging Recovery</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>Outstanding invoices sorted by date</p>
          
          <div className="aging-report-container">
            <div className="aging-bar-group">
              <div className="aging-bar-label">
                <span>0-7 Days</span>
                <span>INR {aging.days_0_7.toLocaleString()}</span>
              </div>
              <div className="aging-bar-track">
                <div className="aging-bar-fill normal" style={{ width: `${(aging.days_0_7 / maxAgingAmount) * 100}%` }}></div>
              </div>
            </div>

            <div className="aging-bar-group">
              <div className="aging-bar-label">
                <span>8-15 Days</span>
                <span>INR {aging.days_8_15.toLocaleString()}</span>
              </div>
              <div className="aging-bar-track">
                <div className="aging-bar-fill normal" style={{ width: `${(aging.days_8_15 / maxAgingAmount) * 100}%` }}></div>
              </div>
            </div>

            <div className="aging-bar-group">
              <div className="aging-bar-label">
                <span>16-30 Days</span>
                <span>INR {aging.days_16_30.toLocaleString()}</span>
              </div>
              <div className="aging-bar-track">
                <div className="aging-bar-fill normal" style={{ width: `${(aging.days_16_30 / maxAgingAmount) * 100}%` }}></div>
              </div>
            </div>

            <div className="aging-bar-group">
              <div className="aging-bar-label">
                <span>31-60 Days</span>
                <span>INR {aging.days_31_60.toLocaleString()}</span>
              </div>
              <div className="aging-bar-track">
                <div className="aging-bar-fill warning" style={{ width: `${(aging.days_31_60 / maxAgingAmount) * 100}%` }}></div>
              </div>
            </div>

            <div className="aging-bar-group">
              <div className="aging-bar-label" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                <span>Above 60 Days</span>
                <span>INR {aging.days_above_60.toLocaleString()}</span>
              </div>
              <div className="aging-bar-track">
                <div className="aging-bar-fill danger" style={{ width: `${(aging.days_above_60 / maxAgingAmount) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid for Bottom Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Top Pending Clients */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Top Pending Customers</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Outstanding receivables</span>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th style={{ textAlign: 'right' }}>Pending Amount</th>
                </tr>
              </thead>
              <tbody>
                {pendingCustomers.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ textAlign: 'right', color: 'var(--warning)', fontWeight: 600 }}>
                      INR {c.pendingAmount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments logs */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Recent Collections</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Latest logs received</span>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div>
                        <p style={{ fontWeight: 600 }}>{log.invoiceNumber}</p>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Ref: {log.ref}</span>
                      </div>
                    </td>
                    <td>{log.customerName}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                      +INR {log.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
