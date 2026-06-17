import type { ChatMessage, TutorResponse } from "@/types";

export const mockChatHistory: ChatMessage[] = [
  { role: "user", content: "What is the difference between LL and LR rotation in AVL trees?" },
  {
    role: "assistant",
    content:
      "Great question — this is the most common source of confusion with AVL rotations.\n\n**LL Rotation (Right Rotation)**\n\nOccurs when the imbalance is caused by inserting into the **left subtree of the left child** — a 'left-left' chain.\n\n- Only requires **one rotation**: a single right rotation at the unbalanced node\n- The left child becomes the new subtree root\n\n**LR Rotation (Left-Right Double Rotation)**\n\nOccurs when the imbalance is caused by inserting into the **right subtree of the left child** — a 'zig-zag' pattern.\n\n- Requires **two rotations**: first a left rotation on the left child, then a right rotation on the unbalanced node\n- The single rotation won't work here because the 'zig-zag' shape can't be straightened in one step\n\n**Quick mnemonic:** The name tells you the path — LL means left→left (one step, one rotation), LR means left→right (zig-zag, two rotations).",
  },
  {
    role: "user",
    content: "Can you give me an example — insert 30, 10, 20 and show the LR rotation?",
  },
  {
    role: "assistant",
    content:
      "Exactly the classic LR example. Let's trace it:\n\n**After inserting 30, 10:**\n```\n30\n/\n10\n```\nBalance factors: 30 = +1, 10 = 0. Tree is balanced.\n\n**After inserting 20:**\n```\n  30   ← balance factor = +2 (UNBALANCED)\n  /\n 10   ← balance factor = -1\n  \\\\\n  20\n```\n\nThis is the **LR case** — imbalance at 30, caused by insertion into the right subtree (20) of the left child (10).\n\n**Step 1: Left rotation on node 10**\n```\n  30\n  /\n 20\n /\n10\n```\n\n**Step 2: Right rotation on node 30**\n```\n   20\n  /  \\\n10   30\n```\n\nDone. 20 becomes the root. All balance factors are now 0.",
  },
];

export const mockTutorResponses: Record<string, TutorResponse> = {
  avl_rotation: {
    message_id: "msg-001",
    answer:
      "Great question — this is the most common source of confusion with AVL rotations.\n\n**LL Rotation (Right Rotation)**\n\nOccurs when the imbalance is caused by inserting into the **left subtree of the left child** — a 'left-left' chain. Requires one rotation: a single right rotation at the unbalanced node.\n\n**LR Rotation (Left-Right Double Rotation)**\n\nOccurs when the imbalance is caused by inserting into the **right subtree of the left child** — a 'zig-zag' pattern. Requires two rotations: first a left rotation on the left child, then a right rotation on the unbalanced node.\n\n**Quick mnemonic:** The name tells you the path — LL means left→left (one rotation), LR means left→right (two rotations).",
    confidence: "high",
    sources_referenced: ["AVL Trees", "Binary Trees and BST"],
    follow_up_suggestions: [
      "Show me a step-by-step example of LR rotation with numbers",
      "What is the difference between RR and RL rotation?",
      "When does deletion in AVL require more than one rotation?",
    ],
    out_of_scope: false,
  },
  out_of_scope: {
    message_id: "msg-002",
    answer:
      "That's an interesting topic, but **quantum computing** doesn't appear to be part of your uploaded syllabus. I'm scoped to your Data Structures and Heat Transfer curriculum to keep answers directly useful for your exam.\n\nIf you're curious about advanced computing topics, I'd suggest exploring them after your exams!\n\nMeanwhile, is there anything from your syllabus I can help with?",
    confidence: "high",
    sources_referenced: [],
    follow_up_suggestions: [
      "Explain AVL tree rotations",
      "How does Dijkstra's algorithm work?",
      "What is the Dittus-Boelter equation used for?",
    ],
    out_of_scope: true,
  },
};

export const suggestedQuestions: Record<string, string[]> = {
  "t-ds-006": [
    "What are the four AVL rotation types and when is each used?",
    "Why does deletion require O(log n) rotations but insertion only needs 1?",
    "How do you calculate the balance factor at each node?",
  ],
  "t-ht-001": [
    "Derive Fourier's Law from first principles",
    "What is the thermal resistance analogy and how do you apply it?",
    "Why does the temperature profile vary linearly in a plane wall?",
  ],
  default: [
    "Summarise the most important topics in this chapter",
    "What are the common exam questions from this topic?",
    "Explain the key formula and when to use it",
  ],
};
