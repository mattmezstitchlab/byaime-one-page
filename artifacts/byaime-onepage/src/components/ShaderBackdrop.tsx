import { useReducedMotion } from "framer-motion";
import { MeshGradient } from "@paper-design/shaders-react";

/**
 * Fond signature de la landing : le dégradé Mesh de Paper exporté depuis
 * Paper (01KYZHW3DDV0GSEQQT6GTRN2JZ), ancré au viewport en plan fixe. Le
 * contenu défile par-dessus, comme l'ancien fond cosmique. Paramètres
 * d'export conservés à l'identique ; seule la taille épouse l'écran.
 * Mouvement réduit : l'animation est figée (speed 0) sur la frame exportée.
 */
export function ShaderBackdrop() {
  const reduceMotion = useReducedMotion();
  return (
    <div aria-hidden data-testid="landing-shader" className="fixed inset-0 z-0 overflow-hidden bg-[#013a63]">
      <MeshGradient
        speed={reduceMotion ? 0 : 0.23}
        scale={1}
        distortion={0.19}
        swirl={0.04}
        frame={40643.653999401475}
        grainMixer={0.1}
        grainOverlay={0.29}
        colors={["#00BBCD", "#00BAE7", "#71EBA8", "#005DB8"]}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
