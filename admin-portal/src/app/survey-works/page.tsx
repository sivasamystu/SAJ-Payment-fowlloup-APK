'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ClipboardList, Plus, Search, MapPin, Calendar, User, Eye, X, CheckCircle, AlertCircle } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  name: string;
}

interface SurveyWork {
  id: string;
  workNumber: string;
  workDate: string;
  workType: string;
  siteLocation: string;
  customerId: string;
  customer: Customer;
  assignedStaffId?: string;
  assignedStaff?: Staff;
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'BILLED' | 'PAID';
  remarks?: string;
}

const MOCK_CUSTOMERS = [
  { id: '1', name: 'Apex Infrastructure Ltd' },
  { id: '2', name: 'Greenwood Builders' },
  { id: '3', name: 'Vertex Land Developers' },
];

const MOCK_STAFF = [
  { id: 'staff_1', name: 'Karthik Raja' },
  { id: 'staff_2', name: 'Srinivasan M' },
  { id: 'staff_3', name: 'Anbarasan G' },
];

const MOCK_WORKS: SurveyWork[] = [
  { id: 'w1', workNumber: 'SURV-20260621-0001', workDate: '2026-06-21', workType: 'Topographical Survey', siteLocation: 'Guindy Industrial Estate, Chennai', customerId: '1', customer: MOCK_CUSTOMERS[0], assignedStaffId: 'staff_1', assignedStaff: MOCK_STAFF[0], status: 'NEW', remarks: 'Requires high-precision GPS sensors' },
  { id: 'w2', workNumber: 'SURV-20260619-0002', workDate: '2026-06-19', workType: 'Boundary Demarcation', siteLocation: 'OMR Road, Sholinganallur, Chennai', customerId: '2', customer: MOCK_CUSTOMERS[1], assignedStaffId: 'staff_2', assignedStaff: MOCK_STAFF[1], status: 'IN_PROGRESS', remarks: 'Client requested physical concrete pegs' },
  { id: 'w3', workNumber: 'SURV-20260615-0003', workDate: '2026-06-15', workType: 'Drone Mapping', siteLocation: 'Vallalar Nagar, Coimbatore', customerId: '3', customer: MOCK_CUSTOMERS[2], assignedStaffId: 'staff_3', assignedStaff: MOCK_STAFF[2], status: 'COMPLETED', remarks: 'Raw orthomosaic images delivered' },
  { id: 'w4', workNumber: 'SURV-20260612-0004', workDate: '2026-06-12', workType: 'GPS Survey', siteLocation: 'SIPCOT Industrial Park, Sriperumbudur', customerId: '1', customer: MOCK_CUSTOMERS[0], assignedStaffId: 'staff_1', assignedStaff: MOCK_STAFF[0], status: 'BILLED', remarks: 'Invoice generated INV-20260612-0001' },
];

