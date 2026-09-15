import { describe, it, expect } from "vitest";
import { PERMIT_TYPES, permitTypesForCountry } from "../usePermits";

describe("permitTypesForCountry", () => {
  it("mostra só AET e 'Other' para org brasileira", () => {
    expect(permitTypesForCountry("BR")).toEqual([
      "AET DNIT", "AET DER (estadual)", "AET Municipal", "Other",
    ]);
  });

  it("esconde os tipos brasileiros fora do Brasil", () => {
    const us = permitTypesForCountry("US");
    expect(us).not.toContain("AET DNIT");
    expect(us).not.toContain("AET Municipal");
    expect(us).toContain("IFTA");
    expect(us).toContain("IRP");
  });

  it("mantém 'Other' disponível nos dois países", () => {
    // "Other" está no conjunto brasileiro e mesmo assim precisa sobreviver ao
    // filtro americano — é a saída para qualquer tipo fora do catálogo.
    expect(permitTypesForCountry("US")).toContain("Other");
    expect(permitTypesForCountry("BR")).toContain("Other");
  });

  it("trata país desconhecido como não-brasileiro", () => {
    // Org sem país gravado cai no fallback "US" no OrgContext, mas a função
    // não deve quebrar se receber outra coisa.
    expect(permitTypesForCountry("ES")).toContain("IFTA");
    expect(permitTypesForCountry("")).not.toContain("AET DNIT");
  });

  it("não perde nenhum tipo entre os dois países", () => {
    const union = new Set([...permitTypesForCountry("US"), ...permitTypesForCountry("BR")]);
    expect(union.size).toBe(PERMIT_TYPES.length);
  });
});
