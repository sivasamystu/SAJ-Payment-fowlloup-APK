'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { UserPlus, Search, Phone, Mail, FileText, X, AlertCircle } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  whatsapp: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  companyName?: string;
  notes?: string;
}

const MOCK_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Apex Infrastructure Ltd', mobile: '9876543210', whatsapp: '9876543210', email: 'billing@apexinfra.com', address: 'Plot 45, Sector 12, Tech Park, Chennai', gstNumber: '33AAAAA1111A1Z1', companyName: 'Apex Infrastructure Ltd', notes: 'Frequent customer for topography layouts' },
  { id: '2', name: 'Greenwood Builders', mobile: '9876543211', whatsapp: '9876543211', email: 'accounts@greenwood.in', address: 'Greenwood Square, OMR Road, Chennai', gstNumber: '33BBBBB2222B2Z2', companyName: 'Greenwood Builders', notes: 'Payment terms: Net 15' },
  { id: '3', name: 'Vertex Land Developers', mobile: '9876543212', whatsapp: '9876543212', email: 'vertexdevelopers@gmail.com', address: 'No 12, Mount Road, Guindy, Chennai', gstNumber: '', companyName: 'Vertex Land Developers', notes: 'Contact person: Mr. Dinesh' },
  { id: '4', name: 'Skyline Surveyors Co', mobile: '9876543213', whatsapp: '9876543213', email: 'info@skylinesurveys.com', address: 'Suite 304, Prestige Block, Coimbatore', gstNumber: '33CCCCC3333C3Z3', companyName: 'Skyline Surveyors Co' },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiActive, setApiActive] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [formError, setFormError] = useState('');

  const fetchCustomers = async () => {
    const token = localStorage.getItem('saj_token');
    try {
      const res = await fetch('http://localhost:3001/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
        setApiActive(true);
      }
    } catch (err) {
      console.warn('Backend server connection failed, using local customer mockup state.');
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name || !mobile || !whatsapp) {
      setFormError('Name, mobile, and WhatsApp numbers are required.');
      return;
    }

    const payload = { name, mobile, whatsapp, email, companyName, gstNumber, address, notes };
    const token = localStorage.getItem('saj_token');

    if (apiActive) {
      try {
        const res = await fetch('http://localhost:3001/api/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          fetchCustomers();
          closeModal();
        } else {
          const errData = await res.json();
          setFormError(errData.message || 'Failed to save customer');
        }
      } catch (err) {
        setFormError('Error connecting to backend server.');
      }
    } else {
      // Mock mode
      const newCustomer: Customer = {
        id: `mock_cust_${Date.now()}`,
        ...payload,
      };
      setCustomers([newCustomer, ...customers]);
      closeModal();
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setName('');
    setMobile('');
    setWhatsapp('');
    setEmail('');
    setCompanyName('');
    setGstNumber('');
    setAddress('');
    setNotes('');
    setFormError('');
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.companyName && c.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.mobile.includes(searchQuery),
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Directory</h1>
          <p className="page-subtitle">Add, search, and manage clients for digital surveying accounts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <UserPlus size={16} /> Add Customer
        </button>
      </div>

      {/* Filter and search actions */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, company, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
        </div>
      </div>

      {/* Grid containing customers list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {filteredCustomers.map((c) => (
          <div key={c.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', fontWeight: 700 }}>{c.name}</h3>
              {c.companyName && (
                <p style={{ fontSize: '0.85rem', color: '#06b6d4', fontWeight: 600, marginTop: '0.1rem' }}>
                  {c.companyName}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                <Phone size={14} />
                <span>Call/WA: {c.whatsapp}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                <Mail size={14} />
                <span>{c.email || 'No email registered'}</span>
              </div>
              {c.gstNumber && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                  <FileText size={14} />
                  <span>GST: <span style={{ fontFamily: 'monospace', color: '#f8fafc' }}>{c.gstNumber}</span></span>
                </div>
              )}
            </div>

            {c.address && (
              <p style={{ fontSize: '0.8rem', color: '#64748b', backgroundColor: 'rgba(255,255,255,0.01)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                {c.address}
              </p>
            )}

            {c.notes && (
              <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: '#94a3b8', borderLeft: '2px solid var(--primary)', paddingLeft: '0.5rem', fontStyle: 'italic' }}>
                &ldquo;{c.notes}&rdquo;
              </div>
            )}
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
            No customers found matching &ldquo;{searchQuery}&rdquo;.
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Create Customer Record</h2>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCustomer}>
              {formError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rajesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="10 digit mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Include country code (e.g. 91...)"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="email@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Apex Infra Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="15-digit GSTIN"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Billing Address</label>
                <textarea
                  className="form-control"
                  placeholder="Complete postal address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Private Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Terms, contact preference, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyItems: 'flex-end', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