export default function SurveyWorksPage() {
  const [works, setWorks] = useState<SurveyWork[]>(MOCK_WORKS);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [staffList, setStaffList] = useState<Staff[]>(MOCK_STAFF);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiActive, setApiActive] = useState(false);

  // Form Fields
  const [workDate, setWorkDate] = useState('');
  const [workType, setWorkType] = useState('Topographical Survey');
  const [siteLocation, setSiteLocation] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [remarks, setRemarks] = useState('');

  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    const token = localStorage.getItem('saj_token');
    try {
      // Fetch Survey Works
      const resWorks = await fetch('http://localhost:3001/api/survey-works', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resWorks.ok) {
        const data = await resWorks.json();
        setWorks(data);
        setApiActive(true);
      }

      // Fetch Customers Dropdown
      const resCust = await fetch('http://localhost:3001/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resCust.ok) {
        const data = await resCust.json();
        setCustomers(data);
      }

      // Fetch Staff Users Dropdown
      const resStaff = await fetch('http://localhost:3001/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resStaff.ok) {
        const data = await resStaff.json();
        setStaffList(data);
      }
    } catch (err) {
      console.warn('Backend connection unavailable, running in simulated offline mode.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWork = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!workDate || !siteLocation || !customerId) {
      setFormError('Date, site location, and customer selection are required.');
      return;
    }

    const payload = { workDate, workType, siteLocation, customerId, assignedStaffId, remarks };
    const token = localStorage.getItem('saj_token');

    if (apiActive) {
      try {
        const res = await fetch('http://localhost:3001/api/survey-works', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          fetchData();
          closeModal();
        } else {
          const errData = await res.json();
          setFormError(errData.message || 'Failed to create work log');
        }
      } catch (err) {
        setFormError('Error connecting to backend API.');
      }
    } else {
      // Mock mode
      const selectedCust = customers.find(c => c.id === customerId) || { id: customerId, name: 'Apex Infra' };
      const selectedStaff = staffList.find(s => s.id === assignedStaffId) || { id: assignedStaffId, name: 'Karthik Raja' };
      
      const newWork: SurveyWork = {
        id: `mock_work_${Date.now()}`,
        workNumber: `SURV-20260621-${Math.floor(1000 + Math.random() * 9000)}`,
        workDate,
        workType,
        siteLocation,
        customerId,
        customer: selectedCust,
        assignedStaffId,
        assignedStaff: selectedStaff,
        status: 'NEW',
        remarks,
      };

      setWorks([newWork, ...works]);
      closeModal();
    }
  };

  const handleStatusChange = async (workId: string, newStatus: SurveyWork['status']) => {
    const token = localStorage.getItem('saj_token');
    if (apiActive) {
      try {
        const res = await fetch(`http://localhost:3001/api/survey-works/${workId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          fetchData();
        }
      } catch (err) {
        console.error('Failed to update status', err);
      }
    } else {
      setWorks(works.map(w => w.id === workId ? { ...w, status: newStatus } : w));
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setWorkDate('');
    setWorkType('Topographical Survey');
    setSiteLocation('');
    setCustomerId('');
    setAssignedStaffId('');
    setRemarks('');
    setFormError('');
  };

  const filteredWorks = works.filter(
    (w) =>
      w.workNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.workType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.siteLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.customer.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusBadgeClass = (status: SurveyWork['status']) => {
    switch (status) {
      case 'NEW': return 'badge primary';
      case 'IN_PROGRESS': return 'badge warning';
      case 'COMPLETED': return 'badge success';
      case 'BILLED': return 'badge success';
      case 'PAID': return 'badge success';
      default: return 'badge';
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Survey Work Orders</h1>
          <p className="page-subtitle">Assign field operations, log surveying requests, and check statuses.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Create Work Order
        </button>
      </div>

      {/* Filter and search */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by number, location, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#64748b' }} />
        </div>
      </div>

      {/* Works Table */}
      <div className="glass-card" style={{ padding: '0' }}>
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Client</th>
                <th>Work Details</th>
                <th>Assigned Staff</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorks.map((w) => (
                <tr key={w.id}>
                  <td>
                    <div>
                      <p style={{ fontWeight: 600, color: '#f8fafc' }}>{w.workNumber}</p>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                        <Calendar size={12} /> {w.workDate}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{w.customer.name}</td>
                  <td>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{w.workType}</p>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                        <MapPin size={12} /> {w.siteLocation}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                      <User size={12} color="#06b6d4" />
                      <span>{w.assignedStaff?.name || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(w.status)}>{w.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {w.status === 'NEW' && (
                        <button
                          onClick={() => handleStatusChange(w.id, 'IN_PROGRESS')}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        >
                          Start Work
                        </button>
                      )}
                      {w.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleStatusChange(w.id, 'COMPLETED')}
                          className="btn btn-outline-success"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        >
                          Complete
                        </button>
                      )}
                      {w.status === 'COMPLETED' && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Ready for Invoice</span>
                      )}
                      {w.status === 'BILLED' && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Invoice Raised</span>
                      )}
                      {w.status === 'PAID' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>
                          <CheckCircle size={12} /> Fully Settled
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredWorks.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
                    No work orders found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Work Order Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Create Survey Job Sheet</h2>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateWork}>
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

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Work Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Surveying Type</label>
                  <select
                    className="form-control"
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                  >
                    <option value="Topographical Survey">Topographical Survey</option>
                    <option value="Boundary Demarcation">Boundary Demarcation</option>
                    <option value="GPS Survey">GPS Control Points</option>
                    <option value="Drone Mapping">Drone Orthomosaic</option>
                    <option value="Sub-division Survey">Sub-division Survey</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Site Location *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Village name, Survey Block, Address"
                  value={siteLocation}
                  onChange={(e) => setSiteLocation(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Field Officer</label>
                <select
                  className="form-control"
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                >
                  <option value="">-- Leave Unassigned --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Specific Instructions / Remarks</label>
                <textarea
                  className="form-control"
                  placeholder="Equipments needed, boundary sketch requests, notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyItems: 'flex-end', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
