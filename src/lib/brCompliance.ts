// ---------------------------------------------------------------------------
// Catálogo de compliance brasileiro — lógica pura.
//
// Espelha o papel que lib/dqf.ts tem no lado americano: define quais
// documentos compõem a regularidade de um motorista, de um veículo e da
// transportadora, e faz o rollup de vencimentos. Sem import de React nem de
// Supabase, para ser testável direto e reutilizável por edge function.
//
// ---------------------------------------------------------------------------
// Sobre os prazos: `validityMonths` é SUGESTÃO, não verdade.
//
// O que vale é sempre a data gravada em `br_compliance_items.expires_on`. O
// prazo do catálogo serve só para pré-preencher o formulário a partir da data
// de emissão, e o usuário sobrescreve. Essa separação é deliberada: legislação
// muda, há exceções por categoria e por estado, e um número desatualizado aqui
// nunca deve virar um alerta errado na tela de alguém. No máximo vira um campo
// pré-preenchido que a pessoa corrige.
//
// Por isso a CNH tem validityMonths null: desde a Lei 14.071/2021 a validade
// depende da idade do condutor (10 anos até 49, 5 anos de 50 a 69, 3 anos a
// partir de 70). Derivar isso exigiria a data de nascimento e acertaria menos
// do que simplesmente ler a data impressa no documento.
// ---------------------------------------------------------------------------

import { expiryStatus, expiryFromIssue, type ExpiryInfo, type ExpiryState } from "@/lib/expiry";

export type BrScope = "driver" | "truck" | "client";

export type BrComplianceKind =
  | "cnh"
  | "mopp"
  | "toxicologico"
  | "aso"
  | "crlv"
  | "tacografo"
  | "antt_veiculo"
  | "rntrc"
  | "outro";

export interface BrComplianceKindSpec {
  kind: BrComplianceKind;
  scope: BrScope;
  /** Chave de i18n do rótulo. O catálogo não carrega texto traduzido. */
  labelKey: string;
  /**
   * Prazo típico em MESES a partir da emissão. Null quando o documento traz a
   * própria validade e não há regra fixa a aplicar.
   */
  validityMonths: number | null;
  /** Se o documento é essencial para a regularidade do titular. */
  required: boolean;
  /** Se faz sentido pedir número do documento no formulário. */
  hasNumber: boolean;
}

export const BR_COMPLIANCE_KINDS: BrComplianceKindSpec[] = [
  // ── Motorista ────────────────────────────────────────────────────────────
  // Validade impressa no documento — ver nota sobre a Lei 14.071 no cabeçalho.
  { kind: "cnh", scope: "driver", labelKey: "br.kind.cnh", validityMonths: null, required: true, hasNumber: true },
  // Curso de movimentação de produtos perigosos: 5 anos.
  { kind: "mopp", scope: "driver", labelKey: "br.kind.mopp", validityMonths: 60, required: false, hasNumber: false },
  // Exame toxicológico de larga janela (Lei 13.103): obrigatório para C, D e E,
  // renovado a cada 2 anos e 6 meses.
  { kind: "toxicologico", scope: "driver", labelKey: "br.kind.toxicologico", validityMonths: 30, required: true, hasNumber: false },
  // Atestado de Saúde Ocupacional: periódico anual no caso geral.
  { kind: "aso", scope: "driver", labelKey: "br.kind.aso", validityMonths: 12, required: true, hasNumber: false },

  // ── Veículo ──────────────────────────────────────────────────────────────
  // Licenciamento anual. O vencimento efetivo varia por estado e final de
  // placa, então 12 meses é ponto de partida, não regra.
  { kind: "crlv", scope: "truck", labelKey: "br.kind.crlv", validityMonths: 12, required: true, hasNumber: true },
  // Aferição do cronotacógrafo (selo INMETRO): anual.
  { kind: "tacografo", scope: "truck", labelKey: "br.kind.tacografo", validityMonths: 12, required: true, hasNumber: false },
  { kind: "antt_veiculo", scope: "truck", labelKey: "br.kind.anttVeiculo", validityMonths: null, required: false, hasNumber: true },

  // ── Transportadora ───────────────────────────────────────────────────────
  // RNTRC: renovação a cada 5 anos.
  { kind: "rntrc", scope: "client", labelKey: "br.kind.rntrc", validityMonths: 60, required: true, hasNumber: true },

  { kind: "outro", scope: "driver", labelKey: "br.kind.outro", validityMonths: null, required: false, hasNumber: true },
];

