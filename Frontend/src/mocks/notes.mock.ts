import type { Note } from "@/types";

// Notes for AVL Trees (t-ds-006)
export const mockNotesAVL: Note = {
  note_id: "note-avl-001",
  topic_id: "t-ds-006",
  topic: "AVL Trees",
  subject: "Data Structures",
  generated_at: "2024-09-15T10:30:00Z",
  sections: [
    {
      heading: "What Is an AVL Tree?",
      content:
        "An AVL tree (named after Adelson-Velsky and Landis, 1962) is a **self-balancing binary search tree** in which the heights of the two child subtrees of any node differ by at most one. When they differ by more than one after an insertion or deletion, the tree is **rebalanced** using rotations.\n\nThis height property ensures that search, insertion, and deletion all run in **O(log n)** time in the worst case — unlike an unbalanced BST, which degenerates to O(n) for sorted input.",
      key_points: [
        "Every node maintains a balance factor: height(left subtree) − height(right subtree)",
        "Balance factor must be in {−1, 0, +1} for the tree to be AVL-balanced",
        "All standard BST properties still hold: left child < parent < right child",
        "Height of an AVL tree with n nodes is at most 1.44 × log₂(n + 2)",
      ],
      formula: "\\text{Balance Factor}(N) = h(\\text{left}(N)) - h(\\text{right}(N))",
    },
    {
      heading: "The Four Rotation Types",
      content:
        "When an insertion or deletion causes a balance factor to go outside {−1, 0, +1}, we fix it with one of four rotations. The type of rotation depends on **where the imbalance occurred**.\n\n**LL Rotation (Right Rotation):** Imbalance caused by insertion into the *left subtree of the left child*. Fix: single right rotation at the unbalanced node.\n\n**RR Rotation (Left Rotation):** Imbalance caused by insertion into the *right subtree of the right child*. Fix: single left rotation.\n\n**LR Rotation (Left-Right Rotation):** Imbalance caused by insertion into the *right subtree of the left child*. Fix: left rotation on left child, then right rotation on the node.\n\n**RL Rotation (Right-Left Rotation):** Imbalance caused by insertion into the *left subtree of the right child*. Fix: right rotation on right child, then left rotation on the node.",
      key_points: [
        "LL and RR: single rotations — one step to fix",
        "LR and RL: double rotations — two steps to fix",
        "After any rotation, verify all ancestor nodes still satisfy balance property",
        "The 'zig-zag' pattern (LR or RL) always requires the double rotation",
      ],
      formula: null,
    },
    {
      heading: "AVL Insertion Algorithm",
      content:
        "Insertion in an AVL tree follows the standard BST insertion, then rebalances on the way back up the recursion stack.\n\n```\n1. Insert the new node using BST rules\n2. Starting from the inserted node, walk up to the root\n3. At each ancestor, recompute the balance factor\n4. If balance factor = ±2, identify the rotation type and rotate\n5. After rotating, the subtree height is restored → no further rotations needed\n```\n\nOnly **one rotation** (single or double) is ever needed per insertion.",
      key_points: [
        "Time complexity: O(log n) — tree height is O(log n) and we walk up once",
        "After insertion, at most one rotation is needed",
        "Update heights of all nodes on the path from new node to root",
        "Storing the height (not just balance factor) simplifies implementation",
      ],
      formula: "h(N) = 1 + \\max(h(\\text{left}(N)),\\, h(\\text{right}(N)))",
    },
    {
      heading: "AVL Deletion Algorithm",
      content:
        "Deletion is more complex than insertion. After deleting a node using BST deletion, balance may be violated at *multiple ancestors* — requiring potentially O(log n) rotations.\n\n```\n1. Delete node using BST rules (replace with in-order successor if two children)\n2. Walk up from the deletion point to the root\n3. At each node, check balance factor\n4. Apply the appropriate rotation if balance = ±2\n5. Continue walking up (unlike insertion, imbalance can propagate)\n```",
      key_points: [
        "Deletion may require O(log n) rotations — multiple levels can become unbalanced",
        "After each rotation in deletion, the subtree height may decrease → parent may also need rotation",
        "In-order successor replacement: replace node value, then delete the successor (which has at most one child)",
        "Time complexity remains O(log n) overall",
      ],
      formula: null,
    },
    {
      heading: "AVL vs BST vs Other Balanced Trees",
      content:
        "AVL trees are more **strictly balanced** than Red-Black trees, giving faster lookups. However, they perform more rotations during insertions and deletions.\n\n| Property | BST | AVL Tree | Red-Black Tree |\n|---|---|---|---|\n| Height guarantee | O(n) worst | O(log n) | O(log n) |\n| Lookup | O(n) worst | O(log n) | O(log n) |\n| Insert rotations | 0 | ≤ 1 | ≤ 2 |\n| Delete rotations | 0 | O(log n) | ≤ 3 |\n| Balance strictness | None | Very strict | Relaxed |",
      key_points: [
        "Use AVL trees when lookups heavily outnumber insertions/deletions",
        "Red-Black trees preferred in most standard library implementations (lower rotation count)",
        "AVL trees used in databases where read performance is critical",
        "B-trees preferred for disk-based storage (high branching factor reduces I/O)",
      ],
      formula: null,
    },
  ],
  summary:
    "An AVL tree is a self-balancing BST that maintains a balance factor of ±1 at every node through rotations (LL, RR, LR, RL). Insertion requires at most one rotation; deletion may require O(log n). All operations run in O(log n) time, making it ideal for read-heavy workloads.",
  related_topics: [
    "Binary Trees and BST",
    "Heaps and Priority Queues",
    "B-Trees and B+ Trees",
    "Shortest Path Algorithms",
  ],
};

