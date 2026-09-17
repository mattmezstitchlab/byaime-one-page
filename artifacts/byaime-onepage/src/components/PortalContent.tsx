import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import {
  Download,
  Upload,
  LogOut,
  Trash2,
} from "lucide-react";
import { useProject } from "@/store/project-store";
import { useI18n, type Translate } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { Link, useLocation } from "wouter";
import { CenteredBlock } from "./CenteredBlock";
import { VisualImportControl } from "./VisualImportControl";
import { WorldSwitcher } from "./WorldSwitcher";
import { cn } from "@/lib/utils";
import { effectiveGuestDietary, effectiveGuestRsvp } from "@/lib/participant-rsvp";
import {
  getInvitationRoleOptions,
  roleDisplayName,
  type InvitationRole,
} from "@/lib/collaboration-roles";
import { pendingSaveOutcomeNotice } from "@/lib/pending-save-notice";
import { getUniversalCreateActions, type UniversalCreateActionId } from "@/lib/universal/create-actions";
import { CalendarDays, ClipboardList, FileText, Users } from "lucide-react";

/*
 * Le contenu des espaces « ME », « Réglages du Monde », « Modifier
 * l'ouverture » et « Créer » — porté par la zone de contenu du Panneau AIME
 * (17/09, phase 3).
 *
 * Plus de modale propre et plus de bouton dans l'en-tête : c'est le panneau
 * qui ouvre, titre et ferme. Ce composable ne porte que l'état et les gestes
 * (upload, invitations, exports, suppressions). Les quatre confirmations de
 * bas de route (invitation, suppression de fichier / Monde / compte) restent
 * des fenêtres posées sur le contenu : ce sont des gestes, pas de la
 * navigation.
 *
 * P5 (17/09) : chaque chaîne passe par le dictionnaire FR/EN — plus de
 * français durci dans l'espace privé.
 */

export type PortalContentMode = "create" | "me" | "world-settings" | "hero-editor";

type MeSection =
  | "overview"
  | "profile"
  | "security"
  | "privacy"
  | "preferences"
  | "worlds"
  | "sensitive";

const createActionIcons = {
  person: Users,
  moment: CalendarDays,
  task: ClipboardList,
  "document-media": FileText,
} satisfies Partial<Record<UniversalCreateActionId, typeof Users>>;

function putFile(
  uploadURL: string,
  file: File,
  onProgress: (progress: number) => void,
  t: Translate,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadURL);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.addEventListener("progress", event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(t("upload.failedServer")));
    });
    request.addEventListener("error", () => reject(new Error(t("upload.networkStopped"))));
    request.addEventListener("abort", () => reject(new Error(t("upload.aborted"))));
    request.send(file);
  });
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

