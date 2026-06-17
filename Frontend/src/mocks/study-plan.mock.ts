import type { StudyPlan } from "@/types";

export const mockStudyPlan: StudyPlan = {
  plan_id: "sp-001",
  syllabus_id: "s-sppu-mech-sem5",
  exam_date: "2024-11-15",
  generated_at: "2024-10-01T09:00:00Z",
  total_days: 45,
  total_topics: 23,
  daily_hours: 6,
  weeks: [
    {
      week_number: 1,
      theme: "Data Structures — Linear Foundations",
      days: [
        {
          date: "2024-10-01",
          day_label: "Day 1 — Tue, Oct 1",
          is_buffer: false,
          tasks: [
            { task_id: "tk-001", topic_id: "t-ds-001", subject: "Data Structures", topic: "Arrays and Dynamic Arrays", duration_minutes: 90, task_type: "study", priority: "medium", notes: "Focus on amortized analysis of doubling — explain why average insertion is O(1)" },
            { task_id: "tk-002", topic_id: "t-ds-002", subject: "Data Structures", topic: "Linked Lists", duration_minutes: 90, task_type: "study", priority: "medium", notes: "Draw pointer diagrams for insert and delete — don't just memorise code" },
            { task_id: "tk-003", topic_id: "t-ds-001", subject: "Data Structures", topic: "Arrays and Dynamic Arrays", duration_minutes: 45, task_type: "practice", priority: "low", notes: null },
          ],
        },
        {
          date: "2024-10-02",
          day_label: "Day 2 — Wed, Oct 2",
          is_buffer: false,
          tasks: [
            { task_id: "tk-004", topic_id: "t-ds-003", subject: "Data Structures", topic: "Stacks and Their Applications", duration_minutes: 90, task_type: "study", priority: "high", notes: "Infix→postfix conversion is a common exam question — practice 3 examples" },
            { task_id: "tk-005", topic_id: "t-ds-004", subject: "Data Structures", topic: "Queues and Deques", duration_minutes: 90, task_type: "study", priority: "medium", notes: null },
            { task_id: "tk-006", topic_id: "t-ds-002", subject: "Data Structures", topic: "Linked Lists", duration_minutes: 45, task_type: "revise", priority: "medium", notes: null },
          ],
        },
        {
          date: "2024-10-03",
          day_label: "Day 3 — Thu, Oct 3",
          is_buffer: false,
          tasks: [
            { task_id: "tk-007", topic_id: "t-ds-003", subject: "Data Structures", topic: "Stacks and Their Applications", duration_minutes: 60, task_type: "revise", priority: "high", notes: null },
            { task_id: "tk-008", topic_id: "t-ds-004", subject: "Data Structures", topic: "Queues and Deques", duration_minutes: 60, task_type: "practice", priority: "medium", notes: null },
            { task_id: "tk-009", topic_id: "t-ds-005", subject: "Data Structures", topic: "Binary Trees and BST", duration_minutes: 120, task_type: "study", priority: "high", notes: "All four traversals (pre/in/post/level) — derive from recursion, not memory" },
          ],
        },
        {
          date: "2024-10-04",
          day_label: "Day 4 — Fri, Oct 4",
          is_buffer: false,
          tasks: [
            { task_id: "tk-010", topic_id: "t-ds-005", subject: "Data Structures", topic: "Binary Trees and BST", duration_minutes: 90, task_type: "study", priority: "high", notes: "BST insert/delete/search — trace through examples" },
            { task_id: "tk-011", topic_id: "t-ds-006", subject: "Data Structures", topic: "AVL Trees", duration_minutes: 150, task_type: "study", priority: "high", notes: "AVL is a high-priority PYQ topic. Study all 4 rotation types with diagrams" },
          ],
        },
        {
          date: "2024-10-05",
          day_label: "Day 5 — Sat, Oct 5",
          is_buffer: false,
          tasks: [
            { task_id: "tk-012", topic_id: "t-ds-006", subject: "Data Structures", topic: "AVL Trees", duration_minutes: 120, task_type: "practice", priority: "high", notes: "Do 5 insertion problems from scratch on paper" },
            { task_id: "tk-013", topic_id: "t-ds-007", subject: "Data Structures", topic: "Heaps and Priority Queues", duration_minutes: 120, task_type: "study", priority: "medium", notes: null },
          ],
        },
        {
          date: "2024-10-06",
          day_label: "Day 6 — Sun, Oct 6",
          is_buffer: true,
          tasks: [
            { task_id: "tk-014", topic_id: "t-ds-001", subject: "Data Structures", topic: "Week 1 Revision — Linear Structures + Trees", duration_minutes: 120, task_type: "revise", priority: "high", notes: "Cover all topics from Day 1–5. Identify weak areas for extra practice." },
            { task_id: "tk-015", topic_id: "t-ds-006", subject: "Data Structures", topic: "AVL Trees", duration_minutes: 60, task_type: "practice", priority: "high", notes: "Attempt 3 past exam questions on AVL" },
          ],
        },
      ],
    },
    {
      week_number: 2,
      theme: "Data Structures — Advanced Trees and Graphs",
      days: [
        {
          date: "2024-10-07",
          day_label: "Day 7 — Mon, Oct 7",
          is_buffer: false,
          tasks: [
            { task_id: "tk-016", topic_id: "t-ds-008", subject: "Data Structures", topic: "B-Trees and B+ Trees", duration_minutes: 150, task_type: "study", priority: "high", notes: "Focus on split conditions — this is frequently asked in exams" },
            { task_id: "tk-017", topic_id: "t-ds-007", subject: "Data Structures", topic: "Heaps and Priority Queues", duration_minutes: 90, task_type: "revise", priority: "medium", notes: null },
          ],
        },
        {
          date: "2024-10-08",
          day_label: "Day 8 — Tue, Oct 8",
          is_buffer: false,
          tasks: [
            { task_id: "tk-018", topic_id: "t-ds-009", subject: "Data Structures", topic: "Graph Representations and Traversals", duration_minutes: 120, task_type: "study", priority: "high", notes: "BFS and DFS — trace on 6-node example, track visited array and queue/stack" },
            { task_id: "tk-019", topic_id: "t-ds-008", subject: "Data Structures", topic: "B-Trees and B+ Trees", duration_minutes: 90, task_type: "practice", priority: "high", notes: null },
          ],
        },
        {
          date: "2024-10-09",
          day_label: "Day 9 — Wed, Oct 9",
          is_buffer: false,
          tasks: [
            { task_id: "tk-020", topic_id: "t-ds-010", subject: "Data Structures", topic: "Shortest Path Algorithms", duration_minutes: 150, task_type: "study", priority: "high", notes: "Dijkstra's is a guaranteed exam question — do the full table-based trace for 3 problems" },
            { task_id: "tk-021", topic_id: "t-ds-009", subject: "Data Structures", topic: "Graph Representations and Traversals", duration_minutes: 60, task_type: "revise", priority: "medium", notes: null },
          ],
        },
        {
          date: "2024-10-10",
          day_label: "Day 10 — Thu, Oct 10",
          is_buffer: false,
          tasks: [
            { task_id: "tk-022", topic_id: "t-ds-011", subject: "Data Structures", topic: "Sorting Algorithms", duration_minutes: 150, task_type: "study", priority: "medium", notes: "Focus on merge sort and quick sort — trace through on 8-element arrays" },
            { task_id: "tk-023", topic_id: "t-ds-010", subject: "Data Structures", topic: "Shortest Path Algorithms", duration_minutes: 60, task_type: "practice", priority: "high", notes: null },
          ],
        },
        {
          date: "2024-10-11",
          day_label: "Day 11 — Fri, Oct 11",
          is_buffer: false,
          tasks: [
            { task_id: "tk-024", topic_id: "t-ds-012", subject: "Data Structures", topic: "Hashing and Hash Tables", duration_minutes: 120, task_type: "study", priority: "medium", notes: null },
            { task_id: "tk-025", topic_id: "t-ds-011", subject: "Data Structures", topic: "Sorting Algorithms", duration_minutes: 90, task_type: "practice", priority: "medium", notes: null },
          ],
        },
        {
          date: "2024-10-12",
          day_label: "Day 12 — Sat, Oct 12",
          is_buffer: true,
          tasks: [
            { task_id: "tk-026", topic_id: "t-ds-009", subject: "Data Structures", topic: "Week 2 Revision — Advanced DS", duration_minutes: 180, task_type: "revise", priority: "high", notes: "Focus on B-trees, Dijkstra's, and Sorting — most likely exam topics" },
          ],
        },
      ],
    },
    {
      week_number: 3,
      theme: "Heat Transfer — Conduction",
      days: [
        {
          date: "2024-10-14",
          day_label: "Day 14 — Mon, Oct 14",
          is_buffer: false,
          tasks: [
            { task_id: "tk-027", topic_id: "t-ht-001", subject: "Heat Transfer", topic: "Fourier's Law of Heat Conduction", duration_minutes: 120, task_type: "study", priority: "high", notes: "Derive the heat equation from first principles — don't just memorise the formula" },
            { task_id: "tk-028", topic_id: "t-ht-001", subject: "Heat Transfer", topic: "Fourier's Law of Heat Conduction", duration_minutes: 90, task_type: "practice", priority: "high", notes: "Solve 3 plane wall numericals from the problem set" },
          ],
        },
        {
          date: "2024-10-15",
          day_label: "Day 15 — Tue, Oct 15",
          is_buffer: false,
          tasks: [
            { task_id: "tk-029", topic_id: "t-ht-002", subject: "Heat Transfer", topic: "Thermal Resistance and Composite Walls", duration_minutes: 150, task_type: "study", priority: "high", notes: "Draw the electrical analogy circuit for every problem — examiners award marks for diagrams" },
            { task_id: "tk-030", topic_id: "t-ht-001", subject: "Heat Transfer", topic: "Fourier's Law of Heat Conduction", duration_minutes: 60, task_type: "revise", priority: "medium", notes: null },
          ],
        },
        {
          date: "2024-10-16",
          day_label: "Day 16 — Wed, Oct 16",
          is_buffer: false,
          tasks: [
            { task_id: "tk-031", topic_id: "t-ht-003", subject: "Heat Transfer", topic: "Critical Radius of Insulation", duration_minutes: 120, task_type: "study", priority: "medium", notes: "The counterintuitive result (adding insulation increases Q up to r_cr) is exam favourite" },
            { task_id: "tk-032", topic_id: "t-ht-002", subject: "Heat Transfer", topic: "Thermal Resistance and Composite Walls", duration_minutes: 90, task_type: "practice", priority: "high", notes: null },
          ],
        },
        {
          date: "2024-10-17",
          day_label: "Day 17 — Thu, Oct 17",
          is_buffer: false,
          tasks: [
            { task_id: "tk-033", topic_id: "t-ht-004", subject: "Heat Transfer", topic: "Extended Surfaces (Fins)", duration_minutes: 150, task_type: "study", priority: "high", notes: "Fin efficiency η_f and fin effectiveness ε_f — know the formulas and physical meaning" },
          ],
        },
        {
          date: "2024-10-18",
          day_label: "Day 18 — Fri, Oct 18",
          is_buffer: false,
          tasks: [
            { task_id: "tk-034", topic_id: "t-ht-004", subject: "Heat Transfer", topic: "Extended Surfaces (Fins)", duration_minutes: 90, task_type: "practice", priority: "high", notes: null },
            { task_id: "tk-035", topic_id: "t-ht-003", subject: "Heat Transfer", topic: "Critical Radius of Insulation", duration_minutes: 90, task_type: "practice", priority: "medium", notes: null },
          ],
        },
        {
          date: "2024-10-19",
          day_label: "Day 19 — Sat, Oct 19",
          is_buffer: true,
          tasks: [
            { task_id: "tk-036", topic_id: "t-ht-001", subject: "Heat Transfer", topic: "Week 3 Revision — Conduction", duration_minutes: 180, task_type: "revise", priority: "high", notes: "Do 5 mixed conduction problems — composite walls, fins, critical radius" },
          ],
        },
      ],
    },
    {
      week_number: 4,
      theme: "Heat Transfer — Convection and Radiation",
      days: [
        {
          date: "2024-10-21",
          day_label: "Day 21 — Mon, Oct 21",
          is_buffer: false,
          tasks: [
            { task_id: "tk-037", topic_id: "t-ht-005", subject: "Heat Transfer", topic: "Newton's Law of Cooling and Boundary Layer", duration_minutes: 120, task_type: "study", priority: "high", notes: null },
            { task_id: "tk-038", topic_id: "t-ht-006", subject: "Heat Transfer", topic: "Forced Convection Over Flat Plates", duration_minutes: 120, task_type: "study", priority: "high", notes: "Memorise the Nusselt number correlations — they're always given in exam but you need to know when to apply each" },
          ],
        },
        {
          date: "2024-10-22",
          day_label: "Day 22 — Tue, Oct 22",
          is_buffer: false,
          tasks: [
            { task_id: "tk-039", topic_id: "t-ht-007", subject: "Heat Transfer", topic: "Forced Convection in Tubes", duration_minutes: 120, task_type: "study", priority: "high", notes: "Dittus-Boelter equation — know heating vs cooling exponent (0.4 vs 0.3)" },
            { task_id: "tk-040", topic_id: "t-ht-006", subject: "Heat Transfer", topic: "Forced Convection Over Flat Plates", duration_minutes: 90, task_type: "practice", priority: "high", notes: null },
          ],
        },
        {
          date: "2024-10-23",
          day_label: "Day 23 — Wed, Oct 23",
          is_buffer: false,
          tasks: [
            { task_id: "tk-041", topic_id: "t-ht-008", subject: "Heat Transfer", topic: "Natural (Free) Convection", duration_minutes: 120, task_type: "study", priority: "medium", notes: null },
            { task_id: "tk-042", topic_id: "t-ht-007", subject: "Heat Transfer", topic: "Forced Convection in Tubes", duration_minutes: 90, task_type: "practice", priority: "high", notes: null },
          ],
        },
        {
          date: "2024-10-24",
          day_label: "Day 24 — Thu, Oct 24",
          is_buffer: false,
          tasks: [
            { task_id: "tk-043", topic_id: "t-ht-009", subject: "Heat Transfer", topic: "Radiation Fundamentals and Stefan-Boltzmann Law", duration_minutes: 120, task_type: "study", priority: "high", notes: "Temperatures must be in Kelvin for radiation calculations — common error" },
            { task_id: "tk-044", topic_id: "t-ht-010", subject: "Heat Transfer", topic: "View Factors", duration_minutes: 90, task_type: "study", priority: "medium", notes: null },
          ],
        },
        {
          date: "2024-10-25",
          day_label: "Day 25 — Fri, Oct 25",
          is_buffer: false,
          tasks: [
            { task_id: "tk-045", topic_id: "t-ht-011", subject: "Heat Transfer", topic: "Radiation Exchange Between Surfaces", duration_minutes: 150, task_type: "study", priority: "high", notes: "Radiation network — draw it for every problem before solving" },
          ],
        },
        {
          date: "2024-10-26",
          day_label: "Day 26 — Sat, Oct 26",
          is_buffer: true,
          tasks: [
            { task_id: "tk-046", topic_id: "t-ht-005", subject: "Heat Transfer", topic: "Week 4 Revision — Convection & Radiation", duration_minutes: 180, task_type: "revise", priority: "high", notes: "Focus on numericals: one forced convection + one radiation exchange problem" },
          ],
        },
      ],
    },
    {
      week_number: 5,
      theme: "Full Revision and Mock Tests",
      days: [
        {
          date: "2024-10-28",
          day_label: "Day 28 — Mon, Oct 28",
          is_buffer: false,
          tasks: [
            { task_id: "tk-047", topic_id: "t-ds-006", subject: "Data Structures", topic: "AVL Trees — Revision", duration_minutes: 90, task_type: "revise", priority: "high", notes: null },
            { task_id: "tk-048", topic_id: "t-ht-001", subject: "Heat Transfer", topic: "Conduction — Revision", duration_minutes: 90, task_type: "revise", priority: "high", notes: null },
          ],
        },
        {
          date: "2024-10-29",
          day_label: "Day 29 — Tue, Oct 29",
          is_buffer: false,
          tasks: [
            { task_id: "tk-049", topic_id: "t-ds-010", subject: "Data Structures", topic: "Mock Test — DS Unit 3", duration_minutes: 180, task_type: "mock_test", priority: "high", notes: "Simulate exam: no notes, strict 3-hour limit" },
          ],
        },
        {
          date: "2024-10-30",
          day_label: "Day 30 — Wed, Oct 30",
          is_buffer: false,
          tasks: [
            { task_id: "tk-050", topic_id: "t-ht-006", subject: "Heat Transfer", topic: "Mock Test — HT Full", duration_minutes: 180, task_type: "mock_test", priority: "high", notes: "Simulate exam: no notes, strict 3-hour limit" },
          ],
        },
        {
          date: "2024-10-31",
          day_label: "Day 31 — Thu, Oct 31",
          is_buffer: true,
          tasks: [
            { task_id: "tk-051", topic_id: "t-ds-001", subject: "Data Structures", topic: "Review Mock Test Mistakes", duration_minutes: 180, task_type: "revise", priority: "high", notes: "Go through every wrong answer — don't just see what's correct, understand why" },
          ],
        },
      ],
    },
  ],
};
