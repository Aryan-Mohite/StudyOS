/**
 * Phase 1: Auth is bypassed. Clerk will be re-added in Phase 4.
 * This stub redirects immediately to the dashboard.
 */
import { redirect } from "next/navigation";

export default function SignInPage() {
  redirect("/dashboard");
}
