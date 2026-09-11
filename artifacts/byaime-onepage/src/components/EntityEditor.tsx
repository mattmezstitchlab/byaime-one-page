import { format } from "date-fns";
import { User, Folder, Network, MapPin, Globe, ImageIcon, Lock, Globe2, Users, Calendar } from "lucide-react";
import { CenteredBlock } from "./CenteredBlock";
import { VisualImportControl } from "./VisualImportControl";
import { cn } from "@/lib/utils";

export function EntityEditor({ node, onClose, project, updateProject, updateEntity, openUserProfile, currentRole, canEdit }: any) {
  const inputClass = "w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-foreground/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const selectClass = "w-full bg-background border border-foreground/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-foreground/30 transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed";

  if (node.type === "identity") {
    return (
      <CenteredBlock eyebrow="Édition" title="Identité du Profil" onClose={onClose} leading={<User className="mt-4 w-6 h-6 text-foreground/50" />}>
         <div className="space-y-8 mt-4">
            <div className="p-6 rounded-2xl bg-foreground/[0.03] border border-foreground/10 flex items-center justify-between">
               <div>
                  <p className="text-sm font-medium text-foreground">Nom et Avatar</p>
                  <p className="text-xs text-foreground/40 mt-1">Gérés de manière centralisée par votre compte AIME.</p>
               </div>
               <button onClick={() => { onClose(); openUserProfile(); }} className="px-4 py-2 rounded-full bg-foreground/10 text-xs font-medium hover:bg-foreground/20 transition-colors text-foreground">
                  Gérer l'identité
               </button>
            </div>

            {currentRole === "owner" ? <div className="pt-6 border-t border-foreground/10">
               <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-4">Visibilité de la page (Profil)</label>
               <div className="flex items-center gap-3">
                  <button 
                     onClick={() => updateProject({ publicProfile: { published: false } })}
                     className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all",
                        !project.publicProfile?.published ? "bg-foreground/10 border-foreground/30 text-foreground" : "bg-transparent border-foreground/10 text-foreground/40 hover:bg-foreground/5"
                     )}
                  >
                     <Lock className="w-4 h-4" /> Privé
                  </button>
                  <button 
                     onClick={() => updateProject({ publicProfile: { published: true } })}
                     className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all",
                        project.publicProfile?.published ? "bg-foreground/10 border-foreground/30 text-foreground" : "bg-transparent border-foreground/10 text-foreground/40 hover:bg-foreground/5"
                     )}
                  >
                     <Globe2 className="w-4 h-4" /> Public
                  </button>
               </div>
            </div> : <div className="border-t border-foreground/10 pt-6 text-sm font-light leading-relaxed text-foreground/42">La publication publique de cette Page reste sous le contrôle de son propriétaire.</div>}
         </div>
      </CenteredBlock>
    );
  }

  if (node.id === "worlds" || node.collection === "project") {
    return (
      <CenteredBlock eyebrow="Édition" title="Le Monde" onClose={onClose} leading={<Globe className="mt-4 w-6 h-6 text-foreground/50" />}>
         <div className="space-y-6 mt-4">
            <div>
               <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Titre du Monde</label>
               <input 
                  type="text" 
                  className={inputClass}
                  defaultValue={project.title}
                  disabled={!canEdit}
                  onBlur={(e) => updateProject({ title: e.target.value })}
               />
            </div>
            <div>
                <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Sous-titre du Monde</label>
               <input 
                  type="text" 
                  className={inputClass}
                  defaultValue={project.subtitle || ""}
                  disabled={!canEdit}
                  onBlur={(e) => updateProject({ subtitle: e.target.value })}
               />
            </div>
            <div>
                <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Date pivot du Monde</label>
               <input 
                  type="date" 
                  className={inputClass}
                  defaultValue={project.pivot?.value ? format(project.pivot.value, "yyyy-MM-dd") : ""}
                  disabled={!canEdit}
                  onChange={(e) => {
                     if (e.target.value) {
                        updateProject({ pivot: { ...project.pivot, value: new Date(e.target.value).getTime() } });
                     }
                  }}
               />
            </div>
         </div>
      </CenteredBlock>
    );
  }

  if (node.id === "map") {
    return (
      <CenteredBlock eyebrow="Édition" title="Carte & Lieux" onClose={onClose} leading={<MapPin className="mt-4 w-6 h-6 text-foreground/50" />}>
         <div className="space-y-6 mt-4">
            <div>
                <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Ville du Monde</label>
               <input 
                  type="text" 
                  className={inputClass}
                  defaultValue={project.city?.value || ""}
                  disabled={!canEdit}
                  onBlur={(e) => updateProject({ city: { ...project.city, value: e.target.value || null } })}
               />
            </div>
            <div>
                <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Lieu principal</label>
               <input 
                  type="text" 
                  className={inputClass}
                  defaultValue={project.venue?.value || ""}
                  disabled={!canEdit}
                  onBlur={(e) => updateProject({ venue: { ...project.venue, value: e.target.value || null } })}
               />
            </div>
         </div>
      </CenteredBlock>
    );
  }

  if (node.type === "item" && node.collection === "timeline") {
     const event = node.sourceRef;
     return (
       <CenteredBlock eyebrow="Édition du Moment" title={event.title} onClose={onClose} leading={<Calendar className="mt-4 w-6 h-6 text-foreground/50" />}>
         <div className="space-y-6 mt-4">
            <div>
               <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Titre du moment</label>
               <input 
                  type="text" 
                  className={inputClass}
                  defaultValue={event.title}
                  disabled={!canEdit}
                  onBlur={(e) => updateEntity("timeline", event.id, { title: e.target.value })}
               />
            </div>
            <div>
               <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Détails et références</label>
               <textarea 
                  className={cn(inputClass, "min-h-[100px] resize-none")}
                  defaultValue={event.detail || ""}
                  disabled={!canEdit}
                  onBlur={(e) => updateEntity("timeline", event.id, { detail: e.target.value })}
               />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Date</label>
                  <input 
                     type="date" 
                     className={inputClass}
                     defaultValue={event.time ? format(event.time, "yyyy-MM-dd") : ""}
                     disabled={!canEdit}
                     onChange={(e) => {
                        if (e.target.value) {
                           updateEntity("timeline", event.id, { time: new Date(e.target.value).getTime() });
                        }
                     }}
                  />
               </div>
               <div>
                  <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Lieu</label>
                  <input 
                     type="text" 
                     className={inputClass}
                     defaultValue={event.location || ""}
                     disabled={!canEdit}
                     onBlur={(e) => updateEntity("timeline", event.id, { location: e.target.value })}
                  />
               </div>
            </div>

            <div className="pt-6 border-t border-foreground/10">
               <VisualImportControl
                 label="Visuel du Moment"
                 value={event.visual}
                 disabled={!canEdit}
                 onChange={visual => updateEntity("timeline", event.id, { visual })}
               />
            </div>

            {canEdit && (
               <div className="pt-6 border-t border-foreground/10">
                  <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-4">Visibilité (Timeline)</label>
                  <div className="flex items-center gap-2 bg-foreground/5 p-1 rounded-xl border border-foreground/10">
                     {["prive", "equipe", "audience"].map(v => (
                        <button
                           key={v}
                           onClick={() => updateEntity("timeline", event.id, { visibility: v })}
                           className={cn(
                              "flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex justify-center items-center gap-2",
                              event.visibility === v ? "bg-foreground/15 text-foreground shadow-sm" : "text-foreground/40 hover:text-foreground/80"
                           )}
                        >
                           {v === "prive" ? <Lock className="w-3.5 h-3.5" /> : v === "equipe" ? <Users className="w-3.5 h-3.5" /> : <Globe2 className="w-3.5 h-3.5" />}
                           {v === "prive" ? "Privé" : v === "equipe" ? "Réseau" : "Public"}
                        </button>
                     ))}
                  </div>
               </div>
            )}
         </div>
       </CenteredBlock>
     );
  }

  if (node.type === "item" && node.collection === "documents") {
     const doc = node.sourceRef;
     return (
        <CenteredBlock eyebrow="Édition Archive" title={doc.title} onClose={onClose} leading={<Folder className="mt-4 w-6 h-6 text-foreground/50" />}>
           <div className="space-y-6 mt-4">
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Titre</label>
                 <input 
                    type="text" 
                    className={inputClass}
                    defaultValue={doc.title}
                    disabled={!canEdit}
                    onBlur={(e) => updateEntity("documents", doc.id, { title: e.target.value })}
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Type</label>
                    <select 
                       className={selectClass}
                       defaultValue={doc.kind}
                       disabled={!canEdit}
                       onChange={(e) => updateEntity("documents", doc.id, { kind: e.target.value })}
                    >
                       <option value="devis">Devis</option>
                       <option value="contrat">Contrat</option>
                       <option value="facture">Facture</option>
                       <option value="autre">Autre</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Date</label>
                    <input 
                       type="date" 
                       className={inputClass}
                       defaultValue={doc.at ? format(doc.at, "yyyy-MM-dd") : ""}
                       disabled={!canEdit}
                       onChange={(e) => {
                          if (e.target.value) {
                             updateEntity("documents", doc.id, { at: new Date(e.target.value).getTime() });
                          }
                       }}
                    />
                 </div>
              </div>
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">URL (Lien externe)</label>
                 <input 
                    type="url" 
                    className={inputClass}
                    defaultValue={doc.url || ""}
                    disabled={!canEdit}
                    onBlur={(e) => updateEntity("documents", doc.id, { url: e.target.value })}
                    placeholder="https://..."
                 />
              </div>
           </div>
        </CenteredBlock>
     );
  }

  if (node.type === "item" && node.collection === "payments") {
     const payment = node.sourceRef;
     return (
        <CenteredBlock eyebrow="Édition Finance" title={payment.label} onClose={onClose} leading={<Folder className="mt-4 w-6 h-6 text-foreground/50" />}>
           <div className="space-y-6 mt-4">
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Libellé</label>
                 <input type="text" className={inputClass} defaultValue={payment.label} disabled={!canEdit} onBlur={(e) => updateEntity("payments", payment.id, { label: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Montant</label>
                    <input type="number" min="0" step="0.01" className={inputClass} defaultValue={payment.amountCents / 100} disabled={!canEdit} onBlur={(e) => updateEntity("payments", payment.id, { amountCents: Math.round(Number(e.target.value || 0) * 100) })} />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">État</label>
                    <select className={selectClass} defaultValue={payment.state} disabled={!canEdit} onChange={(e) => updateEntity("payments", payment.id, { state: e.target.value })}>
                       <option value="du">À régler</option>
                       <option value="paye">Payé</option>
                    </select>
                 </div>
              </div>
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Date</label>
                 <input type="date" className={inputClass} defaultValue={payment.at ? format(payment.at, "yyyy-MM-dd") : ""} disabled={!canEdit} onChange={(e) => e.target.value && updateEntity("payments", payment.id, { at: new Date(e.target.value).getTime() })} />
              </div>
           </div>
        </CenteredBlock>
     );
  }

  if (node.type === "item" && node.collection === "guests") {
     const guest = node.sourceRef;
     return (
        <CenteredBlock eyebrow="Édition Réseau" title={guest.name} onClose={onClose} leading={<Network className="mt-4 w-6 h-6 text-foreground/50" />}>
           <div className="space-y-6 mt-4">
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Nom</label>
                 <input 
                    type="text" 
                    className={inputClass}
                    defaultValue={guest.name}
                    disabled={!canEdit}
                    onBlur={(e) => updateEntity("guests", guest.id, { name: e.target.value })}
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Contact (Email/Tel)</label>
                    <input 
                       type="text" 
                       className={inputClass}
                       defaultValue={guest.contact || ""}
                       disabled={!canEdit}
                       onBlur={(e) => updateEntity("guests", guest.id, { contact: e.target.value })}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Rôle</label>
                    <select 
                       className={selectClass}
                       defaultValue={guest.role}
                       disabled={!canEdit}
                       onChange={(e) => updateEntity("guests", guest.id, { role: e.target.value })}
                    >
                       <option value="marie">Marié(e)</option>
                       <option value="temoin">Témoin</option>
                       <option value="famille">Famille</option>
                       <option value="invite">Invité(e)</option>
                       <option value="enfant">Enfant</option>
                    </select>
                 </div>
              </div>
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Notes</label>
                 <textarea 
                    className={cn(inputClass, "min-h-[80px] resize-none")}
                    defaultValue={guest.notes || ""}
                    disabled={!canEdit}
                    onBlur={(e) => updateEntity("guests", guest.id, { notes: e.target.value })}
                 />
              </div>
           </div>
        </CenteredBlock>
     );
  }

  if (node.type === "item" && node.collection === "memories") {
     const memory = node.sourceRef;
     return (
        <CenteredBlock eyebrow="Édition Média" title={memory.title} onClose={onClose} leading={<ImageIcon className="mt-4 w-6 h-6 text-foreground/50" />}>
           <div className="space-y-6 mt-4">
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Titre</label>
                 <input 
                    type="text" 
                    className={inputClass}
                    defaultValue={memory.title}
                    disabled={!canEdit}
                    onBlur={(e) => updateEntity("memories", memory.id, { title: e.target.value })}
                 />
              </div>
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-2">Notes</label>
                 <textarea 
                    className={cn(inputClass, "min-h-[100px] resize-none")}
                    defaultValue={memory.notes || ""}
                    disabled={!canEdit}
                    onBlur={(e) => updateEntity("memories", memory.id, { notes: e.target.value })}
                 />
              </div>
           </div>
        </CenteredBlock>
     );
  }

  return (
    <CenteredBlock eyebrow="Détails" title={node.label || "Élément"} onClose={onClose}>
      <p className="mt-4 text-sm text-foreground/60 font-light">Cet élément ne peut pas être modifié dans cette vue.</p>
    </CenteredBlock>
  );
}
