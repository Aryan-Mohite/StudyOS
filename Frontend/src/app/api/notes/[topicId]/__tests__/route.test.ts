import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Regression coverage for the bug fixed in CHANGES-BUGFIXES.md: this route
// used to look up/delete notes by topic_id alone, with no check that the
// caller's syllabus_id (and therefore the notes) actually belonged to them.

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    syllabusBelongsToUser: vi.fn(),
    getPool: vi.fn(),
    initDb: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => dbMock);

const { GET, DELETE } = await import("@/app/api/notes/[topicId]/route");

function req(url: string, method: "GET" | "DELETE" = "GET") {
  return new NextRequest(url, { method });
}

function paramsFor(topicId: string) {
  return { params: Promise.resolve({ topicId }) };
}

describe("GET /api/notes/:topicId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user_1" });
  });

  it("400s when syllabus_id is missing — no longer trusts topic_id alone", async () => {
    const res = await GET(req("http://localhost/api/notes/t1"), paramsFor("t1"));
    expect(res.status).toBe(400);
    expect(dbMock.getPool).not.toHaveBeenCalled();
  });

  it("404s when the syllabus doesn't belong to the caller, without ever querying notes", async () => {
    dbMock.syllabusBelongsToUser.mockResolvedValue(false);

    const res = await GET(
      req("http://localhost/api/notes/t1?syllabus_id=someone_elses"),
      paramsFor("t1"),
    );

    expect(res.status).toBe(404);
    expect(dbMock.syllabusBelongsToUser).toHaveBeenCalledWith("someone_elses", "user_1");
    expect(dbMock.getPool).not.toHaveBeenCalled();
  });

  it("scopes the notes lookup query by syllabus_id, not just topic_id", async () => {
    dbMock.syllabusBelongsToUser.mockResolvedValue(true);
    const query = vi.fn().mockResolvedValue([[{ content_json: JSON.stringify({ note_id: "n1" }) }]]);
    dbMock.getPool.mockReturnValue({ query });

    const res = await GET(
      req("http://localhost/api/notes/t1?syllabus_id=syl_mine"),
      paramsFor("t1"),
    );

    expect(res.status).toBe(200);
    const [sql, args] = query.mock.calls[0];
    expect(sql).toMatch(/syllabus_id\s*=\s*\?/);
    expect(args).toEqual(["t1", "syl_mine"]);
  });
});

describe("DELETE /api/notes/:topicId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user_1" });
  });

  it("404s and never deletes when the syllabus doesn't belong to the caller", async () => {
    dbMock.syllabusBelongsToUser.mockResolvedValue(false);
    const query = vi.fn();
    dbMock.getPool.mockReturnValue({ query });

    const res = await DELETE(
      req("http://localhost/api/notes/t1?syllabus_id=not_mine", "DELETE"),
      paramsFor("t1"),
    );

    expect(res.status).toBe(404);
    expect(query).not.toHaveBeenCalled();
  });

  it("scopes the DELETE by syllabus_id when ownership checks out", async () => {
    dbMock.syllabusBelongsToUser.mockResolvedValue(true);
    const query = vi.fn().mockResolvedValue([{}]);
    dbMock.getPool.mockReturnValue({ query });

    const res = await DELETE(
      req("http://localhost/api/notes/t1?syllabus_id=syl_mine", "DELETE"),
      paramsFor("t1"),
    );

    expect(res.status).toBe(200);
    const [sql, args] = query.mock.calls[0];
    expect(sql).toMatch(/syllabus_id\s*=\s*\?/);
    expect(args).toEqual(["t1", "syl_mine"]);
  });
});
