import {
  Brain,
  FileText,
  Calculator,
  Youtube,
  HelpCircle,
  TrendingUp,
  Calendar,
  Upload,
  ArrowRight,
  Check,
  MessageSquare,
  ChevronRight,
  BookOpen,
  Sparkles,
  Video,
} from "lucide-react";

/* ── Tokens ─────────────────────────────────────────── */
const C = {
  bg: "#F8F9FC",
  surface: "#FFFFFF",
  border: "#E4E7F0",
  accent: "#4650E0",
  aLight: "#EEF0FF",
  aMid: "#C7CBF8",
  text: "#0F1117",
  sub: "#6B7280",
  light: "#9CA3AF",
  green: "#059669",
  amber: "#D97706",
  violet: "#7C3AED",
  pink: "#DB2777",
  red: "#DC2626",
};

const wrap = { maxWidth: 1060, margin: "0 auto", padding: "0 24px" };

/* ── Root ───────────────────────────────────────────── */
export default function StudyOS() {
  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "'Inter', system-ui, sans-serif",
        lineHeight: 1.6,
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .sg { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .card { transition: box-shadow .18s ease, transform .18s ease; }
        .card:hover { box-shadow: 0 6px 24px rgba(70,80,224,.1); transform: translateY(-2px); }
        .btnp { transition: background .15s, box-shadow .15s, transform .15s; }
        .btnp:hover { background: #3840CC !important; box-shadow: 0 4px 16px rgba(70,80,224,.3); transform: translateY(-1px); }
        .btns { transition: background .15s, border-color .15s; }
        .btns:hover { background: ${C.aLight} !important; border-color: ${C.aMid} !important; }
        .pill { transition: background .15s, border-color .15s; }
        .pill:hover { background: ${C.aLight} !important; border-color: ${C.aMid} !important; }
        .pill:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; }
        .navlink { transition: color .15s; }
        .navlink:hover { color: ${C.accent} !important; }
        @keyframes fadein { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fadein { animation: fadein .5s ease both; }
        @keyframes pulse { 0%,100%{opacity:.35} 50%{opacity:.85} }
        @media(max-width:780px){
          .hero-inner{flex-direction:column!important}
          .mockup-col{display:none!important}
          .g3{grid-template-columns:1fr 1fr!important}
          .hide-mob{display:none!important}
          h1.hero-h{font-size:34px!important}
          .footer-row{flex-direction:column!important;align-items:flex-start!important;gap:10px!important}
        }
        @media(max-width:480px){
          .g3{grid-template-columns:1fr!important}
        }
      `}</style>

      <Nav />
      <Hero />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
}

/* ── NAV ────────────────────────────────────────────── */
function Nav() {
  return (
    <nav
      style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        position: "sticky",
        top: 0,
        zIndex: 100,
        WebkitBackdropFilter: "blur(12px)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          ...wrap,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px",
        }}
      >
        <Logo />
        <div className="hide-mob" style={{ display: "flex", gap: 28 }}>
          {["Features", "Agents", "Pricing"].map((l) => (
            <a
              key={l}
              href="#"
              className="navlink"
              style={{
                color: C.sub,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {l}
            </a>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btns"
            style={{
              background: "transparent",
              color: C.text,
              border: `1.5px solid ${C.border}`,
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className="btnp"
            style={{
              background: C.accent,
              color: "white",
              border: "none",
              padding: "8px 18px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Get started <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </nav>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: C.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Brain size={16} color="white" />
      </div>
      <span
        className="sg"
        style={{
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: -0.3,
          color: C.text,
        }}
      >
        StudyOS
      </span>
    </div>
  );
}

/* ── HERO ───────────────────────────────────────────── */
function Hero() {
  return (
    <section
      style={{ padding: "80px 0 64px", borderBottom: `1px solid ${C.border}` }}
    >
      <div style={wrap}>
        <div
          className="hero-inner"
          style={{ display: "flex", gap: 56, alignItems: "center" }}
        >
          {/* Copy */}
          <div style={{ flex: "1 1 420px" }} className="fadein">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: C.aLight,
                border: `1px solid ${C.aMid}`,
                borderRadius: 6,
                padding: "4px 12px",
                marginBottom: 24,
              }}
            >
              <Sparkles size={12} color={C.accent} />
              <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>
                Syllabus-first · AI-powered
              </span>
            </div>

            <h1
              className="sg hero-h"
              style={{
                fontSize: 48,
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: -1.4,
                marginBottom: 20,
                color: C.text,
              }}
            >
              Your syllabus.
              <br />
              <span style={{ color: C.accent }}>Your OS for studying.</span>
            </h1>

            <p
              style={{
                fontSize: 16,
                color: C.sub,
                marginBottom: 32,
                maxWidth: 400,
                lineHeight: 1.75,
              }}
            >
              Upload any university syllabus and instantly get notes, solved
              problems, video picks, MCQs, and a personal AI tutor — all scoped
              to your exact curriculum.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 48,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btnp"
                style={{
                  background: C.accent,
                  color: "white",
                  border: "none",
                  padding: "12px 22px",
                  borderRadius: 9,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Upload size={15} /> Upload syllabus — free
              </button>
              <button
                type="button"
                className="btns"
                style={{
                  background: "transparent",
                  color: C.text,
                  border: `1.5px solid ${C.border}`,
                  padding: "12px 20px",
                  borderRadius: 9,
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Video size={14} /> See demo
              </button>
            </div>

            {/* Tiny stat row */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[
                { n: "9", l: "AI agents" },
                { n: "6+", l: "output types" },
                { n: "Any", l: "Indian university" },
              ].map((s) => (
                <div
                  key={s.n}
                  style={{ display: "flex", alignItems: "baseline", gap: 5 }}
                >
                  <span
                    className="sg"
                    style={{ fontSize: 20, fontWeight: 700, color: C.accent }}
                  >
                    {s.n}
                  </span>
                  <span style={{ fontSize: 13, color: C.light }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mockup */}
          <div className="mockup-col" style={{ flex: "0 0 400px" }}>
            <Mockup />
          </div>
        </div>
      </div>
    </section>
  );
}

/* App-window mockup */
function Mockup() {
  const sources = [
    { icon: FileText, label: "DS Syllabus.pdf", color: C.accent },
    { icon: BookOpen, label: "CLRS 4th Ed.", color: C.green },
    { icon: BookOpen, label: "Cormen Algo.", color: C.violet },
  ];
  const topics = [
    { name: "Binary Trees", done: true },
    { name: "AVL Trees", done: true },
    { name: "B+ Trees", done: false },
    { name: "Graph Theory", done: false },
  ];
  const tabs = ["Notes", "Problems", "MCQs", "Videos"];

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(70,80,224,.09), 0 2px 8px rgba(0,0,0,.05)",
      }}
    >
      {/* Window bar */}
      <div
        style={{
          background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          padding: "9px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 5 }}>
          {["#F87171", "#FBBF24", "#34D399"].map((c) => (
            <div
              key={c}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: c,
              }}
            />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 5,
            padding: "3px 10px",
            fontSize: 11,
            color: C.light,
          }}
        >
          StudyOS · SPPU CSE Sem 3 · Data Structures
        </div>
      </div>

      <div style={{ display: "flex", height: 330 }}>
        {/* Sidebar */}
        <div
          style={{
            width: 155,
            borderRight: `1px solid ${C.border}`,
            padding: "12px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.light,
              fontWeight: 600,
              letterSpacing: 0.9,
              textTransform: "uppercase",
              marginBottom: 6,
              padding: "0 4px",
            }}
          >
            Sources
          </div>
          {sources.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 7,
                background: C.bg,
                border: `1px solid ${C.border}`,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  flexShrink: 0,
                  background: `${s.color}14`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <s.icon size={11} color={s.color} />
              </div>
              <span style={{ fontSize: 11, color: C.text, lineHeight: 1.3 }}>
                {s.label}
              </span>
            </div>
          ))}

          <div style={{ height: 1, background: C.border, margin: "8px 0" }} />

          <div
            style={{
              fontSize: 10,
              color: C.light,
              fontWeight: 600,
              letterSpacing: 0.9,
              textTransform: "uppercase",
              marginBottom: 4,
              padding: "0 4px",
            }}
          >
            Topics
          </div>
          {topics.map((t) => (
            <div
              key={t.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "4px 6px",
                borderRadius: 5,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: 3,
                  flexShrink: 0,
                  background: t.done ? C.accent : C.border,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {t.done && <Check size={8} color="white" />}
              </div>
              <span style={{ fontSize: 11, color: t.done ? C.text : C.light }}>
                {t.name}
              </span>
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "14px",
            gap: 10,
            overflow: "hidden",
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: 5 }}>
            {tabs.map((t, i) => (
              <div
                key={t}
                style={{
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: i === 0 ? C.accent : "transparent",
                  color: i === 0 ? "white" : C.light,
                  border: `1px solid ${i === 0 ? C.accent : C.border}`,
                }}
              >
                {t}
              </div>
            ))}
          </div>

          {/* Content skeleton */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span
              className="sg"
              style={{ fontSize: 13, fontWeight: 700, color: C.text }}
            >
              AVL Trees — Unit 2
            </span>
            {[92, 78, 85, 60].map((w) => (
              <div
                key={w}
                style={{
                  width: `${w}%`,
                  height: 7,
                  borderRadius: 4,
                  background: C.border,
                }}
              />
            ))}
            <div style={{ height: 1, background: C.border, margin: "2px 0" }} />
            <div
              style={{
                background: C.aLight,
                border: `1px solid ${C.aMid}`,
                borderRadius: 7,
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              <div
                style={{
                  width: "88%",
                  height: 6,
                  borderRadius: 3,
                  background: C.aMid,
                }}
              />
              <div
                style={{
                  width: "65%",
                  height: 6,
                  borderRadius: 3,
                  background: C.aMid,
                }}
              />
            </div>
          </div>

          {/* Chat bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "7px 10px",
            }}
          >
            <MessageSquare size={13} color={C.light} />
            <span style={{ fontSize: 11, color: C.light, flex: 1 }}>
              Ask about AVL rotations…
            </span>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                background: C.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowRight size={11} color="white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── FEATURES ───────────────────────────────────────── */
function Features() {
  const items = [
    {
      icon: FileText,
      color: C.accent,
      title: "Structured Notes",
      desc: "Long notes, short notes, and revision sheets for every topic — grounded in your syllabus and textbook.",
    },
    {
      icon: Calculator,
      color: C.violet,
      title: "Solved Numericals",
      desc: "Step-by-step derivations and practice problems for Maths, Physics, Statistics, and DSA.",
    },
    {
      icon: Youtube,
      color: C.pink,
      title: "Video Picks",
      desc: "Best-matched NPTEL, YouTube, and MIT OCW videos per topic. No more aimless searching.",
    },
    {
      icon: HelpCircle,
      color: C.amber,
      title: "MCQs & Viva Questions",
      desc: "Auto-generated practice questions mapped directly to your topic list and previous year papers.",
    },
    {
      icon: Calendar,
      color: C.green,
      title: "Smart Study Plans",
      desc: "7-day to 60-day plans tailored to your exam date, syllabus weight, and current progress.",
    },
    {
      icon: TrendingUp,
      color: C.red,
      title: "Exam Predictions",
      desc: "PYQ analysis surfaces which topics are High, Medium, or Low priority — so you study what matters.",
    },
  ];

  const prompts = [
    "Explain AVL rotations",
    "Numerical on Dijkstra's",
    "MCQs for Unit 3",
    "7-day revision plan",
    "High-priority PYQ topics",
    "DBMS viva questions",
  ];

  return (
    <section style={{ padding: "80px 0", background: C.surface }}>
      <div style={wrap}>
        {/* Section header */}
        <div style={{ marginBottom: 48, maxWidth: 480 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: C.aLight,
              border: `1px solid ${C.aMid}`,
              borderRadius: 6,
              padding: "3px 10px",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: C.accent,
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              WHAT YOU GET
            </span>
          </div>
          <h2
            className="sg"
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: -0.5,
              marginBottom: 12,
              color: C.text,
            }}
          >
            Everything a student needs.
          </h2>
          <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.72 }}>
            Upload your syllabus once. StudyOS builds a complete learning
            environment around it — no manual searching across YouTube, PDFs, or
            question banks.
          </p>
        </div>

        {/* Feature grid */}
        <div
          className="g3"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
            marginBottom: 28,
          }}
        >
          {items.map((item) => (
            <div
              key={item.title}
              className="card"
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "20px 20px",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 9,
                  marginBottom: 14,
                  background: `${item.color}12`,
                  border: `1px solid ${item.color}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <item.icon size={18} color={item.color} />
              </div>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 6,
                  color: C.text,
                }}
              >
                {item.title}
              </h3>
              <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.65 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* AI tutor prompt strip */}
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              flexShrink: 0,
            }}
          >
            <MessageSquare size={14} color={C.accent} />
            <span style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>
              AI Tutor
            </span>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {prompts.map((p) => (
              <button
                key={p}
                type="button"
                className="pill"
                style={{
                  fontSize: 12,
                  color: C.accent,
                  fontWeight: 500,
                  background: C.aLight,
                  border: `1px solid ${C.aMid}`,
                  borderRadius: 20,
                  padding: "5px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {p} <ChevronRight size={11} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── CTA ────────────────────────────────────────────── */
function CTA() {
  return (
    <section
      style={{
        padding: "80px 0",
        background: C.bg,
        borderTop: `1px solid ${C.border}`,
      }}
    >
      <div style={{ ...wrap, textAlign: "center" }}>
        <h2
          className="sg"
          style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: -1,
            marginBottom: 16,
            color: C.text,
          }}
        >
          Start with your syllabus.
        </h2>
        <p
          style={{
            fontSize: 16,
            color: C.sub,
            marginBottom: 32,
            maxWidth: 380,
            margin: "0 auto 32px",
            lineHeight: 1.72,
          }}
        >
          Go from "I don't know where to start" to a full study plan in minutes.
        </p>
        <button
          type="button"
          className="btnp"
          style={{
            background: C.accent,
            color: "white",
            border: "none",
            padding: "13px 30px",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Upload size={15} /> Upload syllabus — it's free
        </button>
        <div style={{ marginTop: 14, fontSize: 13, color: C.light }}>
          No credit card · Works for any Indian university
        </div>
      </div>
    </section>
  );
}

/* ── FOOTER ─────────────────────────────────────────── */
function Footer() {
  return (
    <footer
      style={{
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        padding: "24px 0",
      }}
    >
      <div style={{ ...wrap, padding: "0 24px" }}>
        <div
          className="footer-row"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Logo />
          <span style={{ fontSize: 13, color: C.light }}>© 2025 StudyOS</span>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { label: "Privacy", aria: "Privacy policy" },
              { label: "Terms", aria: "Terms of service" },
              { label: "Contact", aria: "Contact us" },
            ].map((link) => (
              <a
                key={link.label}
                href="#"
                aria-label={link.aria}
                style={{
                  fontSize: 13,
                  color: C.light,
                  textDecoration: "none",
                  transition: "color .15s",
                }}
                onMouseEnter={(e) => (e.target.style.color = C.accent)}
                onMouseLeave={(e) => (e.target.style.color = C.light)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
