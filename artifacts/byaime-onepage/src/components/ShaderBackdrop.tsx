import { useReducedMotion } from "framer-motion";
import { MeshGradient } from "@paper-design/shaders-react";

/**
 * Fond signature de la landing : le dégradé Mesh de Paper exporté depuis
 * Paper (01KYZHW3DDV0GSEQQT6GTRN2JZ), ancré au viewport en plan fixe. Le
 * contenu défile par-dessus. Palette rose/magenta, dans l'harmonie de
 * l'accent AIME. Mouvement réduit : l'animation est figée (speed 0) sur la
 * frame exportée. Seule la taille épouse l'écran.
 */
export function ShaderBackdrop() {
  const reduceMotion = useReducedMotion();
  return (
    <div aria-hidden data-testid="landing-shader" className="fixed inset-0 z-0 overflow-hidden bg-[#160309]">
      <MeshGradient
        speed={reduceMotion ? 0 : 0.34}
        scale={1.66}
        distortion={0.32}
        swirl={0.25}
        frame={44343.90399951904}
        grainMixer={0.06}
        grainOverlay={0}
        colors={["#FF6663", "#FE0077", "#FC4F79", "#FB56F1"]}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
