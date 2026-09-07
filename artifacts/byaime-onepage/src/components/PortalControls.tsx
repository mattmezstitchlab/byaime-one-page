import { useEffect, useRef, useState } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { Download, Settings2, Upload, Globe } from 'lucide-react';
import { useProject } from '@/store/project-store';
import { trackEvent } from '@/lib/analytics';
import { Link } from 'wouter';
import { CenteredBlock } from './CenteredBlock';

const labels = { local: 'Local', loading: 'Chargement…', saving: 'Enregistrement…', saved: 'Enregistré', error: 'Hors connexion', conflict: 'À vérifier' };

export function PortalControls() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { project, projects, selectProject, syncStatus, syncError, currentRole, updateProject, importBackup, clearProject } = useProject();
  const [panel, setPanel] = useState<'settings' | 'invite' | 'message' | 'delete-file' | 'delete-project' | null>(null);
  const [notice, setNotice] = useState('');
  const [files, setFiles] = useState<{ id: string; name: string; contentType: string; size: number }[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('family');
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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
    await api('/storage/files', { method: 'POST', body: JSON.stringify({ projectId: project.id, name: file.name, size: file.size, contentType: file.type, objectPath: request.objectPath }) });
    setFiles(await api(`/projects/${project.id}/files`));
    trackEvent('file_added');
    setNotice(`${file.name} ajouté à l'espace privé`);
  };

  return <>
     <div data-testid="portal-controls" className="fixed top-4 right-4 z-[60] flex items-center gap-2">
       <Link href="/network" className="rounded-full border border-white/20 bg-black/60 p-2.5 backdrop-blur hover:bg-white/10 transition-colors text-white" aria-label="Carte des lieux et des personnes">
         <Globe className="h-4 w-4" />
       </Link>
        <span data-testid="sync-status" title={syncError} className={`rounded-full border bg-black/60 px-3 py-1.5 text-[11px] text-white backdrop-blur ${syncStatus === 'error' || syncStatus === 'conflict' ? 'border-white/30' : 'border-white/15 text-white/65'}`}>{labels[syncStatus]}</span>
        <button data-testid="settings-open" onClick={() => setPanel('settings')} className="rounded-full border border-white/20 bg-black/60 p-2.5 backdrop-blur hover:bg-white/10 transition-colors text-white" aria-label="Ouvrir les réglages"><Settings2 className="h-4 w-4" /></button>
    </div>
      {panel === 'settings' && <CenteredBlock eyebrow="ME" title="Votre espace" description={user?.primaryEmailAddress?.emailAddress} onClose={() => setPanel(null)} size="lg" testId="settings-panel">
        <label className="block text-xs uppercase tracking-widest text-white/45 mb-2">Projet actif</label>
        <select value={project.id} onChange={e => void selectProject(e.target.value)} className="w-full rounded-xl border border-white/15 bg-white/5 p-3 mb-6">
          {projects.map(item => <option className="bg-black" key={item.id} value={item.id}>{item.title} · {item.role}</option>)}
        </select>
         {notice && <p className="mb-5 border-l border-white/20 py-1 pl-3 text-sm text-white/60">{notice}</p>}
        <div className="grid grid-cols-2 gap-2">
           <button onClick={() => setPanel('invite')} className="action">Inviter l'équipe</button>
           <button onClick={() => setPanel('message')} className="action">Envoyer un e-mail</button>
          <button onClick={() => fileRef.current?.click()} className="action"><Upload className="h-4 w-4" /> Ajouter un fichier</button>
          <input ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp,video/mp4" className="hidden" onChange={e => e.target.files?.[0] && void upload(e.target.files[0]).catch(err => setNotice(err.message))} />
           <a href={`/api/projects/${project.id}/export`} onClick={() => trackEvent('project_exported', { format: 'json' })} className="action"><Download className="h-4 w-4" /> Sauvegarde JSON</a>
          <button onClick={exportCsv} className="action">Invités CSV</button>
          <button onClick={() => window.print()} className="action">Imprimer Jour J / tables</button>
          <button onClick={() => document.getElementById('backup-input')?.click()} className="action">Importer JSON</button>
          <input id="backup-input" className="hidden" type="file" accept=".json,application/json" onChange={async e => {
            const file = e.target.files?.[0]; if (!file) return;
            try { importBackup(JSON.parse(await file.text())); setNotice('Sauvegarde importée — enregistrement en cours'); } catch (err) { setNotice(err instanceof Error ? err.message : 'Import impossible'); }
          }} />
        </div>
        {files.length > 0 && <div className="mt-8 border-t border-white/10 pt-6"><h3 className="font-medium mb-3">Documents & médias privés</h3><div className="space-y-2">{files.map(file =>
           <div key={file.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-xs"><span className="min-w-0 flex-1 truncate">{file.name}</span><a target="_blank" rel="noreferrer" href={`/api/storage/files/${file.id}`} className="text-white/70">Aperçu</a><a href={`/api/storage/files/${file.id}?download=1`} className="text-white/70">Télécharger</a><button className="text-white/40 transition hover:text-white" onClick={() => { setSelectedFile({ id: file.id, name: file.name }); setPanel('delete-file'); }}>Supprimer</button></div>
        )}</div></div>}
        <div className="mt-8 border-t border-white/10 pt-6">
          <h3 className="font-medium mb-2">Confidentialité & conservation</h3>
          <p className="text-xs text-white/45 mb-3">Les documents restent privés. Choisissez la durée de conservation du projet.</p>
          <select defaultValue="365" onChange={e => void api(`/projects/${project.id}/privacy`, { method: 'PATCH', body: JSON.stringify({ retentionDays: Number(e.target.value) }) }).then(() => setNotice('Préférence enregistrée')).catch(err => setNotice(err.message))} className="w-full rounded-xl border border-white/15 bg-white/5 p-3">
            <option className="bg-black" value="180">6 mois</option><option className="bg-black" value="365">1 an</option><option className="bg-black" value="1095">3 ans</option>
          </select>
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
           <button data-testid="sign-out" className="w-full rounded-xl border border-white/15 p-3 text-sm" onClick={() => void signOut({ redirectUrl: basePath() })}>Se déconnecter</button>
           <button className="w-full p-3 text-sm text-white/35 transition hover:text-white/70" onClick={() => setPanel('delete-project')}>Supprimer définitivement le projet</button>
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
  </>;
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