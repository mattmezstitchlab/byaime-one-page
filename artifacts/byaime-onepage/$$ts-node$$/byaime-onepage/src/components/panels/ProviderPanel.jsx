import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { useProject } from "@/store/project-store";
export function ProviderPanel() {
    const { project, updateEntity, addEntity, removeEntity, canEdit } = useProject();
    const [query, setQuery] = useState("");
    if (!project)
        return null;
    const providers = project.providers.filter(provider => `${provider.role} ${provider.name || ""}`.toLowerCase().includes(query.toLowerCase()));
    return <div className="mx-auto max-w-4xl space-y-4"><div className="flex gap-2"><label className="flex flex-1 items-center gap-2 rounded-full border border-foreground/10 px-3"><Search className="h-3.5 w-3.5"/><input value={query} onChange={e => setQuery(e.target.value)} className="w-full bg-transparent py-2 text-sm outline-none" placeholder="Rechercher un professionnel…"/></label>{canEdit && <button onClick={() => addEntity("providers", { role: "Nouveau poste", category: "autre", status: "recherche" })} className="rounded-full border border-foreground/15 px-3 text-xs"><Plus className="mr-1 inline h-3 w-3"/>Ajouter</button>}</div>
    <div className="grid gap-3 md:grid-cols-2">{providers.map(provider => {
            const journey = project.timeline.filter(event => event.relations?.some(relation => relation.kind === "provider" && relation.id === provider.id));
            const payments = project.payments.filter(payment => payment.providerId === provider.id);
            const documents = project.documents.filter(document => document.providerId === provider.id);
            return <div key={provider.id} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4"><div className="flex gap-2"><div className="flex-1"><input disabled={!canEdit} value={provider.role} onChange={e => updateEntity("providers", provider.id, { role: e.target.value })} className="w-full bg-transparent text-[10px] uppercase tracking-widest text-foreground/45 outline-none"/><input disabled={!canEdit} value={provider.name || ""} onChange={e => updateEntity("providers", provider.id, { name: e.target.value })} placeholder="Nom" className="mt-1 w-full bg-transparent text-base outline-none"/></div>{canEdit && <button onClick={() => removeEntity("providers", provider.id)}><Trash2 className="h-4 w-4 text-foreground/25"/></button>}</div>
        <div className="mt-3 grid grid-cols-2 gap-2"><select disabled={!canEdit} value={provider.status} onChange={e => updateEntity("providers", provider.id, { status: e.target.value })} className="rounded-lg bg-foreground/10 p-2 text-xs"><option value="recherche">À trouver</option><option value="contacte">Contact pris</option><option value="devis">Prix reçu</option><option value="reserve">Confirmé</option></select><input disabled={!canEdit} value={provider.nextAction || ""} onChange={e => updateEntity("providers", provider.id, { nextAction: e.target.value })} placeholder="À faire ensuite" className="rounded-lg bg-foreground/10 p-2 text-xs outline-none"/></div>
        <div className="mt-3 border-t border-foreground/5 pt-3"><p className="text-[9px] uppercase tracking-widest text-foreground/35">Suivi · {payments.length} paiement(s) · {documents.length} document(s)</p><div className="mt-2 space-y-1">{journey.length ? journey.map(event => <p key={event.id} className="text-xs text-foreground/55">{new Date(event.time).toLocaleString("fr-FR")} · {event.title}{event.location ? ` · ${event.location}` : ""}</p>) : <p className="text-xs text-foreground/30">Aucun moment prévu avec ce professionnel.</p>}</div></div>
      </div>;
        })}</div>
  </div>;
}
//# sourceMappingURL=ProviderPanel.jsx.map