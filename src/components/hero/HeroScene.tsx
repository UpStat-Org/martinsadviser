import {
  ArrowUpRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Gauge,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function HeroScene() {
  const { t } = useLanguage();

  return (
    <div className="presentation3d-stage pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="presentation3d-space">
        <div className="presentation3d-halo presentation3d-halo-a" />
        <div className="presentation3d-halo presentation3d-halo-b" />
        <div className="presentation3d-grid" />

        <div className="presentation3d-platform" />

        <div className="presentation3d-core">
          <div className="presentation3d-core-top">
            <div>
              <p className="presentation3d-kicker">{t("presentation.hero.badge")}</p>
              <h3 className="presentation3d-title">{t("presentation.hero.panelTitle")}</h3>
            </div>
            <div className="presentation3d-live">
              <Sparkles className="h-3.5 w-3.5" />
              {t("presentation.demo.live")}
            </div>
          </div>

          <div className="presentation3d-core-body">
            <div className="presentation3d-main">
              <div className="presentation3d-main-hero">
                <div className="presentation3d-main-icon">
                  <Gauge className="h-6 w-6" />
                </div>
                <div>
                  <div className="presentation3d-main-label">
                    {t("presentation.demo.flowLabel")}
                  </div>
                  <h4 className="presentation3d-main-title">
                    {t("presentation.demo.flowTitle")}
                  </h4>
                  <p className="presentation3d-main-desc">
                    {t("presentation.demo.flowDesc")}
                  </p>
                </div>
              </div>

              <div className="presentation3d-kpi-grid">
                <div className="presentation3d-kpi">
                  <Users className="h-4 w-4" />
                  <span>{t("nav.clients")}</span>
                </div>
                <div className="presentation3d-kpi">
                  <CalendarDays className="h-4 w-4" />
                  <span>{t("nav.calendar")}</span>
                </div>
                <div className="presentation3d-kpi">
                  <MessageSquare className="h-4 w-4" />
                  <span>{t("nav.messages")}</span>
                </div>
                <div className="presentation3d-kpi">
                  <Bot className="h-4 w-4" />
                  <span>{t("presentation.diff1.title")}</span>
                </div>
              </div>

              <div className="presentation3d-mini-status">
                <div>
                  <span>{t("presentation.outcome1.title")}</span>
                  <strong>92%</strong>
                </div>
                <div>
                  <span>{t("presentation.outcome2.title")}</span>
                  <strong>+ IA</strong>
                </div>
                <div>
                  <span>{t("presentation.outcome3.title")}</span>
                  <strong>24/7</strong>
                </div>
              </div>
            </div>

            <div className="presentation3d-side">
              <div className="presentation3d-arc">
                <div className="presentation3d-arc-ring" />
                <div className="presentation3d-arc-core">
                  <ShieldCheck className="h-6 w-6" />
                  <span>{t("presentation.diff4.title")}</span>
                </div>
              </div>

              <div className="presentation3d-trace">
                <div className="presentation3d-trace-line">
                  <span>{t("presentation.outcome3.title")}</span>
                  <strong>88%</strong>
                </div>
                <div className="presentation3d-trace-bar">
                  <div style={{ width: "88%" }} />
                </div>
                <div className="presentation3d-trace-line">
                  <span>{t("presentation.outcome4.title")}</span>
                  <strong>99%</strong>
                </div>
                <div className="presentation3d-trace-bar">
                  <div className="alt" style={{ width: "99%" }} />
                </div>
                <div className="presentation3d-trace-line">
                  <span>{t("presentation.demo4.title")}</span>
                  <strong>OK</strong>
                </div>
                <div className="presentation3d-trace-bar">
                  <div className="warn" style={{ width: "76%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="presentation3d-node presentation3d-node-left">
          <div className="presentation3d-node-head">
            <Users className="h-4 w-4" />
            <span>{t("presentation.demo1.tag")}</span>
          </div>
          <strong>{t("presentation.demo1.title")}</strong>
          <p>{t("presentation.demo1.desc")}</p>
        </div>

        <div className="presentation3d-node presentation3d-node-right">
          <div className="presentation3d-node-head">
            <Bot className="h-4 w-4" />
            <span>{t("presentation.demo2.tag")}</span>
          </div>
          <strong>{t("presentation.demo2.title")}</strong>
          <p>{t("presentation.demo2.desc")}</p>
        </div>

        <div className="presentation3d-vignette" />
      </div>
    </div>
  );
}

export default HeroScene;
