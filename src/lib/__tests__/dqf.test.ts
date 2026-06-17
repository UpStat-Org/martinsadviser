import { describe, it, expect } from "vitest";
import {
  expiryStatus,
  isDocCurrent,
  summarizeDqf,
  driverCompliance,
  REQUIRED_DQF_KINDS,
  type DqfDocLike,
} from "../dqf";

const NOW = new Date("2026-06-01T00:00:00Z").getTime();
const daysFromNow = (n: number) => new Date(NOW + n * 86_400_000).toISOString().slice(0, 10);

// A full, current file: one valid doc per required kind.
function fullFile(): DqfDocLike[] {
  return REQUIRED_DQF_KINDS.map((kind) => ({
    kind,
    expires_on: daysFromNow(200),
    created_at: daysFromNow(-1),
  }));
}

describe("expiryStatus", () => {
  it("flags missing, expired, expiring and valid", () => {
    expect(expiryStatus(null, NOW).state).toBe("missing");
    expect(expiryStatus(daysFromNow(-1), NOW).state).toBe("expired");
    expect(expiryStatus(daysFromNow(10), NOW).state).toBe("expiring");
    expect(expiryStatus(daysFromNow(200), NOW).state).toBe("valid");
  });

  it("reports signed daysUntil", () => {
    expect(expiryStatus(daysFromNow(10), NOW).daysUntil).toBe(10);
    expect(expiryStatus(daysFromNow(-5), NOW).daysUntil).toBe(-5);
  });
});

describe("isDocCurrent", () => {
  it("uses explicit expiration when present", () => {
    expect(isDocCurrent({ kind: "medical_exam", expires_on: daysFromNow(10), created_at: daysFromNow(-400) }, NOW)).toBe(true);
    expect(isDocCurrent({ kind: "medical_exam", expires_on: daysFromNow(-1), created_at: daysFromNow(-1) }, NOW)).toBe(false);
  });

  it("treats undated one-time docs as always current", () => {
    expect(isDocCurrent({ kind: "application", expires_on: null, created_at: daysFromNow(-3000) }, NOW)).toBe(true);
  });

  it("expires undated annual docs after 12 months", () => {
    expect(isDocCurrent({ kind: "mvr", expires_on: null, created_at: daysFromNow(-100) }, NOW)).toBe(true);
    expect(isDocCurrent({ kind: "mvr", expires_on: null, created_at: daysFromNow(-400) }, NOW)).toBe(false);
  });
});

describe("summarizeDqf", () => {
  it("reports 100% for a complete file", () => {
    const s = summarizeDqf(fullFile(), NOW);
    expect(s.complete).toBe(true);
    expect(s.percent).toBe(100);
    expect(s.missing).toEqual([]);
    expect(s.expired).toEqual([]);
  });

  it("lists missing required kinds", () => {
    const s = summarizeDqf([], NOW);
    expect(s.complete).toBe(false);
    expect(s.percent).toBe(0);
    expect(s.missing).toEqual(expect.arrayContaining([...REQUIRED_DQF_KINDS]));
  });

  it("separates expired from missing", () => {
    const docs = fullFile().map((d) =>
      d.kind === "mvr" ? { ...d, expires_on: daysFromNow(-2) } : d,
    );
    const s = summarizeDqf(docs, NOW);
    expect(s.expired).toContain("mvr");
    expect(s.missing).not.toContain("mvr");
    expect(s.complete).toBe(false);
  });

  it("keeps only the newest doc per kind (caller passes newest-first)", () => {
    const docs: DqfDocLike[] = [
      { kind: "mvr", expires_on: daysFromNow(200), created_at: daysFromNow(-1) }, // newest, valid
      { kind: "mvr", expires_on: daysFromNow(-200), created_at: daysFromNow(-400) }, // stale, ignored
    ];
    const s = summarizeDqf(docs, NOW);
    expect(s.expired).not.toContain("mvr");
  });
});

describe("driverCompliance", () => {
  const okDriver = { cdl_expires_on: daysFromNow(200), medical_card_expires_on: daysFromNow(200) };

  it("is ok when CDL, medical and DQF are all valid", () => {
    const r = driverCompliance(okDriver, fullFile(), NOW);
    expect(r.level).toBe("ok");
    expect(r.urgency).toBe(0);
  });

  it("is critical when the medical card is expired", () => {
    const r = driverCompliance({ ...okDriver, medical_card_expires_on: daysFromNow(-1) }, fullFile(), NOW);
    expect(r.level).toBe("critical");
    expect(r.urgency).toBeGreaterThanOrEqual(1000);
  });

  it("is attention when CDL is merely expiring soon", () => {
    const r = driverCompliance({ ...okDriver, cdl_expires_on: daysFromNow(10) }, fullFile(), NOW);
    expect(r.level).toBe("attention");
    expect(r.urgency).toBeGreaterThan(0);
    expect(r.urgency).toBeLessThan(1000);
  });

  it("is critical when DQF docs are missing", () => {
    const r = driverCompliance(okDriver, [], NOW);
    expect(r.level).toBe("critical");
  });

  it("sorts a fully-expired driver above a merely-expiring one", () => {
    const expired = driverCompliance({ cdl_expires_on: daysFromNow(-5), medical_card_expires_on: daysFromNow(-5) }, fullFile(), NOW);
    const expiring = driverCompliance({ ...okDriver, cdl_expires_on: daysFromNow(20) }, fullFile(), NOW);
    expect(expired.urgency).toBeGreaterThan(expiring.urgency);
  });
});
