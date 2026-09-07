import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { User, BookOpen, Folder, Network, MapPin, Globe, ImageIcon, Pencil, Lock, Globe2, Users, Calendar, Link2 } from "lucide-react";
import { useProject } from "@/store/project-store";
import { CenteredBlock } from "./CenteredBlock";
import { cn } from "@/lib/utils";
import { useClerk } from "@clerk/react";
import { format } from "date-fns";

type NodeData = {
  id: string;
  type: "root" | "item" | "identity";
  label: string;
  icon?: any;
  x: number;
  y: number;
  parentId?: string;
  sourceRef?: any;
  collection?: string;
};

const MAIN_NODES = [
  { id: "identity", label: "Identité", icon: User, x: 500, y: 500, type: "identity" as const },
  { id: "history", label: "Histoire", icon: BookOpen, x: 300, y: 250, type: "root" as const },
  { id: "archives", label: "Archives", icon: Folder, x: 700, y: 250, type: "root" as const },
  { id: "network", label: "Réseau", icon: Network, x: 850, y: 500, type: "root" as const },
  { id: "worlds", label: "Mondes", icon: Globe, x: 700, y: 750, type: "root" as const },
  { id: "media", label: "Médias", icon: ImageIcon, x: 300, y: 750, type: "root" as const },
  { id: "map", label: "Carte", icon: MapPin, x: 150, y: 500, type: "root" as const },
];

export function ProfileNervousSystem() {
  const { project, canEdit, currentRole, updateProject, updateEntity } = useProject();
  const { openUserProfile } = useClerk();
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  const nodes = useMemo(() => {
    if (!project) return [];
    const result: NodeData[] = [...MAIN_NODES];

    const addLeaves = (rootId: string, items: any[], collection: string, getLabel: (i: any) => string) => {
      const root = MAIN_NODES.find((n) => n.id === rootId);
      if (!root || !items) return;
      
      const count = items.length;
      if (count === 0) return;
      
      const radius = 100 + Math.min(count * 2, 80);
      items.forEach((item, i) => {
        const angle = (i / count) * Math.PI * 2;
        const rOffset = (i % 3) * 15;
        const x = root.x + Math.cos(angle) * (radius + rOffset);
        const y = root.y + Math.sin(angle) * (radius + rOffset);
        result.push({
          id: `${rootId}-${item.id || i}`,
          type: "item",
          label: getLabel(item),
          x,
          y,
          parentId: rootId,
          sourceRef: item,
          collection
        });
      });
    };

    if (project.timeline) {
      addLeaves("history", project.timeline, "timeline", (e) => e.title);
    }
    if (project.documents) {
      addLeaves("archives", project.documents, "documents", (d) => d.title);
    }
    if (project.payments) {
      addLeaves("archives", project.payments, "payments", (payment) => payment.label);
    }
    if (project.guests) {
      addLeaves("network", project.guests, "guests", (g) => g.name);
    }
    if (project.memories) {
      addLeaves("media", project.memories, "memories", (m) => m.title);
    }

    if (project.universe) {
       const root = MAIN_NODES.find((n) => n.id === "worlds")!;
       result.push({
          id: "worlds-universe",
          type: "item",
          label: project.universe,
          x: root.x,
          y: root.y + 90,
          parentId: "worlds",
          sourceRef: { title: project.title, universe: project.universe },
          collection: "project"
       });
    }

    return result;
  }, [project]);

  if (!project || !canEdit) return null;

  return (
    <div className="relative h-[70vh] min-h-[600px] w-full overflow-auto rounded-3xl border border-white/5 bg-[#020202] shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] to-[#020202] opacity-80" />
      <motion.div 
         className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02),transparent_60%)] pointer-events-none"
         animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
         transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto aspect-square h-full min-h-[720px] min-w-[720px] max-h-[1000px] max-w-[1000px]">
      <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
        {MAIN_NODES.filter(n => n.type === "root").map(root => (
          <motion.line
            key={`line-root-${root.id}`}
            x1="500" y1="500" x2={root.x} y2={root.y}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        ))}

        {nodes.filter(n => n.type === "item").map(item => {
          const root = MAIN_NODES.find(n => n.id === item.parentId);
          if (!root) return null;
          return (
            <motion.line
              key={`line-item-${item.id}`}
              x1={root.x} y1={root.y} x2={item.x} y2={item.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 pointer-events-none">
          {nodes.map(node => {
            const isIdentity = node.type === "identity";
            const isRoot = node.type === "root";
            
            return (
              <motion.button
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center group pointer-events-auto",
                  isIdentity ? "z-30" : isRoot ? "z-20" : "z-10"
                )}
                style={{ left: `${(node.x / 1000) * 100}%`, top: `${(node.y / 1000) * 100}%` }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: isIdentity ? 0 : isRoot ? 0.3 : 0.8 }}
              >
                {isIdentity && (
                  <div className="w-24 h-24 rounded-full border border-white/20 bg-white/5 backdrop-blur-md flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:bg-white/10 transition-colors">
                    <User className="w-10 h-10 text-white/80" />
                  </div>
                )}
                
                {isRoot && (
                  <div className="w-14 h-14 rounded-full border border-white/10 bg-[#0a0a0a] flex items-center justify-center shadow-lg group-hover:border-white/30 transition-colors">
                    {node.icon && <node.icon className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />}
                  </div>
                )}
                
                {node.type === "item" && (
                  <div className="w-3 h-3 rounded-full bg-white/20 group-hover:bg-white group-hover:scale-150 transition-all shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
                )}
                
                <span className={cn(
                  "absolute whitespace-nowrap text-center transition-all",
                  isIdentity ? "top-full mt-4 text-sm font-display tracking-widest uppercase text-white" :
                  isRoot ? "top-full mt-3 text-[10px] tracking-widest uppercase text-white/60 group-hover:text-white" :
                  "opacity-0 group-hover:opacity-100 top-full mt-2 text-[9px] uppercase tracking-wider text-white/80 bg-black/60 px-2 py-1 rounded backdrop-blur-md border border-white/10"
                )}>
                  {node.label}
                </span>
              </motion.button>
            );
          })}
      </div>
      </div>

      {selectedNode && (
        <EditorModal 
          node={selectedNode} 
          nodes={nodes}
          setSelectedNode={setSelectedNode}
          onClose={() => setSelectedNode(null)} 
          project={project}
          updateProject={updateProject}
          updateEntity={updateEntity}
          openUserProfile={openUserProfile}
           currentRole={currentRole}
        />
      )}
    </div>
  );
}