const BY_KIND = new Map(BR_COMPLIANCE_KINDS.map((s) => [s.kind, s]));

export function kindSpec(kind: BrComplianceKind): BrComplianceKindSpec | undefined {
  return BY_KIND.get(kind);
}

/** Tipos que fazem sentido para um titular. "outro" vale para qualquer um. */
export function kindsForScope(scope: BrScope): BrComplianceKindSpec[] {
  return BR_COMPLIANCE_KINDS.filter((s) => s.scope === scope || s.kind === "outro");
}

/** Tipos obrigatórios de um titular — a base do cálculo de "está faltando o quê". */
export function requiredKindsForScope(scope: BrScope): BrComplianceKind[] {
  return BR_COMPLIANCE_KINDS.filter((s) => s.scope === scope && s.required).map((s) => s.kind);
}

/**
 * Validade sugerida a partir da emissão, segundo o prazo típico do tipo.
 * Null quando o tipo não tem prazo fixo ou não há data de emissão — nesses
 * casos o formulário simplesmente não sugere nada.
 */
export function suggestedExpiry(kind: BrComplianceKind, issuedOn: string | null | undefined): string | null {
  const spec = BY_KIND.get(kind);
  if (!spec?.validityMonths) return null;
  return expiryFromIssue(issuedOn, spec.validityMonths);
}

// ── Rollup por titular ─────────────────────────────────────────────────────

export interface BrComplianceItemLike {
  kind: BrComplianceKind;
  expires_on: string | null;
}

export type BrComplianceLevel = "ok" | "attention" | "critical";

export interface BrComplianceSummary {
  /** Estado por tipo obrigatório do escopo, incluindo os não cadastrados. */
  byKind: Array<{ kind: BrComplianceKind; expiry: ExpiryInfo }>;
  missing: BrComplianceKind[];
  expired: BrComplianceKind[];
  expiring: BrComplianceKind[];
  level: BrComplianceLevel;
  /** Data mais próxima a vencer entre os itens válidos. */
  nextExpiry: string | null;
}

/**
 * Consolida a situação de um titular.
 *
 * Documento faltando pesa igual a documento vencido no nível final: nos dois
 * casos o motorista não pode rodar. A distinção entre `missing` e `expired`
 * fica preservada nas listas porque a AÇÃO é diferente — um precisa ser
 * lançado no sistema, o outro precisa ser renovado no órgão.
 *
 * Quando há mais de um item do mesmo tipo (renovações sucessivas guardadas
 * como histórico), vale o de validade mais distante: é o documento vigente.
 */
export function summarizeBrCompliance(
  scope: BrScope,
  items: BrComplianceItemLike[] | null | undefined,
  now: number = Date.now(),
): BrComplianceSummary {
  const list = items ?? [];
  const required = requiredKindsForScope(scope);

  const latestByKind = new Map<BrComplianceKind, string | null>();
  for (const item of list) {
    const current = latestByKind.get(item.kind);
    if (!latestByKind.has(item.kind)) {
      latestByKind.set(item.kind, item.expires_on);
      continue;
    }
    // Sem data não substitui uma data existente: um registro incompleto não
    // deve apagar a validade que já se conhece.
    if (!item.expires_on) continue;
    if (!current || new Date(item.expires_on) > new Date(current)) {
      latestByKind.set(item.kind, item.expires_on);
    }
  }

  const byKind = required.map((kind) => ({
    kind,
    expiry: latestByKind.has(kind)
      ? expiryStatus(latestByKind.get(kind) ?? null, now)
      : ({ date: null, daysUntil: null, state: "missing" } as ExpiryInfo),
  }));

  const pick = (state: ExpiryState) =>
    byKind.filter((entry) => entry.expiry.state === state).map((entry) => entry.kind);

  const missing = pick("missing");
  const expired = pick("expired");
  const expiring = pick("expiring");

  const level: BrComplianceLevel =
    missing.length > 0 || expired.length > 0 ? "critical"
    : expiring.length > 0 ? "attention"
    : "ok";

  const upcoming = byKind
    .map((entry) => entry.expiry.date)
    .filter((d): d is string => !!d)
    .sort();

  return { byKind, missing, expired, expiring, level, nextExpiry: upcoming[0] ?? null };
}

