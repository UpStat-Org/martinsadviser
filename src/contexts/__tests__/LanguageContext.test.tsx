import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "../LanguageContext";

function TestConsumer() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="translated">{t("nav.clients")}</span>
      <button onClick={() => setLanguage("en")}>Switch to EN</button>
      <button onClick={() => setLanguage("es")}>Switch to ES</button>
    </div>
  );
}

describe("LanguageContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to Portuguese", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("pt");
    expect(screen.getByTestId("translated")).toHaveTextContent("Clientes");
  });

  it("switches language to English", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByText("Switch to EN"));
    expect(screen.getByTestId("lang")).toHaveTextContent("en");
    expect(screen.getByTestId("translated")).toHaveTextContent("Clients");
  });

  it("switches language to Spanish", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByText("Switch to ES"));
    expect(screen.getByTestId("lang")).toHaveTextContent("es");
    expect(screen.getByTestId("translated")).toHaveTextContent("Clientes");
  });

  it("persists language to localStorage", () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByText("Switch to EN"));
    expect(localStorage.getItem("app-language")).toBe("en");
  });

  it("reads persisted language from localStorage", () => {
    localStorage.setItem("app-language", "es");
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("es");
  });

  it("throws when used outside provider", () => {
    expect(() => render(<TestConsumer />)).toThrow("useLanguage must be used within LanguageProvider");
  });
});
