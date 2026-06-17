"use client";
import { AlertTriangle, RefreshCw, BookOpen, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  message: string;
  suggestion?: string;
  relatedTopics?: string[];
}

export function EmptyState({ message, suggestion, relatedTopics }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
        <BookOpen size={20} className="text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">{message}</p>
        {suggestion && <p className="mt-1 text-xs text-gray-400">{suggestion}</p>}
      </div>
      {relatedTopics && relatedTopics.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {relatedTopics.map((t) => (
            <span key={t} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 border border-brand-200">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stale Warning ────────────────────────────────────────────────────────────

interface StaleWarningProps {
  onRegenerate: () => void;
}

export function StaleWarning({ onRegenerate }: StaleWarningProps) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
        <p className="text-xs font-medium text-amber-700">
          Your syllabus was updated. This content may be outdated.
        </p>
      </div>
      <button
        onClick={onRegenerate}
        className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
      >
        <RefreshCw size={12} />
        Regenerate
      </button>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
        <AlertTriangle size={20} className="text-red-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">
          {message ?? "Something went wrong. Please try again."}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          If this keeps happening, try refreshing the page.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry}>
        <RefreshCw size={13} /> Try again
      </Button>
    </div>
  );
}

// ─── Formula Block ────────────────────────────────────────────────────────────

interface FormulaBlockProps {
  formula: string;
}

export function FormulaBlock({ formula }: FormulaBlockProps) {
  return (
    <div className="my-3 flex items-center gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3">
      <Lightbulb size={14} className="shrink-0 text-brand-400" />
      <code className="font-mono text-[13px] text-brand-700 leading-relaxed break-all">
        {formula}
      </code>
    </div>
  );
}

// ─── Idle Generate Card ────────────────────────────────────────────────────────

interface IdleGenerateProps {
  label: string;
  description: string;
  estimatedTime: string;
  onGenerate: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
}

export function IdleGenerateCard({ label, description, estimatedTime, onGenerate, icon, disabled }: IdleGenerateProps) {
  return (
    <div className="flex flex-col items-center gap-5 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">{description}</p>
        <p className="mt-1 text-xs text-gray-400">Takes {estimatedTime}</p>
      </div>
      <Button onClick={onGenerate} disabled={disabled}>
        {label}
      </Button>
    </div>
  );
}
