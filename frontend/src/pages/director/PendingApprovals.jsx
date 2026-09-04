import VoucherList from '../../components/VoucherList';

export default function PendingApprovals() {
  return <VoucherList endpoint="/vouchers/pending" title="Pending Approvals" showStatusFilter={false} />;
}
