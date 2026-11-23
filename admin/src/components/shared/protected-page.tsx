import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import AdminLoader from "./admin-loader";

async function AuthenticatedContent({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return children;
}
export default function ProtectedPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminLoader />}>
      <AuthenticatedContent>{children}</AuthenticatedContent>
    </Suspense>
  );
}
