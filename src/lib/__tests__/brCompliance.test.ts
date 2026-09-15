import { describe, it, expect } from "vitest";
import {
  BR_COMPLIANCE_KINDS,
  kindSpec,
  kindsForScope,
  requiredKindsForScope,
  suggestedExpiry,
  summarizeBrCompliance,
  FINE_POINTS,
  daysToDefend,
  isDefendable,
  consolidatedPoints,
  cnpjDigits,
  formatCnpj,
  isValidCnpj,
  type BrComplianceItemLike,
} from "../brCompliance";
import { addMonths, expiryFromIssue } from "../expiry";

// Congelado para que "hoje" não mova os testes. 1º de junho de 2026, meio-dia.
const NOW = new Date(2026, 5, 1, 12, 0, 0).getTime();
const iso = (y: number, m: number, d: number) =>
  new Date(y, m - 1, d, 12).toISOString().slice(0, 10);

describe("expiry — aritmética de calendário", () => {
  it("soma meses preservando o dia", () => {
    expect(addMonths(new Date(2026, 0, 15), 12).toISOString().slice(0, 10)).toBe("2027-01-15");
  });

  it("não transborda de mês quando o dia não existe no destino", () => {
    // setMonth sozinho joga 31 de janeiro + 1 mês para 2 ou 3 de março.
    // Para validade de documento isso significaria alertar depois do prazo.
    const r = addMonths(new Date(2026, 0, 31), 1);
    expect(r.getMonth()).toBe(1);
    expect(r.getDate()).toBe(28);
  });

  it("respeita ano bissexto", () => {
    const r = addMonths(new Date(2028, 0, 31), 1);
    expect(r.getMonth()).toBe(1);
    expect(r.getDate()).toBe(29);
  });

  it("atravessa a virada do ano", () => {
    expect(addMonths(new Date(2026, 10, 10), 30).toISOString().slice(0, 10)).toBe("2029-05-10");
  });

  it("devolve null sem data de emissão", () => {
    expect(expiryFromIssue(null, 12)).toBeNull();
    expect(expiryFromIssue("não é data", 12)).toBeNull();
  });
});

describe("catálogo de tipos", () => {
  it("dá à CNH validade variável, não fixa", () => {
    // Desde a Lei 14.071/2021 a validade depende da idade do condutor. Derivar
    // acertaria menos que ler a data impressa no documento.
    expect(kindSpec("cnh")?.validityMonths).toBeNull();
  });

  it("usa 30 meses no toxicológico e 60 no MOPP", () => {
    expect(kindSpec("toxicologico")?.validityMonths).toBe(30);
    expect(kindSpec("mopp")?.validityMonths).toBe(60);
  });

  it("sugere validade a partir da emissão", () => {
    expect(suggestedExpiry("toxicologico", iso(2026, 6, 1))).toBe("2028-12-01");
    expect(suggestedExpiry("aso", iso(2026, 6, 1))).toBe("2027-06-01");
  });

  it("não sugere nada para tipo sem prazo fixo", () => {
    expect(suggestedExpiry("cnh", iso(2026, 6, 1))).toBeNull();
    expect(suggestedExpiry("toxicologico", null)).toBeNull();
  });

  it("oferece 'outro' em qualquer escopo", () => {
    for (const scope of ["driver", "truck", "client"] as const) {
      expect(kindsForScope(scope).map((s) => s.kind)).toContain("outro");
    }
  });

  it("separa os tipos por titular", () => {
    const truck = kindsForScope("truck").map((s) => s.kind);
    expect(truck).toContain("crlv");
    expect(truck).toContain("tacografo");
    expect(truck).not.toContain("cnh");
  });

  it("não marca 'outro' como obrigatório em nenhum escopo", () => {
    for (const scope of ["driver", "truck", "client"] as const) {
      expect(requiredKindsForScope(scope)).not.toContain("outro");
    }
  });

  it("dá a todo tipo uma chave de tradução", () => {
    for (const spec of BR_COMPLIANCE_KINDS) {
      expect(spec.labelKey.startsWith("br.kind.")).toBe(true);
    }
  });
});

