import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-page p-8">
      <h1 className="font-display text-2xl font-bold text-gray-900">
        Welcome back, {user?.firstName ?? "Student"} 👋
      </h1>
      <p className="mt-2 text-gray-500">Upload a syllabus to get started.</p>
      {/* TODO: Dashboard UI with subject list, notes, chat */}
    </div>
  );
}
