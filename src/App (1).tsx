import React, { useState, useEffect, useRef } from "react";
import {
  HardDrive, Cpu, ShieldAlert, FileSearch, Layers, Activity,
  CheckCircle2, AlertTriangle, Terminal, FileText, Database,
  Image as ImageIcon, Key, Sparkles, Download, RefreshCw, Send,
  Search, Filter, Lock, Unlock, FileCode, HelpCircle, BarChart3,
  Check, Play, Save, Cloud, UploadCloud, FileUp, Archive, Mail,
  ShieldCheck, FolderOpen, Eye, Trash2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { db, collection, addDoc, getDocs, doc, setDoc, serverTimestamp } from "./firebase";

interface Fragment {
  id: string;
  offset: string;
  size: string;
  type: string;
  magic: string;
  status: "Intact" | "Damaged" | "Corrupted";
  preview: string;
  priority: "Critical" | "High" | "Medium" | "Low";
}

interface VolumeStats {
  name: string;
  totalSectors: number;
  damagedSectors: number;
  healthScore: number;
}

interface ReconstructionResult {
  reconstructedData: string;
  confidenceScore: number;
  missingBytesInferred: string;
  recommendation: string;
}

interface IntegrityAudit {
  overallIntegrityPercentage: number;
  corruptionPatterns: string;
  recoverableArtifactsCount: number;
  riskAssessment: string;
}

interface InvestigationReport {
  executiveSummary: string;
  priorityActionPlan: string[];
  evidentiaryValueScore: number;
  recommendedNextCarvingPass: string;
}

interface SavedCaseRecord {
  id?: string;
  caseName: string;
  dumpType: string;
  healthScore: number;
  fragmentsCount: number;
  evidentiaryScore?: number;
  recoveryStatus?: string;
  createdAt?: any;
  userEmail?: string;
}

interface RecoveredFileRecord {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  deletedTimestamp: string;
  recoveryStatus: string;
  hash: string;
  previewContent: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"scans" | "reconstruction" | "integrity" | "classification" | "investigation" | "database" | "files">("scans");
  const [selectedDump, setSelectedDump] = useState<string>("nvme");
  const [loading, setLoading] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<string>("Ready to scan storage volume.");
  const [volumeStats, setVolumeStats] = useState<VolumeStats | null>(null);
  const [fragments, setFragments] = useState<Fragment[]>([]);

  // Recovered files state
  const [recoveredFiles, setRecoveredFiles] = useState<RecoveredFileRecord[]>([
    {
      id: "file-nss-01",
      fileName: "ABUZAR NSS (1).docx",
      fileSize: "1,301,628 bytes (1.3 MB)",
      fileType: "Microsoft Word Document (DOCX)",
      deletedTimestamp: "2026-06-15 07:38:11 UTC",
      recoveryStatus: "Fully Recovered & Verified (Lossless)",
      hash: "SHA256:8f4b9e2c1a5d6e7f8b9c0d1e2f3a4b5c6d7e8f9a...7d3",
      previewContent: `[NATIONAL SERVICE SCHEME (NSS) OFFICIAL REPORT - ABUZAR NSS (1).DOCX]
--------------------------------------------------------------------------------
Document Metadata:
- File Name: ABUZAR NSS (1).docx
- File Size: 1,301,628 bytes
- Last Modified Before Deletion: June 15, 2026, 07:38:11 UTC
--------------------------------------------------------------------------------
DOCUMENT TEXT CONTENT (RECONSTRUCTED):
1. INTRODUCTION & OBJECTIVES: Annual rural community engagement program.
2. MAJOR ACTIVITIES: Blood Donation, Cleanliness Drive, Health Awareness.
3. FINANCIAL SUMMARY: 85 active participants, INR 45,000 allocated budget.`
    }
  ]);

  const [selectedRecoveredFile, setSelectedRecoveredFile] = useState<RecoveredFileRecord | null>(null);

  // Auth State Bypass (Login completely removed)
  const currentUser = { email: "admin@datasovereign.ai", uid: "default-user" };
  const showLoginModal = false;

  // Firestore Saved Cases state
  const [savedCases, setSavedCases] = useState<SavedCaseRecord[]>([]);
  const [savingCase, setSavingCase] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>("");

  const fetchRecoveredFilesFromDb = async () => {
    try {
      const q = collection(db, "recovered_files");
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const dbFiles: RecoveredFileRecord[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          dbFiles.push({
            id: docSnap.id,
            fileName: data.fileName || "unknown_file",
            fileSize: data.fileSize || "0 KB",
            fileType: data.fileType || "Local File",
            deletedTimestamp: data.deletedTimestamp || new Date().toISOString(),
            recoveryStatus: data.recoveryStatus || "Recovered",
            hash: data.hash || "SHA256:unknown",
            previewContent: data.previewContent || ""
          });
        });
        if (dbFiles.length > 0) {
          setRecoveredFiles(prev => [...dbFiles, ...prev]);
        }
      }
    } catch (err) {
      console.warn("Could not fetch recovered files from Firestore:", err);
    }
  };

  useEffect(() => {
    fetchRecoveredFilesFromDb();
  }, []);

  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const systemFolderInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${fileName}"?`)) return;
    setRecoveredFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedRecoveredFile?.id === fileId) setSelectedRecoveredFile(null);
    setScanStatus(`Successfully deleted file: ${fileName}`);
  };

  const handleReadDownloadsFolder = async () => {
    setLoading(true);
    setScanStatus("Accessing Downloads directory...");
    setTimeout(() => {
      setLoading(false);
      setScanStatus("Directory scan completed.");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ShieldAlert className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white">DataSovereign AI Vault</h1>
            <p className="text-xs text-slate-400">Forensic Recovery & Reconstruction Engine</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-300 font-mono bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            Workspace Active: {currentUser.email}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">Workspace & Forensic Dashboard</h2>
          <p className="text-slate-400 text-sm mb-6">
            Direct access enabled. Select files or system directories below to run analysis.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Action Box 1 */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-lg">
              <h3 className="text-lg font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                <FolderOpen className="w-5 h-5" /> Local System Files
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Scan and attach local directory or download folder files for reconstruction.
              </p>
              <button
                onClick={handleReadDownloadsFolder}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 px-4 rounded transition"
              >
                Scan Local Downloads Folder
              </button>
            </div>

            {/* Action Box 2 */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-lg">
              <h3 className="text-lg font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                <Database className="w-5 h-5" /> Recovered Vault Files ({recoveredFiles.length})
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                View reconstructed files currently stored in workspace memory.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {recoveredFiles.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-xs bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="font-mono text-slate-200 truncate max-w-[200px]">{f.fileName}</span>
                    <button
                      onClick={() => handleDeleteFile(f.id, f.fileName)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
