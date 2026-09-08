import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import {
  CloudAlert,
  CloudCheck,
  CloudOff,
  Download,
  LoaderCircle,
  PenLine,
  Upload,
} from "lucide-react";
import { useProject } from "@/store/project-store";
import { trackEvent } from "@/lib/analytics";
import { Link } from "wouter";
import { CenteredBlock } from "./CenteredBlock";
import {
  auditTimelineConnections,
  buildTimelineIndex,
} from "@/lib/timeline-graph";
import { effectiveGuestDietary, effectiveGuestRsvp } from "@/lib/participant-rsvp";

const labels = {
  local: "Local",
  loading: "Chargement…",
  saving: "Enregistrement…",
  saved: "Enregistré",
  error: "Hors connexion",
  conflict: "À vérifier",
};

export function PortalControls({ embedded = false }: { embedded?: boolean }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const {
    project,
    projects,
    selectProject,
    syncStatus,
    syncError,
    currentRole,
    canEdit,
    participantLinks,
    refreshParticipantLinks,
    updateProject,
    importBackup,
    clearProject,
  } = useProject();
  const [panel, setPanel] = useState<
    | "settings"
    | "editor"
    | "sync"
    | "invite"
    | "message"
    | "delete-file"
    | "delete-project"
    | "delete-account"
    | null
  >(null);
  const [notice, setNotice] = useState("");
  const [files, setFiles] = useState<
    { id: string; name: string; contentType: string; size: number }[]
  >([]);
  const [selectedFile, setSelectedFile] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("family");
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] =
    useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingSaveSeenRef = useRef(false);
  const canManage = currentRole === "owner" || currentRole === "planner";
  useEffect(() => {
    const openMe = () => setPanel("settings");
    const openCollaborationInvite = () => setPanel("invite");
    window.addEventListener("aime:open-me", openMe);
    window.addEventListener("aime:open-collaboration-invite", openCollaborationInvite);
    return () => {
      window.removeEventListener("aime:open-me", openMe);
      window.removeEventListener("aime:open-collaboration-invite", openCollaborationInvite);
    };
  }, []);
  const api = async (path: string, init?: RequestInit) => {
    const response = await fetch(`/api${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    const body =
      response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        body?.error || body?.providerError || `Erreur ${response.status}`,
      );
    return body;
  };
  useEffect(() => {
    if (!notice.includes("enregistrement en cours")) {
      pendingSaveSeenRef.current = false;
      return;
    }
    if (syncStatus === "saving") pendingSaveSeenRef.current = true;
    if (!pendingSaveSeenRef.current) return;
    if (syncStatus === "saved") {
      pendingSaveSeenRef.current = false;
      setNotice("Modification enregistrée dans le Monde");
    }
    if (syncStatus === "error") {
      pendingSaveSeenRef.current = false;
      setNotice(
        syncError ||
          "Modification conservée sur cet appareil, mais pas encore enregistrée en ligne",
      );
    }
    if (syncStatus === "conflict") {
      pendingSaveSeenRef.current = false;
      setNotice(
        "Modification non enregistrée : une autre version du Monde doit être vérifiée",
      );
    }
  }, [notice, syncError, syncStatus]);
  useEffect(() => {
    if (panel !== "settings" || !project) return;
    void api(`/projects/${project.id}/files`)
      .then(setFiles)
      .catch((error) => setNotice(error.message));
  }, [panel, project?.id]);
  if (!project)
    return (
      <button
        onClick={() => void signOut({ redirectUrl: basePath() })}
        className={embedded
          ? "h-8 rounded-full border border-border bg-background px-3 text-[10px] text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : "fixed right-4 top-4 z-[60] rounded-full border border-foreground/20 bg-background/60 px-4 py-2 text-xs text-foreground backdrop-blur"}
      >
        Se déconnecter
      </button>
    );
  const download = (content: string, name: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    Object.assign(document.createElement("a"), {
      href: url,
      download: name,
    }).click();
    URL.revokeObjectURL(url);
  };
  const exportCsv = async () => {
    const latestLinks = canManage
      ? await refreshParticipantLinks().catch(() => participantLinks)
      : participantLinks;
    const quote = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    download(
      [
        "Nom,Contact,RSVP,Régime,Table",
        ...project.guests.map((g) =>
          [g.name, g.contact, effectiveGuestRsvp(g, latestLinks[g.id]), effectiveGuestDietary(g, latestLinks[g.id]), g.tableId]
            .map(quote)
            .join(","),
        ),
      ].join("\n"),
      "invites-aime.csv",
      "text/csv",
    );
    trackEvent("project_exported", { format: "csv" });
  };
  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setSubmitting(true);
    const email = inviteEmail.trim();
    try {
      await api(`/projects/${project.id}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email, role: inviteRole }),
      });
      trackEvent("collaborator_invitation_sent");
      setNotice(`Invitation créée et e-mail envoyé à ${email}`);
      setInviteEmail("");
      setPanel("settings");
    } finally {
      setSubmitting(false);
    }
  };
  const sendMessage = async () => {
    if (!recipients.trim() || !subject.trim() || !messageBody.trim()) return;
    setSubmitting(true);
    const recipientList = recipients
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    try {
      const delivery = await api(`/projects/${project.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          kind: "practical_info",
          recipients: recipientList,
          subject: subject.trim(),
          body: messageBody.trim(),
          confirmed: true,
        }),
      });
      if (delivery?.status !== "sent")
        throw new Error(
          delivery?.providerError ||
            "La livraison de l’e-mail n’a pas été confirmée",
        );
      trackEvent("message_sent");
      setNotice(
        `E-mail envoyé à ${recipientList.length} destinataire${recipientList.length > 1 ? "s" : ""}`,
      );
      setRecipients("");
      setSubject("");
      setMessageBody("");
      setPanel("settings");
    } finally {
      setSubmitting(false);
    }
  };
  const upload = async (file: File) => {
    setSubmitting(true);
    setNotice(`Transfert de ${file.name} en cours…`);
    try {
      const request = await api("/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      const uploaded = await fetch(request.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploaded.ok) throw new Error("Échec du transfert vers App Storage");
      await api("/storage/files", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          name: file.name,
          size: file.size,
          contentType: file.type,
          objectPath: request.objectPath,
          finalizeToken: request.finalizeToken,
        }),
      });
      setFiles(await api(`/projects/${project.id}/files`));
      trackEvent("file_added");
      setNotice(`${file.name} est enregistré dans l’espace privé`);
    } finally {
      setSubmitting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const SyncIcon =
    syncStatus === "conflict"
      ? CloudAlert
      : syncStatus === "error"
        ? CloudOff
        : syncStatus === "loading" || syncStatus === "saving"
          ? LoaderCircle
          : CloudCheck;
  const audit = auditTimelineConnections(project);
  const timelineIndex = buildTimelineIndex(project);
  const reviewCount =
    audit.isolated.length +
    audit.dangling.length +
    audit.manualMusic.length +
    (syncStatus === "conflict" || syncStatus === "error" ? 1 : 0);
  const isProfileRoute = window.location.pathname.endsWith("/profile");

  return (
    <>
      <div
        data-testid="portal-controls"
        className={embedded ? "flex items-center gap-1.5" : "fixed right-4 top-3 z-[60] flex items-center gap-1.5"}
      >
        <button
          data-testid="sync-status"
          data-sync-status={syncStatus}
          title={
            syncError ||
            `${reviewCount} élément${reviewCount === 1 ? "" : "s"} à vérifier`
          }
          onClick={() => setPanel("sync")}
          className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-[10px] font-medium text-foreground shadow-sm transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-2 sm:px-3"
          aria-label={`${reviewCount} élément${reviewCount === 1 ? "" : "s"} à vérifier`}
        >
          <span className="relative grid place-items-center">
            {reviewCount > 0 && (
              <span className="absolute inset-0 animate-ping rounded-full bg-foreground/20" />
            )}
            <SyncIcon
              className={`relative h-3.5 w-3.5 ${syncStatus === "loading" || syncStatus === "saving" ? "animate-spin" : ""}`}
            />
          </span>
          <span className="hidden sm:inline">À vérifier</span>
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-foreground/10 px-1 text-[9px] font-semibold text-foreground">
            {reviewCount}
          </span>
        </button>
        {canEdit && (
          <button
            data-testid="settings-open"
            onClick={() =>
              isProfileRoute
                ? window.dispatchEvent(new Event("aime:toggle-profile-editor"))
                : setPanel("editor")
            }
            className="flex h-8 items-center gap-2 rounded-full border border-border bg-background px-2.5 text-[10px] font-medium text-foreground shadow-sm transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3"
            aria-label={isProfileRoute ? "Éditer le Profil" : "Éditer le Monde"}
            title={isProfileRoute ? "Éditer le Profil" : "Éditer le Monde"}
          >
            <PenLine className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Éditer</span>
          </button>
        )}
      </div>
      {panel === "sync" && (
        <CenteredBlock
          eyebrow="Contrôle universel"
          title="Des changements sont à vérifier"
          description="AIME réunit ici la sauvegarde, les liens incomplets et les éléments qui demandent une décision humaine, quel que soit l’écran courant."
          onClose={() => setPanel(null)}
          size="lg"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <ReviewCard
              label="Conservation"
              value={
                syncStatus === "conflict" || syncStatus === "error" ? 1 : 0
              }
              detail={labels[syncStatus]}
              alert={syncStatus === "conflict" || syncStatus === "error"}
            />
            <ReviewCard
              label="Éléments sans lien"
              value={audit.isolated.length}
              detail="À relier à un Moment"
            />
            <ReviewCard
              label="Liens incomplets"
              value={audit.dangling.length}
              detail="Références à réparer"
              alert={audit.dangling.length > 0}
            />
            <ReviewCard
              label="Musiques manuelles"
              value={audit.manualMusic.length}
              detail="À reconnaître ou conserver"
            />
          </div>
          {syncError && (
            <p className="mt-5 border-l border-destructive/50 py-1 pl-4 text-sm font-light leading-relaxed text-destructive/80">
              {syncError}
            </p>
          )}
          {(audit.isolated.length > 0 ||
            audit.dangling.length > 0 ||
            audit.manualMusic.length > 0) && (
            <div className="mt-6 space-y-1 border-t border-border pt-5">
              {audit.isolated.slice(0, 4).map((entity) => (
                <ReviewLine
                  key={`isolated:${entity.kind}:${entity.id}`}
                  label={entity.label}
                  meta={`${entity.kind} · sans Moment`}
                />
              ))}
              {audit.dangling.slice(0, 4).map(({ eventId, relation }) => (
                <ReviewLine
                  key={`dangling:${eventId}:${relation.kind}:${relation.id}`}
                  label={
                    timelineIndex.events.get(eventId)?.title ||
                    "Moment introuvable"
                  }
                  meta={`${relation.kind} · référence absente`}
                />
              ))}
              {audit.manualMusic.slice(0, 4).map((track) => (
                <ReviewLine
                  key={`music:${track.id}`}
                  label={track.title}
                  meta={`${track.artist} · ajouté à la main`}
                />
              ))}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              data-testid="me-open"
              onClick={() => setPanel("settings")}
              className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ouvrir ME
            </button>
            <button
              onClick={() => setPanel(null)}
              className="rounded-full border border-foreground/15 px-4 py-2 text-xs text-foreground/70 hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Fermer
            </button>
          </div>
        </CenteredBlock>
      )}
      {panel === "editor" && (
        <CenteredBlock
          eyebrow="Éditeur du Monde"
          title="Modifier l’ouverture"
          description="Ces informations composent le hero et sa projection visible selon les droits de chacun."
          onClose={() => setPanel(null)}
          size="lg"
        >
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const date = String(form.get("date") || "");
              updateProject({
                title: String(form.get("title") || "").trim() || project.title,
                subtitle: String(form.get("subtitle") || "").trim(),
                city: {
                  ...project.city,
                  value: String(form.get("city") || "").trim() || null,
                },
                venue: {
                  ...project.venue,
                  value: String(form.get("venue") || "").trim() || null,
                },
                pivot: {
                  ...project.pivot,
                  value: date
                    ? new Date(`${date}T12:00:00`).getTime()
                    : project.pivot.value,
                },
              });
              setNotice("Ouverture modifiée — enregistrement en cours");
              setPanel("settings");
            }}
          >
            <Field label="Titre">
              <input
                name="title"
                required
                defaultValue={project.title}
                className="field"
              />
            </Field>
            <Field label="Sous-titre">
              <input
                name="subtitle"
                defaultValue={project.subtitle || ""}
                className="field"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Ville">
                <input
                  name="city"
                  defaultValue={project.city.value || ""}
                  className="field"
                />
              </Field>
              <Field label="Lieu">
                <input
                  name="venue"
                  defaultValue={project.venue.value || ""}
                  className="field"
                />
              </Field>
            </div>
            <Field label="Date">
              <input
                name="date"
                type="date"
                defaultValue={new Date(
                  project.pivot.value -
                    new Date(project.pivot.value).getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .slice(0, 10)}
                className="field"
              />
            </Field>
            <button className="w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Enregistrer l’ouverture
            </button>
          </form>
        </CenteredBlock>
      )}
      {panel === "settings" && (
        <CenteredBlock
          eyebrow="ME"
          title="Votre espace"
          description={user?.primaryEmailAddress?.emailAddress}
          onClose={() => setPanel(null)}
          size="lg"
          testId="settings-panel"
        >
          <label className="block text-xs uppercase tracking-widest text-foreground/40 mb-2">
            Projet actif
          </label>
          <select
            data-testid="active-project-select"
            value={project.id}
            onChange={(e) => void selectProject(e.target.value)}
            className="w-full rounded-xl border border-border bg-card p-3 mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {projects.map((item) => (
              <option
                className="bg-background text-foreground"
                key={item.id}
                value={item.id}
              >
                {item.title} · {item.role}
              </option>
            ))}
          </select>
          {notice && (
            <p className="mb-5 border-l border-foreground/30 py-1 pl-3 text-sm text-foreground/60">
              {notice}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {canManage && (
              <button
                onClick={() => setPanel("invite")}
                className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Inviter à collaborer
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setPanel("message")}
                className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Envoyer un e-mail
              </button>
            )}
            {canManage && (
              <button
                disabled={submitting}
                onClick={() => fileRef.current?.click()}
                className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Upload className="h-4 w-4" />{" "}
                {submitting ? "Opération en cours…" : "Ajouter un fichier"}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp,video/mp4"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] &&
                void upload(e.target.files[0]).catch((err) =>
                  setNotice(err.message),
                )
              }
            />
            {currentRole === "owner" && (
              <a
                href={`/api/projects/${project.id}/export`}
                onClick={() =>
                  trackEvent("project_exported", { format: "json" })
                }
                className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Download className="h-4 w-4" /> Sauvegarde du Monde
              </a>
            )}
            <a
              href="/api/account/export"
              className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Download className="h-4 w-4" /> Mes données
            </a>
            <button
              onClick={exportCsv}
              className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Invités CSV
            </button>
            <button
              onClick={() => window.print()}
              className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Imprimer Jour J / tables
            </button>
            <button
              onClick={() => document.getElementById("backup-input")?.click()}
              className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Importer JSON
            </button>
            <input
              id="backup-input"
              className="hidden"
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  importBackup(JSON.parse(await file.text()));
                  setNotice("Sauvegarde importée — enregistrement en cours");
                } catch (err) {
                  setNotice(
                    err instanceof Error ? err.message : "Import impossible",
                  );
                }
              }}
            />
          </div>
          {files.length > 0 && (
            <div className="mt-8 border-t border-border pt-6">
              <h3 className="font-medium mb-3">Documents & médias privés</h3>
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 rounded-xl bg-card p-3 text-xs border border-border"
                  >
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={`/api/storage/files/${file.id}`}
                      className="text-foreground/70 hover:text-foreground"
                    >
                      Aperçu
                    </a>
                    <a
                      href={`/api/storage/files/${file.id}?download=1`}
                      className="text-foreground/70 hover:text-foreground"
                    >
                      Télécharger
                    </a>
                    {canManage && (
                      <button
                        className="text-foreground/40 transition hover:text-destructive"
                        onClick={() => {
                          setSelectedFile({ id: file.id, name: file.name });
                          setPanel("delete-file");
                        }}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-8 border-t border-border pt-6">
            <h3 className="font-medium mb-2">Confidentialité & conservation</h3>
            <p className="text-xs text-foreground/50 mb-3">
              Les documents restent privés. Choisissez la durée souhaitée.
              Pendant le pilote, aucune suppression automatique n’a lieu sans
              avertissement.
            </p>
            {currentRole === "owner" && (
              <select
                defaultValue="365"
                onChange={(e) =>
                  void api(`/projects/${project.id}/privacy`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      retentionDays: Number(e.target.value),
                    }),
                  })
                    .then(() => setNotice("Préférence enregistrée"))
                    .catch((err) => setNotice(err.message))
                }
                className="w-full rounded-xl border border-border bg-card p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option className="bg-background text-foreground" value="180">
                  6 mois
                </option>
                <option className="bg-background text-foreground" value="365">
                  1 an
                </option>
                <option className="bg-background text-foreground" value="1095">
                  3 ans
                </option>
              </select>
            )}
            {currentRole === "owner" && (
              <div className="mt-6 border-t border-border pt-6">
                <label className="flex items-start justify-between gap-5">
                  <span>
                    <span className="block text-sm">Profil public</span>
                    <span className="mt-1 block text-xs font-light leading-relaxed text-foreground/50">
                      Seuls les Moments marqués « Public » seront visibles. Les
                      invités, messages, documents et informations
                      d’organisation restent privés.
                    </span>
                  </span>
                  <input
                    data-testid="toggle-public-profile"
                    type="checkbox"
                    checked={project.publicProfile?.published === true}
                    onChange={(event) => {
                      updateProject({
                        publicProfile: { published: event.target.checked },
                      });
                      setNotice(
                        `${event.target.checked ? "Activation" : "Désactivation"} du profil public — enregistrement en cours`,
                      );
                    }}
                    className="mt-1 h-4 w-4 accent-foreground"
                  />
                </label>
                {project.publicProfile?.published && (
                  <div className="mt-4 flex gap-2">
                    <Link
                      data-testid="link-public-profile"
                      href={`/profil/${project.id}`}
                      className="flex-1 rounded-full border border-foreground/15 px-4 py-2.5 text-center text-xs transition hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Voir le profil
                    </Link>
                    <button
                      data-testid="button-copy-public-profile"
                      type="button"
                      onClick={() => {
                        const root = basePath() === "/" ? "" : basePath();
                        void navigator.clipboard
                          .writeText(
                            `${window.location.origin}${root}/profil/${project.id}`,
                          )
                          .then(() => setNotice("Lien du profil copié"));
                      }}
                      className="flex-1 rounded-full bg-foreground px-4 py-2.5 text-xs font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Copier le lien
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-8 space-y-2">
            <div className="flex justify-center gap-4 py-2 text-xs text-foreground/40">
              <Link href="/confidentialite">Confidentialité</Link>
              <Link href="/conditions">Conditions</Link>
            </div>
            <button
              data-testid="sign-out"
              className="w-full rounded-xl border border-border p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => void signOut({ redirectUrl: basePath() })}
            >
              Se déconnecter
            </button>
            {currentRole === "owner" && (
              <button
                className="w-full p-3 text-sm text-foreground/40 transition hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setPanel("delete-project")}
              >
                Supprimer définitivement le projet
              </button>
            )}
            <button
              className="w-full p-3 text-sm text-destructive/60 transition hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setPanel("delete-account")}
            >
              Supprimer mon compte et mes accès
            </button>
          </div>
        </CenteredBlock>
      )}
      {panel === "invite" && (
        <CenteredBlock
          eyebrow="ME · Droit de collaboration"
          title="Inviter à collaborer"
          description="Cette invitation crée un accès authentifié au Monde. La personne pourra agir selon le rôle choisi ; ce n’est pas une invitation RSVP à l’événement."
          onClose={() => setPanel("settings")}
        >
          <form
            className="space-y-7"
            onSubmit={(event) => {
              event.preventDefault();
              void invite().catch((error) => {
                setNotice(`Invitation non envoyée : ${error.message}`);
                setPanel("settings");
              });
            }}
          >
            <Field label="Adresse e-mail">
              <input
                required
                type="email"
                autoFocus
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className="field"
                placeholder="personne@exemple.fr"
              />
            </Field>
            <Field label="Rôle">
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
                className="field bg-background"
              >
                <option value="planner">Organisation</option>
                <option value="family">Proche</option>
                <option value="viewer">Lecture</option>
              </select>
            </Field>
            <Actions
              onBack={() => setPanel("settings")}
              submitLabel={submitting ? "Envoi…" : "Envoyer l’accès au Monde"}
              disabled={submitting || !inviteEmail.trim()}
            />
          </form>
        </CenteredBlock>
      )}
      {panel === "message" && (
        <CenteredBlock
          eyebrow="ME · Messages"
          title="Préparer un message"
          description="AIME ne l’enverra qu’après votre confirmation."
          onClose={() => setPanel("settings")}
          size="lg"
        >
          <form
            className="space-y-7"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage().catch((error) => {
                setNotice(`E-mail non envoyé : ${error.message}`);
                setPanel("settings");
              });
            }}
          >
            <Field label="Destinataires">
              <input
                required
                type="text"
                autoFocus
                value={recipients}
                onChange={(event) => setRecipients(event.target.value)}
                className="field"
                placeholder="Une ou plusieurs adresses, séparées par des virgules"
              />
            </Field>
            <Field label="Objet">
              <input
                required
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="field"
              />
            </Field>
            <Field label="Message">
              <textarea
                required
                rows={7}
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                className="field resize-none"
              />
            </Field>
            <div className="border-l border-foreground/50 py-1 pl-4 text-xs font-light leading-relaxed text-foreground/50">
              Le message sera envoyé à{" "}
              {recipients.split(",").filter((value) => value.trim()).length ||
                0}{" "}
              destinataire(s).
            </div>
            <Actions
              onBack={() => setPanel("settings")}
              submitLabel={submitting ? "Envoi…" : "Confirmer et envoyer"}
              disabled={
                submitting ||
                !recipients.trim() ||
                !subject.trim() ||
                !messageBody.trim()
              }
            />
          </form>
        </CenteredBlock>
      )}
      {panel === "delete-file" && selectedFile && (
        <CenteredBlock
          eyebrow="ME · Documents"
          title="Supprimer ce document ?"
          description={selectedFile.name}
          onClose={() => setPanel("settings")}
        >
          <p className="text-sm font-light leading-relaxed text-foreground/60">
            Le document ne sera plus disponible dans cet espace privé. Cette
            action ne peut pas être annulée.
          </p>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setPanel("settings")}
              className="flex-1 rounded-full border border-foreground/50 px-5 py-3 text-sm text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Conserver
            </button>
            <button
              onClick={() =>
                void api(`/storage/files/${selectedFile.id}`, {
                  method: "DELETE",
                })
                  .then(() => {
                    setFiles((value) =>
                      value.filter((item) => item.id !== selectedFile.id),
                    );
                    setSelectedFile(null);
                    setNotice("Document supprimé");
                    setPanel("settings");
                  })
                  .catch((error) => {
                    setNotice(error.message);
                    setPanel("settings");
                  })
              }
              className="flex-1 rounded-full bg-destructive px-5 py-3 text-sm font-medium text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Supprimer
            </button>
          </div>
        </CenteredBlock>
      )}
      {panel === "delete-project" && (
        <CenteredBlock
          eyebrow="ME · Monde"
          title="Supprimer définitivement ce Monde ?"
          description="Les informations, documents et accès associés seront supprimés."
          onClose={() => setPanel("settings")}
        >
          <Field label="Écrivez SUPPRIMER pour confirmer">
            <input
              autoFocus
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              className="field"
            />
          </Field>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setPanel("settings")}
              className="flex-1 rounded-full border border-foreground/50 px-5 py-3 text-sm text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Conserver
            </button>
            <button
              disabled={deleteConfirmation !== "SUPPRIMER" || submitting}
              onClick={() => {
                setSubmitting(true);
                void api(`/projects/${project.id}`, {
                  method: "DELETE",
                  body: JSON.stringify({ confirmation: "SUPPRIMER" }),
                })
                  .then(() => {
                    clearProject();
                    location.reload();
                  })
                  .catch((error) => {
                    setSubmitting(false);
                    setNotice(error.message);
                    setPanel("settings");
                  });
              }}
              className="flex-1 rounded-full bg-destructive px-5 py-3 text-sm font-medium text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Supprimer
            </button>
          </div>
        </CenteredBlock>
      )}
      {panel === "delete-account" && (
        <CenteredBlock
          eyebrow="ME · Compte"
          title="Supprimer définitivement votre compte ?"
          description="Vos Mondes, leurs documents et tous vos accès seront supprimés. Cette action ne peut pas être annulée."
          onClose={() => setPanel("settings")}
        >
          <Field label="Écrivez SUPPRIMER MON COMPTE pour confirmer">
            <input
              autoFocus
              value={deleteAccountConfirmation}
              onChange={(event) =>
                setDeleteAccountConfirmation(event.target.value)
              }
              className="field"
            />
          </Field>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setPanel("settings")}
              className="flex-1 rounded-full border border-foreground/50 px-5 py-3 text-sm text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Conserver mon compte
            </button>
            <button
              disabled={
                deleteAccountConfirmation !== "SUPPRIMER MON COMPTE" ||
                submitting
              }
              onClick={() => {
                setSubmitting(true);
                void api("/account", {
                  method: "DELETE",
                  body: JSON.stringify({
                    confirmation: "SUPPRIMER MON COMPTE",
                  }),
                })
                  .then(() => {
                    clearProject();
                    return signOut({ redirectUrl: basePath() });
                  })
                  .catch((error) => {
                    setSubmitting(false);
                    setNotice(error.message);
                    setPanel("settings");
                  });
              }}
              className="flex-1 rounded-full bg-destructive px-5 py-3 text-sm font-medium text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {submitting ? "Suppression…" : "Supprimer mon compte"}
            </button>
          </div>
        </CenteredBlock>
      )}
    </>
  );
}

function ReviewCard({
  label,
  value,
  detail,
  alert = false,
}: {
  label: string;
  value: number;
  detail: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${alert ? "border-destructive/30 bg-destructive/10" : "border-border bg-card"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-[10px] uppercase tracking-[.16em] text-foreground/50">
          {label}
        </p>
        <span className="text-2xl font-light text-foreground">{value}</span>
      </div>
      <p className="mt-3 text-xs text-foreground/60">{detail}</p>
    </div>
  );
}

function ReviewLine({ label, meta }: { label: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-xl px-3 py-3 transition hover:bg-foreground/5">
      <span className="min-w-0 truncate text-sm text-foreground/90">
        {label}
      </span>
      <span className="shrink-0 text-[9px] uppercase tracking-[.14em] text-foreground/40">
        {meta}
      </span>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] uppercase tracking-[.2em] text-foreground/40">
        {label}
      </span>
      {children}
    </label>
  );
}

function Actions({
  onBack,
  submitLabel,
  disabled,
}: {
  onBack: () => void;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        className="flex-1 rounded-full border border-foreground/50 px-5 py-3 text-sm text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Retour
      </button>
      <button
        type="submit"
        disabled={disabled}
        className="flex-1 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function basePath() {
  return import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
}
