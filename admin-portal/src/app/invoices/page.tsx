'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Send,
  RefreshCw,
  History,
  X,
  Copy,
  ExternalLink,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
}

interface SurveyWork {
  id: string;
  workNumber: string;
  workType: string;
}

interface ReminderLog {
  id: string;
  type: string;
  sentDate: string;
  deliveryStatus: string;
  retryCount: number;
  triggeredBy: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string;
  customer: Customer;
  surveyWorkId?: string;
  surveyWork?: SurveyWork;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE';
  paymentLink?: string;
  paymentLinkId?: string;
  reminderHistories?: ReminderLog[];
}

const MOCK_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Apex Infrastructure Ltd', whatsapp: '+919876543210' },
  { id: '2', name: 'Greenwood Builders', whatsapp: '+919876543211' },
];

const MOCK_WORKS: SurveyWork[] = [
  { id: 'w3', workNumber: 'SURV-20260615-0003', workType: 'Drone Mapping' },
];

const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv_1',
    invoiceNumber: 'INV-20260621-0001',
    invoiceDate: '2026-06-21',
    customerId: '1',
    customer: MOCK_CUSTOMERS[0],
    surveyWorkId: 'w3',
    surveyWork: MOCK_WORKS[0],
    amount: 50000,
    gstAmount: 9000,
    totalAmount: 59000,
    dueDate: '2026-06-28',
    status: 'PENDING',
    paymentLink: 'https://rzp.io/i/mock_plink_21a',
    paymentLinkId: 'plink_21a',
    reminderHistories: [
      { id: 'rl1', type: 'PAYMENT_REQUEST', sentDate: '2026-06-21T10:00:00Z', deliveryStatus: 'SENT', retryCount: 0, triggeredBy: 'Tenant Admin' }
    ]
  },
  {
    id: 'inv_2',
    invoiceNumber: 'INV-20260615-0002',
    invoiceDate: '2026-06-15',
    customerId: '2',
    customer: MOCK_CUSTOMERS[1],
    amount: 30000,
    gstAmount: 5400,
    totalAmount: 35400,
    dueDate: '2026-06-20',
    status: 'OVERDUE',
    paymentLink: 'https://rzp.io/i/mock_plink_15b',
    paymentLinkId: 'plink_15b',
    reminderHistories: [
      { id: 'rl2', type: 'PAYMENT_REQUEST', sentDate: '2026-06-15T09:30:00Z', deliveryStatus: 'SENT', retryCount: 0, triggeredBy: 'System Auto' },
      { id: 'rl3', type: 'GENTLE_REMINDER', sentDate: '2026-06-16T09:00:00Z', deliveryStatus: 'SENT', retryCount: 0, triggeredBy: 'System Auto' },
      { id: 'rl4', type: 'PENDING_PAYMENT', sentDate: '2026-06-18T09:00:00Z', deliveryStatus: 'FAILED', retryCount: 2, triggeredBy: 'System Auto' }
    ]
  }
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [works, setWorks] = useState<SurveyWork[]>(MOCK_WORKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiActive, setApiActive] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  // Form Fields
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [surveyWorkId, setSurveyWorkId] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState('');

  // Reminder Selection
  const [selectedTemplate, setSelectedTemplate] = useState('GENTLE_REMINDER');

  const fetchData = async () => {
    const token = localStorage.getItem('saj_token');
    try {
      const resInvoices = await fetch('http://localhost:3001/api/invoices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resInvoices.ok) {
        const data = await resInvoices.json();
        setInvoices(data);
        setApiActive(true);
      }

      const resCust = await fetch('http://localhost:3001/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resCust.ok) {
        const data = await resCust.json();
        setCustomers(data);
      }

      const resWorks = await fetch('http://localhost:3001/api/survey-works', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resWorks.ok) {
        const data = await resWorks.json();
        // Filter out works that aren't completed yet
        setWorks(data.filter((w: any) => w.status === 'COMPLETED'));
      }
    } catch (err) {
      console.warn('Backend connection unavailable, using local invoice simulation.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!invoiceDate || !dueDate || !customerId || !amount) {
      setFormError('Date, Due Date, Client, and Base Amount are required.');
      return;
    }

    const payload = {
      invoiceDate,
      dueDate,
      customerId,
      surveyWorkId: surveyWorkId || undefined,
      amount: Number(amount),
    };
    const token = localStorage.getItem('saj_token');

    if (apiActive) {
      try {
        const res = await fetch('http://localhost:3001/api/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          fetchData();
          closeCreateModal();
        } else {
          const errData = await res.json();
          setFormError(errData.message || 'Failed to save invoice');
        }
      } catch (err) {
        setFormError('Failed to establish API connection.');
      }
    } else {
      // Mock logic
      const selectedCust = customers.find(c => c.id === customerId) || MOCK_CUSTOMERS[0];
      const selectedWork = works.find(w => w.id === surveyWorkId);
      
      const numAmt = Number(amount);
      const calculatedGst = numAmt * 0.18;
      const total = numAmt + calculatedGst;

      const newInvoice: Invoice = {
        id: `mock_inv_${Date.now()}`,
        invoiceNumber: `INV-20260621-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceDate,
        dueDate,
        customerId,
        customer: selectedCust,
        surveyWorkId: surveyWorkId || undefined,
        surveyWork: selectedWork,
        amount: numAmt,
        gstAmount: calculatedGst,
        totalAmount: total,
        status: 'PENDING',
        paymentLink: 'https://rzp.io/i/mock_plink_gen',
        paymentLinkId: `plink_${Math.random().toString(36).substring(7)}`,
        reminderHistories: [
          { id: `rl_${Date.now()}`, type: 'PAYMENT_REQUEST', sentDate: new Date().toISOString(), deliveryStatus: 'SENT', retryCount: 0, triggeredBy: 'Tenant Admin' }
        ]
      };

      setInvoices([newInvoice, ...invoices]);
      closeCreateModal();
    }
  };

  const handleRegenerateLink = async (invoiceId: string) => {
    const token = localStorage.getItem('saj_token');
    if (apiActive) {
      try {
        const res = await fetch(`http://localhost:3001/api/invoices/${invoiceId}/regenerate-link`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          fetchData();
          alert('Razorpay payment link successfully regenerated!');
        }
      } catch (err) {
        console.error('Failed to regenerate link', err);
      }
    } else {
      alert('[MOCK] Generated new short link short_url successfully.');
    }
  };

  const handleSendReminder = async () => {
    if (!activeInvoice) return;

    const token = localStorage.getItem('saj_token');
    if (apiActive) {
      try {
        const res = await fetch(`http://localhost:3001/api/invoices/${activeInvoice.id}/send-reminder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ type: selectedTemplate }),
        });
        if (res.ok) {
          fetchData();
          setIsReminderOpen(false);
          alert('WhatsApp Reminder dispatched successfully!');
        }
      } catch (err) {
        console.error('Failed to dispatch reminder', err);
      }
    } else {
      // Mock log insert
      const updatedInvoices = invoices.map(inv => {
        if (inv.id === activeInvoice.id) {
          const logs = inv.reminderHistories || [];
          return {
            ...inv,
            reminderHistories: [
              {
                id: `rl_${Date.now()}`,
                type: selectedTemplate,
                sentDate: new Date().toISOString(),
                deliveryStatus: 'SENT',
                retryCount: 0,
                triggeredBy: 'Tenant Admin'
              },
              ...logs
            ]
          };
        }
        return inv;
      });
      setInvoices(updatedInvoices);
      setIsReminderOpen(false);
      alert(`[MOCK] Dispatched ${selectedTemplate} alert to ${activeInvoice.customer.whatsapp}`);
    }
  };

  // Mock payment hook simulator
  const handleSimulateWebhook = async (invoice: Invoice) => {
    const token = localStorage.getItem('saj_token');
    if (apiActive) {
      try {
        // Send a mock Razorpay payload directly to the public webhooks controller
        const payload = {
          event: 'payment_link.paid',
          payload: {
            payment_link: {
              entity: {
                id: invoice.paymentLinkId,
                amount: invoice.totalAmount * 100, // paise
              }
            },
            payment: {
              entity: {
                id: `pay_${Math.random().toString(36).substring(2, 10)}`,
                amount: invoice.totalAmount * 100
              }
            }
          }
        };

        const res = await fetch('http://localhost:3001/api/webhooks/razorpay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-razorpay-signature': 'signature_override_mock'
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          fetchData();
          alert('Webhook signature matched. Invoice updated to PAID!');
        }
      } catch (err) {
        console.error('Failed to dispatch simulated webhook', err);
      }
    } else {
      setInvoices(invoices.map(inv => inv.id === invoice.id ? { ...inv, status: 'PAID' } : inv));
      alert('[MOCK] Webhook processed. Invoice and work statuses set to PAID.');
    }
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setInvoiceDate('');
    setDueDate('');
    setCustomerId('');
    setSurveyWorkId('');
    setAmount('');
    setFormError('');
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.status.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'PAID': return <span className="badge success">Paid</span>;
      case 'PENDING': return <span className="badge warning">Pending</span>;
      case 'OVERDUE': return <span className="badge danger">Overdue</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice Records & Follow-up</h1>
          <p className="page-subtitle">Manage billing, trigger manual WhatsApp notifications, and verify reminder history logs.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      {/* Filter and Search actions */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search invoice or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
        </div>
      </div>

      {/* Table grid */}
      <div className="glass-card" style={{ padding: '0' }}>
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Survey Link</th>
                <th>Amount Details (18% GST)</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div>
                      <p style={{ fontWeight: 600, color: '#f8fafc' }}>{inv.invoiceNumber}</p>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Date: {inv.invoiceDate}</span>
                    </div>
                  </td>
                  <td>{inv.customer.name}</td>
                  <td>
                    {inv.surveyWork ? (
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{inv.surveyWork.workNumber}</span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Direct Billing</span>
                    )}
                  </td>
                  <td>
                    <div>
                      <p style={{ fontWeight: 600 }}>INR {inv.totalAmount.toLocaleString()}</p>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Base: {inv.amount.toLocaleString()} + GST {inv.gstAmount.toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.9rem', color: inv.status === 'OVERDUE' ? 'var(--danger)' : '#f8fafc' }}>
                      {inv.dueDate}
                    </span>
                  </td>
                  <td>{getStatusBadge(inv.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {/* View Reminder History */}
                      <button
                        onClick={() => {
                          setActiveInvoice(inv);
                          setIsHistoryOpen(true);
                        }}
                        className="btn-icon btn-secondary"
                        title="Reminder History Log"
                      >
                        <History size={14} />
                      </button>

                      {/* Manual Reminder Sender */}
                      {inv.status !== 'PAID' && (
                        <>
                          <button
                            onClick={() => {
                              setActiveInvoice(inv);
                              setIsReminderOpen(true);
                            }}
                            className="btn-icon btn-secondary"
                            title="Send WhatsApp Alert"
                            style={{ color: '#06b6d4' }}
                          >
                            <Send size={14} />
                          </button>

                          <button
                            onClick={() => handleRegenerateLink(inv.id)}
                            className="btn-icon btn-secondary"
                            title="Regenerate Razorpay Link"
                          >
                            <RefreshCw size={14} />
                          </button>

                          <button
                            onClick={() => handleSimulateWebhook(inv)}
                            className="btn btn-outline-success"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', display: 'flex', gap: '4px' }}
                            title="Simulate Webhook Payment"
                          >
                            <Zap size={10} /> Paid
                          </button>
                        </>
                      )}

                      {inv.paymentLink && (
                        <a
                          href={inv.paymentLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-icon btn-secondary"
                          title="Open Payment Link"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Create Invoice Modal */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Create Survey Invoice</h2>
              <button className="modal-close" onClick={closeCreateModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice}>
              {formError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Client / Customer *</label>
                <select
                  className="form-control"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Link Completed Survey Work (Optional)</label>
                <select
                  className="form-control"
                  value={surveyWorkId}
                  onChange={(e) => setSurveyWorkId(e.target.value)}
                >
                  <option value="">-- Select Completed Survey Order --</option>
                  {works.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.workNumber} - {w.workType}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Invoice Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Base Service Charge (INR) *</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Base amount excluding GST"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                {amount && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8', display: 'flex', gap: '1.5rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px' }}>
                    <span>GST (18%): INR {(Number(amount) * 0.18).toFixed(2)}</span>
                    <span style={{ color: '#06b6d4', fontWeight: 600 }}>Total Payable: INR {(Number(amount) * 1.18).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyItems: 'flex-end', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeCreateModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate & Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. View Reminder History Modal */}
      {isHistoryOpen && activeInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Follow-up History Log</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Invoice: {activeInvoice.invoiceNumber}</p>
              </div>
              <button className="modal-close" onClick={() => setIsHistoryOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Template Type</th>
                    <th>Sent Date</th>
                    <th>Status</th>
                    <th>Triggered By</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInvoice.reminderHistories && activeInvoice.reminderHistories.length > 0 ? (
                    activeInvoice.reminderHistories.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontWeight: 600 }}>{log.type}</td>
                        <td>{new Date(log.sentDate).toLocaleString()}</td>
                        <td>
                          <span className={log.deliveryStatus === 'SENT' ? 'badge success' : 'badge danger'}>
                            {log.deliveryStatus}
                          </span>
                        </td>
                        <td>{log.triggeredBy || 'System Cron'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
                        No reminder notifications logged for this invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyItems: 'flex-end', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsHistoryOpen(false)}>
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Manual Reminder Sender Modal */}
      {isReminderOpen && activeInvoice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Trigger Manual WhatsApp Follow-up</h2>
              <button className="modal-close" onClick={() => setIsReminderOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', fontSize: '0.9rem' }}>
              <p style={{ marginBottom: '0.4rem' }}><strong>Client:</strong> {activeInvoice.customer.name}</p>
              <p style={{ marginBottom: '0.4rem' }}><strong>WhatsApp Number:</strong> {activeInvoice.customer.whatsapp}</p>
              <p><strong>Invoice Due Amount:</strong> INR {activeInvoice.totalAmount.toLocaleString()}</p>
            </div>

            <div className="form-group">
              <label className="form-label">Select approved WhatsApp Template</label>
              <select
                className="form-control"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                <option value="GENTLE_REMINDER">Template 2: Gentle Reminder (Day 1 Style)</option>
                <option value="PENDING_PAYMENT">Template 3: Pending Payment Reminder (Day 3 Style)</option>
                <option value="OVERDUE_PAYMENT">Template 4: Overdue Payment Reminder (Strong Day 5 Style)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyItems: 'flex-end', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsReminderOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSendReminder}>
                Send WhatsApp Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
