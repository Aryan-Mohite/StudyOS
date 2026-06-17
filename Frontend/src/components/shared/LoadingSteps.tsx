"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";

interface LoadingStepsProps {
  currentStep: string;
  completedSteps: string[];
  estimatedSeconds?: number;
}

export function LoadingSteps({ currentStep, completedSteps, estimatedSeconds }: LoadingStepsProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
      {/* Spinner */}
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
        <Loader2 size={22} className="animate-spin text-brand-500" />
      </div>

      {/* Steps */}
      <div className="flex flex-col items-center gap-2">
        {/* Completed steps */}
        {completedSteps.map((step) => (
          <div key={step} className="flex items-center gap-2 text-sm text-gray-400">
            <CheckCircle2 size={14} className="text-brand-400" />
            <span>{step}</span>
          </div>
        ))}

        {/* Current step */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
            <span>{currentStep}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {estimatedSeconds && (
        <p className="text-xs text-gray-400">~{estimatedSeconds} seconds</p>
      )}
    </div>
  );
}
