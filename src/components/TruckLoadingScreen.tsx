import { Truck, Package, MapPinned, ShieldCheck, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const highlights = [
  {
    icon: MapPinned,
    titleKey: "loadingScreen.highlight1.title",
    descKey: "loadingScreen.highlight1.desc",
  },
  {
    icon: Package,
    titleKey: "loadingScreen.highlight2.title",
    descKey: "loadingScreen.highlight2.desc",
  },
  {
    icon: ShieldCheck,
    titleKey: "loadingScreen.highlight3.title",
    descKey: "loadingScreen.highlight3.desc",
  },
];

export function TruckLoadingScreen() {
  const { t } = useLanguage();

  return (
    <div className="truck-loading-screen">
      <div className="truck-loading-sky" />
      <div className="truck-loading-grid" />
      <div className="truck-loading-radar" />

      <div className="truck-loading-content">
        <div className="truck-loading-copy">
          <div className="truck-loading-eyebrow">
            <Sparkles className="h-4 w-4" />
            <span>{t("loadingScreen.eyebrow")}</span>
          </div>
          <h1 className="truck-loading-title">{t("loadingScreen.title")}</h1>
          <p className="truck-loading-subtitle">{t("loadingScreen.subtitle")}</p>
        </div>

        <div className="truck-loading-stage">
          <div className="truck-loading-card truck-loading-card-left">
            <div className="truck-loading-card-label">{t("loadingScreen.sideLabel1")}</div>
            <div className="truck-loading-card-value">{t("loadingScreen.sideValue1")}</div>
          </div>

          <div className="truck-loading-card truck-loading-card-right">
            <div className="truck-loading-card-label">{t("loadingScreen.sideLabel2")}</div>
            <div className="truck-loading-card-value">{t("loadingScreen.sideValue2")}</div>
          </div>

          <div className="truck-loading-road">
            <div className="truck-loading-road-glow" />
            <div className="truck-loading-lane truck-loading-lane-left" />
            <div className="truck-loading-lane truck-loading-lane-right" />
            <div className="truck-loading-road-dashes">
              {Array.from({ length: 12 }).map((_, index) => (
                <span key={index} className="truck-loading-dash" />
              ))}
            </div>
          </div>

          <div className="truck-loading-truck-wrap">
            <div className="truck-loading-truck-shadow" />
            <div className="truck-loading-truck">
              <div className="truck-loading-trailer">
                <div className="truck-loading-trailer-header">
                  <span>{t("loadingScreen.trailerLabel")}</span>
                  <span className="truck-loading-status-dot" />
                </div>
                <div className="truck-loading-trailer-value">{t("loadingScreen.trailerValue")}</div>
                <div className="truck-loading-trailer-bars">
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div className="truck-loading-cabin">
                <div className="truck-loading-cabin-window">
                  <Truck className="h-8 w-8" />
                </div>
                <div className="truck-loading-cabin-lights">
                  <span />
                  <span />
                </div>
                <div className="truck-loading-wheel truck-loading-wheel-rear" />
                <div className="truck-loading-wheel truck-loading-wheel-front" />
              </div>
            </div>
          </div>
        </div>

        <div className="truck-loading-highlights">
          {highlights.map(({ icon: Icon, titleKey, descKey }) => (
            <div key={titleKey} className="truck-loading-highlight">
              <div className="truck-loading-highlight-icon">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="truck-loading-highlight-title">{t(titleKey)}</div>
                <div className="truck-loading-highlight-desc">{t(descKey)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
