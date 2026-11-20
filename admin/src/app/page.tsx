import AdminLoader from "@/components/shared/admin-loader";
import LoginPage from "@/views/login-page";
import { Suspense } from 'react';
import { getAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function LoginContent() {
  if (await getAdmin()) redirect('/dashboard');
  return <LoginPage />;
}

function Login() {
  return <Suspense fallback={<AdminLoader />}><LoginContent /></Suspense>;
}

export default Login;
