import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Box } from "lucide-react";
import { ProjectCard } from "../components/ProjectCard";
import { ResourceChart } from "../components/ResourceChart";
import { LogTerminal } from "../components/LogTerminal";
import { StatusDot } from "../components/StatusDot";
import { Copy, Check, ExternalLink } from "lucide-react";
import { BrowserOpenURL } from "../../wailsjs/runtime/runtime";
import type { ProjectState } from "../types";

interface DashboardProps {
  projects: ProjectState[];
  selectedProjectID: string | null;
  onSelectProject: (projectID: string) => void;
  onStart: (projectID: string) => void;
  onStop: (projectID: string) => void;
  onRemove: (projectID: string) => void;
  onAddProject: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  selectedProjectID,
  onSelectProject,
  onStart,
  onStop,
  onRemove,
  onAddProject,
}) => {
  const selectedProject = projects.find((p) => p.projectID === selectedProjectID);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (url: string) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex-1 ml-[56px] min-h-screen bg-[#0b0f17] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2937] bg-[#0b0f17]/80 backdrop-blur-sm sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#f3f4f6]">
            LocalCloud
          </h1>
          <p className="text-[10px] text-[#9ca3af] font-mono">
            {projects.length} project{projects.length !== 1 ? "s" : ""} managed
          </p>
        </div>
        <button
          onClick={onAddProject}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] active:scale-[0.98] rounded-xl text-xs font-bold font-mono text-white transition-all cursor-pointer border border-[#6366f1]/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Project
        </button>
      </div>

      <div className="p-6">
        {/* Empty State */}
        {projects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center mb-6">
              <Box className="w-8 h-8 text-[#6366f1]" />
            </div>
            <h2 className="text-lg font-bold text-[#f3f4f6] mb-2">
              Belum ada project.
            </h2>
            <p className="text-sm text-[#9ca3af] font-mono mb-6 max-w-sm">
              Klik 'Add Project' untuk memulai server lokal dan mendapatkan URL publik dalam hitungan detik.
            </p>
            <button
              onClick={onAddProject}
              className="px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] active:scale-[0.98] rounded-xl text-sm font-bold font-mono text-white transition-all cursor-pointer"
            >
              + Tambah Project Pertama
            </button>
          </motion.div>
        )}

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <AnimatePresence>
            {projects.map((project) => (
              <ProjectCard
                key={project.projectID}
                project={project}
                onStart={onStart}
                onStop={onStop}
                onRemove={onRemove}
                isSelected={project.projectID === selectedProjectID}
                onSelect={onSelectProject}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Expanded Detail Panel */}
        <AnimatePresence>
          {selectedProject && selectedProject.status === "running" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-4 overflow-hidden"
            >
              {/* URL Card */}
              {selectedProject.tunnelURL && (
                <div className="relative bg-gray-900/30 border border-emerald-500/30 rounded-xl p-5 backdrop-blur-lg shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
                        Public Forwarding Address
                      </span>
                      <div className="mt-1">
                        <span className="text-base font-semibold text-white font-mono break-all">
                          {selectedProject.tunnelURL}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(selectedProject.tunnelURL)}
                        className="flex items-center gap-1.5 bg-gray-950 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 active:scale-98 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-all"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                        <span className="font-mono">{copied ? "Copied" : "Copy"}</span>
                      </button>
                      <button
                        onClick={() => BrowserOpenURL(selectedProject.tunnelURL)}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="font-mono">Open</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Resource Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResourceChart type="ram" limit={256} projectID={selectedProject.projectID} />
                <ResourceChart type="cpu" limit={100} projectID={selectedProject.projectID} />
              </div>

              {/* Log Terminal */}
              <div className="h-[400px] flex">
                <LogTerminal projectID={selectedProject.projectID} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;
