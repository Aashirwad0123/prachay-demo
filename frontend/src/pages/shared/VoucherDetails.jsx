import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

// Signatures are served from an authenticated endpoint (not a public static path), so a
// plain <img src> can't carry the auth header - fetch it as a blob and point the <img> at
// an object URL instead.
function SignatureImage({ voucherId, type, alt }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let objectUrl;
    api.get(`/vouchers/${voucherId}/signature`, { params: { type }, responseType: 'blob' }).then((res) => {
      objectUrl = URL.createObjectURL(res.data);
      setSrc(objectUrl);
    });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [voucherId, type]);

  if (!src) return <p className="muted">Loading...</p>;
  return <img className="signature" src={src} alt={alt} />;
}

export default function VoucherDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState(null);
  const [error, setError] = useState('');
  const [directorSignature, setDirectorSignature] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get(`/vouchers/${id}`).then((res) => setVoucher(res.data)).catch(() => setError('Voucher not found or access denied'));
  }

  useEffect(load, [id]);

  async function handleSubmit() {
    setBusy(true);
    try {
      await api.post(`/vouchers/${id}/submit`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this draft voucher?')) return;
    setBusy(true);
    try {
      await api.delete(`/vouchers/${id}`);
      navigate('/vouchers/mine');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!directorSignature && !voucher.directorSignature) {
      setError('Director signature is required to approve');
      return;
    }
    const data = new FormData();
    if (directorSignature) data.append('directorSignature', directorSignature);
    setBusy(true);
    try {
      await api.post(`/vouchers/${id}/approve`, data);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/vouchers/${id}/reject`, { rejectionReason });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject');
    } finally {
      setBusy(false);
    }
  }

  if (error && !voucher) return <p className="error">{error}</p>;
  if (!voucher) return <p>Loading...</p>;

  const isOwner = user.role === 'EMPLOYEE' && voucher.employeeUserId === user.id;
  const isDraft = voucher.status === 'DRAFT';
  const isPending = voucher.status === 'PENDING_APPROVAL';

  return (
    <div className="card">
      <div className="detail-header">
        <h1>{voucher.voucherNumber}</h1>
        <StatusBadge status={voucher.status} />
      </div>
      {error && <p className="error">{error}</p>}

      <div className="detail-grid">
        <div><label>Voucher Date</label><p>{voucher.voucherDate}</p></div>
        <div><label>Expense Date</label><p>{voucher.expenseDate}</p></div>
        <div><label>Department</label><p>{voucher.departmentName}</p></div>
        <div><label>Expense Title</label><p>{voucher.expenseTitle}</p></div>
        <div><label>Category</label><p>{voucher.expenseCategory || '—'}</p></div>
        <div><label>Amount</label><p className="amount">₹{Number(voucher.amount).toLocaleString()}</p></div>
        <div className="full-width"><label>Description</label><p>{voucher.expenseDescription || '—'}</p></div>
        <div><label>Employee</label><p>{voucher.employeeName}</p></div>
        <div><label>Employee ID</label><p>{voucher.employeeIdCode || '—'}</p></div>
        <div>
          <label>Employee Signature</label>
          {voucher.employeeSignature
            ? <SignatureImage voucherId={id} type="employee" alt="Employee signature" />
            : <p className="muted">Not uploaded</p>}
        </div>
        <div>
          <label>Director Signature</label>
          {voucher.directorSignature
            ? <SignatureImage voucherId={id} type="director" alt="Director signature" />
            : <p className="muted">Not uploaded</p>}
        </div>
        <div><label>Approval Date</label><p>{voucher.approvalDate ? new Date(voucher.approvalDate).toLocaleString() : '—'}</p></div>
        {voucher.status === 'REJECTED' && (
          <div className="full-width"><label>Rejection Reason</label><p>{voucher.rejectionReason}</p></div>
        )}
        <div><label>Created</label><p>{new Date(voucher.createdAt).toLocaleString()}</p></div>
        <div><label>Last Updated</label><p>{new Date(voucher.updatedAt).toLocaleString()}</p></div>
      </div>

      {isOwner && isDraft && (
        <div className="actions">
          <Link to={`/vouchers/${id}/edit`}><button className="secondary">Edit</button></Link>
          <button className="danger" onClick={handleDelete} disabled={busy}>Delete</button>
          <button className={`primary${busy ? ' is-loading' : ''}`} onClick={handleSubmit} disabled={busy}>Submit for Approval</button>
        </div>
      )}

      {user.role === 'DIRECTOR' && isPending && (
        <div className="approval-panel">
          <h2>Director Action</h2>
          <label>
            Director Signature (required to approve)
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setDirectorSignature(e.target.files[0])} />
          </label>
          <div className="actions">
            <button className={`primary${busy ? ' is-loading' : ''}`} onClick={handleApprove} disabled={busy}>Approve</button>
            <button className="secondary" onClick={() => setShowReject((s) => !s)} disabled={busy}>Reject</button>
          </div>
          {showReject && (
            <div className="reject-box">
              <label>
                Rejection Reason
                <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
              </label>
              <button className={`danger${busy ? ' is-loading' : ''}`} onClick={handleReject} disabled={busy}>Confirm Rejection</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
