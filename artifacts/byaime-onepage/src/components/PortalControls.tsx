import { useEffect, useRef, useState } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { CloudAlert, CloudCheck, CloudOff, Download, LoaderCircle, PenLine, Upload } from 'lucide-react';
import { useProject } from '@/store/project-store';
import { trackEvent } from '@/lib/analytics';
import { Link } from 'wouter';
import { CenteredBlock } from './CenteredBlock';
import { auditTimelineConnections, buildTimelineIndex } from '@/lib/timeline-graph';

const labels = { local: 'Local', loading: 'Chargement…', saving: 'Enregistrement…', saved: 'Enregistré', error: 'Hors connexion', conflict: 'À vérifier' };

export function PortalControls() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { project, projects, selectProject, syncStatus, syncError, currentRole, canEdit, updateProject, importBackup, clearProject } = useProject();
  const [panel, setPanel] = useState<'settings' | 'editor' | 'sync' | 'invite' | 'message' | 'delete-file' | 'delete-project' | 'delete-account' | null>(null);
  const [notice, setNotice] = useState('');
  const [files, setFiles] = useState<{ id: string; name: string; contentType: string; size: number }[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('family');
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canManage = currentRole === 'owner' || currentRole === 'planner';
  useEffect(() => {
    const openMe = () => setPanel('settings');
    window.addEventListener('aime:open-me', openMe);
    return () => window.removeEventListener('aime:open-me', openMe);
  }, []);
  const api = async (path: string, init?: RequestInit) => {
    const response = await fetch(`/api${path}`, { ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } });
    const body = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || `Erreur ${response.status}`);
    return body;
  };
  useEffect(() => {
    if (panel !== 'settings' || !project) return;
    void api(`/projects/${project.id}/files`).then(setFiles).catch(error => setNotice(error.message));
  }, [panel, project?.id]);
  if (!project) return <button onClick={() => void signOut({ redirectUrl: basePath() })} className="fixed right-4 top-4 z-[60] rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs text-white backdrop-blur">Se déconnecter</button>;
  const download = (content: string, name: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    Object.assign(document.createElement('a'), { href: url, download: name }).click();
    URL.revokeObjectURL(url);
  };
  const exportCsv = () => {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    download(['Nom,Contact,RSVP,Régime,Table', ...project.guests.map(g => [g.name, g.contact, g.rsvp, g.dietary, g.tableId].map(quote).join(','))].join('\n'), 'invites-aime.csv', 'text/csv');
    trackEvent('project_exported', { format: 'csv' });
  };
  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setSubmitting(true);
    await api(`/projects/${project.id}/invitations`, { method: 'POST', body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }) });
    trackEvent('collaborator_invitation_sent');
    setNotice(`Invitation envoyée à ${inviteEmail.trim()}`);
    setInviteEmail('');
    setPanel('settings');
    setSubmitting(false);
  };
  const sendMessage = async () => {
    if (!recipients.trim() || !subject.trim() || !messageBody.trim()) return;
    setSubmitting(true);
    await api(`/projects/${project.id}/messages`, { method: 'POST', body: JSON.stringify({
      kind: 'practical_info', recipients: recipients.split(',').map(v => v.trim()).filter(Boolean), subject: subject.trim(), body: messageBody.trim(), confirmed: true,
    }) });
    trackEvent('message_sent');
    setNotice('Message envoyé');
    setRecipients('');
    setSubject('');
    setMessageBody('');
    setPanel('settings');
    setSubmitting(false);
  };
  const upload = async (file: File) => {
    const request = await api('/storage/uploads/request-url', { method: 'POST', body: JSON.stringify({ projectId: project.id, name: file.name, size: file.size, contentType: file.type }) });
    const uploaded = await fetch(request.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!uploaded.ok) throw new Error('Échec du transfert vers App Storage');
    await api('/storage/files', { method: 'POST', body: JSON.stringify({ projectId: project.id, name: file.name, size: file.size, contentType: file.type, objectPath: request.objectPath, finalizeToken: request.finalizeToken }) });
    setFiles(await api(`/projects/${project.id}/files`));
    trackEvent('file_added');
    setNotice(`${file.name} ajouté à l'espace privé`);
  };
  const SyncIcon = syncStatus === 'conflict' ? CloudAlert : syncStatus === 'error' ? CloudOff : syncStatus === 'loading' || syncStatus === 'saving' ? LoaderCircle : CloudCheck;
  const audit = auditTimelineConnections(project);
  const timelineIndex = buildTimelineIndex(project);
  const reviewCount = audit.isolated.length + audit.dangling.length + audit.manualMusic.length + (syncStatus === 'conflict' || syncStatus === 'error' ? 1 : 0);
  const isProfileRoute = window.location.pathname.endsWith('/profile');

  return <>
     <div data-testid="portal-controls" className="fixed top-4 right-4 z-[60] flex items-center gap-2">
          <button data-testid="sync-status" title={syncError || `${reviewCount} élément${reviewCount === 1 ? '' : 's'} à vérifier`} onClick={() => setPanel('sync')} className="group flex h-11 items-center gap-2.5 rounded-full bg-white px-4 text-black shadow-[0_8px_30px_rgba(255,255,255,.14)] transition hover:scale-[1.02] hover:shadow-[0_10px_38px_rgba(255,255,255,.22)]" aria-label={`${reviewCount} élément${reviewCount === 1 ? '' : 's'} à vérifier`}>
            <span className="relative grid h-5 w-5 place-items-center">
              {reviewCount > 0 && <span className="absolute inset-0 animate-ping rounded-full bg-black/12" />}
              <SyncIcon className={`relative h-3.5 w-3.5 ${syncStatus === 'loading' || syncStatus === 'saving' ? 'animate-spin' : ''}`} />
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[.18em]">À vérifier</span>
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-black px-1.5 text-[9px] font-semibold text-white">{reviewCount}</span>
          </button>
         {canEdit && <button data-testid="settings-open" onClick={() => isProfileRoute ? window.dispatchEvent(new Event('aime:toggle-profile-editor')) : setPanel('editor')} className="flex h-11 items-center gap-2 rounded-full border border-white/12 bg-black/70 px-4 text-white/60 backdrop-blur-xl transition hover:border-white/25 hover:text-white" aria-label={isProfileRoute ? 'Éditer le Profil' : 'Éditer le Monde'} title={isProfileRoute ? 'Éditer le Profil' : 'Éditer le Monde'}><PenLine className="h-3.5 w-3.5" /><span className="text-[9px] uppercase tracking-[.18em]">Éditer</span></button>}
    </div>
      {panel === 'sync' && <CenteredBlock eyebrow="Contrôle universel" title="Des changements sont à vérifier" description="AIME réunit ici la sauvegarde, les liens incomplets et les éléments qui demandent une décision humaine, quel que soit l’écran courant." onClose={() => setPanel(null)} size="lg">
        <div className="grid gap-2 sm:grid-cols-2">
          <ReviewCard label="Conservation" value={syncStatus === 'conflict' || syncStatus === 'error' ? 1 : 0} detail={labels[syncStatus]} alert={syncStatus === 'conflict' || syncStatus === 'error'} />
          <ReviewCard label="Éléments sans lien" value={audit.isolated.length} detail="À relier à un Moment" />
          <ReviewCard label="Liens incomplets" value={audit.dangling.length} detail="Références à réparer" alert={audit.dangling.length > 0} />
          <ReviewCard label="Musiques manuelles" value={audit.manualMusic.length} detail="À reconnaître ou conserver" />
        </div>
        {syncError && <p className="mt-5 border-l border-white/20 py-1 pl-4 text-sm font-light leading-relaxed text-white/48">{syncError}</p>}
        {(audit.isolated.length > 0 || audit.dangling.length > 0 || audit.manualMusic.length > 0) && <div className="mt-6 space-y-1 border-t border-white/10 pt-5">
          {audit.isolated.slice(0, 4).map(entity => <ReviewLine key={`isolated:${entity.kind}:${entity.id}`} label={entity.label} meta={`${entity.kind} · sans Moment`} />)}
          {audit.dangling.slice(0, 4).map(({ eventId, relation }) => <ReviewLine key={`dangling:${eventId}:${relation.kind}:${relation.id}`} label={timelineIndex.events.get(eventId)?.title || 'Moment introuvable'} meta={`${relation.kind} · référence absente`} />)}
          {audit.manualMusic.slice(0, 4).map(track => <ReviewLine key={`music:${track.id}`} label={track.title} meta={`${track.artist} · ajouté à la main`} />)}
        </div>}
        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={() => setPanel('settings')} className="rounded-full bg-white px-4 py-2 text-xs font-medium text-black">Ouvrir ME</button>
          <button onClick={() => setPanel(null)} className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/65">Fermer</button>
        </div>
      </CenteredBlock>}
      {panel === 'editor' && <CenteredBlock eyebrow="Éditeur du Monde" title="Modifier l’ouverture" description="Ces informations composent le hero et sa projection visible selon les droits de chacun." onClose={() => setPanel(null)} size="lg">
        <form className="space-y-5" onSubmit={event => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const date = String(form.get('date') || '');
          updateProject({
            title: String(form.get('title') || '').trim() || project.title,
            subtitle: String(form.get('subtitle') || '').trim(),
            city: { ...project.city, value: String(form.get('city') || '').trim() || null },
            venue: { ...project.venue, value: String(form.get('venue') || '').trim() || null },
            pivot: { ...project.pivot, value: date ? new Date(`${date}T12:00:00`).getTime() : project.pivot.value },
          });
          setPanel(null);
        }}>
          <Field label="Titre"><input name="title" required defaultValue={project.title} className="field" /></Field>
          <Field label="Sous-titre"><input name="subtitle" defaultValue={project.subtitle || ''} className="field" /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Ville"><input name="city" defaultValue={project.city.value || ''} className="field" /></Field>
            <Field label="Lieu"><input name="venue" defaultValue={project.venue.value || ''} className="field" /></Field>
          </div>
          <Field label="Date"><input name="date" type="date" defaultValue={new Date(project.pivot.value - new Date(project.pivot.value).getTimezoneOffset() * 60000).toISOString().slice(0, 10)} className="field" /></Field>
          <button className="w-full rounded-full bg-white px-5 py-3 text-sm font-medium text-black">Enregistrer l’ouverture</button>
        </form>
      </CenteredBlock>}
      {panel === 'settings' && <CenteredBlock eyebrow="ME" title="Votre espace" description={user?.primaryEmailAddress?.emailAddress} onClose={() => setPanel(null)} size="lg" testId="settings-panel">
        <label className="block text-xs uppercase tracking-widest text-white/45 mb-2">Projet actif</label>
        <select value={project.id} onChange={e => void selectProject(e.target.value)} className="w-full rounded-xl border border-white/15 bg-white/5 p-3 mb-6">
          {projects.map(item => <option className="bg-black" key={item.id} value={item.id}>{item.title} · {item.role}</option>)}
        </select>
         {notice && <p className="mb-5 border-l border-white/20 py-1 pl-3 text-sm text-white/60">{notice}</p>}
        <div className="grid grid-cols-2 gap-2">
           {canManage && <button onClick={() => setPanel('invite')} className="action">Inviter l'équipe</button>}
           {canManage && <button onClick={() => setPanel('message')} className="action">Envoyer un e-mail</button>}
           {canManage && <button onClick={() => fileRef.current?.click()} className="action"><Upload className="h-4 w-4" /> Ajouter un fichier</button>}
          <input ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp,video/mp4" className="hidden" onChange={e => e.target.files?.[0] && void upload(e.target.files[0]).catch(err => setNotice(err.message))} />
           {currentRole === 'owner' && <a href={`/api/projects/${project.id}/export`} onClick={() => trackEvent('project_exported', { format: 'json' })} className="action"><Download className="h-4 w-4" /> Sauvegarde du Monde</a>}
           <a href="/api/account/export" className="action"><Download className="h-4 w-4" /> Mes données</a>
          <button onClick={exportCsv} className="action">Invités CSV</button>
          <button onClick={() => window.print()} className="action">Imprimer Jour J / tables</button>
          <button onClick={() => document.getElementById('backup-input')?.click()} className="action">Importer JSON</button>
          <input id="backup-input" className="hidden" type="file" accept=".json,application/json" onChange={async e => {
            const file = e.target.files?.[0]; if (!file) return;
            try { importBackup(JSON.parse(await file.text())); setNotice('Sauvegarde importée — enregistrement en cours'); } catch (err) { setNotice(err instanceof Error ? err.message : 'Import impossible'); }
          }} />
        </div>
        {files.length > 0 && <div className="mt-8 border-t border-white/10 pt-6"><h3 className="font-medium mb-3">Documents & médias privés</h3><div className="space-y-2">{files.map(file =>
            <div key={file.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-xs"><span className="min-w-0 flex-1 truncate">{file.name}</span><a target="_blank" rel="noreferrer" href={`/api/storage/files/${file.id}`} className="text-white/70">Aperçu</a><a href={`/api/storage/files/${file.id}?download=1`} className="text-white/70">Télécharger</a>{canManage && <button className="text-white/40 transition hover:text-white" onClick={() => { setSelectedFile({ id: file.id, name: file.name }); setPanel('delete-file'); }}>Supprimer</button>}</div>
        )}</div></div>}
        <div className="mt-8 border-t border-white/10 pt-6">
           <h3 className="font-medium mb-2">Confidentialité & conservation</h3>
           <p className="text-xs text-white/45 mb-3">Les documents restent privés. Choisissez la durée souhaitée. Pendant le pilote, aucune suppression automatique n’a lieu sans avertissement.</p>
           {currentRole === 'owner' && <select defaultValue="365" onChange={e => void api(`/projects/${project.id}/privacy`, { method: 'PATCH', body: JSON.stringify({ retentionDays: Number(e.target.value) }) }).then(() => setNotice('Préférence enregistrée')).catch(err => setNotice(err.message))} className="w-full rounded-xl border border-white/15 bg-white/5 p-3">
            <option className="bg-black" value="180">6 mois</option><option className="bg-black" value="365">1 an</option><option className="bg-black" value="1095">3 ans</option>
           </select>}
          {currentRole === 'owner' && <div className="mt-6 border-t border-white/10 pt-6">
            <label className="flex items-start justify-between gap-5">
              <span><span className="block text-sm">Profil public</span><span className="mt-1 block text-xs font-light leading-relaxed text-white/45">Seuls les Moments marqués « Public » seront visibles. Les invités, messages, documents et informations d’organisation restent privés.</span></span>
              <input data-testid="toggle-public-profile" type="checkbox" checked={project.publicProfile?.published === true} onChange={event => {
                updateProject({ publicProfile: { published: event.target.checked } });
                setNotice(event.target.checked ? 'Profil public activé' : 'Profil public désactivé');
              }} className="mt-1 h-4 w-4 accent-white" />
            </label>
            {project.publicProfile?.published && <div className="mt-4 flex gap-2">
              <Link data-testid="link-public-profile" href={`/profil/${project.id}`} className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-center text-xs transition hover:bg-white/10">Voir le profil</Link>
              <button data-testid="button-copy-public-profile" type="button" onClick={() => {
                const root = basePath() === '/' ? '' : basePath();
                void navigator.clipboard.writeText(`${window.location.origin}${root}/profil/${project.id}`).then(() => setNotice('Lien du profil copié'));
              }} className="flex-1 rounded-full bg-white px-4 py-2.5 text-xs font-medium text-black">Copier le lien</button>
            </div>}
          </div>}
        </div>
        <div className="mt-8 space-y-2">
           <div className="flex justify-center gap-4 py-2 text-xs text-white/35"><Link href="/confidentialite">Confidentialité</Link><Link href="/conditions">Conditions</Link></div>
           <button data-testid="sign-out" className="w-full rounded-xl border border-white/15 p-3 text-sm" onClick={() => void signOut({ redirectUrl: basePath() })}>Se déconnecter</button>
           {currentRole === 'owner' && <button className="w-full p-3 text-sm text-white/35 transition hover:text-white/70" onClick={() => setPanel('delete-project')}>Supprimer définitivement le projet</button>}
           <button className="w-full p-3 text-sm text-rose-200/45 transition hover:text-rose-200/80" onClick={() => setPanel('delete-account')}>Supprimer mon compte et mes accès</button>
        </div>
       </CenteredBlock>}
      {panel === 'invite' && <CenteredBlock eyebrow="ME · Équipe" title="Inviter une personne" description="Choisissez qui peut rejoindre ce Monde et ce qu’elle pourra y faire." onClose={() => setPanel('settings')}>
        <form className="space-y-7" onSubmit={event => { event.preventDefault(); void invite().catch(error => { setSubmitting(false); setNotice(error.message); setPanel('settings'); }); }}>
          <Field label="Adresse e-mail"><input required type="email" autoFocus value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} className="field" placeholder="personne@exemple.fr" /></Field>
          <Field label="Rôle"><select value={inviteRole} onChange={event => setInviteRole(event.target.value)} className="field bg-[#0a0a0a]"><option value="planner">Organisation</option><option value="family">Proche</option><option value="viewer">Lecture</option></select></Field>
          <Actions onBack={() => setPanel('settings')} submitLabel={submitting ? 'Envoi…' : 'Envoyer l’invitation'} disabled={submitting || !inviteEmail.trim()} />
        </form>
      </CenteredBlock>}
      {panel === 'message' && <CenteredBlock eyebrow="ME · Messages" title="Préparer un message" description="AIME ne l’enverra qu’après votre confirmation." onClose={() => setPanel('settings')} size="lg">
        <form className="space-y-7" onSubmit={event => { event.preventDefault(); void sendMessage().catch(error => { setSubmitting(false); setNotice(error.message); setPanel('settings'); }); }}>
          <Field label="Destinataires"><input required type="text" autoFocus value={recipients} onChange={event => setRecipients(event.target.value)} className="field" placeholder="Une ou plusieurs adresses, séparées par des virgules" /></Field>
          <Field label="Objet"><input required value={subject} onChange={event => setSubject(event.target.value)} className="field" /></Field>
          <Field label="Message"><textarea required rows={7} value={messageBody} onChange={event => setMessageBody(event.target.value)} className="field resize-none" /></Field>
          <div className="border-l border-white/15 py-1 pl-4 text-xs font-light leading-relaxed text-white/45">Le message sera envoyé à {recipients.split(',').filter(value => value.trim()).length || 0} destinataire(s).</div>
          <Actions onBack={() => setPanel('settings')} submitLabel={submitting ? 'Envoi…' : 'Confirmer et envoyer'} disabled={submitting || !recipients.trim() || !subject.trim() || !messageBody.trim()} />
        </form>
      </CenteredBlock>}
      {panel === 'delete-file' && selectedFile && <CenteredBlock eyebrow="ME · Documents" title="Supprimer ce document ?" description={selectedFile.name} onClose={() => setPanel('settings')}>
        <p className="text-sm font-light leading-relaxed text-white/50">Le document ne sera plus disponible dans cet espace privé. Cette action ne peut pas être annulée.</p>
        <div className="mt-8 flex gap-3">
          <button onClick={() => setPanel('settings')} className="flex-1 rounded-full border border-white/15 px-5 py-3 text-sm text-white/60">Conserver</button>
          <button onClick={() => void api(`/storage/files/${selectedFile.id}`, { method: 'DELETE' }).then(() => { setFiles(value => value.filter(item => item.id !== selectedFile.id)); setSelectedFile(null); setNotice('Document supprimé'); setPanel('settings'); }).catch(error => { setNotice(error.message); setPanel('settings'); })} className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-medium text-black">Supprimer</button>
        </div>
      </CenteredBlock>}
      {panel === 'delete-project' && <CenteredBlock eyebrow="ME · Monde" title="Supprimer définitivement ce Monde ?" description="Les informations, documents et accès associés seront supprimés." onClose={() => setPanel('settings')}>
        <Field label="Écrivez SUPPRIMER pour confirmer"><input autoFocus value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} className="field" /></Field>
        <div className="mt-8 flex gap-3">
          <button onClick={() => setPanel('settings')} className="flex-1 rounded-full border border-white/15 px-5 py-3 text-sm text-white/60">Conserver</button>
          <button disabled={deleteConfirmation !== 'SUPPRIMER' || submitting} onClick={() => { setSubmitting(true); void api(`/projects/${project.id}`, { method: 'DELETE', body: JSON.stringify({ confirmation: 'SUPPRIMER' }) }).then(() => { clearProject(); location.reload(); }).catch(error => { setSubmitting(false); setNotice(error.message); setPanel('settings'); }); }} className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-25">Supprimer</button>
        </div>
      </CenteredBlock>}
      {panel === 'delete-account' && <CenteredBlock eyebrow="ME · Compte" title="Supprimer définitivement votre compte ?" description="Vos Mondes, leurs documents et tous vos accès seront supprimés. Cette action ne peut pas être annulée." onClose={() => setPanel('settings')}>
        <Field label="Écrivez SUPPRIMER MON COMPTE pour confirmer"><input autoFocus value={deleteAccountConfirmation} onChange={event => setDeleteAccountConfirmation(event.target.value)} className="field" /></Field>
        <div className="mt-8 flex gap-3">
          <button onClick={() => setPanel('settings')} className="flex-1 rounded-full border border-white/15 px-5 py-3 text-sm text-white/60">Conserver mon compte</button>
          <button disabled={deleteAccountConfirmation !== 'SUPPRIMER MON COMPTE' || submitting} onClick={() => {
            setSubmitting(true);
            void api('/account', { method: 'DELETE', body: JSON.stringify({ confirmation: 'SUPPRIMER MON COMPTE' }) })
              .then(() => { clearProject(); return signOut({ redirectUrl: basePath() }); })
              .catch(error => { setSubmitting(false); setNotice(error.message); setPanel('settings'); });
          }} className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-25">{submitting ? 'Suppression…' : 'Supprimer mon compte'}</button>
        </div>
      </CenteredBlock>}
  </>;
}

