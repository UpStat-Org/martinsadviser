import { describe, it, expect } from "vitest";
import {
  COUNTRIES,
  CURRENCIES,
  CURRENCY_SYMBOL,
  defaultCurrencyForCountry,
  defaultLocaleForCountry,
  formatMoney,
  isCountryCode,
  isCurrency,
} from "../region";

// Espaço não-quebrável: Intl separa símbolo e número com U+00A0 em pt-BR e
// es-ES. Comparar com espaço comum falharia por um caractere invisível.
const NBSP = " ";

describe("region", () => {
  describe("defaults por país", () => {
    // Estes três casos são o contrato com
    // 20260824120000_org_country_currency.sql: default_currency_for_country e
    // default_locale_for_country implementam o MESMO mapeamento no banco. Se
    // alguém mudar um lado sem o outro, uma org nasce com moeda diferente da
    // que o painel de Configurações sugere pro mesmo país.
    it("mapeia US → USD/en", () => {
      expect(defaultCurrencyForCountry("US")).toBe("USD");
      expect(defaultLocaleForCountry("US")).toBe("en");
    });

    it("mapeia BR → BRL/pt", () => {
      expect(defaultCurrencyForCountry("BR")).toBe("BRL");
      expect(defaultLocaleForCountry("BR")).toBe("pt");
    });

    it("mapeia ES → EUR/es", () => {
      expect(defaultCurrencyForCountry("ES")).toBe("EUR");
      expect(defaultLocaleForCountry("ES")).toBe("es");
    });

    it("cobre todos os países suportados", () => {
      // Adicionar um país à lista sem lhe dar moeda/idioma faria a org cair
      // silenciosamente em USD/en. Este teste quebra nesse caso.
      for (const c of COUNTRIES) {
        expect(CURRENCIES).toContain(defaultCurrencyForCountry(c));
        expect(["en", "pt", "es"]).toContain(defaultLocaleForCountry(c));
      }
    });
  });

  describe("guards", () => {
    it("aceita apenas códigos conhecidos", () => {
      expect(isCountryCode("BR")).toBe(true);
      expect(isCountryCode("br")).toBe(false);
      expect(isCountryCode("MX")).toBe(false);
      expect(isCountryCode(undefined)).toBe(false);
      expect(isCurrency("BRL")).toBe(true);
      expect(isCurrency("GBP")).toBe(false);
      expect(isCurrency(null)).toBe(false);
    });
  });

  describe("formatMoney", () => {
    it("formata USD na convenção americana", () => {
      expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
    });

    it("formata BRL na convenção brasileira", () => {
      // Ponto de milhar e vírgula decimal — invertidos em relação ao dólar.
      expect(formatMoney(1234.5, "BRL")).toBe(`R$${NBSP}1.234,50`);
    });

    it("não deixa o idioma de quem lê mudar a aparência do valor", () => {
      // O formato acompanha a MOEDA, não a interface. Uma fatura em dólar sai
      // igual pra quem lê em inglês e pra quem lê em português, senão o mesmo
      // número vira dois textos diferentes e deixa de ser citável.
      expect(formatMoney(1000, "USD")).toBe("$1,000.00");
      expect(formatMoney(1000, "BRL")).toBe(`R$${NBSP}1.000,00`);
    });

    it("aceita string, que é como numeric chega do PostgREST", () => {
      // Colunas `numeric` não cabem em double sem perda, então o driver
      // preserva o texto. Antes disso cada call site fazia seu próprio Number().
      expect(formatMoney("2500.00", "USD")).toBe("$2,500.00");
    });

    it("devolve travessão para valor ausente em vez de zero", () => {
      // "$0.00" para um campo não preenchido é indistinguível de uma fatura
      // legitimamente zerada — o comportamento que os call sites tinham antes.
      expect(formatMoney(null, "USD")).toBe("—");
      expect(formatMoney(undefined, "USD")).toBe("—");
      expect(formatMoney("", "USD")).toBe("—");
      expect(formatMoney("abc", "USD")).toBe("—");
      expect(formatMoney(Number.NaN, "USD")).toBe("—");
    });

    it("respeita um fallback customizado", () => {
      expect(formatMoney(null, "USD", { fallback: "n/d" })).toBe("n/d");
    });

    it("formata zero como zero, não como ausente", () => {
      expect(formatMoney(0, "USD")).toBe("$0.00");
    });

    it("arredonda para a unidade quando pedido", () => {
      // maximumFractionDigits: 0 com currency exigia clamp do mínimo — sem ele
      // o Intl lança RangeError porque o default de minimumFractionDigits é 2.
      expect(formatMoney(1234.56, "USD", { maximumFractionDigits: 0 })).toBe("$1,235");
      expect(() => formatMoney(1, "BRL", { maximumFractionDigits: 0 })).not.toThrow();
    });

    it("formata negativos", () => {
      // Lucro por cliente pode ser negativo quando o custo supera a receita.
      expect(formatMoney(-500, "USD")).toBe("-$500.00");
    });

    it("tem símbolo para toda moeda suportada", () => {
      for (const c of CURRENCIES) {
        expect(CURRENCY_SYMBOL[c]).toBeTruthy();
      }
    });
  });
});
