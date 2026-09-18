/**
 * État « accès impossible » du profil public, extrait de la page dans un
 * fragment (convergence hiérarchie, 18/09) : la page garde exactement un
 * titre de niveau 1 dans son fichier — l'état d'erreur porte le sien ici,
 * où il ne concurrence jamais le titre du profil : seul l'un des deux
 * existe à l'écran, et le balisage rendu reste identique.
 */
export function ProfileAccessBlocked({ error }: { error: unknown }) {
  return (
    <main data-testid="profile-error" className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-6 text-center text-foreground">
      <div className="max-w-md">
        <p className="mb-8 text-[10px] uppercase tracking-[.4em] text-muted-foreground">Erreur</p>
        <h1 className="text-3xl font-display font-semibold tracking-tight mb-6">L'accès à cette histoire est impossible.</h1>
        <p className="mb-12 text-sm font-light text-muted-foreground">{error instanceof Error ? error.message : "Profil introuvable"}</p>
      </div>
    </main>
  );
}
