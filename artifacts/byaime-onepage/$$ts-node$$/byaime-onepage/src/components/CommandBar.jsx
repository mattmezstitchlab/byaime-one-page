import { useEffect, useState } from "react";
import { useProject } from "@/store/project-store";
import { executeCommand, parseFrenchCommand, proposeCommand } from "@/lib/command-agent";
import { CenteredBlock } from "@/components/CenteredBlock";
const contextCopy = {
    profile: {
        label: "Profil",
        description: "AIME comprend votre Profil comme une projection du Monde actif. Elle peut vérifier les informations reliées sans transformer le Profil en espace d’organisation.",
    },
    world: {
        label: "Monde",
        description: "AIME comprend le Monde actif, vérifie votre demande et demande votre accord avant tout changement.",
    },
    network: {
        label: "Carte",
        description: "AIME garde le contexte des personnes et des Mondes reliés. Elle n’invente ni relation ni localisation et agit seulement sur les données confirmées du Monde actif.",
    },
    laboratory: {
        label: "Laboratoire",
        description: "Le Laboratoire recueille vos retours volontaires sans se confondre avec la boîte « À vérifier » d’AIME.",
    },
};
export function CommandBar({ context = "world" }) {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [proposal, setProposal] = useState();
    const [error, setError] = useState("");
    const [result, setResult] = useState("");
    const [notification, setNotification] = useState();
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [scheduleAt, setScheduleAt] = useState("");
    const [notificationBusy, setNotificationBusy] = useState(false);
    const { project, updateProject, canEdit } = useProject();
    useEffect(() => {
        const listener = (event) => { if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            setOpen(value => !value);
        } };
        const openAI = () => setOpen(true);
        document.addEventListener("keydown", listener);
        window.addEventListener("aime:open-ai", openAI);
        return () => {
            document.removeEventListener("keydown", listener);
            window.removeEventListener("aime:open-ai", openAI);
        };
    }, []);
    const inspect = () => {
        if (!project)
            return;
        setError("");
        setResult("");
        setProposal(undefined);
        const command = parseFrenchCommand(input);
        if (!command) {
            setError("AIME n’a pas compris cette demande. Rien n’a été modifié.");
            return;
        }
        try {
            setProposal(proposeCommand(project, command));
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : "AIME ne peut pas vérifier cette demande pour le moment.");
        }
    };
    const execute = () => {
        if (!project || !proposal || (proposal.mutation && !canEdit))
            return;
        try {
            const output = executeCommand(project, proposal, true);
            updateProject(output.project);
            setResult(output.message);
            if (proposal.communication) {
                setNotification(proposal.communication);
                setSelectedRecipients(proposal.communication.audiences.flatMap(audience => audience.email ? [audience.email] : []));
            }
            setProposal(undefined);
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : "Cette action n’a pas pu être réalisée.");
        }
    };
    const sendNotification = async () => {
        if (!notification || !project || !selectedRecipients.length || !notification.subject.trim() || !notification.body.trim())
            return;
        setNotificationBusy(true);
        setError("");
        try {
            const response = await fetch(`/api/projects/${project.id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    kind: "event_change",
                    timelineEventId: notification.eventId,
                    recipients: selectedRecipients,
                    subject: notification.subject.trim(),
                    body: notification.body.trim(),
                    ...(scheduleAt ? { scheduledAt: new Date(scheduleAt).toISOString() } : {}),
                    confirmed: true,
                }),
            });
            const delivery = await response.json().catch(() => ({}));
            if (!response.ok) {
                setError(delivery?.providerError || delivery?.error || "Le message n’a pas pu être enregistré.");
                return;
            }
            setResult(delivery.status === "scheduled"
                ? `Rappel programmé pour ${new Date(delivery.scheduledAt).toLocaleString("fr-FR")}. Vous pourrez l’annuler ou le replanifier dans Messages.`
                : `Message confirmé et envoyé à ${selectedRecipients.length} destinataire${selectedRecipients.length > 1 ? "s" : ""}.`);
            setNotification(undefined);
            setSelectedRecipients([]);
            setScheduleAt("");
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : "Le message n’a pas pu être envoyé.");
        }
        finally {
            setNotificationBusy(false);
        }
    };
    if (!open)
        return null;
    const currentContext = contextCopy[context];
    if (!project) {
        return <CenteredBlock eyebrow={`AI · ${currentContext.label}`} title="Commençons par un Monde" description="AIME pourra vous aider dès qu’un Monde réunira les informations à comprendre, vérifier ou transformer." onClose={() => setOpen(false)}>
      <p className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-5 text-sm font-light leading-relaxed text-foreground/60">Utilisez le + permanent pour commencer votre premier Monde. Rien ne sera créé ni modifié sans une action explicite de votre part.</p>
    </CenteredBlock>;
    }
    return <>
    <CenteredBlock eyebrow={`AI · ${currentContext.label}`} title="Que souhaitez-vous faire ?" description={currentContext.description} onClose={() => setOpen(false)} size="lg">
        <form onSubmit={event => { event.preventDefault(); inspect(); }} className="mt-5 flex gap-2"><input autoFocus value={input} onChange={event => setInput(event.target.value)} placeholder="Décaler la cérémonie de 15 minutes…" className="min-w-0 flex-1 rounded-xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/30"/><button className="rounded-xl bg-foreground px-4 text-sm text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50">Vérifier</button></form>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">{["Voir les tâches restantes", "Repérer les horaires qui se chevauchent", "Vérifier les besoins alimentaires", "Préparer le programme des professionnels", "Ajouter 2 invités"].map(example => <button key={example} onClick={() => setInput(example)} className="text-[10px] uppercase tracking-[.12em] text-foreground/40 transition hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 rounded px-1">{example}</button>)}</div>
        {error && <p className="mt-4 border-l border-destructive/50 py-1 pl-3 text-sm text-destructive/90">{error}</p>}
        {result && <p className="mt-4 border-l border-foreground/30 py-1 pl-3 text-sm text-foreground/80">{result}</p>}
        {proposal && <div className="mt-4 rounded-xl border border-border bg-foreground/5 p-4"><p className="font-medium text-foreground">{proposal.title}</p><ul className="mt-3 space-y-1 text-xs text-foreground/60">{proposal.impact.length ? proposal.impact.map((line, index) => <li key={index}>• {line}</li>) : <li>Aucun élément concerné.</li>}</ul>
          {proposal.mutation ? <div className="mt-4"><p className="mb-2 text-xs text-foreground/50">Rien ne changera sans votre accord.</p><button disabled={!canEdit} onClick={execute} className="rounded-full bg-foreground px-4 py-2 text-xs text-background disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50">{canEdit ? "Oui, faire ce changement" : "Vous pouvez consulter, mais pas modifier"}</button></div> : <p className="mt-4 text-xs text-foreground/40">Aucune information n’a été modifiée.</p>}
        </div>}
         {notification && <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4">
           <p className="font-medium text-foreground">Prévenir les personnes concernées</p>
           <p className="mt-1 text-xs leading-relaxed text-foreground/55">Le changement est enregistré. Vérifiez maintenant le contenu et les destinataires : aucun message ne partira sans cette seconde confirmation.</p>
           <div className="mt-4 space-y-2">
             {notification.audiences.map(audience => audience.email
                ? <label key={`${audience.kind}:${audience.id}:${audience.email}`} className="flex items-start gap-2 rounded-lg border border-foreground/10 px-3 py-2 text-xs">
                   <input type="checkbox" checked={selectedRecipients.includes(audience.email)} onChange={() => setSelectedRecipients(current => current.includes(audience.email) ? current.filter(email => email !== audience.email) : [...current, audience.email])} className="mt-0.5 accent-white"/>
                   <span><span className="block text-foreground/80">{audience.label}</span><span className="block text-foreground/45">{audience.email} · {audience.reason}</span></span>
                 </label>
                : <div key={`${audience.kind}:${audience.id}`} className="rounded-lg border border-amber-300/15 px-3 py-2 text-xs text-amber-100/70">{audience.label} · aucune adresse e-mail vérifiable ({audience.reason})</div>)}
             {!notification.audiences.length && <p className="text-xs text-foreground/45">Aucune personne reliée avec un contact vérifiable. Le changement reste enregistré, mais aucun envoi n’est proposé.</p>}
           </div>
           <label className="mt-4 block text-[10px] uppercase tracking-[.12em] text-foreground/45">Objet<input value={notification.subject} onChange={event => setNotification(current => current ? { ...current, subject: event.target.value } : current)} className="mt-2 w-full rounded-lg border border-foreground/10 bg-background/20 px-3 py-2 text-sm normal-case tracking-normal outline-none focus:border-foreground/30"/></label>
           <label className="mt-3 block text-[10px] uppercase tracking-[.12em] text-foreground/45">Message<textarea value={notification.body} onChange={event => setNotification(current => current ? { ...current, body: event.target.value } : current)} rows={5} className="mt-2 w-full resize-y rounded-lg border border-foreground/10 bg-background/20 px-3 py-2 text-sm normal-case tracking-normal outline-none focus:border-foreground/30"/></label>
           <label className="mt-3 block text-[10px] uppercase tracking-[.12em] text-foreground/45">Programmer (facultatif)<input type="datetime-local" value={scheduleAt} onChange={event => setScheduleAt(event.target.value)} min={new Date().toISOString().slice(0, 16)} className="mt-2 rounded-lg border border-foreground/10 bg-background/20 px-3 py-2 text-sm normal-case tracking-normal outline-none focus:border-foreground/30"/></label>
           <div className="mt-4 flex flex-wrap gap-2">
             <button type="button" disabled={notificationBusy} onClick={() => { setNotification(undefined); setSelectedRecipients([]); setScheduleAt(""); }} className="rounded-full border border-foreground/10 px-3 py-2 text-xs text-foreground/55">Pas maintenant</button>
             <button type="button" disabled={notificationBusy || !selectedRecipients.length || !notification.subject.trim() || !notification.body.trim()} onClick={() => void sendNotification()} className="rounded-full bg-foreground px-4 py-2 text-xs text-background disabled:opacity-35">{notificationBusy ? "Enregistrement…" : scheduleAt ? "Confirmer et programmer" : "Confirmer et envoyer"}</button>
           </div>
         </div>}
    </CenteredBlock>
  </>;
}
//# sourceMappingURL=CommandBar.jsx.map