import { describe, it, expect } from "vitest";
import { replacePlaceholders } from "../placeholders";

describe("replacePlaceholders", () => {
  const client = {
    company_name: "Acme Corp",
    dot: "12345",
    mc: "MC-100",
    ein: "99-123",
    email: "test@acme.com",
    phone: "(555) 111-2222",
  };

  it("replaces all known placeholders", () => {
    const tpl = "Company: {company_name}, DOT: {dot}, MC: {mc}, EIN: {ein}, Email: {email}, Phone: {phone}";
    const result = replacePlaceholders(tpl, client);
    expect(result).toBe("Company: Acme Corp, DOT: 12345, MC: MC-100, EIN: 99-123, Email: test@acme.com, Phone: (555) 111-2222");
  });

  it("replaces multiple occurrences", () => {
    expect(replacePlaceholders("{dot} and {dot}", client)).toBe("12345 and 12345");
  });

  it("replaces with empty string for null fields", () => {
    const partial = { company_name: "Test", dot: null, mc: null, ein: null, email: null, phone: null };
    expect(replacePlaceholders("DOT: {dot}", partial)).toBe("DOT: ");
  });

  it("returns original text if client is null/undefined", () => {
    expect(replacePlaceholders("Hello {company_name}", null)).toBe("Hello {company_name}");
    expect(replacePlaceholders("Hello {company_name}", undefined)).toBe("Hello {company_name}");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(replacePlaceholders("{unknown} text", client)).toBe("{unknown} text");
  });
});
