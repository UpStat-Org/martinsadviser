import { describe, it, expect } from "vitest";
import { parseHostnameOrg } from "../orgHost";

describe("parseHostnameOrg", () => {
  const permissive = { slug: null, hostname: null, isDev: true, isStrict: false };

  it("treats localhost / IPs / preview hosts as dev (permissive)", () => {
    expect(parseHostnameOrg("localhost")).toEqual(permissive);
    expect(parseHostnameOrg("127.0.0.1")).toEqual(permissive);
    expect(parseHostnameOrg("preview-abc.lovable.app")).toEqual(permissive);
    expect(parseHostnameOrg("ma-preview.netlify.app")).toEqual(permissive);
    expect(parseHostnameOrg("foo.lovableproject.com")).toEqual(permissive);
  });

  it("returns no slug for the apex host", () => {
    expect(parseHostnameOrg("martinsadviser.com")).toEqual(permissive);
  });

  it("returns the subdomain as slug for a tenant host", () => {
    expect(parseHostnameOrg("acme.martinsadviser.com")).toEqual({
      slug: "acme",
      hostname: "acme.martinsadviser.com",
      isDev: false,
      isStrict: true,
    });
  });

  it("normalizes uppercase hosts to lowercase slugs", () => {
    expect(parseHostnameOrg("Acme.MARTINSadviser.com")).toEqual({
      slug: "acme",
      hostname: "acme.martinsadviser.com",
      isDev: false,
      isStrict: true,
    });
  });

  it("treats reserved subdomains as apex", () => {
    for (const reserved of ["www", "app", "api", "admin", "status"]) {
      expect(parseHostnameOrg(`${reserved}.martinsadviser.com`)).toEqual(permissive);
    }
  });

  it("treats non-platform hosts as strict custom domains", () => {
    expect(parseHostnameOrg("client.com")).toEqual({
      slug: null,
      hostname: "client.com",
      isDev: false,
      isStrict: true,
    });
    expect(parseHostnameOrg("portal.client.com:5173")).toEqual({
      slug: null,
      hostname: "portal.client.com",
      isDev: false,
      isStrict: true,
    });
  });
});
