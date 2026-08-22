# StudyOS — User Guide

This guide walks through everything you can do in StudyOS as a student,
page by page. If you're looking for setup or API details instead, see
[`DOCUMENTATION.md`](DOCUMENTATION.md).

Live app: **https://study-os-liart-six.vercel.app/**

---

## 1. Creating an account

StudyOS uses email/Google sign-in (via Clerk) — click **Sign up** on the
landing page, verify your email, and you'll land on your dashboard.

On first login, open **Profile** (left nav) and fill in:

- **Name**
- **Education level, course** (e.g. "CS", "MBA", "MBBS")
- **University** (e.g. "SPPU", "VTU", "Mumbai University")

This isn't required to start using the app, but it's what personalizes
things like the dashboard greeting.

## 2. Uploading your syllabus

Go to **Upload** and drop in your syllabus PDF (max 10 MB). StudyOS reads
the file and extracts your subjects, units, and topics into a structured
tree — you'll see this appear as a **Syllabus Tree** in the left sidebar
across the app.

**Tips for a clean parse:**
- Digitally-authored PDFs (exported from Word, LaTeX, or a college
  website) parse best. A syllabus that's a *photograph* of a printed page
  may fail to extract — if that happens, try a text-based version of the
  same document if your college provides one.
- You can only have one active syllabus parsed at a time per upload;
  uploading a new one replaces what the app is currently scoped to.

Once parsing finishes, you're dropped onto the **Dashboard**, with your
subjects listed and ready to open.

## 3. The Dashboard

Your home base. It shows:
- Your parsed syllabus tree (subjects → units → topics) in the sidebar
- A subject grid to jump into any subject
- Your daily/weekly goal progress and current streak
- Weak topics and upcoming revisions, once you've done some MCQ practice

Click any topic to open its **Study** view.

## 4. Studying a topic

Each topic has two tabs:

### Notes
Click **Generate** the first time you open a topic — StudyOS produces
structured notes (long-form explanation plus a revision-friendly summary)
scoped to that exact topic and your syllabus wording. Generated notes are
cached, so reopening the same topic later loads instantly instead of
re-generating. If you want a fresh version (e.g. after uploading new
reference material), use **Regenerate**.

If you've uploaded reference material for that subject (see §6), notes are
grounded in it — you'll see an indicator when a topic's content is drawn
from your own uploaded material rather than general knowledge.

### MCQs
Generate a practice set for the topic. Before generating, pick a
**difficulty: Easy / Medium / Hard / Mixed.** Once you've attempted enough
questions on a topic, StudyOS will suggest a difficulty based on your
recent accuracy — you can tap the suggestion chip to apply it, or ignore
it and pick your own.

Answer each question; StudyOS tells you immediately whether you got it
right and records the attempt. Switching difficulty on a topic you've
already generated for produces a genuinely new set — it won't silently
serve you a cached set at the wrong difficulty.

> **Note:** earlier versions of this project included an AI tutor chat and
> a solved-numericals generator. Both were intentionally removed to keep
> the product focused — you won't find them in the current app.

## 5. Study Plan

Open **Plan**, pick your exam date, and generate. StudyOS builds a
day-by-day schedule covering every topic in your syllabus between now and
that date, including dedicated **revision days** and, for longer plans,
**mock-test days.** Each day lists which topics to cover and a short focus
note.

Regenerating with a different exam date always produces a new plan; the
same syllabus + exam date combination is cached so reopening the page is
instant.

## 6. Reference Material

Open **Reference material** to upload your own textbook chapters, lecture
slides (as PDF), or past-paper solutions — one file at a time, tied to
your current syllabus. This is entirely optional: Notes and MCQs work
fine without it, drawing on the model's general subject knowledge instead.

What uploading changes: any topic that overlaps with your uploaded
material will have its Notes and MCQs generated *from* that material
first, rather than from general knowledge — useful if your professor
grades against a specific textbook's terminology or a specific past-paper
style.

You can upload multiple files per subject over time; StudyOS lists
everything you've uploaded so far, newest first.

## 7. Progress

Open **Progress** to see, per subject and per topic:
- Your mastery score (based on MCQ accuracy)
- Total attempts and correct attempts
- Which topics are flagged **weak** and due for review

This is also where the app decides what to suggest on your dashboard's
"upcoming revisions" list — topics you haven't touched recently, or got
wrong often, get surfaced again before they're forgotten.

## 8. Goals & streaks

From the dashboard, you can set:
- A **daily goal** — how many MCQ questions you want to answer today
- A **weekly goal** — how many distinct topics you want to cover this week

These reset on their respective schedules and contribute to your visible
streak on the dashboard.

## 9. Common questions

**Why did my notes/MCQs take 30–60 seconds the first time today?**
The AI backend runs on a free hosting tier that goes to sleep after 15
minutes of no traffic and takes a moment to wake up. Subsequent requests
in the same session are fast. This isn't a bug — see
[`DOCUMENTATION.md`](DOCUMENTATION.md) if you're curious why.

**Can I study multiple syllabi at once (e.g. two semesters)?**
Each upload scopes the app to that syllabus, and everything (notes, MCQs,
progress, reference material) is tracked separately per syllabus — but the
dashboard currently reflects your *most recently uploaded* syllabus.

**I uploaded the wrong PDF — can I redo it?**
Yes, just upload again from the **Upload** page.

**Is there a mobile app?**
No — StudyOS is a responsive web app; use it from your phone's browser at
the same URL.
