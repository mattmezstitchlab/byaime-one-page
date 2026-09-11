import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { useRouteMeta } from "@/lib/page-meta";

export default function NotFound() {
  useRouteMeta({ title: "Page introuvable — AIME" });
  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-6 text-foreground">
      <div className="flex max-w-md flex-col items-center text-center">
        <AlertCircle className="h-10 w-10 text-foreground/30" />
        <p className="mt-8 text-[10px] uppercase tracking-[.3em] text-foreground/40">Erreur 404</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Cette page n’existe pas.</h1>
        <p className="mt-4 text-sm font-light leading-relaxed text-foreground/55">
          L’adresse demandée est introuvable ou n’est plus disponible.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Retour à l’accueil
        </Link>
      </div>
    </main>
  );
}
