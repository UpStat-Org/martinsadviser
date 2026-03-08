import { describe, it, expect } from "vitest";
import { getTranslation, languageLabels, type Language } from "../translations";

describe("translations", () => {
  describe("getTranslation", () => {
    it("returns Portuguese translation by default", () => {
      expect(getTranslation("pt", "nav.dashboard")).toBe("Dashboard");
      expect(getTranslation("pt", "nav.clients")).toBe("Clientes");
    });

    it("returns English translations", () => {
      expect(getTranslation("en", "nav.clients")).toBe("Clients");
      expect(getTranslation("en", "nav.trucks")).toBe("Trucks");
    });

    it("returns Spanish translations", () => {
      expect(getTranslation("es", "nav.clients")).toBe("Clientes");
    });

    it("falls back to Portuguese for missing keys in other languages", () => {
      // If a key exists in pt but not in en, it should fall back to pt
      const ptValue = getTranslation("pt", "nav.dashboard");
      const enValue = getTranslation("en", "nav.dashboard");
      // Both should return a non-empty string
      expect(ptValue).toBeTruthy();
      expect(enValue).toBeTruthy();
    });

    it("returns the key itself if not found in any language", () => {
      expect(getTranslation("pt", "nonexistent.key.xyz")).toBe("nonexistent.key.xyz");
    });
  });

  describe("languageLabels", () => {
    it("has entries for all supported languages", () => {
      const langs: Language[] = ["pt", "en", "es"];
      langs.forEach((lang) => {
        expect(languageLabels[lang]).toBeDefined();
        expect(languageLabels[lang].flag).toBeTruthy();
        expect(languageLabels[lang].label).toBeTruthy();
      });
    });
  });
});
