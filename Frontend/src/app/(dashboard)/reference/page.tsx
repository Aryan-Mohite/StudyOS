"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Upload, File as FileIcon, CheckCircle2, AlertCircle, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLatestSyllabus, uploadReferenceMaterial, getReferenceMaterials, APIError } from "@/lib/api";
import type { Syllabus, ReferenceMaterial, SyllabusUploadState } from "@/types";

export default function ReferenceMaterialPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [materials, setMaterials] = useState<ReferenceMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);

  const [state, setState] = useState<SyllabusUploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const refreshMaterials = useCallback((syllabusId: string) => {
    setMaterialsLoading(true);
    getReferenceMaterials(syllabusId)
      .then((res) => setMaterials(res.materials))
      .catch(() => setMaterials([]))
      .finally(() => setMaterialsLoading(false));
  }, []);

  useEffect(() => {
    getLatestSyllabus()
      .then((s) => {
        setSyllabus(s);
        refreshMaterials(s.syllabus_id);
      })
      .catch(() => setLoadError(true));
  }, [refreshMaterials]);

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
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
    if (!file || !syllabus) return;
    setState("parsing"); // reusing "parsing" to mean "extracting + indexing" here
    try {
      await uploadReferenceMaterial(syllabus.syllabus_id, file);
      setState("success");
      refreshMaterials(syllabus.syllabus_id);
      setTimeout(() => reset(), 1500);
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

  const reset = () => {
    setState("idle");
    setFile(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!syllabus && !loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 size={20} className="animate-spin text-brand-500" />
        <p className="text-sm text-gray-400">Loading your syllabus…</p>
      </div>
    );
  }

  if (!syllabus) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-5 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <BookOpen size={26} className="text-brand-500" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">No syllabus yet</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload your syllabus first — reference material is attached to it.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/upload">
            <Upload size={16} />
            Upload your syllabus
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-bold text-gray-900">Reference material</h1>
        <p className="mt-2 text-sm text-gray-500">
          Upload textbook chapters, lecture PDFs, or past-paper solutions for{" "}
          <span className="font-medium text-gray-700">
            {syllabus.university ?? "your syllabus"}
          </span>
          . StudyOS grounds Notes, MCQs, and Numericals in these when they're relevant — this is
          entirely optional, everything works fine without it.
        </p>
      </div>

      {/* ── Already-uploaded files ─────────────────────────────── */}
      {!materialsLoading && materials.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-[12px] font-bold uppercase tracking-widest text-gray-400">
            Uploaded ({materials.length})
          </h2>
          <div className="flex flex-col gap-2">
            {materials.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <FileIcon size={15} className="shrink-0 text-brand-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{m.filename}</p>
                  <p className="text-[11px] text-gray-400">{m.chunks_indexed} chunks indexed</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <FileIcon size={22} className="text-brand-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="mt-0.5 text-sm text-gray-400">{(file.size / 1024).toFixed(0)} KB · PDF</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); reset(); }} className="text-xs text-gray-400 hover:text-gray-600">
                  Remove
                </button>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                  <Upload size={22} className="text-brand-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-700">Drop a reference PDF here</p>
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
            Upload & index
          </Button>
        </div>
      )}

      {/* ── Extracting + indexing ─────────────────────────────── */}
      {state === "parsing" && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
              <Upload size={20} className="text-brand-500" />
            </div>
            <div>
              <p className="font-medium text-gray-800">Reading and indexing {file?.name}…</p>
              <p className="mt-1 text-xs text-gray-400">This can take a minute for longer PDFs.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Success ────────────────────────────────────────────── */}
      {state === "success" && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={22} className="text-emerald-500" />
          </div>
          <p className="font-medium text-gray-900">Indexed successfully</p>
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
              {state === "error_parse" ? "Couldn't read this PDF" : "Upload failed"}
            </p>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">{errorMsg}</p>
          </div>
          <Button variant="outline" onClick={reset}>Try again</Button>
        </div>
      )}
    </div>
  );
}