export function PortalContent({
  mode,
  onMode,
  inviteSignal = 0,
}: {
  mode: PortalContentMode;
  /** Bascule de section DANS le panneau (l'éditeur enregistre → réglages). */
  onMode: (mode: PortalContentMode) => void;
  /** L'assistant ou le dossier Invités demande l'invitation : on y va direct. */
  inviteSignal?: number;
}) {
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
  const { locale, setLocale, t } = useI18n();
  const [, navigate] = useLocation();
  type WorldSettingsSub = "settings" | "invite" | "delete-file" | "delete-project";
  const [wsSub, setWsSub] = useState<WorldSettingsSub>("settings");
  const [meSection, setMeSection] = useState<MeSection>("overview");
  const [meAccountDelete, setMeAccountDelete] = useState(false);
  const [notice, setNotice] = useState("");
  /*
   * Deux sources, un seul type : le serveur renvoie `contentType`, le repli
   * local-first (Galerie unifiée) renvoie `createdAt`. Les deux champs sont
   * optionnels pour que `setFiles` accepte l'une ou l'autre liste.
   */
  const [files, setFiles] = useState<
    { id: string; name: string; size: number; contentType?: string; createdAt?: string }[]
  >([]);
  const [selectedFile, setSelectedFile] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InvitationRole>("family");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] =
    useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /*
   * Le backend est optionnel : l'app est local-first. Ce drapeau démarre
   * optimiste et bascule dès qu'un appel échoue, pour que l'interface serve
   * les documents locaux, note les invitations sur place et libellé
   * « Ouvrir local » au lieu d'« Aperçu ».
   */
  const [apiAvailable, setApiAvailable] = useState(true);
  /*
   * Suivi de l'enregistrement : quand une notice « enregistrement en cours »
   * est posée (drapeau ci-dessous), le passage du store saving →
   * saved/error/conflict est remplacé par le sort réel. Un drapeau plutôt
   * qu'une lecture du texte : la notice est FR ou EN, le suivi ne dépend pas
   * de la langue.
   */
  const pendingSaveActiveRef = useRef(false);
  const pendingSaveSeenRef = useRef(false);
  const pendingSaveSuccessNoticeRef = useRef<string | null>(null);
  const markPendingSave = (noticeText: string) => {
    pendingSaveActiveRef.current = true;
    pendingSaveSeenRef.current = false;
    setNotice(noticeText);
  };
  const canManage = currentRole === "owner" || currentRole === "planner";
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

  /* La demande d'invitation (dossier Invités, actions de l'assistant) :
     le panneau a déjà sélectionné « Réglages du Monde », on plonge direct
     dans la sous-section. */
  useEffect(() => {
    if (inviteSignal > 0 && mode === "world-settings") setWsSub("invite");
  }, [inviteSignal, mode]);

  const api = async (path: string, init?: RequestInit) => {
    try {
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
          body?.error || body?.providerError || t("upload.errorStatus", { status: response.status }),
        );
      return body;
    } catch (err) {
      if (String(path).includes("/files") || String(path).includes("/storage") || String(path).includes("/invitations") || String(path).includes("/privacy") || String(path).includes("/account")) {
        setApiAvailable(false);
      }
      throw err;
    }
  };
  useEffect(() => {
    if (!pendingSaveActiveRef.current) return;
    if (syncStatus === "saving") pendingSaveSeenRef.current = true;
    if (!pendingSaveSeenRef.current) return;
    if (syncStatus === "saved") {
      pendingSaveActiveRef.current = false;
      setNotice(
        pendingSaveOutcomeNotice(
          "saved",
          pendingSaveSuccessNoticeRef.current ?? undefined,
          undefined,
          locale,
        ),
      );
    }
    if (syncStatus === "error") {
      pendingSaveActiveRef.current = false;
      setNotice(pendingSaveOutcomeNotice("error", undefined, syncError, locale));
    }
    if (syncStatus === "conflict") {
      pendingSaveActiveRef.current = false;
      setNotice(pendingSaveOutcomeNotice("conflict", undefined, undefined, locale));
    }
  }, [syncError, syncStatus, locale]);
  useEffect(() => {
    if (mode !== "world-settings" || wsSub !== "settings" || !project) return;
    void api(`/projects/${project.id}/files`)
      .then(setFiles)
      .catch(() => {
        setApiAvailable(false);
        const local = (project.documents || []).map((d) => ({ id: d.id, name: d.title, size: 0, createdAt: new Date(d.at || Date.now()).toISOString() }));
        setFiles(local);
        setNotice(t("ws.localDocs"));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, wsSub, project?.id, project?.documents]);
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
      if (!apiAvailable) {
        setNotice(t("ws.inviteLocal", { email, role: roleDisplayName(inviteRole, locale) }));
        setInviteEmail("");
        setWsSub("settings");
        return;
      }
      await api(`/projects/${project.id}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email, role: inviteRole }),
      });
      trackEvent("collaborator_invitation_sent");
      setNotice(t("ws.inviteSent", { email }));
      setInviteEmail("");
      setWsSub("settings");
    } catch (error) {
      setApiAvailable(false);
      setNotice(
        t("ws.inviteLocalError", {
          email,
          error: error instanceof Error ? error.message : "—",
        }),
      );
      setWsSub("settings");
    } finally {
      setSubmitting(false);
    }
  };
  const upload = async (file: File) => {
    if (!project) return;
    setSubmitting(true);
    setUploadProgress(0);
    setNotice(t("upload.inProgress", { name: file.name }));
    try {
      if (!apiAvailable) {
        const reader = new FileReader();
        const dataUrl: string = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error(t("upload.readFailed")));
          reader.readAsDataURL(file);
        });
        const newDoc = { id: Math.random().toString(36).slice(2), title: file.name, kind: "autre" as const, url: dataUrl, at: Date.now() };
        // @ts-ignore local fallback
        updateProject({ documents: [...(project.documents || []), newDoc] });
        setFiles((prev: any) => [...prev, { id: newDoc.id, name: newDoc.title, size: file.size, createdAt: new Date().toISOString() }]);
        trackEvent("file_added");
        setNotice(t("upload.addedLocal", { name: file.name }));
        return;
      }
      const request = await api("/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      await putFile(request.uploadURL, file, setUploadProgress, t);
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
      setNotice(t("upload.saved", { name: file.name }));
    } catch (err) {
      if (!apiAvailable) {
        // handled
      } else {
        setNotice(err instanceof Error ? err.message : t("upload.failed"));
        setApiAvailable(false);
      }
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /* ——— CRÉER (ex GlobalCreateCenter) : la création vit dans le panneau. ——— */
  if (mode === "create") {
    const availableActions = getUniversalCreateActions(locale).filter(
      action => action.availableInCurrentProject && action.id in createActionIcons,
    );
    return (
      <div data-testid="portal-create" className="space-y-6">
        {!project ? (
          <button
            type="button"
            onClick={() => {
              navigate("/user-portal");
            }}
            className="w-full rounded-2xl bg-foreground px-5 py-4 text-sm font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("create.startWorld")}
          </button>
        ) : (
          <>
            <p className="rounded-xl border border-foreground/10 bg-foreground/[.035] p-4 text-xs leading-relaxed text-foreground/55">
              {t("create.hint", { title: project.title })}
            </p>
            {!canEdit && <p className="rounded-xl border border-foreground/10 bg-foreground/[.035] p-4 text-xs leading-relaxed text-foreground/55">{t("create.readOnly")}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {availableActions.map(action => {
                const Icon = createActionIcons[action.id as keyof typeof createActionIcons];
                const canUse = canEdit && (action.id !== "document-media" || currentRole === "owner" || currentRole === "planner");
                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={!canUse}
                    onClick={() => {
                      /* Le Monde est la seule destination privée : l'événement
                         suffit — le panneau se referme pour laisser place au
                         cockpit (AimePanel écoute `aime:open-create-target`). */
                      window.dispatchEvent(new CustomEvent<UniversalCreateActionId>("aime:open-create-target", { detail: action.id }));
                    }}
                    className="group flex min-h-32 items-start gap-4 rounded-2xl border border-foreground/10 bg-foreground/[.035] p-5 text-left transition hover:border-foreground/25 hover:bg-foreground/[.07] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground/5 text-foreground/55 transition group-hover:bg-foreground group-hover:text-background"><Icon className="h-4 w-4" /></span>
                    <span>
                      <span className="block text-sm font-medium text-foreground/80">{action.label}</span>
                      <span className="mt-2 block text-xs font-light leading-relaxed text-foreground/45">{action.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] uppercase tracking-[.15em] text-foreground/35">{t("create.footnote")}</p>
          </>
        )}
      </div>
    );
  }

  /* ——— MODIFIER L'OUVERTURE (ex modale « Éditer » de l'en-tête). ——— */
  if (mode === "hero-editor") {
    if (!project) {
      return (
        <p className="text-sm text-foreground/55">
          {t("heroEdit.noProject")}
        </p>
      );
    }
    return (
      <form
        data-testid="portal-hero-editor"
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
          markPendingSave(t("heroEdit.saved"));
          onMode("world-settings");
        }}
      >
        <Field label={t("heroEdit.title")}>
          <input name="title" required defaultValue={project.title} className="field" />
        </Field>
        <Field label={t("heroEdit.subtitle")}>
          <input name="subtitle" defaultValue={project.subtitle || ""} className="field" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("heroEdit.city")}>
            <input name="city" defaultValue={project.city.value || ""} className="field" />
          </Field>
          <Field label={t("heroEdit.venue")}>
            <input name="venue" defaultValue={project.venue.value || ""} className="field" />
          </Field>
        </div>
        <Field label={t("heroEdit.date")}>
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
        <div>
          <span className="mb-2 block text-[10px] uppercase tracking-[.25em] text-foreground/45">
            {t("heroEdit.visualLabel")}
          </span>
          <VisualImportControl
            label={t("heroEdit.visualField")}
            value={project.heroVisual}
            onChange={heroVisual => {
              updateProject({ heroVisual });
              markPendingSave(t("heroEdit.visualSaved"));
            }}
          />
        </div>
        <button className="w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t("heroEdit.save")}
        </button>
      </form>
    );
  }

  /* ——— RÉGLAGES DU MONDE (ex modale « world-settings »). ——— */
  if (mode === "world-settings") {
    if (!project) {
      return (
        <p className="text-sm text-foreground/55">
          {t("ws.noProject")}
        </p>
      );
    }
    return (
      <div data-testid="portal-world-settings">
        {wsSub === "settings" && (
          <>
            <p className="mb-4 text-xs text-foreground/50" data-testid="world-settings-role">{t("ws.role", { role: roleDisplayName(currentRole, locale) })}</p>
            {notice && (
              <p className="mb-5 border-l border-foreground/30 py-1 pl-3 text-sm text-foreground/60">
                {notice}
              </p>
            )}
            {project.persona === "pro" && (
              <p data-testid="world-settings-persona" className="mb-5 rounded-xl border border-border bg-card px-4 py-3 text-xs text-foreground/60">
                {t("ws.personaPro")}
              </p>
            )}
            {uploadProgress !== null && (
              <div role="status" aria-live="polite" className="mb-5 rounded-xl border border-border bg-card p-3">
                <div className="flex justify-between text-xs text-foreground/60">
                  <span>{t("ws.uploadTitle")}</span>
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
                  onClick={() => setWsSub("invite")}
                  className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("ws.invite")}
                </button>
              )}
              {canManage && (
                <button
                  disabled={submitting}
                  onClick={() => fileRef.current?.click()}
                  className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Upload className="h-4 w-4" />{" "}
                  {submitting ? t("ws.busy") : t("ws.addFile")}
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
                <>
                  <a
                    href={`/api/projects/${project.id}/export`}
                    onClick={() =>
                      trackEvent("project_exported", { format: "json" })
                    }
                    className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Download className="h-4 w-4" /> {t("ws.serverBackup")}
                  </a>
                  <button
                    onClick={() => {
                      const json = JSON.stringify(project, null, 2);
                      const blob = new Blob([json], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${project.title || "monde"}-${new Date().toISOString().slice(0,10)}.byaime.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      trackEvent("project_exported", { format: "byaime-local" });
                      setNotice(t("ws.localExportDone"));
                    }}
                    className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Download className="h-4 w-4" /> {t("ws.localExport")}
                  </button>
                </>
              )}
              <button
                onClick={exportCsv}
                className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("ws.csv")}
              </button>
              <button
                onClick={() => window.print()}
                className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("ws.print")}
              </button>
              <button
                onClick={() => document.getElementById("backup-input")?.click()}
                className="action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("ws.importJson")}
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
                    markPendingSave(t("ws.imported"));
                  } catch (err) {
                    setNotice(
                      err instanceof Error ? err.message : t("ws.importFailed"),
                    );
                  }
                }}
              />
            </div>
            {files.length > 0 && (
              <div className="mt-8 border-t border-border pt-6">
                <h3 className="font-medium mb-3">{t("ws.filesTitle")}</h3>
                <div className="space-y-2">
                  {files.map((file) => {
                    const localDoc = (project?.documents || []).find((d: any) => d.id === file.id);
                    const href = !apiAvailable && localDoc?.url ? localDoc.url : `/api/storage/files/${file.id}`;
                    const dlHref = !apiAvailable && localDoc?.url ? localDoc.url : `/api/storage/files/${file.id}?download=1`;
                    return (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 rounded-xl bg-card p-3 text-xs border border-border"
                    >
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={href}
                        download={!apiAvailable ? file.name : undefined}
                        className="text-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        {apiAvailable ? t("ws.preview") : t("ws.openLocal")}
                      </a>
                      <a
                        href={dlHref}
                        download={file.name}
                        className="text-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        {t("ws.download")}
                      </a>
                      {canManage && (
                        <button
                          className="text-foreground/40 transition hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          onClick={() => {
                            setSelectedFile({ id: file.id, name: file.name });
                            setWsSub("delete-file");
                          }}
                        >
                          {t("ws.delete")}
                        </button>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-8 border-t border-border pt-6">
              <h3 className="font-medium mb-2">{t("ws.privacyTitle")}</h3>
              <p className="text-xs text-foreground/50 mb-3">
                {t("ws.privacyText")}
              </p>
              {currentRole === "owner" && (
                <select
                  defaultValue="365"
                  onChange={(e) => {
                    const days = Number(e.target.value);
                    if (!apiAvailable) {
                      setNotice(t("ws.retentionLocal", { days }));
                      return;
                    }
                    void api(`/projects/${project.id}/privacy`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        retentionDays: days,
                      }),
                    })
                      .then(() => setNotice(t("ws.prefSaved")))
                      .catch(() => {
                        setApiAvailable(false);
                        setNotice(t("ws.retentionLocalMode", { days }));
                      });
                  }}
                  className="w-full rounded-xl border border-border bg-card p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option className="bg-background text-foreground" value="180">
                    {t("ws.retention180")}
                  </option>
                  <option className="bg-background text-foreground" value="365">
                    {t("ws.retention365")}
                  </option>
                  <option className="bg-background text-foreground" value="1095">
                    {t("ws.retention1095")}
                  </option>
                </select>
              )}
              {currentRole === "owner" && (
                <div className="mt-6 border-t border-border pt-6">
                  <label className="flex items-start justify-between gap-5">
                    <span>
                      <span className="block text-sm">{t("ws.publicTitle")}</span>
                      <span className="mt-1 block text-xs font-light leading-relaxed text-foreground/50">
                        {t("ws.publicText")}
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
                            ? t("ws.publicEnabled")
                            : t("ws.publicDisabled");
                        updateProject({
                          publicProfile: {
                            ...project.publicProfile,
                            published: enabled,
                          },
                        });
                        markPendingSave(t("ws.publicChanged"));
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
                        {t("ws.viewProfile")}
                      </Link>
                      <button
                        type="button"
                        data-testid="copy-public-profile-link"
                        onClick={() => {
                          const prefix = basePath === "/" ? "" : basePath;
                          void navigator.clipboard
                            .writeText(`${window.location.origin}${prefix}/profil/${project.id}`)
                            .then(() => setNotice(t("ws.linkCopied")));
                        }}
                        className="flex-1 rounded-full bg-foreground px-4 py-2.5 text-xs font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {t("ws.copyLink")}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {currentRole === "owner" && (
                <div className="mt-6 border-t border-border pt-6">
                  <button
                    onClick={() => setWsSub("delete-project")}
                    className="text-sm text-destructive transition hover:text-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    {t("ws.deleteProject")}
                  </button>
                  <p className="mt-2 text-xs font-light text-foreground/50">
                    {t("ws.deleteProjectNote")}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        {wsSub === "invite" && (
          <div className="space-y-5">
            <Field label={t("ws.inviteEmail")}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="prenom@exemple.com"
                className="field"
                disabled={submitting}
              />
            </Field>
            <Field label={t("ws.inviteRole")}>
              <select
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as InvitationRole)
                }
                className="w-full rounded-xl border border-border bg-card p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={submitting}
              >
                {getInvitationRoleOptions(locale).map((option) => (
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
              {submitting ? t("ws.sending") : t("ws.sendInvite")}
            </button>
            <button
              type="button"
              onClick={() => setWsSub("settings")}
              className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("ws.backSettings")}
            </button>
          </div>
        )}
        {wsSub === "delete-file" && selectedFile && (
          <div className="space-y-5">
            <p className="text-sm text-foreground/70">
              {t("ws.deleteFileText", { name: selectedFile.name })}
            </p>
            <div className="flex gap-3">
              <button
                data-testid="delete-file-confirm"
                disabled={submitting}
                onClick={async () => {
                  if (submitting) return;
                  setSubmitting(true);
                  try {
                    if (!apiAvailable) {
                      // Local fallback : supprime dans documents
                      // @ts-ignore
                      updateProject({ documents: (project?.documents || []).filter((d: any) => d.id !== selectedFile.id) });
                      setFiles((prev) => prev.filter((f) => f.id !== selectedFile.id));
                      setNotice(t("ws.fileDeletedLocal", { name: selectedFile.name }));
                      setWsSub("settings");
                      trackEvent("file_deleted");
                      return;
                    }
                    await api(`/storage/files/${selectedFile.id}`, {
                      method: "DELETE",
                    });
                    setFiles((prev) =>
                      prev.filter((f) => f.id !== selectedFile.id),
                    );
                    setNotice(t("ws.fileDeleted", { name: selectedFile.name }));
                    setWsSub("settings");
                    trackEvent("file_deleted");
                  } catch (err) {
                    setApiAvailable(false);
                    // @ts-ignore
                    updateProject({ documents: (project?.documents || []).filter((d: any) => d.id !== selectedFile.id) });
                    setFiles((prev) => prev.filter((f) => f.id !== selectedFile.id));
                    setNotice(t("ws.fileDeletedLocalMode", { name: selectedFile.name }));
                    setWsSub("settings");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="flex-1 rounded-full bg-destructive px-5 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {submitting ? t("ws.deleting") : t("ws.delete")}
              </button>
              <button
                onClick={() => setWsSub("settings")}
                className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("ws.cancel")}
              </button>
            </div>
          </div>
        )}
        {wsSub === "delete-project" && (
          <div className="space-y-5">
            <p className="text-sm text-foreground/70">
              {t("ws.deleteProjectText")}
            </p>
            <Field label={t("ws.confirmLabel")}>
              <input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={t("ws.typeToDelete")}
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
                    if (!apiAvailable) {
                      clearProject();
                      trackEvent("project_deleted");
                      window.location.assign(basePath || "/");
                      return;
                    }
                    await api(`/projects/${project.id}`, {
                      method: "DELETE",
                      body: JSON.stringify({ confirmation: "SUPPRIMER" }),
                    });
                    clearProject();
                    trackEvent("project_deleted");
                    window.location.assign(basePath || "/");
                  } catch (err) {
                    setApiAvailable(false);
                    clearProject();
                    trackEvent("project_deleted");
                    window.location.assign(basePath || "/");
                  }
                }}
                className="flex-1 rounded-full bg-destructive px-5 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {submitting ? t("ws.deleting") : t("ws.destroy")}
              </button>
              <button
                onClick={() => {
                  setDeleteConfirmation("");
                  setWsSub("settings");
                }}
                className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("ws.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ——— MON ESPACE (ex modale ME) : profil, ma carte, mes Mondes, préférences, déconnexion. ——— */
  const meSections: [MeSection, string][] = [
    ["overview", t("me.overview")],
    ["profile", t("me.profile")],
    ["security", t("me.security")],
    ["privacy", t("me.privacy")],
    ["preferences", t("me.preferences")],
    ["worlds", t("me.worlds")],
    ["sensitive", t("me.sensitive")],
  ];
  return (
    <div data-testid="portal-me" className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="space-y-1 rounded-2xl border border-border bg-card p-2">
        {meSections.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMeSection(id)}
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
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="" className="h-14 w-14 rounded-full border border-border bg-background object-cover" />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-full border border-border bg-background text-lg font-display font-light text-foreground/70">
                  {(user?.firstName || user?.fullName || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-lg font-display font-medium">{user?.fullName || user?.firstName || t("me.user")}</p>
                <p className="truncate text-sm text-foreground/55">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setMeSection("profile")} className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:bg-foreground/5">{t("me.editProfile")}</button>
              <button type="button" onClick={() => setMeSection("security")} className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:bg-foreground/5">{t("me.manageSecurity")}</button>
              <button type="button" onClick={() => setMeSection("worlds")} className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:bg-foreground/5">{t("me.viewWorlds")}</button>
              <button type="button" onClick={() => setMeSection("sensitive")} className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:bg-foreground/5">{t("me.sensitiveActions")}</button>
              <button type="button" onClick={() => navigate("/ma-carte")} data-testid="me-open-card" className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:bg-foreground/5">{t("me.myCard")}</button>
              <Link href="/admin" className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:bg-foreground/5">{t("me.guide")}</Link>
            </div>
            {projects.length === 0 && (
              <p className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-foreground/55">
                {t("me.noWorlds")}
              </p>
            )}
          </div>
        )}

        {meSection === "profile" && (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h4 className="text-sm font-medium">{t("me.profile")}</h4>
            <div className="space-y-2 text-sm text-foreground/70">
              <p>{t("me.name")}: {user?.fullName || user?.firstName || t("me.unavailable")}</p>
              <p>{t("me.mainEmail")}: {user?.primaryEmailAddress?.emailAddress || t("me.unavailable")}</p>
              <p>
                {t("me.verified")}: {user?.primaryEmailAddress?.verification?.status === "verified" ? t("me.yes") : t("me.no")}
              </p>
              <p>
                {t("me.createdAt")}: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR") : t("me.unavailable")}
              </p>
            </div>
            <button type="button" onClick={() => setMeSection("security")} className="rounded-full border border-foreground/15 px-4 py-2 text-xs font-medium text-foreground hover:bg-foreground/5">
              {t("me.manageConnection")}
            </button>
          </div>
        )}

        {meSection === "security" && (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h4 className="text-sm font-medium">{t("me.security")}</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                <span>{t("me.mainEmailRow")}</span>
                <span className="text-xs text-foreground/55">{user?.primaryEmailAddress?.verification?.status === "verified" ? t("me.verifiedOk") : t("me.verifiedPending")}</span>
              </div>
              {(user?.externalAccounts ?? []).map((account) => (
                <div key={account.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                  <span className="capitalize">{account.provider.replace("oauth_", "")}</span>
                  <span className="text-xs text-foreground/75">{t("me.connected")}</span>
                </div>
              ))}
              {(user?.externalAccounts?.length ?? 0) === 0 && (
                <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                  <span>{t("me.emailPassword")}</span>
                  <span className="text-xs text-foreground/55">{t("me.active")}</span>
                </div>
              )}
            </div>
            <button type="button" onClick={() => openUserProfile()} className="rounded-full border border-foreground/15 px-4 py-2 text-xs font-medium text-foreground hover:bg-foreground/5">
              {t("me.advancedSecurity")}
            </button>
          </div>
        )}

        {meSection === "privacy" && (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h4 className="text-sm font-medium">{t("me.privacy")}</h4>
            <p className="text-sm text-foreground/65">
              {t("me.privacyText")}
            </p>
            <div className="rounded-xl border border-border px-3 py-2 text-sm">
              {t("me.publicProfile")}: {project?.publicProfile?.published ? t("me.enabled") : t("me.disabled")}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/confidentialite" className="rounded-full border border-foreground/15 px-4 py-2 text-xs hover:bg-foreground/5">
                {t("me.privacyPolicy")}
              </Link>
              <button type="button" onClick={() => setMeSection("sensitive")} className="rounded-full border border-foreground/15 px-4 py-2 text-xs hover:bg-foreground/5">
                {t("me.exportSensitive")}
              </button>
            </div>
          </div>
        )}

        {meSection === "preferences" && (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h4 className="text-sm font-medium">{t("me.preferences")}</h4>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2.5">
              <div>
                <p className="text-sm">{t("me.appearance")}</p>
                <p className="mt-0.5 text-xs text-foreground/45">{t("me.appearanceText")}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2.5">
              <div>
                <p className="text-sm">{t("me.language")}</p>
                <p className="mt-0.5 text-xs text-foreground/45">{t("me.languageText")}</p>
              </div>
              <div className="flex gap-1 rounded-full border border-border p-1" role="group" aria-label={t("me.language")}>
                {(["fr", "en"] as const).map(code => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLocale(code)}
                    aria-pressed={locale === code}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      locale === code ? "bg-foreground text-background" : "text-foreground/55 hover:text-foreground",
                    )}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-foreground/45">
              {t("me.prefNote")}
            </p>
          </div>
        )}

        {meSection === "worlds" && (
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase tracking-[.25em] text-foreground/40 font-semibold">{t("me.worldsTitle")}</h4>
            <p className="text-xs font-light leading-relaxed text-foreground/45">
              {t("me.worldsText")}
            </p>
            <WorldSwitcher
              projects={projects}
              activeProjectId={project?.id}
              onSelect={(projectId) => {
                if (projectId !== project?.id) void selectProject(projectId);
              }}
            />
          </div>
        )}

        {meSection === "sensitive" && (
          <div className="space-y-3 border-t border-border pt-4">
            <a href="/api/account/export" className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-sm font-medium text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent hover:border-border">
              <Download className="h-4 w-4" /> {t("me.exportData")}
            </a>
            <button onClick={() => signOut({ redirectUrl: basePath })} className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-sm font-medium text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent hover:border-border">
              <LogOut className="h-4 w-4" /> {t("me.signOut")}
            </button>
            <button onClick={() => setMeAccountDelete(true)} className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-sm font-medium text-destructive/80 transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent hover:border-destructive/20">
              <Trash2 className="h-4 w-4" /> {t("me.deleteAccount")}
            </button>
          </div>
        )}
      </section>

      {meAccountDelete && (
        <CenteredBlock
          eyebrow={t("me.criticalZone")}
          title={t("me.deleteAccount")}
          description={t("me.deleteAccountText")}
          onClose={() => setMeAccountDelete(false)}
        >
          <div className="space-y-5">
            <Field label={t("ws.confirmLabel")}>
              <input
                data-testid="account-delete-confirmation"
                value={deleteAccountConfirmation}
                onChange={(e) => setDeleteAccountConfirmation(e.target.value)}
                placeholder={t("me.typeToDeleteAccount")}
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
                    if (!apiAvailable) {
                      setNotice(t("me.deleteAccountLocal"));
                      clearProject();
                      window.location.assign(basePath || "/");
                      return;
                    }
                    await api(`/account`, {
                      method: "DELETE",
                      body: JSON.stringify({
                        confirmation: "SUPPRIMER MON COMPTE",
                      }),
                    });
                    trackEvent("account_deleted");
                    await signOut({ redirectUrl: basePath || "/" });
                  } catch (err) {
                    setApiAvailable(false);
                    setNotice(t("me.deleteAccountLocalMode"));
                    clearProject();
                    window.location.assign(basePath || "/");
                  }
                }}
                className="flex-1 rounded-full bg-destructive px-5 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {submitting ? t("ws.deleting") : t("me.destroyAccount")}
              </button>
              <button
                onClick={() => {
                  setDeleteAccountConfirmation("");
                  setMeAccountDelete(false);
                }}
                className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("ws.cancel")}
              </button>
            </div>
          </div>
        </CenteredBlock>
      )}
    </div>
  );
}