function ReviewCard({ label, value, detail, alert = false }: { label: string; value: number; detail: string; alert?: boolean }) {
  return <div className={`rounded-2xl border p-5 ${alert ? 'border-white/25 bg-white/[.075]' : 'border-white/10 bg-white/[.035]'}`}>
    <div className="flex items-start justify-between gap-4">
      <p className="text-[10px] uppercase tracking-[.16em] text-white/42">{label}</p>
      <span className="text-2xl font-light text-white">{value}</span>
    </div>
    <p className="mt-3 text-xs text-white/48">{detail}</p>
  </div>;
}

function ReviewLine({ label, meta }: { label: string; meta: string }) {
  return <div className="flex items-center justify-between gap-5 rounded-xl px-3 py-3 transition hover:bg-white/[.04]">
    <span className="min-w-0 truncate text-sm text-white/78">{label}</span>
    <span className="shrink-0 text-[9px] uppercase tracking-[.14em] text-white/32">{meta}</span>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] uppercase tracking-[.2em] text-white/35">{label}</span>{children}</label>;
}

function Actions({ onBack, submitLabel, disabled }: { onBack: () => void; submitLabel: string; disabled?: boolean }) {
  return <div className="flex gap-3 pt-2"><button type="button" onClick={onBack} className="flex-1 rounded-full border border-white/15 px-5 py-3 text-sm text-white/60">Retour</button><button type="submit" disabled={disabled} className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-25">{submitLabel}</button></div>;
}

function basePath() {
  return import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
}