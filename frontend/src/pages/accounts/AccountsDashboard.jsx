import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';

export default function AccountsDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard/accounts').then((res) => setStats(res.data));
  }, []);

  if (!stats) return <p>Loading...</p>;

  return (
    <div>
      <h1>Accounts Dashboard</h1>
      <div className="stat-grid">
        <div className="stat-card"><span>{stats.totalVouchers}</span><label>Total Vouchers</label></div>
        <div className="stat-card"><span>{stats.pendingApproval}</span><label>Pending Approval</label></div>
        <div className="stat-card"><span>{stats.approvedVouchers}</span><label>Approved</label></div>
        <div className="stat-card"><span>{stats.rejectedVouchers}</span><label>Rejected</label></div>
        <div className="stat-card"><span>₹{Number(stats.totalApprovedExpenseAmount).toLocaleString()}</span><label>Total Approved Amount</label></div>
      </div>
      <h2>Recently Approved</h2>
      <table className="table">
        <thead>
          <tr><th>Voucher #</th><th>Employee</th><th>Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          {stats.recentApprovedVouchers.map((v) => (
            <tr key={v.id}>
              <td><Link to={`/vouchers/${v.id}`}>{v.voucherNumber}</Link></td>
              <td>{v.employeeName}</td>
              <td>₹{Number(v.amount).toLocaleString()}</td>
              <td><StatusBadge status={v.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
