import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    syllabusBelongsToUser: vi.fn(),
    getOrCreateDailyGoal: vi.fn(),
    setDailyGoalTarget: vi.fn(),
  },
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => dbMock);

// Imported after the mocks above are registered, so the route picks them up.
const { GET, POST } = await import("@/app/api/goals/daily/route");

function getReq(syllabusId?: string) {
  const url = syllabusId
    ? `http://localhost/api/goals/daily?syllabus_id=${syllabusId}`
    : "http://localhost/api/goals/daily";
  return new NextRequest(url);
}

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/goals/daily", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/goals/daily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user_1" });
  });

  it("401s when the caller isn't signed in", async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await GET(getReq("syl_1"), undefined as never);
    expect(res.status).toBe(401);
  });

  it("400s when syllabus_id is missing", async () => {
    const res = await GET(getReq(), undefined as never);
    expect(res.status).toBe(400);
  });

  it("404s when the syllabus doesn't belong to the caller — never calls getOrCreateDailyGoal", async () => {
    dbMock.syllabusBelongsToUser.mockResolvedValue(false);

    const res = await GET(getReq("someone_elses_syllabus"), undefined as never);

    expect(res.status).toBe(404);
    expect(dbMock.syllabusBelongsToUser).toHaveBeenCalledWith("someone_elses_syllabus", "user_1");
    expect(dbMock.getOrCreateDailyGoal).not.toHaveBeenCalled();
  });

  it("returns the goal when ownership checks out", async () => {
    dbMock.syllabusBelongsToUser.mockResolvedValue(true);
    dbMock.getOrCreateDailyGoal.mockResolvedValue({ syllabus_id: "syl_1", target_questions: 10, completed: 3 });

    const res = await GET(getReq("syl_1"), undefined as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ syllabus_id: "syl_1", target_questions: 10, completed: 3 });
  });
});

describe("POST /api/goals/daily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user_1" });
  });

  it("400s on a malformed body (target_questions out of range)", async () => {
    const res = await POST(postReq({ syllabus_id: "syl_1", target_questions: 999 }), undefined as never);
    expect(res.status).toBe(400);
    expect(dbMock.syllabusBelongsToUser).not.toHaveBeenCalled();
  });

  it("404s when the syllabus doesn't belong to the caller, even with a valid body", async () => {
    dbMock.syllabusBelongsToUser.mockResolvedValue(false);

    const res = await POST(postReq({ syllabus_id: "not_mine", target_questions: 20 }), undefined as never);

    expect(res.status).toBe(404);
    expect(dbMock.setDailyGoalTarget).not.toHaveBeenCalled();
  });

  it("updates the goal when the body is valid and ownership checks out", async () => {
    dbMock.syllabusBelongsToUser.mockResolvedValue(true);
    dbMock.setDailyGoalTarget.mockResolvedValue({ syllabus_id: "syl_1", target_questions: 25, completed: 0 });

    const res = await POST(postReq({ syllabus_id: "syl_1", target_questions: 25 }), undefined as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(dbMock.setDailyGoalTarget).toHaveBeenCalledWith("user_1", "syl_1", 25);
    expect(body.target_questions).toBe(25);
  });
});
