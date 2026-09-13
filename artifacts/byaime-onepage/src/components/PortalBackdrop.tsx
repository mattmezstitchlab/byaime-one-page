import { useReducedMotion } from "framer-motion";
import { MeshGradient } from "@paper-design/shaders-react";

/**
 * Fond signature du User Portal : le dégradé Mesh de Paper exporté depuis
 * Paper (01KYZHW3DDV0GSEQQT6GTRN2JZ), ancré au viewport en plan fixe. Le
 * contenu défile par-dessus. Palette lagon (cyan / turquoise / menthe /
 * bleu profond), distincte du rose/magenta de la landing. Mouvement réduit :
 * l'animation est figée (speed 0) sur la frame exportée. Seule la taille
 * épouse l'écran. Un voile sombre garantit le contraste du texte blanc.
 */
export function PortalBackdrop() {
  const reduceMotion = useReducedMotion();
  return (
    <div aria-hidden data-testid="portal-shader" className="fixed inset-0 z-0 overflow-hidden bg-[#04202a]">
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
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,10,14,.55)_0%,rgba(0,10,14,.28)_24%,rgba(0,10,14,.12)_42%,rgba(0,10,14,.30)_68%,rgba(0,10,14,.62)_100%)]" />
    </div>
  );
}
