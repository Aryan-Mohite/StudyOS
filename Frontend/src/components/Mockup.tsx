import { FileText, BookOpen, Check, ArrowRight, MessageSquare } from "lucide-react";

const sources = [
  { icon: FileText, label: "DS Syllabus.pdf", color: "#4650E0" },
  { icon: BookOpen, label: "CLRS 4th Ed.",    color: "#059669" },
  { icon: BookOpen, label: "Korth DBMS",      color: "#7C3AED" },
];

const topics = [
  { name: "Binary Trees", done: true  },
  { name: "AVL Trees",    done: true  },
  { name: "B+ Trees",     done: false },
  { name: "Graph Theory", done: false },
];

const tabs = ["Notes", "Problems", "MCQs", "Videos"];

export function Mockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_40px_rgba(70,80,224,0.10),0_2px_8px_rgba(0,0,0,0.05)]">
      {/* Window bar */}
      <div className="flex items-center gap-2.5 border-b border-border bg-page px-4 py-2.5">
        <div className="flex gap-1.5">
          {["#F87171","#FBBF24","#34D399"].map(c => (
            <div key={c} style={{ background: c }} className="h-2 w-2 rounded-full" />
          ))}
        </div>
        <div className="flex-1 rounded-md border border-border bg-surface px-3 py-1 text-[11px] text-gray-400">
          StudyOS · SPPU CSE Sem 3 · Data Structures
        </div>
      </div>

      <div className="flex h-[320px]">
        {/* Sidebar */}
        <div className="flex w-40 flex-col gap-1 border-r border-border p-3">
          <p className="mb-1 px-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">Sources</p>
          {sources.map((s) => (
            <div key={s.label} className="flex items-center gap-2 rounded-lg border border-border bg-page p-1.5">
              <div style={{ background: `${s.color}18` }} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md">
                <s.icon size={10} style={{ color: s.color }} />
              </div>
              <span className="text-[10px] leading-tight text-gray-700">{s.label}</span>
            </div>
          ))}

          <div className="my-2 h-px bg-border" />
          <p className="mb-1 px-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">Topics</p>
          {topics.map((t) => (
            <div key={t.name} className="flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5">
              <div style={{ background: t.done ? "#4650E0" : "#DDE0F2" }}
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px]">
                {t.done && <Check size={8} className="text-white" />}
              </div>
              <span style={{ color: t.done ? "#0F1117" : "#9CA3AF" }} className="text-[10px]">{t.name}</span>
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex flex-1 flex-col gap-2.5 overflow-hidden p-3">
          <div className="flex gap-1.5">
            {tabs.map((t, i) => (
              <div key={t}
                style={i === 0 ? { background: "#4650E0", color: "white", borderColor: "#4650E0" } : {}}
                className="cursor-pointer rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold text-gray-400">
                {t}
              </div>
            ))}
          </div>

          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            <span className="text-[12px] font-bold text-gray-900">AVL Trees — Unit 2</span>
            {[92, 78, 85, 60].map((w) => (
              <div key={w} style={{ width: `${w}%` }} className="h-1.5 rounded-full bg-border" />
            ))}
            <div className="my-1 h-px bg-border" />
            <div className="rounded-lg border bg-brand-50 border-brand-200 p-2 flex flex-col gap-1">
              <div className="h-1.5 w-[88%] rounded-full bg-brand-200" />
              <div className="h-1.5 w-[65%] rounded-full bg-brand-200" />
            </div>
          </div>

          {/* Chat strip */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-page px-2.5 py-1.5">
            <MessageSquare size={12} className="text-gray-400 shrink-0" />
            <span className="flex-1 text-[10px] text-gray-400">Ask about AVL rotations…</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-500">
              <ArrowRight size={10} className="text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
