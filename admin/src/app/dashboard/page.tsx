import DashboardHomePage from '@/views/dashboard/dashboard-home-page';
import ProtectedPage from '@/components/shared/protected-page';
export default function Page() { return <ProtectedPage><DashboardHomePage /></ProtectedPage>; }
