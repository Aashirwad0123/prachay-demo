import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';

export default function DirectorDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard/director').then((res) => setStats(res.data));
  }, []);

  if (!stats) return <p>Loading...</p>;

  return (
    <div>
      <h1>Director Dashboard</h1>
      <div className="stat-grid">
        <div className="stat-card"><span>{stats.pendingApprovalCount}</span><label>Pending Approval</label></div>
        <div className="stat-card"><span>{stats.approvedToday}</span><label>Approved Today</label></div>
        <div className="stat-card"><span>{stats.rejectedToday}</span><label>Rejected Today</label></div>
        <div className="stat-card"><span>₹{Number(stats.totalPendingAmount).toLocaleString()}</span><label>Total Pending Amount</label></div>
      </div>
      <h2>Recent Activity</h2>
      <table className="table">
        <thead>
          <tr><th>Voucher #</th><th>Employee</th><th>Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          {stats.recentActivity.map((v) => (
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
