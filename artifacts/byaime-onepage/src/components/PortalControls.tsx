import { useEffect, useRef, useState } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { Download, Settings2, Upload, X, Globe } from 'lucide-react';
import { useProject } from '@/store/project-store';
import { trackEvent } from '@/lib/analytics';
import { Link } from 'wouter';

const labels = { local: 'Local', loading: 'Chargement…', saving: 'Enregistrement…', saved: 'Enregistré', error: 'Hors connexion', conflict: 'Conflit' };

export function PortalControls() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { project, projects, selectProject, syncStatus, syncError, importBackup, clearProject } = useProject();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [files, setFiles] = useState<{ id: string; name: string; contentType: string; size: number }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const api = async (path: string, init?: RequestInit) => {
    const response = await fetch(`/api${path}`, { ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } });
    const body = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || `Erreur ${response.status}`);
    return body;
  };
  useEffect(() => {
    if (!open || !project) return;
    void api(`/projects/${project.id}/files`).then(setFiles).catch(error => setNotice(error.message));
  }, [open, project?.id]);
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
    const email = prompt('Adresse e-mail de la personne à inviter');
    if (!email) return;
    const role = prompt('Rôle : planner, family ou viewer', 'family');
    await api(`/projects/${project.id}/invitations`, { method: 'POST', body: JSON.stringify({ email, role }) });
    trackEvent('collaborator_invitation_sent');
    setNotice(`Invitation envoyée à ${email}`);
  };
  const sendMessage = async () => {
    const recipients = prompt('Destinataires (e-mails séparés par des virgules)');
    if (!recipients) return;
    const subject = prompt('Objet du message');
    const body = prompt('Message');
    if (!subject || !body || !confirm(`Confirmer l'envoi à : ${recipients} ?`)) return;
    await api(`/projects/${project.id}/messages`, { method: 'POST', body: JSON.stringify({
      kind: 'practical_info', recipients: recipients.split(',').map(v => v.trim()), subject, body, confirmed: true,
    }) });
    trackEvent('message_sent');
    setNotice('Message envoyé');
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
       <span data-testid="sync-status" title={syncError} className={`rounded-full border px-3 py-1.5 text-[11px] backdrop-blur ${syncStatus === 'error' || syncStatus === 'conflict' ? 'border-amber-400/40 bg-amber-950/70 text-amber-200' : 'border-white/15 bg-black/60 text-white/65'}`}>{labels[syncStatus]}</span>
       <button data-testid="settings-open" onClick={() => setOpen(true)} className="rounded-full border border-white/20 bg-black/60 p-2.5 backdrop-blur hover:bg-white/10 transition-colors text-white" aria-label="Ouvrir les réglages"><Settings2 className="h-4 w-4" /></button>
    </div>
    {open && <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex justify-end" onClick={() => setOpen(false)}>
       <aside data-testid="settings-panel" className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0d0d0d] p-6 text-white" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8"><div><p className="text-xs text-white/45">Compte</p><p className="font-medium">{user?.primaryEmailAddress?.emailAddress}</p></div><button onClick={() => setOpen(false)}><X /></button></div>
        <label className="block text-xs uppercase tracking-widest text-white/45 mb-2">Projet actif</label>
        <select value={project.id} onChange={e => void selectProject(e.target.value)} className="w-full rounded-xl border border-white/15 bg-white/5 p-3 mb-6">
          {projects.map(item => <option className="bg-black" key={item.id} value={item.id}>{item.title} · {item.role}</option>)}
        </select>
        {notice && <p className="mb-5 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => void invite().catch(e => setNotice(e.message))} className="action">Inviter l'équipe</button>
          <button onClick={() => void sendMessage().catch(e => setNotice(e.message))} className="action">Envoyer un e-mail</button>
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
          <div key={file.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-xs"><span className="min-w-0 flex-1 truncate">{file.name}</span><a target="_blank" rel="noreferrer" href={`/api/storage/files/${file.id}`} className="text-white/70">Aperçu</a><a href={`/api/storage/files/${file.id}?download=1`} className="text-white/70">Télécharger</a><button className="text-red-300" onClick={async () => { if (!confirm(`Supprimer ${file.name} ?`)) return; await api(`/storage/files/${file.id}`, { method: 'DELETE' }); setFiles(value => value.filter(item => item.id !== file.id)); }}>Supprimer</button></div>
        )}</div></div>}
        <div className="mt-8 border-t border-white/10 pt-6">
          <h3 className="font-medium mb-2">Confidentialité & conservation</h3>
          <p className="text-xs text-white/45 mb-3">Les documents restent privés. Choisissez la durée de conservation du projet.</p>
          <select defaultValue="365" onChange={e => void api(`/projects/${project.id}/privacy`, { method: 'PATCH', body: JSON.stringify({ retentionDays: Number(e.target.value) }) }).then(() => setNotice('Préférence enregistrée')).catch(err => setNotice(err.message))} className="w-full rounded-xl border border-white/15 bg-white/5 p-3">
            <option className="bg-black" value="180">6 mois</option><option className="bg-black" value="365">1 an</option><option className="bg-black" value="1095">3 ans</option>
          </select>
        </div>
        <div className="mt-8 space-y-2">
           <button data-testid="sign-out" className="w-full rounded-xl border border-white/15 p-3 text-sm" onClick={() => void signOut({ redirectUrl: basePath() })}>Se déconnecter</button>
          <button className="w-full rounded-xl border border-red-500/30 p-3 text-sm text-red-300" onClick={async () => {
            if (prompt('Tapez SUPPRIMER pour supprimer définitivement ce projet') !== 'SUPPRIMER') return;
            await api(`/projects/${project.id}`, { method: 'DELETE', body: JSON.stringify({ confirmation: 'SUPPRIMER' }) });
            clearProject(); location.reload();
          }}>Supprimer définitivement le projet</button>
        </div>
      </aside>
    </div>}
  </>;
}

function basePath() {
  return import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
}