import { AppNavbar } from "@/components/AppNavbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <AppNavbar />
      {children}
    </div>
  );
}
