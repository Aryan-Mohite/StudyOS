import type { Syllabus, SyllabusTopic } from "@/types";

export const mockSyllabus: Syllabus = {
  syllabus_id: "s-sppu-mech-sem5",
  university: "Savitribai Phule Pune University",
  program: "B.E. Computer Engineering",
  semester: 3,
  uploaded_at: "2024-09-01T09:00:00Z",
  subjects: [
    {
      subject_id: "sub-ds",
      name: "Data Structures",
      code: "CS301",
      credits: 4,
      units: [
        {
          unit_number: 1,
          title: "Linear Data Structures",
          topics: [
            { topic_id: "t-ds-001", name: "Arrays and Dynamic Arrays", subtopics: ["Static vs dynamic allocation", "Array ADT operations", "Amortized analysis of doubling"], has_numericals: false, difficulty_hint: "easy" },
            { topic_id: "t-ds-002", name: "Linked Lists", subtopics: ["Singly linked list", "Doubly linked list", "Circular linked list", "XOR linked list"], has_numericals: false, difficulty_hint: "easy" },
            { topic_id: "t-ds-003", name: "Stacks and Their Applications", subtopics: ["Stack ADT", "Infix to postfix conversion", "Expression evaluation", "Balancing parentheses"], has_numericals: false, difficulty_hint: "medium" },
            { topic_id: "t-ds-004", name: "Queues and Deques", subtopics: ["Queue ADT", "Circular queue", "Priority queue", "Deque operations"], has_numericals: false, difficulty_hint: "medium" },
          ],
        },
        {
          unit_number: 2,
          title: "Non-Linear Structures: Trees",
          topics: [
            { topic_id: "t-ds-005", name: "Binary Trees and BST", subtopics: ["Tree terminology", "Binary tree traversals", "BST insert/delete/search", "Successor and predecessor"], has_numericals: false, difficulty_hint: "medium" },
            { topic_id: "t-ds-006", name: "AVL Trees", subtopics: ["Height balance property", "Rotation types (LL, RR, LR, RL)", "AVL insert and delete", "Balance factor calculation"], has_numericals: false, difficulty_hint: "hard" },
            { topic_id: "t-ds-007", name: "Heaps and Priority Queues", subtopics: ["Max-heap and min-heap", "Heapify operation", "Heap sort", "d-ary heaps"], has_numericals: false, difficulty_hint: "medium" },
            { topic_id: "t-ds-008", name: "B-Trees and B+ Trees", subtopics: ["B-tree properties", "Insert and split", "B+ tree leaf links", "Disk-based storage motivation"], has_numericals: false, difficulty_hint: "hard" },
          ],
        },
        {
          unit_number: 3,
          title: "Graphs and Sorting",
          topics: [
            { topic_id: "t-ds-009", name: "Graph Representations and Traversals", subtopics: ["Adjacency matrix vs list", "BFS traversal", "DFS traversal", "Connected components"], has_numericals: false, difficulty_hint: "medium" },
            { topic_id: "t-ds-010", name: "Shortest Path Algorithms", subtopics: ["Dijkstra's algorithm", "Bellman-Ford algorithm", "Floyd-Warshall", "Negative weight edges"], has_numericals: true, difficulty_hint: "hard" },
            { topic_id: "t-ds-011", name: "Sorting Algorithms", subtopics: ["Merge sort", "Quick sort", "Heap sort", "Counting sort", "Radix sort"], has_numericals: false, difficulty_hint: "medium" },
            { topic_id: "t-ds-012", name: "Hashing and Hash Tables", subtopics: ["Hash functions", "Collision resolution (chaining, open addressing)", "Load factor", "Rehashing"], has_numericals: false, difficulty_hint: "medium" },
          ],
        },
      ],
    },
    {
      subject_id: "sub-ht",
      name: "Heat Transfer",
      code: "ME501",
      credits: 4,
      units: [
        {
          unit_number: 1,
          title: "Conduction",
          topics: [
            { topic_id: "t-ht-001", name: "Fourier's Law of Heat Conduction", subtopics: ["Thermal conductivity", "Temperature gradient", "1D steady-state conduction", "Plane wall analysis"], has_numericals: true, difficulty_hint: "medium" },
            { topic_id: "t-ht-002", name: "Thermal Resistance and Composite Walls", subtopics: ["Electrical analogy", "Series resistance", "Parallel resistance", "Contact resistance"], has_numericals: true, difficulty_hint: "medium" },
            { topic_id: "t-ht-003", name: "Critical Radius of Insulation", subtopics: ["Cylinder with insulation", "Optimum insulation thickness", "Sphere insulation"], has_numericals: true, difficulty_hint: "hard" },
            { topic_id: "t-ht-004", name: "Extended Surfaces (Fins)", subtopics: ["Fin efficiency", "Fin effectiveness", "Types of fins", "Fin arrays"], has_numericals: true, difficulty_hint: "hard" },
          ],
        },
        {
          unit_number: 2,
          title: "Convection",
          topics: [
            { topic_id: "t-ht-005", name: "Newton's Law of Cooling and Boundary Layer", subtopics: ["Convection coefficient h", "Thermal boundary layer", "Velocity boundary layer", "Prandtl number"], has_numericals: true, difficulty_hint: "medium" },
            { topic_id: "t-ht-006", name: "Forced Convection Over Flat Plates", subtopics: ["Nusselt number correlations", "Reynolds number", "Local vs average h", "Turbulent boundary layer"], has_numericals: true, difficulty_hint: "hard" },
            { topic_id: "t-ht-007", name: "Forced Convection in Tubes", subtopics: ["Dittus-Boelter equation", "Fully developed flow", "Entry length effects", "Bulk temperature"], has_numericals: true, difficulty_hint: "hard" },
            { topic_id: "t-ht-008", name: "Natural (Free) Convection", subtopics: ["Grashof number", "Rayleigh number", "Vertical plate correlations", "Horizontal cylinder"], has_numericals: true, difficulty_hint: "medium" },
          ],
        },
        {
          unit_number: 3,
          title: "Radiation",
          topics: [
            { topic_id: "t-ht-009", name: "Radiation Fundamentals and Stefan-Boltzmann Law", subtopics: ["Blackbody radiation", "Emissivity", "Stefan-Boltzmann constant", "Kirchhoff's law"], has_numericals: true, difficulty_hint: "medium" },
            { topic_id: "t-ht-010", name: "View Factors", subtopics: ["Reciprocity rule", "Summation rule", "Crossed string method", "View factor algebra"], has_numericals: true, difficulty_hint: "hard" },
            { topic_id: "t-ht-011", name: "Radiation Exchange Between Surfaces", subtopics: ["Radiosity", "Irradiation", "Radiation network", "Grey-diffuse surfaces"], has_numericals: true, difficulty_hint: "hard" },
          ],
        },
      ],
    },
  ],
};

export const allTopics = mockSyllabus.subjects.flatMap((s) =>
  s.units.flatMap((u) =>
    u.topics.map((t: SyllabusTopic) => ({
      ...t,
      subject: s.name,
      subject_id: s.subject_id,
      unit_title: u.title,
      unit_number: u.unit_number,
    }))
  )
);

export function getTopicById(topicId: string) {
  return allTopics.find((t) => t.topic_id === topicId) ?? null;
}
