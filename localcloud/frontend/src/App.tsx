import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "./components/Sidebar";
import { SettingsPanel } from "./components/SettingsPanel";
import { AddProjectModal } from "./components/AddProjectModal";
import { Dashboard } from "./screens/Dashboard";
import { OOMModal } from "./components/OOMModal";
import type { ProjectState, ScanResult, RunConfig } from "./types";
import {
  ListProjects,
  StartProject,
  StopProject,
  RemoveProject,
  RegisterAndStartProject,
  ScanProject,
} from "../wailsjs/go/main/App";
import { EventsOn } from "../wailsjs/runtime/runtime";

function App() {
  const [projects, setProjects] = useState<ProjectState[]>([]);
  const [selectedProjectID, setSelectedProjectID] = useState<string | null>(null);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // OOM state
  const [oomOpen, setOomOpen] = useState(false);
  const [oomMemoryLimit, setOomMemoryLimit] = useState(0);

  useEffect(() => {
    refreshProjects();
  }, []);

  useEffect(() => {
    const unsub = EventsOn("tunnel-status", () => {
      refreshProjects();
    });

    const unsubOOM = EventsOn("process-oom", (data: { memoryLimit: number }) => {
      setOomMemoryLimit(data.memoryLimit || 0);
      setOomOpen(true);
      refreshProjects();
    });

    return () => {
      unsub();
      unsubOOM();
    };
  }, []);

  const refreshProjects = async () => {
    try {
      const list = await ListProjects();
      setProjects(list || []);
    } catch {
      // Wails bindings may not be regenerated yet during dev
    }
  };

  const handleAddProject = () => {
    setSelectedProjectID(null);
    setAddProjectOpen(true);
  };

  const handleAddProjectComplete = async (scan: ScanResult, config: RunConfig) => {
    try {
      await RegisterAndStartProject(scan as any, config);
      await refreshProjects();
    } catch (err) {
      console.error("Failed to register project:", err);
    }
    setAddProjectOpen(false);
  };

  const handleStart = async (projectID: string) => {
    try {
      await StartProject(projectID);
      await refreshProjects();
    } catch (err) {
      console.error("Failed to start project:", err);
    }
  };

  const handleStop = async (projectID: string) => {
    try {
      await StopProject(projectID);
      await refreshProjects();
    } catch (err) {
      console.error("Failed to stop project:", err);
    }
  };

  const handleRemove = async (projectID: string) => {
    try {
      await RemoveProject(projectID);
      if (selectedProjectID === projectID) {
        setSelectedProjectID(null);
      }
      await refreshProjects();
    } catch (err) {
      console.error("Failed to remove project:", err);
    }
  };

  const handleSelectProject = (projectID: string) => {
    setSelectedProjectID(selectedProjectID === projectID ? null : projectID);
  };

  return (
    <>
      <Sidebar
        projects={projects}
        selectedProjectID={selectedProjectID}
        onSelectProject={handleSelectProject}
        onAddProject={handleAddProject}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <Dashboard
        projects={projects}
        selectedProjectID={selectedProjectID}
        onSelectProject={handleSelectProject}
        onStart={handleStart}
        onStop={handleStop}
        onRemove={handleRemove}
        onAddProject={handleAddProject}
      />

      <AddProjectModal
        open={addProjectOpen}
        onComplete={handleAddProjectComplete}
        onClose={() => setAddProjectOpen(false)}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <OOMModal
        open={oomOpen}
        memoryLimit={oomMemoryLimit}
        onRestart={() => {
          setOomOpen(false);
          if (selectedProjectID) handleStart(selectedProjectID);
        }}
        onChangeSettings={() => {
          setOomOpen(false);
          setSettingsOpen(true);
        }}
      />
    </>
  );
}

export default App;
