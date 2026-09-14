/**
 * Fond du User Portal.
 *
 * C'était un dégradé Mesh « lagon » (cyan / turquoise / menthe / bleu profond) :
 * la seule surface colorée de l'app, en rupture avec le noir de l'accueil et le
 * rose de l'accent. Le portail reprend maintenant exactement le noir du hero et
 * du pied de page de la landing — un plan fixe unique, sans animation, sur
 * lequel le contenu défile. Le contraste du texte blanc n'a plus besoin d'un
 * voile correctif.
 */
export function PortalBackdrop() {
  return (
    <div
      aria-hidden
      data-testid="portal-backdrop"
      className="fixed inset-0 z-0 bg-[var(--agency-paper)]"
    />
  );
}
