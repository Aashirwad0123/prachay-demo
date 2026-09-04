const COLORS = {
  DRAFT: '#6b7280',
  PENDING_APPROVAL: '#b45309',
  APPROVED: '#15803d',
  REJECTED: '#b91c1c',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className="badge"
      style={{ backgroundColor: `${COLORS[status]}22`, color: COLORS[status] }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