// ── Multas ─────────────────────────────────────────────────────────────────

export type FineSeverity = "leve" | "media" | "grave" | "gravissima";

/**
 * Pontuação padrão do CTB por gravidade. Sugestão para o formulário — a coluna
 * `points` é gravada, porque existem multiplicadores e casos que fogem da
 * tabela base.
 */
export const FINE_POINTS: Record<FineSeverity, number> = {
  leve: 3,
  media: 4,
  grave: 5,
  gravissima: 7,
};

/**
 * Dias restantes para apresentar defesa. Negativo quando o prazo já passou.
 * Null quando não há prazo cadastrado — que é diferente de "sem prazo": é uma
 * multa cuja notificação ainda não foi lançada por completo.
 */
export function daysToDefend(defenseDueOn: string | null | undefined, now: number = Date.now()): number | null {
  if (!defenseDueOn) return null;
  return expiryStatus(defenseDueOn, now).daysUntil;
}

export interface FineLike {
  status: "pending" | "appealed" | "paid" | "cancelled";
  defense_due_on: string | null;
  points: number;
}

/**
 * Multa em aberto cujo prazo de defesa ainda corre — o que o painel destaca.
 * Multa já paga ou cancelada não entra nem que o prazo esteja aberto: não há
 * mais o que defender.
 */
export function isDefendable(fine: FineLike, now: number = Date.now()): boolean {
  if (fine.status !== "pending") return false;
  const days = daysToDefend(fine.defense_due_on, now);
  return days !== null && days >= 0;
}

/**
 * Pontos que efetivamente foram para a carteira: só de multas consolidadas.
 * Multa em recurso ainda pode cair, e cancelada não pontua — somar tudo daria
 * um total que assusta sem corresponder ao que a CNH mostra.
 */
export function consolidatedPoints(fines: FineLike[] | null | undefined): number {
  return (fines ?? [])
    .filter((f) => f.status === "paid")
    .reduce((sum, f) => sum + (Number(f.points) || 0), 0);
}

// ── CNPJ ───────────────────────────────────────────────────────────────────

/** Remove máscara: "11.222.333/0001-81" → "11222333000181". */
export function cnpjDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Aplica a máscara para exibição. Devolve a entrada crua se não tiver 14 dígitos. */
export function formatCnpj(value: string | null | undefined): string {
  const d = cnpjDigits(value);
  if (d.length !== 14) return value ?? "";
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Validação pelos dois dígitos verificadores.
 *
 * Vale a pena validar localmente antes de chamar a API: erro de digitação é o
 * caso comum, e devolver "CNPJ inválido" na hora é melhor do que esperar uma
 * ida à rede para receber "não encontrado" — que sugere empresa inexistente
 * quando o problema foi um dígito trocado.
 */
export function isValidCnpj(value: string | null | undefined): boolean {
  const d = cnpjDigits(value);
  if (d.length !== 14) return false;
  // Todos os dígitos iguais passam no algoritmo mas não são CNPJ real.
  if (/^(\d)\1{13}$/.test(d)) return false;

  const checkDigit = (slice: string, weights: number[]): number => {
    const sum = weights.reduce((acc, weight, i) => acc + Number(slice[i]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const first = checkDigit(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (first !== Number(d[12])) return false;

  const second = checkDigit(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return second === Number(d[13]);
}
