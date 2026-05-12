import { Bot, Sparkles, Truck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function LandingHeroScene() {
  const { t } = useLanguage();

  return (
    <div className="landing-hero-visual" aria-hidden>
      <div className="landing-hero-visual-backdrop" />
      <div className="landing-hero-visual-rings">
        <span className="landing-hero-ring landing-hero-ring-a" />
        <span className="landing-hero-ring landing-hero-ring-b" />
        <span className="landing-hero-ring landing-hero-ring-c" />
      </div>

      <div className="landing-hero-panel">
        <div className="landing-hero-panel-top">
          <div className="landing-hero-panel-badge">
            <Truck className="h-4 w-4" />
            <span>{t("lp.hero.badge")}</span>
          </div>
          <div className="landing-hero-panel-live">
            <Bot className="h-3.5 w-3.5" />
            <span>{t("lp.hero.roadLabel3")}</span>
          </div>
        </div>

        <div className="landing-hero-panel-body">
          <div className="landing-hero-panel-chart">
            <div className="landing-hero-panel-chart-top">
              <span />
              <span />
              <span />
            </div>
            <div className="landing-hero-panel-chart-grid">
              {[42, 58, 48, 76, 62, 84].map((height, index) => (
                <span
                  key={index}
                  className="landing-hero-panel-bar"
                  style={{
                    height: `${height}px`,
                    animationDelay: `${index * 0.18}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="landing-hero-panel-orb">
            <div className="landing-hero-panel-orb-inner">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="landing-hero-panel-footer">
          <div>
            <strong>AI</strong>
            <span>{t("lp.hero.stat.aiLabel")}</span>
          </div>
          <div>
            <strong>24/7</strong>
            <span>{t("lp.hero.stat.support")}</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>{t("lp.hero.stat.compliance")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingHeroScene;
