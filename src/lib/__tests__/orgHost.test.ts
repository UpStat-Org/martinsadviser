import { describe, it, expect } from "vitest";
import { parseHostnameOrg } from "../orgHost";

describe("parseHostnameOrg", () => {
  it("treats localhost / IPs / preview hosts as dev (permissive)", () => {
    expect(parseHostnameOrg("localhost")).toEqual({ slug: null, isDev: true });
    expect(parseHostnameOrg("127.0.0.1")).toEqual({ slug: null, isDev: true });
    expect(parseHostnameOrg("preview-abc.lovable.app")).toEqual({ slug: null, isDev: true });
    expect(parseHostnameOrg("ma-preview.netlify.app")).toEqual({ slug: null, isDev: true });
    expect(parseHostnameOrg("foo.lovableproject.com")).toEqual({ slug: null, isDev: true });
  });

  it("returns no slug for the apex host", () => {
    expect(parseHostnameOrg("martinsadviser.com")).toEqual({ slug: null, isDev: true });
  });

  it("returns the subdomain as slug for a tenant host", () => {
    expect(parseHostnameOrg("acme.martinsadviser.com")).toEqual({ slug: "acme", isDev: false });
  });

  it("normalizes uppercase hosts to lowercase slugs", () => {
    expect(parseHostnameOrg("Acme.MARTINSadviser.com")).toEqual({ slug: "acme", isDev: false });
  });

  it("treats reserved subdomains as apex", () => {
    for (const reserved of ["www", "app", "api", "admin", "status"]) {
      expect(parseHostnameOrg(`${reserved}.martinsadviser.com`)).toEqual({ slug: null, isDev: true });
    }
  });
});
