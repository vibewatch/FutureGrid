// No-op stub: lets Vitest import `server-only` without throwing.
// Production enforcement is unchanged — Next.js compiler still rejects
// client-side imports via the real package. The architecture test in
// tests/skills-page-architecture.test.ts uses readFileSync (not a live
// import), so the source-text guard remains intact regardless of this alias.
export {};
