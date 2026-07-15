import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plus, LayoutDashboard } from "lucide-react";
import type { ProjectState } from "../types";
import { StatusDot } from "./StatusDot";
import logo from "../assets/images/logo-universal.png";

interface SidebarProps {
  projects: ProjectState[];
  selectedProjectID: string | null;
  onSelectProject: (projectID: string) => void;
  onAddProject: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  selectedProjectID,
  onSelectProject,
  onAddProject,
  onOpenSettings,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="fixed left-0 top-0 h-full bg-[#111827]/95 border-r border-[#1f2937] flex flex-col select-none z-200 backdrop-blur-md"
      animate={{ width: expanded ? 220 : 56 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-3 border-b border-[#1f2937] h-14 shrink-0">
        <img src={logo} className="w-7 h-auto shrink-0" alt="LocalCloud" />
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="text-sm font-bold text-[#f3f4f6] tracking-tight whitespace-nowrap"
            >
              LocalCloud
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto py-2">
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 mb-2"
            >
              <span className="text-[9px] font-bold text-[#9ca3af] uppercase tracking-wider font-mono">
                Projects
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {projects.length === 0 && expanded && (
          <p className="px-3 text-[10px] text-[#4b5563] font-mono italic">
            No projects yet
          </p>
        )}

        {projects.map((project) => {
          const isActive = project.projectID === selectedProjectID;
          return (
            <button
              key={project.projectID}
              onClick={() => onSelectProject(project.projectID)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all border-l-2 ${
                isActive
                  ? "border-[#6366f1] bg-[#6366f1]/10"
                  : "border-transparent hover:bg-[#1f2937]/50"
              }`}
            >
              <StatusDot
                status={
                  project.status === "running"
                    ? "CONNECTED"
                    : project.status === "error"
                    ? "FAILED"
                    : "DISCONNECTED"
                }
              />
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-xs font-medium text-[#f3f4f6] truncate">
                      {project.name || "Untitled"}
                    </p>
                    <p className="text-[9px] text-[#6b7280] font-mono">
                      :{project.port}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="border-t border-[#1f2937]">
        <button
          onClick={onAddProject}
          className="w-full flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-[#1f2937]/50 transition-colors border-l-2 border-transparent hover:border-[#6366f1]/50"
        >
          <Plus className="w-4 h-4 shrink-0 text-[#6366f1]" />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium text-[#f3f4f6] whitespace-nowrap"
              >
                Add Project
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-[#1f2937]/50 transition-colors border-l-2 border-transparent hover:border-[#6366f1]/50"
        >
          <Settings className="w-4 h-4 shrink-0 text-[#9ca3af]" />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium text-[#9ca3af] whitespace-nowrap"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
