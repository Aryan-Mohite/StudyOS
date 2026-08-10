import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Regression coverage for the bug fixed in CHANGES-BUGFIXES.md: this route
// used to pass a client-supplied syllabus_id straight through to
// AgenticService for RAG grounding, with no check that the caller actually
// owned that syllabus — so a caller could request MCQs grounded in another
// student's private uploaded reference material just by supplying their
// syllabus_id.

const { authMock, dbMock, agenticMock, profileMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    syllabusBelongsToUser: vi.fn(),
    getPool: vi.fn(),
    initDb: vi.fn().mockResolvedValue(undefined),
  },
  agenticMock: { generateMCQ: vi.fn(), AgenticError: class AgenticError extends Error {} },
  profileMock: { getStudentContext: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => dbMock);
vi.mock("@/lib/agentic", () => agenticMock);
vi.mock("@/lib/profile", () => profileMock);

const { POST } = await import("@/app/api/mcq/generate/route");

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/mcq/generate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/mcq/generate — syllabus_id ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user_1" });
  });

  it("404s when syllabus_id doesn't belong to the caller, and never calls AgenticService", async () => {
    dbMock.syllabusBelongsToUser.mockResolvedValue(false);

    const res = await POST(
      postReq({ topic_id: "t1", topic_name: "Arrays", subject: "DS", syllabus_id: "someone_elses_syllabus" }),
      undefined as never,
    );

    expect(res.status).toBe(404);
    expect(agenticMock.generateMCQ).not.toHaveBeenCalled();
    expect(dbMock.getPool).not.toHaveBeenCalled();
  });

  it("proceeds when syllabus_id belongs to the caller", async () => {
    dbMock.syllabusBelongsToUser.mockResolvedValue(true);
    const query = vi.fn().mockResolvedValue([[]]); // empty cache lookup
    dbMock.getPool.mockReturnValue({ query });
    agenticMock.generateMCQ.mockResolvedValue({ mcq_set_id: "m1", questions: [] });

    const res = await POST(
      postReq({ topic_id: "t1", topic_name: "Arrays", subject: "DS", syllabus_id: "syl_mine" }),
      undefined as never,
    );

    expect(res.status).toBe(200);
    expect(dbMock.syllabusBelongsToUser).toHaveBeenCalledWith("syl_mine", "user_1");
    expect(agenticMock.generateMCQ).toHaveBeenCalled();
  });

  it("skips the ownership check entirely when no syllabus_id is supplied (trained-knowledge-only generation)", async () => {
    const query = vi.fn().mockResolvedValue([[]]);
    dbMock.getPool.mockReturnValue({ query });
    agenticMock.generateMCQ.mockResolvedValue({ mcq_set_id: "m1", questions: [] });

    const res = await POST(postReq({ topic_id: "t1", topic_name: "Arrays", subject: "DS" }), undefined as never);

    expect(res.status).toBe(200);
    expect(dbMock.syllabusBelongsToUser).not.toHaveBeenCalled();
  });

  it("scopes the cache-hit lookup by syllabus_id, not just topic_id", async () => {
    dbMock.syllabusBelongsToUser.mockResolvedValue(true);
    const query = vi.fn().mockResolvedValue([[{ content_json: JSON.stringify({ mcq_set_id: "m1" }) }]]);
    dbMock.getPool.mockReturnValue({ query });

    const res = await POST(
      postReq({ topic_id: "t1", topic_name: "Arrays", subject: "DS", syllabus_id: "syl_mine" }),
      undefined as never,
    );

    expect(res.status).toBe(200);
    const [sql, args] = query.mock.calls[0];
    expect(sql).toMatch(/syllabus_id\s*=\s*\?/);
    expect(args).toEqual(["t1", "syl_mine"]);
    expect(agenticMock.generateMCQ).not.toHaveBeenCalled(); // cache hit, no need to call the LLM
  });
});
