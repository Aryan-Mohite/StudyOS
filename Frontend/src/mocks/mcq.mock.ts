import type { MCQSet } from "@/types";

export const mockMCQAVL: MCQSet = {
  mcq_set_id: "mcq-avl-001",
  topic_id: "t-ds-006",
  topic: "AVL Trees",
  subject: "Data Structures",
  generated_at: "2024-09-15T12:00:00Z",
  total_questions: 8,
  questions: [
    {
      id: 1,
      question:
        "The balance factor of a node in an AVL tree is defined as:",
      options: {
        A: "Height of left subtree − Height of right subtree",
        B: "Number of nodes in left subtree − Number in right subtree",
        C: "Height of right subtree − Height of left subtree",
        D: "Depth of the node in the tree",
      },
      correct: "A",
      explanation:
        "Balance Factor = h(left subtree) − h(right subtree). For an AVL tree to be balanced, this must be in {−1, 0, +1}. Option C has the subtraction reversed. Options B and D describe different properties entirely — node count and depth are not used for AVL balancing.",
      concept_tested: "Definition of balance factor",
      difficulty: "easy",
    },
    {
      id: 2,
      question:
        "Inserting the sequence 10, 20, 30 into an empty AVL tree triggers which rotation?",
      options: {
        A: "LL rotation (right rotation at root)",
        B: "RR rotation (left rotation at root)",
        C: "LR rotation (double rotation)",
        D: "RL rotation (double rotation)",
      },
      correct: "B",
      explanation:
        "After inserting 10 and 20, inserting 30 creates an imbalance at node 10 with balance factor −2. The new node 30 was inserted into the right subtree of the right child (20) — this is the RR case, fixed by a single left rotation at node 10. The result: 20 becomes root, 10 is left child, 30 is right child.",
      concept_tested: "Identifying rotation type from insertion sequence",
      difficulty: "medium",
    },
    {
      id: 3,
      question:
        "What is the maximum height of an AVL tree with 7 nodes?",
      options: {
        A: "2",
        B: "3",
        C: "4",
        D: "7",
      },
      correct: "B",
      explanation:
        "An AVL tree with 7 nodes has maximum height 3. The minimum number of nodes in an AVL tree of height h follows: N(0) = 1, N(1) = 2, N(2) = 4, N(3) = 7. So height 3 requires exactly 7 nodes in the minimum case — meaning 7 nodes can have height at most 3. Height 4 would require at least 12 nodes (N(4) = 12).",
      concept_tested: "Relationship between height and node count in AVL trees",
      difficulty: "hard",
    },
    {
      id: 4,
      question:
        "After performing an LR rotation, how many rotations are applied in total?",
      options: {
        A: "1 (a single left rotation)",
        B: "1 (a single right rotation)",
        C: "2 (left rotation, then right rotation)",
        D: "3 (left, right, then left rotation)",
      },
      correct: "C",
      explanation:
        "LR rotation is a double rotation. It consists of: (1) a left rotation on the left child of the unbalanced node, followed by (2) a right rotation on the unbalanced node itself. This is needed when the imbalance is caused by insertion into the right subtree of the left child — the 'zig-zag' pattern that cannot be fixed with a single rotation.",
      concept_tested: "Mechanics of LR double rotation",
      difficulty: "medium",
    },
    {
      id: 5,
      question:
        "In an AVL tree, deletion of a node may require at most how many rotations?",
      options: {
        A: "1",
        B: "2",
        C: "O(log n)",
        D: "O(n)",
      },
      correct: "C",
      explanation:
        "Unlike insertion (which requires at most 1 rotation), deletion in an AVL tree can propagate imbalance upward through multiple levels — requiring O(log n) rotations in the worst case. Each rotation may restore balance at one node but reduce the subtree height, causing an imbalance at the parent. Since the tree height is O(log n), the chain of rotations is also O(log n).",
      concept_tested: "Rotation count difference between insertion and deletion",
      difficulty: "hard",
    },
    {
      id: 6,
      question:
        "Which of the following best describes why AVL trees are preferred over unbalanced BSTs for sorted input?",
      options: {
        A: "AVL trees use less memory per node",
        B: "AVL trees guarantee O(log n) search even when keys are inserted in sorted order",
        C: "AVL trees do not require comparison operations",
        D: "AVL trees automatically sort the input before insertion",
      },
      correct: "B",
      explanation:
        "When keys are inserted in sorted order into a plain BST, it degenerates into a linked list with O(n) height — making search O(n). AVL trees self-balance on every insertion, guaranteeing O(log n) height regardless of insertion order. Memory-wise, AVL nodes actually use slightly more memory (storing height/balance factor), so option A is incorrect.",
      concept_tested: "Motivation for AVL trees over plain BST",
      difficulty: "easy",
    },
    {
      id: 7,
      question:
        "Consider an AVL tree node with balance factor +2 and its left child has balance factor +1. Which rotation fixes the imbalance?",
      options: {
        A: "RR rotation (single left rotation)",
        B: "LL rotation (single right rotation)",
        C: "LR rotation (double: left then right)",
        D: "RL rotation (double: right then left)",
      },
      correct: "B",
      explanation:
        "A balance factor of +2 means the left subtree is taller. The left child's balance factor of +1 means the left child's left subtree is taller — so the imbalance is in the left-left direction. This is the LL case, fixed by a single right rotation (LL rotation) at the unbalanced node. LR would apply if the left child had balance factor −1 (left-right case).",
      concept_tested: "Mapping balance factors to rotation type",
      difficulty: "medium",
    },
    {
      id: 8,
      question:
        "What is the time complexity of finding the in-order successor of a node in an AVL tree?",
      options: {
        A: "O(1)",
        B: "O(log n)",
        C: "O(n)",
        D: "O(n log n)",
      },
      correct: "B",
      explanation:
        "Finding the in-order successor involves going to the right child and then finding the leftmost node in that subtree. In the worst case, this traverses from the root to a leaf — O(h) = O(log n) for an AVL tree. It is not O(1) because the successor is not stored as a direct pointer (unless you use a threaded BST). O(n) would be the answer for an unbalanced BST in the worst case.",
      concept_tested: "In-order successor traversal in balanced BSTs",
      difficulty: "medium",
    },
  ],
};

export const mockMCQByTopicId: Record<string, MCQSet> = {
  "t-ds-006": mockMCQAVL,
};

export function getMockMCQ(topicId: string): MCQSet | null {
  return mockMCQByTopicId[topicId] ?? null;
}
