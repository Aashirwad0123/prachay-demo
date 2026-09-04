import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

const EMPTY = {
  expenseDate: '',
  departmentName: '',
  expenseTitle: '',
  expenseCategory: '',
  expenseDescription: '',
  amount: '',
  employeeIdCode: '',
};

export default function VoucherForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [signatureFile, setSignatureFile] = useState(null);
  const [existingSignature, setExistingSignature] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/vouchers/${id}`).then((res) => {
        const v = res.data;
        setForm({
          expenseDate: v.expenseDate,
          departmentName: v.departmentName,
          expenseTitle: v.expenseTitle,
          expenseCategory: v.expenseCategory || '',
          expenseDescription: v.expenseDescription || '',
          amount: v.amount,
          employeeIdCode: v.employeeIdCode || '',
        });
        setExistingSignature(v.employeeSignature);
      });
    }
  }, [id, isEdit]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(submit) {
    setError('');
    if (!form.departmentName || !form.expenseTitle || !form.expenseDate || !form.amount) {
      setError('Department, Expense Title, Expense Date and Amount are required');
      return;
    }
    if (Number(form.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (submit && !signatureFile && !existingSignature) {
      setError('Signature is required to submit a voucher');
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (signatureFile) data.append('employeeSignature', signatureFile);
    data.append('submit', submit ? 'true' : 'false');

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/vouchers/${id}`, data);
      } else {
        await api.post('/vouchers', data);
      }
      navigate('/vouchers/mine');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save voucher');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h1>{isEdit ? 'Edit Voucher' : 'Create Voucher'}</h1>
      {error && <p className="error">{error}</p>}
      <div className="form-grid">
        <label>
          Expense Date *
          <input type="date" value={form.expenseDate} onChange={(e) => update('expenseDate', e.target.value)} required />
        </label>
        <label>
          Department *
          <input value={form.departmentName} onChange={(e) => update('departmentName', e.target.value)} required />
        </label>
        <label>
          Expense Title *
          <input value={form.expenseTitle} onChange={(e) => update('expenseTitle', e.target.value)} required />
        </label>
        <label>
          Expense Category
          <input value={form.expenseCategory} onChange={(e) => update('expenseCategory', e.target.value)} />
        </label>
        <div className="form-group">
          <label>Amount *</label>
          <div className="input-prefix">
            <span>₹</span>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} required />
          </div>
        </div>
        <label>
          Employee ID (optional)
          <input value={form.employeeIdCode} onChange={(e) => update('employeeIdCode', e.target.value)} />
        </label>
        <label className="full-width">
          Description
          <textarea value={form.expenseDescription} onChange={(e) => update('expenseDescription', e.target.value)} />
        </label>
        <label className="full-width">
          Signature {existingSignature ? '(already uploaded, choose a new file to replace)' : '(required to submit)'}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setSignatureFile(e.target.files[0])} />
        </label>
      </div>
      <div className="actions">
        <button className={`secondary${saving ? ' is-loading' : ''}`} disabled={saving} onClick={() => handleSave(false)}>Save as Draft</button>
        <button className={`primary${saving ? ' is-loading' : ''}`} disabled={saving} onClick={() => handleSave(true)}>Submit for Approval</button>
      </div>
    </div>
  );
}
