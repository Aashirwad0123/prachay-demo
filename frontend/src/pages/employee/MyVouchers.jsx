import VoucherList from '../../components/VoucherList';

export default function MyVouchers() {
  return <VoucherList endpoint="/vouchers/mine" title="My Vouchers" />;
}
