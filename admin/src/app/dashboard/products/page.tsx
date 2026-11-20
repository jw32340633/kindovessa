import DashboardProductsPage from '@/views/dashboard/dashboard-products-page';
import ProtectedPage from '@/components/shared/protected-page';
export default function Page() { return <ProtectedPage><DashboardProductsPage /></ProtectedPage>; }
