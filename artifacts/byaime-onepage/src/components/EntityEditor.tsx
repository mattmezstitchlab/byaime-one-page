import { format } from "date-fns";
import { User, Folder, Network, MapPin, Globe, ImageIcon, Lock, Globe2, Users, Calendar } from "lucide-react";
import { CenteredBlock } from "./CenteredBlock";
import { VisualImportControl } from "./VisualImportControl";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { WORLD_MEDIA_CHOICES } from "@/lib/world-visuals";

/*
 * L'éditeur d'élément (Moment, invité, document, paiement, prestataire,
 * souvenir, Monde, identité). Chaque chaîne passe par le dictionnaire FR/EN
 * (préfixe `ed.`) — mots simples, pas de jargon technique.
 */
export function EntityEditor({ node, onClose, project, updateProject, updateEntity, openUserProfile, currentRole, canEdit }: any) {
  const { t } = useI18n();
  const inputClass = "w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:border-foreground/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const selectClass = "w-full bg-background border border-foreground/10 rounded-xl px-4 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:border-foreground/30 transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClass = "text-[10px] uppercase tracking-widest text-foreground/50 block mb-2";

  if (node.type === "identity") {
    return (
      <CenteredBlock eyebrow={t("ed.edit")} title={t("ed.identity.title")} onClose={onClose} leading={<User className="mt-4 w-6 h-6 text-foreground/50" />}>
         <div className="space-y-8 mt-4">
            <div className="p-6 rounded-2xl bg-foreground/[0.03] border border-foreground/10 flex items-center justify-between">
               <div>
                  <p className="text-sm font-medium text-foreground">{t("ed.identity.nameAvatar")}</p>
                  <p className="text-xs text-foreground/40 mt-1">{t("ed.identity.managed")}</p>
               </div>
               <button onClick={() => { onClose(); openUserProfile(); }} className="px-4 py-2 rounded-full bg-foreground/10 text-xs font-medium hover:bg-foreground/20 transition-colors text-foreground">
                  {t("ed.identity.manage")}
               </button>
            </div>

            {currentRole === "owner" ? <div className="pt-6 border-t border-foreground/10">
               <label className={labelClass + " mb-4"}>{t("ed.identity.visibility")}</label>
               <div className="flex items-center gap-3">
                  <button 
                     onClick={() => updateProject({ publicProfile: { published: false } })}
                     className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all",
                        !project.publicProfile?.published ? "bg-foreground/10 border-foreground/30 text-foreground" : "bg-transparent border-foreground/10 text-foreground/40 hover:bg-foreground/5"
                     )}
                  >
                     <Lock className="w-4 h-4" /> {t("ed.private")}
                  </button>
                  <button 
                     onClick={() => updateProject({ publicProfile: { published: true } })}
                     className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all",
                        project.publicProfile?.published ? "bg-foreground/10 border-foreground/30 text-foreground" : "bg-transparent border-foreground/10 text-foreground/40 hover:bg-foreground/5"
                     )}
                  >
                     <Globe2 className="w-4 h-4" /> {t("ed.public")}
                  </button>
               </div>
            </div> : <div className="border-t border-foreground/10 pt-6 text-sm font-light leading-relaxed text-foreground/42">{t("ed.identity.ownerControl")}</div>}
         </div>
      </CenteredBlock>
    );
  }

  if (node.id === "worlds" || node.collection === "project") {
    return (
      <CenteredBlock eyebrow={t("ed.edit")} title={t("ed.world.title")} onClose={onClose} leading={<Globe className="mt-4 w-6 h-6 text-foreground/50" />}>
         <div className="space-y-6 mt-4">
            <div>
               <label className={labelClass}>{t("ed.world.titleField")}</label>
               <input 
                  type="text" 
                  className={inputClass}
                  defaultValue={project.title}
                  disabled={!canEdit}
                  onBlur={(e) => updateProject({ title: e.target.value })}
               />
            </div>
            <div>
                <label className={labelClass}>{t("ed.world.subtitle")}</label>
               <input 
                  type="text" 
                  className={inputClass}
                  defaultValue={project.subtitle || ""}
                  disabled={!canEdit}
                  onBlur={(e) => updateProject({ subtitle: e.target.value })}
               />
            </div>
            <div>
                <label className={labelClass}>{t("ed.world.date")}</label>
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
      <CenteredBlock eyebrow={t("ed.edit")} title={t("ed.map.title")} onClose={onClose} leading={<MapPin className="mt-4 w-6 h-6 text-foreground/50" />}>
         <div className="space-y-6 mt-4">
            <div>
                <label className={labelClass}>{t("ed.map.city")}</label>
               <input 
                  type="text" 
                  className={inputClass}
                  defaultValue={project.city?.value || ""}
                  disabled={!canEdit}
                  onBlur={(e) => updateProject({ city: { ...project.city, value: e.target.value || null } })}
               />
            </div>
            <div>
                <label className={labelClass}>{t("ed.map.venue")}</label>
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
     if (event.id.startsWith("card-presence:")) return <CenteredBlock eyebrow={t("ed.presence.eyebrow")} title={event.title} onClose={onClose}><p className="mt-4 text-sm">{event.detail}</p><p className="mt-3 text-sm">{t("ed.presence.text")}</p></CenteredBlock>;
     return (
       <CenteredBlock eyebrow={t("ed.moment.eyebrow")} title={event.title} onClose={onClose} leading={<Calendar className="mt-4 w-6 h-6 text-foreground/50" />}>
         <div className="space-y-6 mt-4">
            <div>
               <label className={labelClass}>{t("ed.title")}</label>
               <input 
                  type="text" 
                  className={inputClass}
                  defaultValue={event.title}
                  disabled={!canEdit}
                  onBlur={(e) => updateEntity("timeline", event.id, { title: e.target.value })}
               />
            </div>
            <div>
               <label className={labelClass}>{t("ed.moment.details")}</label>
               <textarea 
                  className={cn(inputClass, "min-h-[100px] resize-none")}
                  defaultValue={event.detail || ""}
                  disabled={!canEdit}
                  onBlur={(e) => updateEntity("timeline", event.id, { detail: e.target.value })}
               />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className={labelClass}>{t("ed.date")}</label>
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
                  <label className={labelClass}>{t("ed.map.venue")}</label>
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
                 label={t("ed.moment.visual")}
                 value={event.visual}
                 disabled={!canEdit}
                 onChange={visual => updateEntity("timeline", event.id, { visual })}
                 choices={WORLD_MEDIA_CHOICES}
                 choicesLabel={t("world.hero.visual.choices")}
               />
            </div>

            {canEdit && (
               <div className="pt-6 border-t border-foreground/10">
                  <label className={labelClass + " mb-4"}>{t("ed.moment.visibility")}</label>
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
                           {v === "prive" ? t("ed.moment.visibility.private") : v === "equipe" ? t("ed.moment.visibility.circle") : t("ed.moment.visibility.public")}
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
        <CenteredBlock eyebrow={t("ed.doc.eyebrow")} title={doc.title} onClose={onClose} leading={<Folder className="mt-4 w-6 h-6 text-foreground/50" />}>
           <div className="space-y-6 mt-4">
              <div>
                 <label className={labelClass}>{t("ed.title")}</label>
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
                    <label className={labelClass}>{t("ed.type")}</label>
                    <select 
                       className={selectClass}
                       defaultValue={doc.kind}
                       disabled={!canEdit}
                       onChange={(e) => updateEntity("documents", doc.id, { kind: e.target.value })}
                    >
                       <option value="devis">{t("ed.doc.quote")}</option>
                       <option value="contrat">{t("ed.doc.contract")}</option>
                       <option value="facture">{t("ed.doc.invoice")}</option>
                       <option value="autre">{t("ed.doc.other")}</option>
                    </select>
                 </div>
                 <div>
                    <label className={labelClass}>{t("ed.date")}</label>
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
                 <label className={labelClass}>{t("ed.link")}</label>
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
        <CenteredBlock eyebrow={t("ed.payment.eyebrow")} title={payment.label} onClose={onClose} leading={<Folder className="mt-4 w-6 h-6 text-foreground/50" />}>
           <div className="space-y-6 mt-4">
              <div>
                 <label className={labelClass}>{t("ed.payment.name")}</label>
                 <input type="text" className={inputClass} defaultValue={payment.label} disabled={!canEdit} onBlur={(e) => updateEntity("payments", payment.id, { label: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className={labelClass}>{t("ed.payment.amount")}</label>
                    <input type="number" min="0" step="0.01" className={inputClass} defaultValue={payment.amountCents / 100} disabled={!canEdit} onBlur={(e) => updateEntity("payments", payment.id, { amountCents: Math.round(Number(e.target.value || 0) * 100) })} />
                 </div>
                 <div>
                    <label className={labelClass}>{t("ed.payment.state")}</label>
                    <select className={selectClass} defaultValue={payment.state} disabled={!canEdit} onChange={(e) => updateEntity("payments", payment.id, { state: e.target.value })}>
                       <option value="du">{t("ed.payment.toPay")}</option>
                       <option value="paye">{t("ed.payment.paid")}</option>
                    </select>
                 </div>
              </div>
              <div>
                 <label className={labelClass}>{t("ed.date")}</label>
                 <input type="date" className={inputClass} defaultValue={payment.at ? format(payment.at, "yyyy-MM-dd") : ""} disabled={!canEdit} onChange={(e) => e.target.value && updateEntity("payments", payment.id, { at: new Date(e.target.value).getTime() })} />
              </div>
           </div>
        </CenteredBlock>
     );
  }

  if (node.type === "item" && node.collection === "guests") {
     const guest = node.sourceRef;
     return (
        <CenteredBlock eyebrow={t("ed.guest.eyebrow")} title={guest.name} onClose={onClose} leading={<Network className="mt-4 w-6 h-6 text-foreground/50" />}>
           <div className="space-y-6 mt-4">
              <div>
                 <label className={labelClass}>{t("ed.name")}</label>
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
                    <label className={labelClass}>{t("ed.contact")}</label>
                    <input 
                       type="text" 
                       className={inputClass}
                       defaultValue={guest.contact || ""}
                       disabled={!canEdit}
                       onBlur={(e) => updateEntity("guests", guest.id, { contact: e.target.value })}
                    />
                 </div>
                 <div>
                    <label className={labelClass}>{t("ed.guest.role")}</label>
                    <select 
                       className={selectClass}
                       defaultValue={guest.role}
                       disabled={!canEdit}
                       onChange={(e) => updateEntity("guests", guest.id, { role: e.target.value })}
                    >
                       <option value="marie">{t("ed.guest.role.marie")}</option>
                       <option value="temoin">{t("ed.guest.role.temoin")}</option>
                       <option value="famille">{t("ed.guest.role.famille")}</option>
                       <option value="invite">{t("ed.guest.role.invite")}</option>
                       <option value="enfant">{t("ed.guest.role.enfant")}</option>
                    </select>
                 </div>
              </div>
              <div>
                 <label className={labelClass}>{t("ed.notes")}</label>
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

  /*
   * La fiche prestataire. Les montants s'écrivent en euros et sont stockés
   * en centimes, comme partout.
   */
  if (node.type === "item" && node.collection === "providers") {
     const provider = node.sourceRef;
     const euro = (cents?: number) => (typeof cents === "number" ? cents / 100 : "");
     const toCents = (value: string) => {
        const parsed = Number(value);
        return value.trim() !== "" && Number.isFinite(parsed) ? Math.round(parsed * 100) : undefined;
     };
     return (
        <CenteredBlock eyebrow={t("ed.provider.eyebrow")} title={provider.name || provider.role} onClose={onClose} leading={<Users className="mt-4 w-6 h-6 text-foreground/50" />}>
           <div className="space-y-6 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                 <div>
                    <label className={labelClass}>{t("ed.name")}</label>
                    <input type="text" className={inputClass} defaultValue={provider.name || ""} disabled={!canEdit}
                       onBlur={(e) => updateEntity("providers", provider.id, { name: e.target.value })} />
                 </div>
                 <div>
                    <label className={labelClass}>{t("ed.provider.job")}</label>
                    <input type="text" className={inputClass} defaultValue={provider.role} disabled={!canEdit}
                       onBlur={(e) => updateEntity("providers", provider.id, { role: e.target.value })} />
                 </div>
                 <div>
                    <label className={labelClass}>{t("ed.provider.category")}</label>
                    <select className={selectClass} defaultValue={provider.category} disabled={!canEdit}
                       onChange={(e) => updateEntity("providers", provider.id, { category: e.target.value })}>
                       {["lieu", "traiteur", "photo", "video", "fleuriste", "musique", "officiant", "tenue", "beaute", "papeterie", "transport", "hebergement", "autre"].map(category => (
                          <option key={category} value={category}>{t(`ed.provider.cat.${category}` as never)}</option>
                       ))}
                    </select>
                 </div>
                 <div>
                    <label className={labelClass}>{t("ed.provider.status")}</label>
                    <select className={selectClass} defaultValue={provider.status} disabled={!canEdit}
                       onChange={(e) => updateEntity("providers", provider.id, { status: e.target.value })}>
                       <option value="recherche">{t("ed.provider.status.recherche")}</option>
                       <option value="contacte">{t("ed.provider.status.contacte")}</option>
                       <option value="rencontre">{t("ed.provider.status.rencontre")}</option>
                       <option value="devis">{t("ed.provider.status.devis")}</option>
                       <option value="reserve">{t("ed.provider.status.reserve")}</option>
                    </select>
                 </div>
              </div>
              <div>
                 <label className={labelClass}>{t("ed.contact")}</label>
                 <input type="text" className={inputClass} defaultValue={provider.contact || ""} disabled={!canEdit}
                    onBlur={(e) => updateEntity("providers", provider.id, { contact: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                 <div>
                    <label className={labelClass}>{t("ed.provider.quote")}</label>
                    <input type="number" min="0" className={inputClass} defaultValue={euro(provider.amountCents)} disabled={!canEdit}
                       onBlur={(e) => updateEntity("providers", provider.id, { amountCents: toCents(e.target.value) })} />
                 </div>
                 <div>
                    <label className={labelClass}>{t("ed.provider.deposit")}</label>
                    <input type="number" min="0" className={inputClass} defaultValue={euro(provider.depositCents)} disabled={!canEdit}
                       onBlur={(e) => updateEntity("providers", provider.id, { depositCents: toCents(e.target.value) })} />
                 </div>
                 <div>
                    <label className={labelClass}>{t("ed.provider.paid")}</label>
                    <input type="number" min="0" className={inputClass} defaultValue={euro(provider.paidCents)} disabled={!canEdit}
                       onBlur={(e) => updateEntity("providers", provider.id, { paidCents: toCents(e.target.value) })} />
                 </div>
              </div>
              <div>
                 <label className={labelClass}>{t("ed.provider.nextAction")}</label>
                 <input type="text" className={inputClass} defaultValue={provider.nextAction || ""} disabled={!canEdit}
                    placeholder={t("ed.provider.nextAction.placeholder")}
                    onBlur={(e) => updateEntity("providers", provider.id, { nextAction: e.target.value })} />
              </div>
           </div>
        </CenteredBlock>
     );
  }
  if (node.type === "item" && node.collection === "memories") {
     const memory = node.sourceRef;
     return (
        <CenteredBlock eyebrow={t("ed.memory.eyebrow")} title={memory.title} onClose={onClose} leading={<ImageIcon className="mt-4 w-6 h-6 text-foreground/50" />}>
           <div className="space-y-6 mt-4">
              <div>
                 <label className={labelClass}>{t("ed.title")}</label>
                 <input 
                    type="text" 
                    className={inputClass}
                    defaultValue={memory.title}
                    disabled={!canEdit}
                    onBlur={(e) => updateEntity("memories", memory.id, { title: e.target.value })}
                 />
              </div>
              <div>
                 <label className={labelClass}>{t("ed.notes")}</label>
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
    <CenteredBlock eyebrow={t("ed.details")} title={node.label || t("ed.item")} onClose={onClose}>
      <p className="mt-4 text-sm text-foreground/60 font-light">{t("ed.notEditable")}</p>
    </CenteredBlock>
  );
}