describe("summarizeBrCompliance", () => {
  const item = (kind: BrComplianceItemLike["kind"], expires: string | null): BrComplianceItemLike =>
    ({ kind, expires_on: expires });

  it("marca como crítico quando falta documento obrigatório", () => {
    const s = summarizeBrCompliance("driver", [], NOW);
    expect(s.level).toBe("critical");
    expect(s.missing).toContain("cnh");
    expect(s.missing).toContain("toxicologico");
  });

  it("separa faltando de vencido, porque a ação é diferente", () => {
    const s = summarizeBrCompliance("driver", [
      item("cnh", iso(2025, 1, 1)),        // vencida
      item("toxicologico", iso(2027, 1, 1)),
      // aso ausente
    ], NOW);
    expect(s.expired).toEqual(["cnh"]);
    expect(s.missing).toEqual(["aso"]);
    expect(s.level).toBe("critical");
  });

  it("fica em atenção quando algo vence dentro da janela", () => {
    const s = summarizeBrCompliance("driver", [
      item("cnh", iso(2026, 6, 20)),   // 19 dias
      item("toxicologico", iso(2028, 1, 1)),
      item("aso", iso(2027, 1, 1)),
    ], NOW);
    expect(s.level).toBe("attention");
    expect(s.expiring).toEqual(["cnh"]);
  });

  it("fica ok com tudo em dia", () => {
    const s = summarizeBrCompliance("driver", [
      item("cnh", iso(2030, 1, 1)),
      item("toxicologico", iso(2028, 1, 1)),
      item("aso", iso(2027, 1, 1)),
    ], NOW);
    expect(s.level).toBe("ok");
    expect(s.missing).toHaveLength(0);
  });

  it("usa o documento vigente quando há histórico de renovações", () => {
    // Renovações sucessivas ficam guardadas; vale a validade mais distante.
    const s = summarizeBrCompliance("driver", [
      item("cnh", iso(2024, 1, 1)),
      item("cnh", iso(2031, 1, 1)),
      item("toxicologico", iso(2028, 1, 1)),
      item("aso", iso(2027, 1, 1)),
    ], NOW);
    expect(s.level).toBe("ok");
  });

  it("não deixa um registro sem data apagar a validade conhecida", () => {
    const s = summarizeBrCompliance("driver", [
      item("cnh", iso(2031, 1, 1)),
      item("cnh", null),
      item("toxicologico", iso(2028, 1, 1)),
      item("aso", iso(2027, 1, 1)),
    ], NOW);
    expect(s.level).toBe("ok");
    expect(s.missing).toHaveLength(0);
  });

  it("aponta o próximo vencimento", () => {
    const s = summarizeBrCompliance("driver", [
      item("cnh", iso(2030, 1, 1)),
      item("toxicologico", iso(2028, 3, 15)),
      item("aso", iso(2027, 7, 1)),
    ], NOW);
    expect(s.nextExpiry).toBe(iso(2027, 7, 1));
  });

  it("avalia veículo pelos tipos de veículo", () => {
    const s = summarizeBrCompliance("truck", [
      item("crlv", iso(2027, 1, 1)),
      item("tacografo", iso(2027, 1, 1)),
    ], NOW);
    expect(s.level).toBe("ok");
    // CNH não entra no rollup de um caminhão.
    expect(s.byKind.map((e) => e.kind)).not.toContain("cnh");
  });
});

describe("multas", () => {
  it("usa a pontuação do CTB por gravidade", () => {
    expect(FINE_POINTS).toEqual({ leve: 3, media: 4, grave: 5, gravissima: 7 });
  });

  it("conta os dias restantes de defesa", () => {
    expect(daysToDefend(iso(2026, 6, 11), NOW)).toBe(10);
    expect(daysToDefend(iso(2026, 5, 22), NOW)).toBe(-10);
    expect(daysToDefend(null, NOW)).toBeNull();
  });

  it("considera defensável só multa pendente com prazo aberto", () => {
    expect(isDefendable({ status: "pending", defense_due_on: iso(2026, 6, 11), points: 5 }, NOW)).toBe(true);
    expect(isDefendable({ status: "pending", defense_due_on: iso(2026, 5, 1), points: 5 }, NOW)).toBe(false);
    // Já paga não tem mais o que defender, mesmo com prazo aberto.
    expect(isDefendable({ status: "paid", defense_due_on: iso(2026, 6, 11), points: 5 }, NOW)).toBe(false);
    expect(isDefendable({ status: "cancelled", defense_due_on: iso(2026, 6, 11), points: 5 }, NOW)).toBe(false);
  });

  it("soma na carteira só o que foi consolidado", () => {
    // Multa em recurso ainda pode cair; cancelada não pontua. Somar tudo daria
    // um total que não bate com o que a CNH mostra.
    const fines = [
      { status: "paid" as const, defense_due_on: null, points: 7 },
      { status: "paid" as const, defense_due_on: null, points: 5 },
      { status: "appealed" as const, defense_due_on: null, points: 7 },
      { status: "pending" as const, defense_due_on: null, points: 4 },
      { status: "cancelled" as const, defense_due_on: null, points: 7 },
    ];
    expect(consolidatedPoints(fines)).toBe(12);
    expect(consolidatedPoints(null)).toBe(0);
  });
});

describe("CNPJ", () => {
  it("tira e põe máscara", () => {
    expect(cnpjDigits("11.222.333/0001-81")).toBe("11222333000181");
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("devolve a entrada crua quando não dá para mascarar", () => {
    expect(formatCnpj("123")).toBe("123");
    expect(formatCnpj(null)).toBe("");
  });

  it("valida os dígitos verificadores", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11222333000181")).toBe(true);
    // Último dígito trocado.
    expect(isValidCnpj("11222333000182")).toBe(false);
  });

  it("rejeita tamanho errado e vazio", () => {
    expect(isValidCnpj("1122233300018")).toBe(false);
    expect(isValidCnpj("")).toBe(false);
    expect(isValidCnpj(null)).toBe(false);
  });

  it("rejeita dígitos repetidos, que passam no algoritmo mas não existem", () => {
    expect(isValidCnpj("00000000000000")).toBe(false);
    expect(isValidCnpj("11111111111111")).toBe(false);
  });
});
