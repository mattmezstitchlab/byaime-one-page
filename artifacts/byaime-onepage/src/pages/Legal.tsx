import { Link } from "wouter";

const sections = {
  privacy: [
    ["Ce qu’AIME conserve", "Les informations de compte nécessaires à la connexion, les Mondes que vous créez ou rejoignez, leurs invités, rôles, Moments, réponses RSVP, messages et documents privés. AIME ne rend public que le Profil et les Moments que le propriétaire choisit explicitement de publier."],
    ["Pourquoi ces données sont utilisées", "Pour fournir l’organisation partagée du mariage, enregistrer les changements, envoyer les invitations et messages confirmés, recevoir les RSVP, conserver les documents et protéger les accès."],
    ["Services techniques", "L’authentification est assurée par Clerk, les e-mails par Resend et les fichiers par le stockage privé de Replit. Ces services reçoivent uniquement les données nécessaires à leur fonction."],
    ["Conservation", "Le propriétaire choisit une préférence de conservation pour son Monde et peut le supprimer immédiatement. Pendant le pilote, cette préférence n’entraîne pas encore de suppression automatique sans avertissement. Chaque membre peut exporter ses données et supprimer son compte depuis ME."],
    ["Vos choix", "Vous pouvez consulter et corriger vos informations dans le Monde, retirer un lien RSVP, désactiver la publication, télécharger vos données ou supprimer votre compte. La suppression d’un compte retire aussi ses accès aux Mondes partagés."],
    ["Sécurité", "Les espaces privés exigent une session authentifiée. Les droits dépendent du rôle, les documents sont servis sans cache public, les liens sensibles sont limités contre les abus et les transferts de fichiers sont autorisés par un jeton court et signé."],
  ],
  terms: [
    ["Objet du pilote", "AIME aide les couples et leurs proches à organiser un mariage dans un espace partagé. Le service est encore en phase pilote : il accompagne l’organisation mais ne remplace ni un professionnel du mariage, ni un conseil juridique, financier ou médical."],
    ["Responsabilité des utilisateurs", "Vous devez partager uniquement les informations nécessaires, respecter les personnes invitées et vérifier les horaires, montants, coordonnées, allergies et décisions importantes avant de les utiliser dans le monde réel."],
    ["Messages et invitations", "Aucun message n’est envoyé sans confirmation. Vous devez disposer d’une raison légitime pour contacter les destinataires et ne pas utiliser AIME pour du démarchage, du spam ou un contenu trompeur."],
    ["Documents et contenus", "Vous restez responsable des documents et contenus ajoutés. N’ajoutez pas de contenu illégal, malveillant ou portant atteinte aux droits d’une autre personne."],
    ["Disponibilité", "AIME cherche à conserver les données et les accès avec soin, mais un pilote peut évoluer ou connaître des interruptions. Conservez une copie des informations indispensables au Jour J."],
    ["Fin d’utilisation", "Le propriétaire peut supprimer son Monde. Chaque utilisateur peut supprimer son compte depuis ME. Un accès peut être suspendu en cas d’abus, de tentative d’intrusion ou d’utilisation mettant d’autres personnes en danger."],
  ],
} as const;

export function LegalPage({ kind }: { kind: keyof typeof sections }) {
  const privacy = kind === "privacy";
  return <main className="min-h-[100dvh] bg-background px-6 py-16 text-foreground md:px-10">
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="text-sm font-medium tracking-[.3em] text-foreground/70">AIME</Link>
      <p className="mt-20 text-[10px] uppercase tracking-[.25em] text-foreground/35">Version pilote · 8 septembre 2026</p>
      <h1 className="mt-5 font-display text-4xl font-light md:text-6xl">{privacy ? "Confidentialité" : "Conditions d’utilisation"}</h1>
      <p className="mt-7 max-w-2xl text-base font-light leading-relaxed text-foreground/50">{privacy ? "AIME organise des informations personnelles et parfois sensibles. Cette page explique simplement ce qui est conservé et comment chacun garde le contrôle." : "Ces règles protègent les couples, leurs invités, les prestataires et les personnes qui participent au pilote AIME."}</p>
      <div className="mt-16 space-y-12">{sections[kind].map(([title, body]) => <section key={title} className="border-t border-foreground/10 pt-7"><h2 className="text-lg font-medium">{title}</h2><p className="mt-4 font-light leading-7 text-foreground/48">{body}</p></section>)}</div>
      <div className="mt-16 flex flex-wrap gap-3 border-t border-foreground/10 pt-8 text-xs">
        <Link href={privacy ? "/conditions" : "/confidentialite"} className="rounded-full border border-foreground/15 px-4 py-2">{privacy ? "Conditions d’utilisation" : "Confidentialité"}</Link>
        <Link href="/" className="rounded-full bg-white px-4 py-2 font-medium text-black">Retour à AIME</Link>
      </div>
    </div>
  </main>;
}