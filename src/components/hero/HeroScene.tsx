import { FileCheck, Truck, Sparkles, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function HeroScene() {
  const { t } = useLanguage();

  return (
    <div
      className="hero3d-stage pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Horizon glow */}
      <div className="hero3d-horizon" />
      <div className="hero3d-sun" />

      {/* Perspective road */}
      <div className="hero3d-road-wrap">
        <div className="hero3d-road">
          <div className="hero3d-lanes" />
          <div className="hero3d-lanes hero3d-lanes-side hero3d-lanes-left" />
          <div className="hero3d-lanes hero3d-lanes-side hero3d-lanes-right" />
        </div>
      </div>

      {/* Floating permit cards in 3D space */}
      <div className="hero3d-cards">
        <div className="hero3d-card hero3d-card-1">
          <div className="hero3d-card-head">
            <FileCheck className="w-3.5 h-3.5" />
            <span>{t("hero.scene.permit")}</span>
          </div>
          <div className="hero3d-card-bar" />
          <div className="hero3d-card-lines">
            <span style={{ width: "82%" }} />
            <span style={{ width: "60%" }} />
            <span style={{ width: "72%" }} />
          </div>
          <div className="hero3d-card-badge hero3d-badge-green">
            <ShieldCheck className="w-3 h-3" />
            {t("hero.scene.approved")}
          </div>
        </div>

        <div className="hero3d-card hero3d-card-2">
          <div className="hero3d-card-head hero3d-card-head-amber">
            <Truck className="w-3.5 h-3.5" />
            <span>{t("hero.scene.oversize")}</span>
          </div>
          <div className="hero3d-card-bar hero3d-card-bar-amber" />
          <div className="hero3d-card-lines">
            <span style={{ width: "68%" }} />
            <span style={{ width: "88%" }} />
          </div>
          <div className="hero3d-card-badge hero3d-badge-amber">
            <Sparkles className="w-3 h-3" />
            {t("hero.scene.reviewing")}
          </div>
        </div>

        <div className="hero3d-card hero3d-card-3">
          <div className="hero3d-card-head hero3d-card-head-purple">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t("hero.scene.complianceOk")}</span>
          </div>
          <div className="hero3d-card-bar hero3d-card-bar-purple" />
          <div className="hero3d-card-lines">
            <span style={{ width: "76%" }} />
            <span style={{ width: "54%" }} />
            <span style={{ width: "80%" }} />
          </div>
          <div className="hero3d-card-badge hero3d-badge-green">
            <ShieldCheck className="w-3 h-3" />
            100%
          </div>
        </div>

        <div className="hero3d-card hero3d-card-4">
          <div className="hero3d-card-head">
            <FileCheck className="w-3.5 h-3.5" />
            <span>{t("hero.scene.route")}</span>
          </div>
          <div className="hero3d-card-bar" />
          <div className="hero3d-card-lines">
            <span style={{ width: "72%" }} />
            <span style={{ width: "48%" }} />
          </div>
          <div className="hero3d-card-badge hero3d-badge-blue">
            <Truck className="w-3 h-3" />
            {t("hero.scene.inTransit")}
          </div>
        </div>
      </div>

      {/* Vignette + fade so text stays legible */}
      <div className="hero3d-vignette" />
    </div>
  );
}

export default HeroScene;
