import { describe, it, expect } from "vitest";
import { generateEvents, toICS } from "../complianceCalendar";

describe("generateEvents", () => {
  it("returns sorted events inside the range only", () => {
    const events = generateEvents(new Date("2026-01-01"), new Date("2026-12-31"));
    expect(events.length).toBeGreaterThan(0);

    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    expect(sorted).toEqual(events);

    for (const e of events) {
      expect(e.date >= "2026-01-01" && e.date <= "2026-12-31").toBe(true);
    }
  });

  it("includes IFTA quarterly deadlines on the canonical IRS dates", () => {
    const events = generateEvents(new Date("2026-01-01"), new Date("2026-12-31"));
    const ifta = events.filter((e) => e.kind === "iftaQuarter").map((e) => e.date);
    // The Q4 deadline lives in the following January and is excluded by the range.
    expect(ifta).toEqual(expect.arrayContaining(["2026-04-30", "2026-07-31", "2026-10-31"]));
  });

  it("emits the annual HVUT and UCR events", () => {
    const events = generateEvents(new Date("2026-08-01"), new Date("2027-01-31"));
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain("hvutAnnual");
    expect(kinds).toContain("ucrAnnual");
  });
});

describe("toICS", () => {
  it("produces a valid-looking VCALENDAR with one VEVENT per event", () => {
    const events = generateEvents(new Date("2026-04-01"), new Date("2026-05-01"));
    const ics = toICS(events, (k) => k);
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR")).toBe(true);
    const veventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(veventCount).toBe(events.length);
    // All-day events use VALUE=DATE on DTSTART/DTEND.
    expect(ics).toContain("DTSTART;VALUE=DATE:");
    expect(ics).toContain("DTEND;VALUE=DATE:");
  });

  it("uses CRLF line endings as RFC 5545 requires", () => {
    const ics = toICS(generateEvents(new Date("2026-04-01"), new Date("2026-05-01")), (k) => k);
    // Cheap sanity check: ICS lines should be CRLF-joined.
    expect(ics).toContain("\r\n");
  });
});
