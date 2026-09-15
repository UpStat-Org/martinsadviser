import { describe, it, expect } from "vitest";
import {
  laneLabel,
  ratePerDistance,
  isReadyToInvoice,
  LOAD_STATUSES,
  LOAD_BOARD_STATUSES,
  LOAD_ACTIVE_STATUSES,
  type LoadStatus,
} from "../useLoads";

describe("useLoads — derivados", () => {
  describe("laneLabel", () => {
    it("junta cidade e estado dos dois lados", () => {
      expect(laneLabel({
        origin_city: "Chicago", origin_region: "IL",
        destination_city: "Dallas", destination_region: "TX",
      })).toBe("Chicago, IL → Dallas, TX");
    });

    it("aceita só cidade quando não há estado", () => {
      expect(laneLabel({
        origin_city: "Santos", origin_region: null,
        destination_city: "Curitiba", destination_region: null,
      })).toBe("Santos → Curitiba");
    });

    it("marca com travessão a ponta que falta em vez de sumir com ela", () => {
      // Uma carga com origem mas sem destino ainda é informação útil no card;
      // devolver null aqui esconderia o que já se sabe.
      expect(laneLabel({
        origin_city: "Miami", origin_region: "FL",
        destination_city: null, destination_region: null,
      })).toBe("Miami, FL → —");
    });

    it("devolve null quando não há trajeto nenhum", () => {
      expect(laneLabel({
        origin_city: null, origin_region: null,
        destination_city: null, destination_region: null,
      })).toBeNull();
    });

    it("ignora strings em branco", () => {
      // Campo de texto vazio chega como "" e não como null; sem o trim isso
      // renderizaria ", IL" com uma vírgula solta na frente.
      expect(laneLabel({
        origin_city: "  ", origin_region: "IL",
        destination_city: "Reno", destination_region: "NV",
      })).toBe("IL → Reno, NV");
    });
  });

  describe("ratePerDistance", () => {
    it("divide valor por distância", () => {
      expect(ratePerDistance({ rate: 2000, distance: 500 })).toBe(4);
    });

    it("devolve null quando não há distância, em vez de zero", () => {
      // Zero diria "esse frete rende 0 por milha", que é uma afirmação falsa
      // sobre um dado que apenas não foi informado.
      expect(ratePerDistance({ rate: 2000, distance: null })).toBeNull();
      expect(ratePerDistance({ rate: 2000, distance: 0 })).toBeNull();
    });

    it("devolve null para distância negativa", () => {
      expect(ratePerDistance({ rate: 2000, distance: -100 })).toBeNull();
    });

    it("aceita numeric vindo como string do PostgREST", () => {
      expect(ratePerDistance({ rate: "1500.00" as unknown as number, distance: "300" as unknown as number }))
        .toBe(5);
    });

    it("devolve null para valor não numérico", () => {
      expect(ratePerDistance({ rate: Number.NaN, distance: 100 })).toBeNull();
    });
  });

  describe("isReadyToInvoice", () => {
    it("é verdadeiro só para entregue e sem fatura", () => {
      expect(isReadyToInvoice({ status: "delivered", invoice_id: null })).toBe(true);
    });

    it("é falso quando a carga já foi faturada", () => {
      expect(isReadyToInvoice({ status: "delivered", invoice_id: "inv-1" })).toBe(false);
    });

    it("é falso antes da entrega", () => {
      const before: LoadStatus[] = ["quoted", "booked", "dispatched", "in_transit"];
      for (const status of before) {
        expect(isReadyToInvoice({ status, invoice_id: null })).toBe(false);
      }
    });

    it("é falso para carga cancelada", () => {
      expect(isReadyToInvoice({ status: "cancelled", invoice_id: null })).toBe(false);
    });
  });

  describe("conjuntos de status", () => {
    it("não expõe estado de cobrança no ciclo da carga", () => {
      // Faturamento vive em invoices, alcançável por invoice_id. Um status
      // "paid" aqui criaria uma segunda fonte de verdade que diverge no
      // primeiro estorno — ver o cabeçalho da migration.
      expect(LOAD_STATUSES).not.toContain("invoiced" as LoadStatus);
      expect(LOAD_STATUSES).not.toContain("paid" as LoadStatus);
    });

    it("mantém o board como subconjunto dos status válidos", () => {
      for (const status of LOAD_BOARD_STATUSES) {
        expect(LOAD_STATUSES).toContain(status);
      }
    });

    it("deixa cancelada fora do board", () => {
      // Cancelada não é etapa do trajeto: como coluna, faria o quadro crescer
      // para sempre com o que já não interessa ao despachante.
      expect(LOAD_BOARD_STATUSES).not.toContain("cancelled");
      expect(LOAD_BOARD_STATUSES).toHaveLength(LOAD_STATUSES.length - 1);
    });

    it("preserva a ordem do ciclo no board", () => {
      expect(LOAD_BOARD_STATUSES).toEqual([
        "quoted", "booked", "dispatched", "in_transit", "delivered",
      ]);
    });

    it("considera em rota apenas despachada e em trânsito", () => {
      for (const status of LOAD_ACTIVE_STATUSES) {
        expect(LOAD_STATUSES).toContain(status);
      }
      expect(LOAD_ACTIVE_STATUSES).toEqual(["dispatched", "in_transit"]);
    });
  });
});
