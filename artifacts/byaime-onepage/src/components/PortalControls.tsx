import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import {
  ArrowRight,
  CloudAlert,
  CloudCheck,
  CloudOff,
  Download,
  FlaskConical,
  LoaderCircle,
  PenLine,
  Upload,
  LogOut,
  Trash2,
} from "lucide-react";
import { useProject } from "@/store/project-store";
import { focusWorld, openLaboratory } from "@/lib/laboratory";
import { trackEvent } from "@/lib/analytics";
import { Link } from "wouter";
import { CenteredBlock } from "./CenteredBlock";
import { cn } from "@/lib/utils";
import {
  auditTimelineConnections,
  buildTimelineIndex,
} from "@/lib/timeline-graph";
import { effectiveGuestDietary, effectiveGuestRsvp } from "@/lib/participant-rsvp";
import {
  INVITATION_ROLE_OPTIONS,
  type InvitationRole,
} from "@/lib/collaboration-roles";
import { pendingSaveOutcomeNotice } from "@/lib/pending-save-notice";

const labels = {
  local: "Local",
  loading: "Chargement…",
  saving: "Enregistrement…",
  saved: "Enregistré",
  error: "Hors connexion",
  conflict: "À vérifier",
};

function putFile(uploadURL: string, file: File, onProgress: (progress: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadURL);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.addEventListener("progress", event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error("Échec du transfert vers l’espace privé"));
    });
    request.addEventListener("error", () => reject(new Error("Le transfert a été interrompu par le réseau")));
    request.addEventListener("abort", () => reject(new Error("Le transfert a été annulé")));
    request.send(file);
  });
}

