import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function EmployeeDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard/employee').then((res) => setStats(res.data));
  }, []);

  if (!stats) return <p>Loading...</p>;

  return (
    <div>
      <h1>My Dashboard</h1>
      <div className="stat-grid">
        <div className="stat-card"><span>{stats.totalVouchers}</span><label>Total Vouchers</label></div>
        <div className="stat-card"><span>{stats.draftVouchers}</span><label>Draft</label></div>
        <div className="stat-card"><span>{stats.pendingApproval}</span><label>Pending Approval</label></div>
        <div className="stat-card"><span>{stats.approvedVouchers}</span><label>Approved</label></div>
        <div className="stat-card"><span>{stats.rejectedVouchers}</span><label>Rejected</label></div>
        <div className="stat-card"><span>₹{Number(stats.totalAmountClaimed).toLocaleString()}</span><label>Total Claimed</label></div>
      </div>
    </div>
  );
}
