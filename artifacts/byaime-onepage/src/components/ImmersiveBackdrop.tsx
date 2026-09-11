import { getAssetUrl } from "@/lib/assets";

/**
 * Fond immersif cosmique : un plan fixe plein écran. Le contenu défile par-
 * dessus tandis que le visuel reste ancré au viewport. Seuls des liserés
 * dégradés en haut et en bas assurent la lisibilité — le centre garde les
 * vraies couleurs de la photo (les astronautes en tenue de mariage).
 */
export function ImmersiveBackdrop({ image }: { image: string }) {
  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden bg-black">
      <img
        src={getAssetUrl(image)}
        alt=""
        className="aime-hero-drift h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,.42)_0%,rgba(0,0,0,.08)_20%,transparent_38%,transparent_66%,rgba(0,0,0,.55)_100%)]" />
    </div>
  );
}
