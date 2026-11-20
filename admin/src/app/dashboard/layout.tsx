import AdminLoader from "@/components/shared/admin-loader";
import AppSidebar from "@/components/layouts/app-sidebar";
import Header from "@/components/layouts/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Suspense } from 'react';
import { requireAdmin } from '@/lib/auth';
import { AuthProvider } from '@/providers/auth-provider';

async function ProtectedDashboard({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <AuthProvider user={user}><SidebarProvider><AppSidebar /><SidebarInset><Header />{children}</SidebarInset></SidebarProvider></AuthProvider>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminLoader />}><ProtectedDashboard>{children}</ProtectedDashboard></Suspense>
  );
}
