import { AppNavbar } from "@/components/AppNavbar";
import { PageTransition } from "@/components/PageTransition";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <AppNavbar />
      {/* tabIndex makes this a valid focus target for the "Skip to main content" link */}
      <div id="main-content" tabIndex={-1} className="outline-none">
        <PageTransition>{children}</PageTransition>
      </div>
    </div>
  );
}
