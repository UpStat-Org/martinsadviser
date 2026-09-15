import { describe, it, expect } from "vitest";
import {
  formatDateNumeric,
  formatDayMonthNumeric,
  formatDateTimeNumeric,
  formatDateLong,
} from "../dates";

// 4 de março de 2026, meio-dia — data escolhida de propósito: dia ≤ 12, então
// dd/MM e MM/dd produzem strings válidas e diferentes. É exatamente o caso em
// que um formato fixo mente sem dar erro.
const AMBIGUOUS = new Date(2026, 2, 4, 14, 30);

describe("dates — formatos numéricos", () => {
  it("põe o mês primeiro em inglês e o dia primeiro em português", () => {
    expect(formatDateNumeric(AMBIGUOUS, "en")).toBe("03/04/2026");
    expect(formatDateNumeric(AMBIGUOUS, "pt")).toBe("04/03/2026");
  });

  it("usa a ordem dia-mês em espanhol", () => {
    expect(formatDateNumeric(AMBIGUOUS, "es")).toBe("04/03/2026");
  });

  it("mantém a mesma inversão na forma curta", () => {
    expect(formatDayMonthNumeric(AMBIGUOUS, "en")).toBe("03/04");
    expect(formatDayMonthNumeric(AMBIGUOUS, "pt")).toBe("04/03");
  });

  it("escreve a hora em 24h nos três idiomas", () => {
    // hour12: false explícito — en-US usaria "02:30 PM" por padrão, que ocupa
    // mais espaço numa tabela densa sem ganhar clareza para público operacional.
    for (const lang of ["en", "pt", "es"] as const) {
      expect(formatDateTimeNumeric(AMBIGUOUS, lang)).toContain("14:30");
    }
  });

  it("inclui a data completa junto da hora", () => {
    expect(formatDateTimeNumeric(AMBIGUOUS, "en")).toContain("03/04/2026");
    expect(formatDateTimeNumeric(AMBIGUOUS, "pt")).toContain("04/03/2026");
  });

  it("não regride os formatos longos já existentes", () => {
    // Estes já eram localizados antes desta mudança; o teste existe para que
    // um ajuste nos formatos numéricos não os arraste junto.
    expect(formatDateLong(AMBIGUOUS, "en")).toBe("March 4, 2026");
    expect(formatDateLong(AMBIGUOUS, "pt")).toBe("4 de março de 2026");
  });

  it("cai no inglês para um idioma desconhecido", () => {
    // BCP47 é indexado por Language; um valor fora da união (vindo de
    // localStorage antigo, por exemplo) não pode quebrar a renderização.
    expect(formatDateNumeric(AMBIGUOUS, "xx" as never)).toBe("03/04/2026");
  });
});
