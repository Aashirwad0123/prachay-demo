const CLASSES = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export default function StatusBadge({ status }) {
  return <span className={`badge ${CLASSES[status]}`}>{status.replace('_', ' ')}</span>;
}
