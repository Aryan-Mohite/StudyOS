import Link from "next/link";
import { Brain } from "lucide-react";

export const metadata = { title: "Privacy Policy · StudyOS" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500">
          <Brain size={14} className="text-white" />
        </div>
        <span className="font-display text-sm font-bold text-gray-900">StudyOS</span>
      </Link>

      <h1 className="font-display text-2xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-400">Last updated {new Date().getFullYear()}</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-600">
        <p>
          StudyOS collects only what it needs to generate study materials from your
          syllabus: your account details from Clerk (name, email), the syllabus PDFs
          and reference material you upload, your study profile (education level,
          course, university), and your chat history with the AI tutor.
        </p>
        <p>
          Uploaded documents are used solely to generate notes, MCQs, numericals, and
          tutor responses for your account. We do not sell your data or share it with
          third parties for advertising.
        </p>
        <p>
          Content you upload may be processed by third-party LLM providers (Groq,
          Gemini, or Anthropic depending on configuration) strictly to generate your
          study materials.
        </p>
        <p>
          You can request deletion of your account and associated data at any time by
          contacting us — see the Contact page.
        </p>
        <p className="text-gray-400">
          This is a placeholder policy for the StudyOS project and should be replaced
          with a reviewed legal document before production use.
        </p>
      </div>
    </div>
  );
}
