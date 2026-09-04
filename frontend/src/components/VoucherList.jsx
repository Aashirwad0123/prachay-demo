import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from './StatusBadge';

const STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'];

export default function VoucherList({ endpoint, title, showStatusFilter = true }) {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '', category: '', status: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '',
    sortBy: 'createdAt', order: 'desc',
  });

  function load() {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    api.get(endpoint, { params }).then((res) => setVouchers(res.data)).finally(() => setLoading(false));
  }

  useEffect(load, [endpoint]);

  function update(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
  }

  return (
    <div>
      <h1>{title}</h1>
      <form className="filter-bar" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <input placeholder="Search voucher #, employee, title..." value={filters.search} onChange={(e) => update('search', e.target.value)} />
        <input placeholder="Category" value={filters.category} onChange={(e) => update('category', e.target.value)} />
        {showStatusFilter && (
          <select value={filters.status} onChange={(e) => update('status', e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        )}
        <input type="date" title="From date" value={filters.dateFrom} onChange={(e) => update('dateFrom', e.target.value)} />
        <input type="date" title="To date" value={filters.dateTo} onChange={(e) => update('dateTo', e.target.value)} />
        <input type="number" placeholder="Min amount" value={filters.amountMin} onChange={(e) => update('amountMin', e.target.value)} />
        <input type="number" placeholder="Max amount" value={filters.amountMax} onChange={(e) => update('amountMax', e.target.value)} />
        <select value={filters.sortBy} onChange={(e) => update('sortBy', e.target.value)}>
          <option value="createdAt">Sort: Created Date</option>
          <option value="amount">Sort: Amount</option>
          <option value="expenseDate">Sort: Expense Date</option>
          <option value="voucherNumber">Sort: Voucher #</option>
          <option value="status">Sort: Status</option>
        </select>
        <select value={filters.order} onChange={(e) => update('order', e.target.value)}>
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
        <button type="submit">Apply</button>
      </form>

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : vouchers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗂️</div>
          No vouchers found.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Voucher #</th><th>Employee</th><th>Department</th><th>Title</th>
                <th>Amount</th><th>Status</th><th>Expense Date</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id}>
                  <td><Link to={`/vouchers/${v.id}`}>{v.voucherNumber}</Link></td>
                  <td>{v.employeeName}</td>
                  <td>{v.departmentName}</td>
                  <td>{v.expenseTitle}</td>
                  <td className="amount">₹{Number(v.amount).toLocaleString()}</td>
                  <td><StatusBadge status={v.status} /></td>
                  <td>{v.expenseDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