function EditorModal({ node, nodes, setSelectedNode, onClose, project, updateProject, updateEntity, openUserProfile, currentRole }: any) {
  if (node.type === "identity") {
    return (
      <CenteredBlock eyebrow="Édition" title="Identité du Profil" onClose={onClose} leading={<User className="mt-4 w-6 h-6 text-white/50" />}>
         <div className="space-y-8 mt-4">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
               <div>
                  <p className="text-sm font-medium text-white">Nom et Avatar</p>
                  <p className="text-xs text-white/40 mt-1">Gérés de manière centralisée par votre compte AIME.</p>
               </div>
               <button onClick={() => { onClose(); openUserProfile(); }} className="px-4 py-2 rounded-full bg-white/10 text-xs font-medium hover:bg-white/20 transition-colors text-white">
                  Gérer l'identité
               </button>
            </div>

            {currentRole === "owner" ? <div className="pt-6 border-t border-white/10">
               <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-4">Visibilité de la page (Profil)</label>
               <div className="flex items-center gap-3">
                  <button 
                     onClick={() => updateProject({ publicProfile: { published: false } })}
                     className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all",
                        !project.publicProfile?.published ? "bg-white/10 border-white/30 text-white" : "bg-transparent border-white/10 text-white/40 hover:bg-white/5"
                     )}
                  >
                     <Lock className="w-4 h-4" /> Privé
                  </button>
                  <button 
                     onClick={() => updateProject({ publicProfile: { published: true } })}
                     className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all",
                        project.publicProfile?.published ? "bg-white/10 border-white/30 text-white" : "bg-transparent border-white/10 text-white/40 hover:bg-white/5"
                     )}
                  >
                     <Globe2 className="w-4 h-4" /> Public
                  </button>
               </div>
            </div> : <div className="border-t border-white/10 pt-6 text-sm font-light leading-relaxed text-white/42">La publication publique de cette Page reste sous le contrôle de son propriétaire.</div>}
         </div>
      </CenteredBlock>
    );
  }

  if (node.id === "worlds" || node.collection === "project") {
    return (
      <CenteredBlock eyebrow="Édition" title="Le Monde" onClose={onClose} leading={<Globe className="mt-4 w-6 h-6 text-white/50" />}>
         <div className="space-y-6 mt-4">
            <div>
               <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Titre du Monde</label>
               <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  defaultValue={project.title}
                  onBlur={(e) => updateProject({ title: e.target.value })}
               />
            </div>
            <div>
                <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Sous-titre du Monde</label>
               <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  defaultValue={project.subtitle || ""}
                  onBlur={(e) => updateProject({ subtitle: e.target.value })}
               />
            </div>
            <div>
                <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Date pivot du Monde</label>
               <input 
                  type="date" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  defaultValue={project.pivot?.value ? format(project.pivot.value, "yyyy-MM-dd") : ""}
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
      <CenteredBlock eyebrow="Édition" title="Carte & Lieux" onClose={onClose} leading={<MapPin className="mt-4 w-6 h-6 text-white/50" />}>
         <div className="space-y-6 mt-4">
            <div>
                <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Ville du Monde</label>
               <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  defaultValue={project.city?.value || ""}
                  onBlur={(e) => updateProject({ city: { ...project.city, value: e.target.value || null } })}
               />
            </div>
            <div>
                <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Lieu principal</label>
               <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  defaultValue={project.venue?.value || ""}
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
       <CenteredBlock eyebrow="Édition du Moment" title={event.title} onClose={onClose} leading={<Calendar className="mt-4 w-6 h-6 text-white/50" />}>
         <div className="space-y-6 mt-4">
            <div>
               <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Titre du moment</label>
               <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  defaultValue={event.title}
                  onBlur={(e) => updateEntity("timeline", event.id, { title: e.target.value })}
               />
            </div>
            <div>
               <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Détails et références</label>
               <textarea 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors min-h-[100px] resize-none"
                  defaultValue={event.detail || ""}
                  onBlur={(e) => updateEntity("timeline", event.id, { detail: e.target.value })}
               />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Date</label>
                  <input 
                     type="date" 
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                     defaultValue={event.time ? format(event.time, "yyyy-MM-dd") : ""}
                     onChange={(e) => {
                        if (e.target.value) {
                           updateEntity("timeline", event.id, { time: new Date(e.target.value).getTime() });
                        }
                     }}
                  />
               </div>
               <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Lieu</label>
                  <input 
                     type="text" 
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                     defaultValue={event.location || ""}
                     onBlur={(e) => updateEntity("timeline", event.id, { location: e.target.value })}
                  />
               </div>
            </div>

            <div className="pt-6 border-t border-white/10">
               <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-4">Visibilité (Timeline)</label>
               <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                  {["prive", "equipe", "audience"].map(v => (
                     <button
                        key={v}
                        onClick={() => updateEntity("timeline", event.id, { visibility: v })}
                        className={cn(
                           "flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex justify-center items-center gap-2",
                           event.visibility === v ? "bg-white/15 text-white shadow-sm" : "text-white/40 hover:text-white/80"
                        )}
                     >
                        {v === "prive" ? <Lock className="w-3.5 h-3.5" /> : v === "equipe" ? <Users className="w-3.5 h-3.5" /> : <Globe2 className="w-3.5 h-3.5" />}
                        {v === "prive" ? "Privé" : v === "equipe" ? "Réseau (Équipe)" : "Public (Audience)"}
                     </button>
                  ))}
               </div>
            </div>
         </div>
       </CenteredBlock>
     );
  }

  if (node.type === "item" && node.collection === "documents") {
     const doc = node.sourceRef;
     return (
        <CenteredBlock eyebrow="Édition Archive" title={doc.title} onClose={onClose} leading={<Folder className="mt-4 w-6 h-6 text-white/50" />}>
           <div className="space-y-6 mt-4">
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Titre</label>
                 <input 
                    type="text" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                    defaultValue={doc.title}
                    onBlur={(e) => updateEntity("documents", doc.id, { title: e.target.value })}
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Type</label>
                    <select 
                       className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors appearance-none"
                       defaultValue={doc.kind}
                       onChange={(e) => updateEntity("documents", doc.id, { kind: e.target.value })}
                    >
                       <option value="devis">Devis</option>
                       <option value="contrat">Contrat</option>
                       <option value="facture">Facture</option>
                       <option value="autre">Autre</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Date</label>
                    <input 
                       type="date" 
                       className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                       defaultValue={doc.at ? format(doc.at, "yyyy-MM-dd") : ""}
                       onChange={(e) => {
                          if (e.target.value) {
                             updateEntity("documents", doc.id, { at: new Date(e.target.value).getTime() });
                          }
                       }}
                    />
                 </div>
              </div>
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">URL (Lien externe)</label>
                 <input 
                    type="url" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                    defaultValue={doc.url || ""}
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
        <CenteredBlock eyebrow="Édition Finance" title={payment.label} onClose={onClose} leading={<Folder className="mt-4 w-6 h-6 text-white/50" />}>
           <div className="space-y-6 mt-4">
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Libellé</label>
                 <input type="text" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/30" defaultValue={payment.label} onBlur={(e) => updateEntity("payments", payment.id, { label: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Montant</label>
                    <input type="number" min="0" step="0.01" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/30" defaultValue={payment.amountCents / 100} onBlur={(e) => updateEntity("payments", payment.id, { amountCents: Math.round(Number(e.target.value || 0) * 100) })} />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">État</label>
                    <select className="w-full appearance-none rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/30" defaultValue={payment.state} onChange={(e) => updateEntity("payments", payment.id, { state: e.target.value })}>
                       <option value="du">À régler</option>
                       <option value="paye">Payé</option>
                    </select>
                 </div>
              </div>
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Date</label>
                 <input type="date" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/30" defaultValue={payment.at ? format(payment.at, "yyyy-MM-dd") : ""} onChange={(e) => e.target.value && updateEntity("payments", payment.id, { at: new Date(e.target.value).getTime() })} />
              </div>
           </div>
        </CenteredBlock>
     );
  }

  if (node.type === "item" && node.collection === "guests") {
     const guest = node.sourceRef;
     return (
        <CenteredBlock eyebrow="Édition Réseau" title={guest.name} onClose={onClose} leading={<Network className="mt-4 w-6 h-6 text-white/50" />}>
           <div className="space-y-6 mt-4">
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Nom</label>
                 <input 
                    type="text" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                    defaultValue={guest.name}
                    onBlur={(e) => updateEntity("guests", guest.id, { name: e.target.value })}
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Contact (Email/Tel)</label>
                    <input 
                       type="text" 
                       className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                       defaultValue={guest.contact || ""}
                       onBlur={(e) => updateEntity("guests", guest.id, { contact: e.target.value })}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Rôle</label>
                    <select 
                       className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors appearance-none"
                       defaultValue={guest.role}
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
                 <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Notes</label>
                 <textarea 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors min-h-[80px] resize-none"
                    defaultValue={guest.notes || ""}
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
        <CenteredBlock eyebrow="Édition Média" title={memory.title} onClose={onClose} leading={<ImageIcon className="mt-4 w-6 h-6 text-white/50" />}>
           <div className="space-y-6 mt-4">
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Titre</label>
                 <input 
                    type="text" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                    defaultValue={memory.title}
                    onBlur={(e) => updateEntity("memories", memory.id, { title: e.target.value })}
                 />
              </div>
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Notes</label>
                 <textarea 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors min-h-[100px] resize-none"
                    defaultValue={memory.notes || ""}
                    onBlur={(e) => updateEntity("memories", memory.id, { notes: e.target.value })}
                 />
              </div>
              <div>
                 <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Statut</label>
                 <select 
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors appearance-none"
                    defaultValue={memory.status}
                    onChange={(e) => updateEntity("memories", memory.id, { status: e.target.value })}
                 >
                    <option value="a_faire">À faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                 </select>
              </div>
           </div>
        </CenteredBlock>
     );
  }

  if (node.type === "root") {
     const children = nodes.filter((n: NodeData) => n.parentId === node.id);
     return (
        <CenteredBlock eyebrow="Aperçu de la Branche" title={node.label} onClose={onClose} leading={<Link2 className="mt-4 w-6 h-6 text-white/50" />}>
           <div className="mt-6">
              {children.length > 0 ? (
                 <div className="grid gap-2 sm:grid-cols-2">
                    {children.map((child: NodeData) => (
                       <button 
                          key={child.id} 
                          onClick={() => setSelectedNode(child)}
                          className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 transition text-left"
                       >
                          <div className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                          <span className="text-sm text-white/90 truncate">{child.label}</span>
                       </button>
                    ))}
                 </div>
              ) : (
                 <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                    <p className="text-white/40 text-sm">Aucun élément relié à cette branche pour le moment.</p>
                 </div>
              )}
           </div>
        </CenteredBlock>
     );
  }

  return null;
}
