"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, File, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockUploadSyllabus } from "@/lib/mock-api";
import { uploadSyllabus, APIError } from "@/lib/api";
import { USE_REAL_API } from "@/lib/flags";
import type { SyllabusUploadState } from "@/types";

const PARSE_STEPS = [
  "Uploading file…",
  "Reading PDF content…",
  "Identifying subjects and units…",
  "Mapping topics and subtopics…",
  "Finalising syllabus structure…",
];

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<SyllabusUploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".pdf")) {
      setState("error_format");
      setErrorMsg("Please upload a PDF file.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setState("error_format");
      setErrorMsg("File must be under 10 MB.");
      return;
    }
    setFile(f);
    setState("file_selected");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;

    // Simulate upload progress bar (UI only)
    setState("uploading");
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress((p: number) => {
        if (p >= 85) { clearInterval(progressInterval); return 85; }
        return p + 12;
      });
    }, 180);

    setState("parsing");
    clearInterval(progressInterval);
    setUploadProgress(100);
    setCompletedSteps([]);

    try {
      if (USE_REAL_API) {
        await runRealUpload(file);
      } else {
        await runMockUpload(file);
      }
      setState("success");
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err) {
      const msg =
        err instanceof APIError
          ? err.detail
          : err instanceof Error
          ? err.message
          : "Upload failed. Please try again.";
      setErrorMsg(msg);
      setState(err instanceof APIError && err.status === 422 ? "error_parse" : "error_upload");
    }
  };

  const runRealUpload = async (f: File) => {
    // Animate steps while the real API runs (~15–40 s)
    let idx = 0;
    setCurrentStep(PARSE_STEPS[0]);
    const ticker = setInterval(() => {
      idx = Math.min(idx + 1, PARSE_STEPS.length - 1);
      setCompletedSteps(PARSE_STEPS.slice(0, idx));
      setCurrentStep(PARSE_STEPS[idx]);
    }, 4500);

    try {
      await uploadSyllabus(f);
    } finally {
      clearInterval(ticker);
    }
  };

  const runMockUpload = async (f: File) => {
    await mockUploadSyllabus(f, (step) => {
      setCurrentStep(step);
      const idx = PARSE_STEPS.indexOf(step);
      setCompletedSteps(PARSE_STEPS.slice(0, idx));
    });
  };

  const reset = () => {
    setState("idle");
    setFile(null);
    setUploadProgress(0);
    setCompletedSteps([]);
    setErrorMsg("");
  };

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-bold text-gray-900">Upload your syllabus</h1>
        <p className="mt-2 text-sm text-gray-500">
          PDF from your university portal, class notes, or course outline.
          We&apos;ll extract the full subject and topic structure.
        </p>
        {USE_REAL_API && (
          <span className="mt-2 inline-block rounded-full bg-brand-50 border border-brand-200 px-3 py-0.5 text-[11px] font-semibold text-brand-600">
            Live mode · Claude will parse your PDF
          </span>
        )}
      </div>

      {/* ── Idle / File selected / Format error ─────────────── */}
      {(state === "idle" || state === "file_selected" || state === "error_format") && (
        <div className="flex flex-col gap-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => state === "idle" && fileInputRef.current?.click()}
            className={`flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-12 text-center transition-all ${
              dragOver
                ? "border-brand-400 bg-brand-50"
                : state === "file_selected"
                ? "border-brand-300 bg-brand-50/40 cursor-default"
                : "border-border bg-surface cursor-pointer hover:border-brand-300 hover:bg-brand-50/30"
            }`}
          >
            {state === "file_selected" && file ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
                  <File size={22} className="text-brand-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="mt-0.5 text-sm text-gray-400">{(file.size / 1024).toFixed(0)} KB · PDF</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); reset(); }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  <X size={12} /> Remove
                </button>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                  <Upload size={22} className="text-brand-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-700">Drop your syllabus PDF here</p>
                  <p className="mt-0.5 text-sm text-gray-400">or click to browse · PDF only · max 10 MB</p>
                </div>
              </>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

          {state === "error_format" && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle size={15} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          <Button size="lg" className="w-full" disabled={state !== "file_selected"} onClick={handleUpload}>
            <Upload size={16} />
            {USE_REAL_API ? "Upload & Analyse with Claude" : "Analyse Syllabus (mock)"}
          </Button>
          <p className="text-center text-xs text-gray-400">
            Works with SPPU, Mumbai University, VTU, GTU, Anna University, and more
          </p>
        </div>
      )}

      {/* ── Uploading ─────────────────────────────────────────── */}
      {state === "uploading" && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="mb-4 text-sm font-medium text-gray-700">Uploading {file?.name}…</p>
          <div className="h-2 w-full rounded-full bg-border">
            <div className="h-2 rounded-full bg-brand-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-400">{uploadProgress}%</p>
        </div>
      )}

      {/* ── Parsing ────────────────────────────────────────────── */}
      {state === "parsing" && (
        <div className="rounded-2xl border border-border bg-surface p-8">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
              <Upload size={20} className="text-brand-500" />
            </div>
            <div>
              <p className="font-medium text-gray-800">Analysing your syllabus…</p>
              <p className="mt-1 text-xs text-gray-400">
                {USE_REAL_API ? "Claude is reading your PDF (~30 seconds)" : "~5 seconds"}
              </p>
            </div>
            <div className="flex w-full flex-col items-start gap-2 text-left">
              {completedSteps.map((step) => (
                <div key={step} className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle2 size={13} className="text-brand-400 shrink-0" /> {step}
                </div>
              ))}
              {currentStep && (
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                  {currentStep}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Success ────────────────────────────────────────────── */}
      {state === "success" && (
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={26} className="text-emerald-500" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-gray-900">Syllabus ready!</p>
            <p className="mt-1 text-sm text-gray-500">Taking you to your dashboard…</p>
          </div>
        </div>
      )}

      {/* ── Errors ──────────────────────────────────────────────── */}
      {(state === "error_parse" || state === "error_upload") && (
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle size={22} className="text-red-500" />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {state === "error_parse" ? "Couldn't read this syllabus" : "Upload failed"}
            </p>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">{errorMsg}</p>
          </div>
          <Button variant="outline" onClick={reset}>Try again</Button>
        </div>
      )}
    </div>
  );
}