// Notes for Fourier's Law (t-ht-001)
export const mockNotesFourier: Note = {
  note_id: "note-ht-001",
  topic_id: "t-ht-001",
  topic: "Fourier's Law of Heat Conduction",
  subject: "Heat Transfer",
  generated_at: "2024-09-15T11:00:00Z",
  sections: [
    {
      heading: "The Fundamental Statement",
      content:
        "Fourier's Law is the cornerstone of heat conduction analysis. It states that the **rate of heat transfer** through a material is directly proportional to the area through which heat flows and the temperature gradient, and inversely proportional to the thickness of the material.\n\nThe law applies to **steady-state, 1D conduction** in its simplest form, but generalises to 3D unsteady problems.",
      key_points: [
        "Heat flows in the direction of decreasing temperature (from hot to cold)",
        "The negative sign ensures Q is positive when heat flows in the positive x-direction",
        "k (thermal conductivity) is a material property, units: W/m·K",
        "Valid for isotropic, homogeneous materials under steady-state conditions",
      ],
      formula: "Q = -kA\\frac{dT}{dx}",
    },
    {
      heading: "Thermal Conductivity (k)",
      content:
        "Thermal conductivity is the material's ability to conduct heat. It varies significantly across material classes:\n\n| Material | k (W/m·K) |\n|---|---|\n| Copper | ~400 |\n| Aluminium | ~200 |\n| Steel | ~50 |\n| Glass | ~1.0 |\n| Water | ~0.6 |\n| Air | ~0.026 |\n| Glass wool | ~0.04 |\n\nFor most problems, assume k is **constant** (temperature-independent) unless stated otherwise.",
      key_points: [
        "Metals: high k → good conductors",
        "Gases: low k → good insulators",
        "k generally increases with temperature for gases, decreases for metals",
        "For composite materials, use equivalent k or thermal resistance network",
      ],
      formula: null,
    },
    {
      heading: "Heat Flux vs Heat Transfer Rate",
      content:
        "It is important to distinguish between **heat flux** (q) and **heat transfer rate** (Q).\n\nHeat flux is the rate of heat transfer per unit area — it tells you the *intensity* of heat flow at a surface. Heat transfer rate gives the *total* heat transferred across the entire area.",
      key_points: [
        "q = Q/A — heat flux in W/m²",
        "Heat flux is independent of area; useful for material comparisons",
        "Heat transfer rate Q is what you use for energy balance calculations",
        "In 1D steady-state, q is constant throughout the wall thickness",
      ],
      formula: "q = -k\\frac{dT}{dx} \\quad (\\text{W/m}^2)",
    },
    {
      heading: "1D Steady-State: Plane Wall",
      content:
        "For a plane wall of thickness L with boundary temperatures T₁ (hot side) and T₂ (cold side) and constant k, integrating Fourier's Law gives the linear temperature profile and the heat transfer rate.\n\nThe temperature varies **linearly** across the wall under these conditions.",
      key_points: [
        "Temperature profile: T(x) = T₁ + (T₂ − T₁)(x/L)",
        "Heat transfer rate is constant (doesn't vary with x) under steady-state",
        "Thermal resistance of plane wall: R = L/(kA)",
        "Larger k or A → lower resistance → more heat transfer",
      ],
      formula:
        "Q = \\frac{kA(T_1 - T_2)}{L} = \\frac{\\Delta T}{R_{\\text{th}}}",
    },
  ],
  summary:
    "Fourier's Law (Q = −kA dT/dx) describes steady-state heat conduction, where heat flow is proportional to thermal conductivity, area, and temperature gradient. For a plane wall, this gives Q = kA(T₁−T₂)/L with a linear temperature profile. Thermal resistance R = L/kA enables the electrical analogy for composite systems.",
  related_topics: [
    "Thermal Resistance and Composite Walls",
    "Critical Radius of Insulation",
    "Newton's Law of Cooling and Boundary Layer",
    "Extended Surfaces (Fins)",
  ],
};

export const mockNotesByTopicId: Record<string, Note> = {
  "t-ds-006": mockNotesAVL,
  "t-ht-001": mockNotesFourier,
};

export function getMockNotes(topicId: string): Note | null {
  return mockNotesByTopicId[topicId] ?? null;
}
