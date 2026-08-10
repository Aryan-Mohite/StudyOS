import "@testing-library/jest-dom/vitest";

// lib/env.ts fails fast (throws) if these are missing — set safe test
// placeholders once, globally, so unrelated test files that transitively
// import lib/db.ts or lib/serviceAuth.ts don't each need to stub them.
process.env.DATABASE_URL ??= "mysql://test:test@localhost:3306/studyos_test";
process.env.INTERNAL_SERVICE_JWT_SECRET ??= "test-secret-at-least-32-characters-long";
process.env.CLERK_SECRET_KEY ??= "sk_test_placeholder";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_placeholder";
process.env.AGENTIC_SERVICE_URL ??= "http://localhost:8000";