function ReviewCard({
  label,
  value,
  detail,
  alert,
}: {
  label: string;
  value: number;
  detail: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-card p-4 transition-colors ${alert ? "border-destructive/30 bg-destructive/5" : "border-border"}`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`text-xs uppercase tracking-widest ${alert ? "text-destructive/80" : "text-foreground/50"}`}
        >
          {label}
        </span>
        <span
          className={`text-xl font-medium ${alert ? "text-destructive" : "text-foreground"}`}
        >
          {value}
        </span>
      </div>
      <p
        className={`mt-2 text-xs ${alert ? "text-destructive/70" : "text-foreground/45"}`}
      >
        {detail}
      </p>
    </div>
  );
}

function ReviewLine({
  label,
  meta,
  action,
  secondaryAction,
}: {
  label: string;
  meta: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-foreground/5">
      <div className="min-w-0 flex-1">
        <span className="truncate text-foreground/80">{label}</span>
        <span className="mt-1 block text-xs text-foreground/40">{meta}</span>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-[10px] font-medium text-background"
          >
            {action.label} <ArrowRight className="h-3 w-3" />
          </button>
        )}
        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="inline-flex items-center gap-1 rounded-full border border-foreground/15 px-3 py-1.5 text-[10px] text-foreground/70"
          >
            <FlaskConical className="h-3 w-3" /> {secondaryAction.label}
          </button>
        )}
      </div>
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
      <span className="mb-2 block text-[10px] uppercase tracking-[.25em] text-foreground/45">
        {label}
      </span>
      {children}
    </label>
  );
}

export function PortalControls({
  embedded = false,
  openMeSignal = 0,
}: {
  embedded?: boolean;
  openMeSignal?: number;
}) {
  type MeSection =
    | "overview"
    | "profile"
    | "security"
    | "privacy"
    | "preferences"
    | "worlds"
    | "sensitive";
  const { signOut, openUserProfile } = useClerk();
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
    | "me"
    | "world-settings"
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
  const [inviteRole, setInviteRole] = useState<InvitationRole>("family");
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] =
    useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [meSection, setMeSection] = useState<MeSection>("overview");
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingSaveSeenRef = useRef(false);
  const pendingSaveSuccessNoticeRef = useRef<string | null>(null);
  const canManage = currentRole === "owner" || currentRole === "planner";
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

  useEffect(() => {
    const openMe = () => {
      setMeSection("overview");
      setPanel("me");
    };
    const openWorldSettings = () => setPanel("world-settings");
    const openCollaborationInvite = () => setPanel("invite");
    window.addEventListener("aime:open-me", openMe);
    window.addEventListener("aime:open-world-settings", openWorldSettings);
    window.addEventListener("aime:open-collaboration-invite", openCollaborationInvite);
    return () => {
      window.removeEventListener("aime:open-me", openMe);
      window.removeEventListener("aime:open-world-settings", openWorldSettings);
      window.removeEventListener("aime:open-collaboration-invite", openCollaborationInvite);
    };
  }, []);
  useEffect(() => {
    if (openMeSignal > 0) {
      setMeSection("overview");
      setPanel("me");
    }
  }, [openMeSignal]);
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
      pendingSaveSuccessNoticeRef.current = null;
      return;
    }
    if (syncStatus === "saving") pendingSaveSeenRef.current = true;
    if (!pendingSaveSeenRef.current) return;
    if (syncStatus === "saved") {
      pendingSaveSeenRef.current = false;
      setNotice(
        pendingSaveOutcomeNotice(
          "saved",
          pendingSaveSuccessNoticeRef.current ?? undefined,
        ),
      );
    }
    if (syncStatus === "error") {
      pendingSaveSeenRef.current = false;
      setNotice(pendingSaveOutcomeNotice("error", undefined, syncError));
    }
    if (syncStatus === "conflict") {
      pendingSaveSeenRef.current = false;
      setNotice(pendingSaveOutcomeNotice("conflict"));
    }
  }, [notice, syncError, syncStatus]);
  useEffect(() => {
    if (panel !== "world-settings" || !project) return;
    void api(`/projects/${project.id}/files`)
      .then(setFiles)
      .catch((error) => setNotice(error.message));
  }, [panel, project?.id]);
  if (!project && !user) return null;
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
        ...project!.guests.map((g) =>
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
    if (!inviteEmail.trim() || !project) return;
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
      setPanel("world-settings");
    } catch (error) {
      setNotice(
        `Invitation non envoyée : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
      setPanel("world-settings");
    } finally {
      setSubmitting(false);
    }
  };
  const sendMessage = async () => {
    if (!recipients.trim() || !subject.trim() || !messageBody.trim() || !project) return;
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
      setPanel("world-settings");
    } catch (error) {
      setNotice(
        `E-mail non envoyé : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
      setPanel("world-settings");
    } finally {
      setSubmitting(false);
    }
  };
  const upload = async (file: File) => {
    if (!project) return;
    setSubmitting(true);
    setUploadProgress(0);
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
      await putFile(request.uploadURL, file, setUploadProgress);
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
      setUploadProgress(null);
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

  const audit = project ? auditTimelineConnections(project) : { isolated: [], dangling: [], manualMusic: [] };
  const timelineIndex = project ? buildTimelineIndex(project) : { events: new Map() };
  const reviewCount =
    audit.isolated.length +
    audit.dangling.length +
    audit.manualMusic.length +
    (syncStatus === "conflict" || syncStatus === "error" ? 1 : 0);
  const currentPath = typeof window === "undefined" ? "/profile" : window.location.pathname;
  const isProfileRoute = currentPath.endsWith("/profile");
  const openWorldContext = (request: Parameters<typeof focusWorld>[0]) => {
    setPanel(null);
    focusWorld({ route: "/user-portal", ...request });
    if (typeof window !== "undefined" && !currentPath.startsWith("/user-portal")) {
      const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
      window.history.pushState({}, "", `${basePath}/user-portal`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <>
      {project && (
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
      )}

      {panel === "me" && (
        <CenteredBlock eyebrow="ME" title="Votre compte personnel" description="Identité, accès et sécurité." onClose={() => setPanel(null)} size="lg" testId="settings-panel">
          <div data-testid="me-panel" className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="space-y-1 rounded-2xl border border-border bg-card p-2">
              {[
                ["overview", "Vue d’ensemble"],
                ["profile", "Profil personnel"],
                ["security", "Connexion et sécurité"],
                ["privacy", "Confidentialité"],
                ["preferences", "Préférences"],
                ["worlds", "Mes Mondes"],
                ["sensitive", "Zone sensible"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMeSection(id as MeSection)}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    meSection === id
                      ? "bg-foreground text-background"
                      : "text-foreground/70 hover:bg-foreground/5",
                  )}
                >
                  {label}
                </button>
              ))}
            </aside>

            <section className="min-w-0">
              {meSection === "overview" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center">
                    <img src={user?.imageUrl} alt="" className="h-14 w-14 rounded-full border border-border bg-background object-cover" />
                    <div className="min-w-0">
                      <p className="text-lg font-display font-light">{user?.fullName || user?.firstName || "Utilisateur"}</p>
                      <p className="truncate text-sm text-foreground/55">{user?.primaryEmailAddress?.emailAddress}</p>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => setMeSection("profile")} className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:bg-foreground/5">Modifier mon profil</button>
                    <button type="button" onClick={() => setMeSection("security")} className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:bg-foreground/5">Gérer ma sécurité</button>
                    <button type="button" onClick={() => setMeSection("worlds")} className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:bg-foreground/5">Voir mes Mondes</button>
                    <button type="button" onClick={() => setMeSection("sensitive")} className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:bg-foreground/5">Actions sensibles</button>
                  </div>
                  {projects.length === 0 && (
                    <p className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-foreground/55">
                      Aucun Monde pour le moment. Votre compte reste accessible.
                    </p>
                  )}
                </div>
              )}

              {meSection === "profile" && (
                <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
                  <h4 className="text-sm font-medium">Profil personnel</h4>
                  <div className="space-y-2 text-sm text-foreground/70">
                    <p>Nom: {user?.fullName || user?.firstName || "Non renseigné"}</p>
                    <p>E-mail principal: {user?.primaryEmailAddress?.emailAddress || "Non renseigné"}</p>
                    <p>
                      E-mail vérifié: {user?.primaryEmailAddress?.verification?.status === "verified" ? "Oui" : "Non"}
                    </p>
                    <p>
                      Créé le: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR") : "Indisponible"}
                    </p>
                  </div>
                  <button type="button" onClick={() => openUserProfile()} className="rounded-full border border-foreground/15 px-4 py-2 text-xs font-medium text-foreground hover:bg-foreground/5">
                    Modifier dans l’espace sécurisé
                  </button>
                </div>
              )}

              {meSection === "security" && (
                <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
                  <h4 className="text-sm font-medium">Connexion et sécurité</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                      <span>Adresse e-mail principale</span>
                      <span className="text-xs text-foreground/55">{user?.primaryEmailAddress?.verification?.status === "verified" ? "Vérifiée" : "À vérifier"}</span>
                    </div>
                    {user?.externalAccounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                        <span className="capitalize">{account.provider.replace("oauth_", "")}</span>
                        <span className="text-xs text-emerald-500">Connecté</span>
                      </div>
                    ))}
                    {user?.externalAccounts.length === 0 && (
                      <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                        <span>E-mail & mot de passe</span>
                        <span className="text-xs text-foreground/55">Actif</span>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => openUserProfile()} className="rounded-full border border-foreground/15 px-4 py-2 text-xs font-medium text-foreground hover:bg-foreground/5">
                    Ouvrir les actions avancées de sécurité
                  </button>
                </div>
              )}

              {meSection === "privacy" && (
                <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
                  <h4 className="text-sm font-medium">Confidentialité et visibilité</h4>
                  <p className="text-sm text-foreground/65">
                    Le profil de compte reste privé. La publication publique du Monde se règle dans « Réglages du Monde ».
                  </p>
                  <div className="rounded-xl border border-border px-3 py-2 text-sm">
                    Profil public du Monde actif: {project?.publicProfile?.published ? "activé" : "désactivé"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/confidentialite" className="rounded-full border border-foreground/15 px-4 py-2 text-xs hover:bg-foreground/5">
                      Politique de confidentialité
                    </Link>
                    <a href="/api/account/export" className="rounded-full border border-foreground/15 px-4 py-2 text-xs hover:bg-foreground/5">
                      Exporter mes données
                    </a>
                  </div>
                </div>
              )}

              {meSection === "preferences" && (
                <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
                  <h4 className="text-sm font-medium">Préférences</h4>
                  <p className="text-sm text-foreground/65">
                    Les préférences globales (ex: apparence claire/sombre) restent accessibles depuis le menu principal.
                  </p>
                  <p className="text-xs text-foreground/50">
                    Langue, fuseau horaire et notifications avancées seront intégrés dans cette section.
                  </p>
                </div>
              )}

              {meSection === "worlds" && (
                <div className="space-y-4">
                  <h4 className="text-[10px] uppercase tracking-[.25em] text-foreground/40 font-semibold">Mondes accessibles</h4>
                  {projects.length > 0 && (
                    <select
                      data-testid="active-project-select"
                      value={project?.id ?? ""}
                      onChange={(event) => void selectProject(event.target.value)}
                      className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {projects.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title} · {item.role}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 hide-scrollbar">
                    {projects.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { selectProject(item.id); setPanel(null); }}
                        className={cn("flex w-full items-center justify-between rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", item.id === project?.id ? "border-brand-accent/30 bg-brand-accent/5" : "border-border bg-card hover:border-foreground/20 hover:bg-foreground/[.02]")}
                      >
                        <div>
                          <div className={cn("mb-1 text-sm font-medium", item.id === project?.id ? "text-brand-accent" : "text-foreground")}>{item.title}</div>
                          <div className="text-[10px] uppercase tracking-[.15em] text-foreground/50">{item.role}</div>
                        </div>
                        {item.id === project?.id && <div className="h-2.5 w-2.5 rounded-full bg-brand-accent shadow-[0_0_12px_hsl(var(--brand-accent)/0.7)]" />}
                      </button>
                    ))}
                    {projects.length === 0 && (
                      <p className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-foreground/55">
                        Aucun Monde pour le moment. Votre compte reste accessible.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {meSection === "sensitive" && (
                <div className="space-y-3 border-t border-border pt-4">
                  <a href="/api/account/export" className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-sm font-medium text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent hover:border-border">
                    <Download className="h-4 w-4" /> Exporter mes données personnelles
                  </a>
                  <button onClick={() => signOut({ redirectUrl: basePath })} className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-sm font-medium text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent hover:border-border">
                    <LogOut className="h-4 w-4" /> Se déconnecter
                  </button>
                  <button onClick={() => setPanel("delete-account")} className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-sm font-medium text-destructive/80 transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent hover:border-destructive/20">
                    <Trash2 className="h-4 w-4" /> Supprimer mon compte
                  </button>
                </div>
              )}
            </section>
          </div>
        </CenteredBlock>
      )}

      {panel === "sync" && project && (
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
            syncStatus === "conflict" ||
            syncStatus === "error" ||
            audit.dangling.length > 0 ||
            audit.manualMusic.length > 0) && (
            <div className="mt-6 space-y-1 border-t border-border pt-5">
              {(syncStatus === "conflict" || syncStatus === "error") && (
                <ReviewLine
                  label={syncStatus === "conflict" ? "Une version du Monde demande vérification" : "La synchronisation a rencontré un problème"}
                  meta={syncError || labels[syncStatus]}
                  action={{
                    label: "Réglages du Monde",
                    onClick: () => {
                      setPanel("world-settings");
                    },
                  }}
                  secondaryAction={{
                    label: "En parler au Laboratoire",
                    onClick: () => openLaboratory({
                      type: "bug",
                      context: {
                        projectId: project.id,
                        role: currentRole,
                        route: isProfileRoute ? "profile" : "world",
                        path: currentPath,
                        source: "universal-review-sync",
                        syncStatus,
                        narrative: syncStatus === "conflict"
                          ? "Conflit de sauvegarde détecté dans le Contrôle universel."
                          : "Erreur de synchronisation rencontrée dans le Contrôle universel.",
                      },
                    }),
                  }}
                />
              )}
              {audit.isolated.slice(0, 4).map((entity) => (
                <ReviewLine
                  key={`isolated:${entity.kind}:${entity.id}`}
                  label={entity.label}
                  meta={`${entity.kind} · sans Moment`}
                  action={{
                    label: "Voir le graphe",
                    onClick: () => openWorldContext({
                      auditView: "isolated",
                      entityKind: entity.kind,
                      entityId: entity.id,
                    }),
                  }}
                  secondaryAction={{
                    label: "En parler au Laboratoire",
                    onClick: () => openLaboratory({
                      type: "remarque",
                      context: {
                        projectId: project.id,
                        role: currentRole,
                        route: "world",
                        path: "/user-portal",
                        source: "universal-review-isolated",
                        auditView: "isolated",
                        entityKind: entity.kind,
                        entityId: entity.id,
                        entityLabel: entity.label,
                        narrative: "Élément sans lien détecté par AIME dans le graphe du Monde.",
                      },
                    }),
                  }}
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
                  action={{
                    label: "Voir le lien",
                    onClick: () => openWorldContext({
                      auditView: "dangling",
                      momentId: eventId,
                      entityKind: relation.kind,
                      entityId: relation.id,
                    }),
                  }}
                  secondaryAction={{
                    label: "En parler au Laboratoire",
                    onClick: () => openLaboratory({
                      type: "remarque",
                      context: {
                        projectId: project.id,
                        role: currentRole,
                        route: "world",
                        path: "/user-portal",
                        source: "universal-review-dangling",
                        auditView: "dangling",
                        momentId: eventId,
                        momentTitle: timelineIndex.events.get(eventId)?.title,
                        entityKind: relation.kind,
                        entityId: relation.id,
                        narrative: "Lien incomplet détecté entre un Moment et une référence absente.",
                      },
                    }),
                  }}
                />
              ))}
              {audit.manualMusic.slice(0, 4).map((track) => (
                <ReviewLine
                  key={`music:${track.id}`}
                  label={track.title}
                  meta={`${track.artist} · ajouté à la main`}
                  action={{
                    label: "Ouvrir Musique",
                    onClick: () => openWorldContext({
                      panel: "music",
                      auditView: "music",
                      entityKind: "music",
                      entityId: track.id,
                      musicTrackId: track.id,
                    }),
                  }}
                  secondaryAction={{
                    label: "En parler au Laboratoire",
                    onClick: () => openLaboratory({
                      type: "suggestion",
                      context: {
                        projectId: project.id,
                        role: currentRole,
                        route: "world",
                        path: "/user-portal",
                        source: "universal-review-music",
                        panel: "music",
                        auditView: "music",
                        entityKind: "music",
                        entityId: track.id,
                        entityLabel: track.title,
                        narrative: "Morceau manuel à reconnaître ou conserver dans le module Musique.",
                      },
                    }),
                  }}
                />
              ))}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              data-testid="me-open"
              onClick={() => setPanel("me")}
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

      {panel === "editor" && project && (
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
              setPanel("world-settings");
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

      {panel === "world-settings" && project && (
        <CenteredBlock
          eyebrow="Réglages du Monde"
          title={project.title}
          description={`Rôle actuel : ${currentRole}`}
          onClose={() => setPanel(null)}
          size="lg"
          testId="world-settings-panel"
        >
          {notice && (
            <p className="mb-5 border-l border-foreground/30 py-1 pl-3 text-sm text-foreground/60">
              {notice}
            </p>
          )}
          {uploadProgress !== null && (
            <div role="status" aria-live="polite" className="mb-5 rounded-xl border border-border bg-card p-3">
              <div className="flex justify-between text-xs text-foreground/60">
                <span>Transfert vers l’espace privé</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
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
                      className="text-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      Aperçu
                    </a>
                    <a
                      href={`/api/storage/files/${file.id}?download=1`}
                      className="text-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      Télécharger
                    </a>
                    {canManage && (
                      <button
                        className="text-foreground/40 transition hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
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
                      personnelles restent privés.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className="mt-1 shrink-0 accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    checked={project.publicProfile?.published === true}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      pendingSaveSuccessNoticeRef.current =
                        enabled
                          ? "Profil public activé"
                          : "Profil masqué au public";
                      updateProject({
                        publicProfile: {
                          ...project.publicProfile,
                          published: enabled,
                        },
                      });
                      setNotice(
                        "Publication modifiée — enregistrement en cours",
                      );
                    }}
                  />
                </label>
                {project.publicProfile?.published && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Link
                      data-testid="link-public-profile"
                      href={`/profil/${project.id}`}
                      className="flex-1 rounded-full border border-foreground/15 px-4 py-2.5 text-center text-xs transition hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Voir le profil
                    </Link>
                    <button
                      type="button"
                      data-testid="copy-public-profile-link"
                      onClick={() => {
                        const prefix = basePath === "/" ? "" : basePath;
                        void navigator.clipboard
                          .writeText(`${window.location.origin}${prefix}/profil/${project.id}`)
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
            {currentRole === "owner" && (
              <div className="mt-6 border-t border-border pt-6">
                <button
                  onClick={() => setPanel("delete-project")}
                  className="text-sm text-destructive transition hover:text-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  Supprimer ce Monde
                </button>
                <p className="mt-2 text-xs font-light text-foreground/50">
                  Cette action est définitive et concerne uniquement ce Monde.
                </p>
              </div>
            )}
          </div>
        </CenteredBlock>
      )}

      {panel === "invite" && project && (
        <CenteredBlock
          eyebrow="Équipe"
          title="Inviter à collaborer"
          description="Les personnes invitées pourront se connecter pour consulter ou modifier ce Monde selon leur rôle."
          onClose={() => setPanel("world-settings")}
        >
          <div className="space-y-5">
            <Field label="E-mail">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="prenom@exemple.com"
                className="field"
                disabled={submitting}
              />
            </Field>
            <Field label="Rôle">
              <select
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as InvitationRole)
                }
                className="w-full rounded-xl border border-border bg-card p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={submitting}
              >
                {INVITATION_ROLE_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    className="bg-background text-foreground"
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <button
              onClick={() => void invite()}
              disabled={submitting || !inviteEmail.trim()}
              className="w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {submitting ? "Envoi en cours…" : "Envoyer l’invitation"}
            </button>
          </div>
        </CenteredBlock>
      )}
      {panel === "message" && project && (
        <CenteredBlock
          eyebrow="Communication"
          title="Envoyer un e-mail"
          description="Envoyer une information pratique ou relancer les professionnels."
          onClose={() => setPanel("world-settings")}
          size="lg"
        >
          <div className="space-y-5">
            <Field label="Destinataires">
              <input
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="Adresses séparées par des virgules"
                className="field"
                disabled={submitting}
              />
            </Field>
            <Field label="Objet">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="field"
                disabled={submitting}
              />
            </Field>
            <Field label="Message">
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="w-full rounded-xl border border-border bg-card p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                rows={6}
                disabled={submitting}
              />
            </Field>
            <button
              onClick={() => void sendMessage()}
              disabled={
                submitting ||
                !recipients.trim() ||
                !subject.trim() ||
                !messageBody.trim()
              }
              className="w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {submitting ? "Envoi en cours…" : "Envoyer l’e-mail"}
            </button>
          </div>
        </CenteredBlock>
      )}
      {panel === "delete-file" && project && selectedFile && (
        <CenteredBlock
          eyebrow="Suppression"
          title="Supprimer ce fichier ?"
          description={`Vous êtes sur le point de supprimer définitivement le fichier "${selectedFile.name}". Cette action est irréversible.`}
          onClose={() => setPanel("world-settings")}
        >
          <div className="flex gap-3">
            <button
              data-testid="delete-file-confirm"
              disabled={submitting}
              onClick={async () => {
                if (submitting) return;
                setSubmitting(true);
                try {
                  await api(`/storage/files/${selectedFile.id}`, {
                    method: "DELETE",
                  });
                  setFiles((prev) =>
                    prev.filter((f) => f.id !== selectedFile.id),
                  );
                  setNotice(`Fichier ${selectedFile.name} supprimé.`);
                  setPanel("world-settings");
                  trackEvent("file_deleted");
                } catch (err) {
                  setNotice(
                    err instanceof Error ? err.message : "Erreur de suppression",
                  );
                  setPanel("world-settings");
                } finally {
                  setSubmitting(false);
                }
              }}
              className="flex-1 rounded-full bg-destructive px-5 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {submitting ? "Suppression…" : "Supprimer"}
            </button>
            <button
              onClick={() => setPanel("world-settings")}
              className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Annuler
            </button>
          </div>
        </CenteredBlock>
      )}
      {panel === "delete-project" && project && (
        <CenteredBlock
          eyebrow="Zone critique"
          title="Supprimer ce Monde"
          description="Cette action est définitive et détruira toutes les données (invités, tâches, budget, documents) liées à ce projet."
          onClose={() => setPanel("world-settings")}
        >
          <div className="space-y-5">
            <Field label="Confirmation">
              <input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Tapez SUPPRIMER pour confirmer"
                className="field"
              />
            </Field>
            <div className="flex gap-3">
              <button
                disabled={
                  deleteConfirmation !== "SUPPRIMER" || submitting
                }
                onClick={async () => {
                  if (submitting) return;
                  setSubmitting(true);
                  try {
                    await api(`/projects/${project.id}`, {
                      method: "DELETE",
                      body: JSON.stringify({ confirmation: "SUPPRIMER" }),
                    });
                    clearProject();
                    trackEvent("project_deleted");
                    window.location.assign(basePath || "/");
                  } catch (err) {
                    setSubmitting(false);
                    setNotice(
                      err instanceof Error
                        ? err.message
                        : "Erreur de suppression",
                    );
                    setPanel("world-settings");
                  }
                }}
                className="flex-1 rounded-full bg-destructive px-5 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {submitting ? "Suppression…" : "Détruire"}
              </button>
              <button
                onClick={() => {
                  setDeleteConfirmation("");
                  setPanel("world-settings");
                }}
                className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Annuler
              </button>
            </div>
          </div>
        </CenteredBlock>
      )}
      {panel === "delete-account" && (
        <CenteredBlock
          eyebrow="Zone critique"
          title="Supprimer mon compte"
          description="Cette action détruira définitivement votre profil, tous les Mondes dont vous êtes propriétaire et retirera votre accès aux autres Mondes."
          onClose={() => setPanel("me")}
        >
          <div className="space-y-5">
            <Field label="Confirmation">
              <input
                data-testid="account-delete-confirmation"
                value={deleteAccountConfirmation}
                onChange={(e) => setDeleteAccountConfirmation(e.target.value)}
                placeholder="Tapez SUPPRIMER MON COMPTE pour confirmer"
                className="field"
              />
            </Field>
            <div className="flex gap-3">
              <button
                data-testid="account-delete-submit"
                disabled={
                  deleteAccountConfirmation !== "SUPPRIMER MON COMPTE" ||
                  submitting
                }
                onClick={async () => {
                  if (submitting) return;
                  setSubmitting(true);
                  try {
                    await api(`/account`, {
                      method: "DELETE",
                      body: JSON.stringify({
                        confirmation: "SUPPRIMER MON COMPTE",
                      }),
                    });
                    trackEvent("account_deleted");
                    await signOut({ redirectUrl: basePath || "/" });
                  } catch (err) {
                    setSubmitting(false);
                    setNotice(
                      err instanceof Error
                        ? err.message
                        : "Erreur de suppression du compte",
                    );
                    setPanel("me");
                  }
                }}
                className="flex-1 rounded-full bg-destructive px-5 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {submitting ? "Suppression…" : "Détruire mon compte"}
              </button>
              <button
                onClick={() => {
                  setDeleteAccountConfirmation("");
                  setPanel("me");
                }}
                className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Annuler
              </button>
            </div>
          </div>
        </CenteredBlock>
      )}
    </>
  );
}
