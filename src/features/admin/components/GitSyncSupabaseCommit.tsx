import React, { useState, useEffect } from "react";
import {
  Github,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCcw,
  Key,
  Database,
  GitCommit,
  GitBranch,
  Save,
  Eye,
  EyeOff,
  Link2,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  Layers,
  FileCode,
  ArrowRight,
  Building,
  Search,
  ChevronDown,
  Activity
} from "lucide-react";
import IndustrialButton from "../../../components/IndustrialButton";
import { useGitSync } from "../../../hooks/useGitSync";
import { useToast } from "../../../providers/ToastProvider";
import { getSupabase } from "../../../services/supabaseService";

export const GitSyncSupabaseCommit: React.FC = () => {
  const { addToast } = useToast();
  const { status: gitStatus, loading: gitLoading, fullSync, commit, sync: syncGit, clearError } = useGitSync();

  // Settings State
  const [repo, setRepo] = useState(() => localStorage.getItem('findaba_git_repo') || 'nedtwistmovies-star/FindAba-OS');
  const [branch, setBranch] = useState(() => localStorage.getItem('findaba_git_branch') || 'main');
  const [token, setToken] = useState(() => localStorage.getItem('findaba_github_pat') || '');
  const [showToken, setShowToken] = useState(false);

  // Connection Test State
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    repo?: string;
    exists?: boolean;
    private?: boolean;
    defaultBranch?: string;
    rateLimitRemaining?: number;
    authStatus?: string;
    htmlUrl?: string;
    message?: string;
    details?: string;
  } | null>(null);

  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);

  const runDiagnostics = async () => {
    setRunningDiagnostics(true);
    setDiagnostics(null);
    try {
      const savedPat = token.trim() || localStorage.getItem('findaba_github_pat')?.trim();
      const currentRepo = repo.trim();
      const headers: Record<string, string> = {};
      if (savedPat) headers['X-GitHub-Token'] = savedPat;

      // Pass repo in query to test unsaved config
      const url = `/api/git/diagnostic?repo=${encodeURIComponent(currentRepo)}`;
      const res = await fetch(url, { headers });
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { success: false, message: `Invalid response format from server (${res.status})` };
      }
      setDiagnostics(data);
      if (data.success) {
        addToast(data.message || "System diagnostics completed successfully", "success");
      } else {
        addToast(data.message || "System diagnostics identified configuration gaps", "info");
      }
    } catch (err: any) {
      addToast(`Diagnostic error: ${err.message}`, "error");
    } finally {
      setRunningDiagnostics(false);
    }
  };

  // Environment Saving state
  const [savingEnv, setSavingEnv] = useState(false);

  // Supabase Commit State
  const [commitMessage, setCommitMessage] = useState("Sync Supabase Database Registry to GitHub");
  const [selectedTables, setSelectedTables] = useState<string[]>([
    "businesses", "profiles", "buyer_signals", "ledger", "orders", "thrift_accounts"
  ]);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [snapshotPreview, setSnapshotPreview] = useState<Record<string, number>>({});
  const [committing, setCommitting] = useState(false);
  const [lastCommitUrl, setLastCommitUrl] = useState<string | null>(null);

  // Branch Dropdown State
  const [branches, setBranches] = useState<{ name: string; protected?: boolean; sha?: string }[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [fetchBranchesError, setFetchBranchesError] = useState<string | null>(null);

  // Org Filter State
  const [orgFilter, setOrgFilter] = useState(() => {
    const owner = (repo || 'nedtwistmovies-star/FindAba-OS').split('/')[0];
    return owner || 'nedtwistmovies-star';
  });
  const [orgRepos, setOrgRepos] = useState<Array<{
    name: string;
    fullName: string;
    description: string;
    private: boolean;
    stars: number;
    forks: number;
    updatedAt: string;
    defaultBranch: string;
    language: string;
    htmlUrl: string;
  }>>([]);
  const [loadingOrgRepos, setLoadingOrgRepos] = useState(false);
  const [orgFetchError, setOrgFetchError] = useState<string | null>(null);
  const [repoSearchKeyword, setRepoSearchKeyword] = useState('');

  const fetchBranches = async (targetRepo = repo) => {
    if (!targetRepo) return;
    setLoadingBranches(true);
    setFetchBranchesError(null);
    let cleanRepo = targetRepo.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
    try {
      const savedPat = token.trim() || localStorage.getItem('findaba_github_pat')?.trim();
      const headers: Record<string, string> = {};
      if (savedPat) headers['X-GitHub-Token'] = savedPat;

      const res = await fetch(`/api/git/branches?repo=${encodeURIComponent(cleanRepo)}`, { headers });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { success: false, message: `Server error (${res.status})` }; }

      if (data.success && Array.isArray(data.branches)) {
        setBranches(data.branches);
        if (data.branches.length > 0 && !data.branches.some((b: any) => b.name === branch)) {
          const defaultB = data.defaultBranch || data.branches[0].name;
          setBranch(defaultB);
        }
      } else {
        setFetchBranchesError(data.message || "Failed to fetch branches");
      }
    } catch (err: any) {
      setFetchBranchesError(err.message || "Error fetching branches");
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchOrgRepos = async (targetOrg = orgFilter) => {
    const cleanOrg = targetOrg.trim();
    if (!cleanOrg) return;
    setLoadingOrgRepos(true);
    setOrgFetchError(null);
    try {
      const savedPat = token.trim() || localStorage.getItem('findaba_github_pat')?.trim();
      const headers: Record<string, string> = {};
      if (savedPat) headers['X-GitHub-Token'] = savedPat;

      const res = await fetch(`/api/git/org-repos?org=${encodeURIComponent(cleanOrg)}`, { headers });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { success: false, message: `Server error (${res.status})` }; }

      if (data.success && Array.isArray(data.repos)) {
        setOrgRepos(data.repos);
        addToast(`Loaded ${data.repos.length} repositories for organization '${cleanOrg}'`, "success");
      } else {
        setOrgFetchError(data.message || "No repositories found for this organization.");
        setOrgRepos([]);
      }
    } catch (err: any) {
      setOrgFetchError(err.message || "Error fetching organization repositories.");
      setOrgRepos([]);
    } finally {
      setLoadingOrgRepos(false);
    }
  };

  useEffect(() => {
    if (repo) {
      fetchBranches(repo);
    }
  }, [repo]);

  useEffect(() => {
    if (gitStatus.repo && gitStatus.repo !== repo) {
      setRepo(gitStatus.repo);
    }
  }, [gitStatus.repo]);

  // Handle Testing Connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    clearError();

    let cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');

    try {
      const savedPat = token.trim() || localStorage.getItem('findaba_github_pat')?.trim();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (savedPat) headers['X-GitHub-Token'] = savedPat;

      const res = await fetch('/api/git/test-connection', {
        method: 'POST',
        headers,
        body: JSON.stringify({ repo: cleanRepo, token: savedPat })
      });

      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { success: false, message: `Network/Server fault (${res.status}): ${text.substring(0, 100)}` }; }
      setTestResult(data);

      if (data.success) {
        addToast(data.message || "GitHub repository connection verified successfully!", "success");
      } else {
        addToast(data.message || data.details || "Repository connection check failed", "error");
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Network Fault: ${err.message}`
      });
      addToast(`Connection check error: ${err.message}`, "error");
    } finally {
      setTestingConnection(false);
    }
  };

  // Handle Saving GITHUB_REPO Environment Variable & Local Config
  const handleSaveRepoSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingEnv(true);

    let cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
    let cleanBranch = branch.trim() || 'main';
    let cleanToken = token.trim();

    // Store in LocalStorage
    if (cleanRepo) localStorage.setItem('findaba_git_repo', cleanRepo);
    else localStorage.removeItem('findaba_git_repo');

    localStorage.setItem('findaba_git_branch', cleanBranch);

    if (cleanToken) localStorage.setItem('findaba_github_pat', cleanToken);
    else localStorage.removeItem('findaba_github_pat');

    try {
      // Save directly to server process.env and .env file
      const res = await fetch('/api/git/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cleanToken ? { 'X-GitHub-Token': cleanToken } : {})
        },
        body: JSON.stringify({
          repo: cleanRepo,
          branch: cleanBranch,
          token: cleanToken
        })
      });

      if (res.ok) {
        addToast("GITHUB_REPO environment variable & credentials saved!", "success");
      }

      await syncGit(cleanRepo, cleanBranch);
    } catch (err: any) {
      addToast(`Config updated locally. Server update note: ${err.message}`, "info");
    } finally {
      setSavingEnv(false);
    }
  };

  // Preview Supabase Tables Record Counts
  const handleInspectSupabaseData = async () => {
    setIsSnapshotting(true);
    const sb = getSupabase();
    if (!sb) {
      addToast("Supabase client not initialized.", "error");
      setIsSnapshotting(false);
      return;
    }

    const preview: Record<string, number> = {};
    for (const table of selectedTables) {
      try {
        const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true });
        if (!error && typeof count === 'number') {
          preview[table] = count;
        } else {
          preview[table] = 0;
        }
      } catch {
        preview[table] = 0;
      }
    }
    setSnapshotPreview(preview);
    setIsSnapshotting(false);
    addToast("Supabase database tables inspected successfully.", "success");
  };

  // Commit Supabase Registry & Database Records to Git
  const handleCommitSupabaseToGit = async () => {
    setCommitting(true);
    setLastCommitUrl(null);
    const sb = getSupabase();
    if (!sb) {
      addToast("Supabase is unavailable", "error");
      setCommitting(false);
      return;
    }

    try {
      addToast("Fetching active database records from Supabase...", "info");
      const commitFiles: { path: string; data: any }[] = [];

      const fullDatabaseDump: Record<string, any[]> = {};

      for (const table of selectedTables) {
        const { data, error } = await sb.from(table).select('*').limit(500);
        if (!error && data) {
          fullDatabaseDump[table] = data;
          commitFiles.push({
            path: `supabase/${table}.json`,
            data: data
          });
        }
      }

      // Add main combined registry.json file
      const registryPayload = {
        version: "v6.0-supabase",
        timestamp: new Date().toISOString(),
        repo: repo,
        tablesCount: selectedTables.length,
        snapshot: fullDatabaseDump
      };

      commitFiles.push({
        path: "registry.json",
        data: registryPayload
      });

      addToast(`Pushing ${commitFiles.length} database snapshot files to GitHub...`, "info");
      const res = await commit(commitFiles, commitMessage || "Sync Supabase Registry Data");

      if (res.success) {
        setLastCommitUrl(res.commit);
        addToast("Supabase database successfully committed to GitHub!", "success");
      } else {
        addToast(`Commit failed: ${res.error}`, "error");
      }
    } catch (err: any) {
      addToast(`Commit exception: ${err.message}`, "error");
    } finally {
      setCommitting(false);
    }
  };

  const toggleTableSelect = (table: string) => {
    if (selectedTables.includes(table)) {
      setSelectedTables(selectedTables.filter(t => t !== table));
    } else {
      setSelectedTables([...selectedTables, table]);
    }
  };

  return (
    <div className="space-y-12">
      {/* Overview & Quick Status Banner */}
      <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-aba-gold/10 rounded-2xl border border-aba-gold/20">
              <Github size={28} className="text-aba-gold" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                Git Sync & Supabase Commit Engine
              </h3>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
                Repository environment configuration & database persistence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${
              gitStatus.connected ? 'bg-aba-green/10 border-aba-green/20 text-aba-green' : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${gitStatus.connected ? 'bg-aba-green animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {gitStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {gitStatus.error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs">
            <AlertCircle size={18} className="shrink-0" />
            <span>{gitStatus.error}</span>
          </div>
        )}
      </div>

      {/* 1. GITHUB_REPO & Token Settings Section */}
      <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 space-y-8">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="space-y-1">
            <h4 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-white">
              <Key className="text-aba-gold" size={20} /> Repository Environment & Credentials
            </h4>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Update GITHUB_REPO directly and validate accessibility
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveRepoSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GITHUB_REPO Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
                <Github size={12} className="text-aba-gold" /> GITHUB_REPO (Owner/Repository)
              </label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="nedtwistmovies-star/FindAba-OS"
                className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-2xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-aba-gold/50 font-mono transition-all"
              />
              <p className="text-[9px] text-white/30">
                Directly updates GITHUB_REPO environment variable and repository configuration.
              </p>
            </div>

            {/* Target Branch Dropdown Component */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
                  <GitBranch size={12} className="text-aba-gold" /> Target Git Branch (GITHUB_BRANCH)
                </label>
                <button
                  type="button"
                  onClick={() => fetchBranches(repo)}
                  disabled={loadingBranches || !repo}
                  className="text-[9px] font-bold uppercase tracking-wider text-aba-gold hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50"
                  title="Fetch available branches using GITHUB_TOKEN"
                >
                  <RefreshCcw size={10} className={loadingBranches ? "animate-spin" : ""} />
                  {loadingBranches ? "Fetching..." : "Fetch Branches"}
                </button>
              </div>

              <div className="relative">
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  disabled={loadingBranches}
                  className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-aba-gold/50 font-mono transition-all appearance-none cursor-pointer pr-10"
                >
                  {branches.length > 0 ? (
                    branches.map((b) => (
                      <option key={b.name} value={b.name} className="bg-neutral-900 text-white font-mono">
                        {b.name} {b.protected ? "🔒 (Protected)" : ""} {b.sha ? `[${b.sha}]` : ""}
                      </option>
                    ))
                  ) : (
                    <option value={branch} className="bg-neutral-900 text-white font-mono">
                      {branch} {loadingBranches ? "(Loading...)" : "(Default)"}
                    </option>
                  )}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                  <ChevronDown size={14} />
                </div>
              </div>

              {fetchBranchesError && (
                <p className="text-[9px] text-amber-400 font-mono">
                  {fetchBranchesError} — manual branch override allowed.
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[9px] text-white/40">Custom branch entry:</span>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. main"
                  className="px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-[10px] text-white font-mono focus:outline-none focus:border-aba-gold/50"
                />
              </div>
            </div>
          </div>

          {/* Organization Repositories Filter Component */}
          <div className="p-6 bg-black/40 border border-white/10 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h5 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Building size={14} className="text-aba-gold" /> Filter Repositories by GitHub Organization / Owner
                </h5>
                <p className="text-[10px] text-white/40">
                  Search and browse repository lists from specific GitHub organizations or user handles
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      fetchOrgRepos();
                    }
                  }}
                  placeholder="Org (e.g. nedtwistmovies-star)"
                  className="px-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-white/20 font-mono focus:outline-none focus:border-aba-gold"
                />
                <button
                  type="button"
                  onClick={() => fetchOrgRepos()}
                  disabled={loadingOrgRepos || !orgFilter.trim()}
                  className="px-4 py-2.5 bg-aba-gold/10 hover:bg-aba-gold/20 text-aba-gold border border-aba-gold/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50 shrink-0"
                >
                  {loadingOrgRepos ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Fetch Org Repos
                </button>
              </div>
            </div>

            {/* Sub-Search keyword filter inside fetched repos */}
            {orgRepos.length > 0 && (
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
                <span className="text-[10px] font-mono text-white/50">
                  Loaded {orgRepos.length} Repositories for <strong className="text-aba-gold">{orgFilter}</strong>
                </span>
                <input
                  type="text"
                  value={repoSearchKeyword}
                  onChange={(e) => setRepoSearchKeyword(e.target.value)}
                  placeholder="Filter list by keyword..."
                  className="px-3 py-1 bg-black/50 border border-white/10 rounded-lg text-[10px] text-white placeholder-white/20 font-mono focus:outline-none focus:border-aba-gold/50"
                />
              </div>
            )}

            {orgFetchError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle size={14} /> {orgFetchError}
              </div>
            )}

            {/* Filtered Repository List */}
            {orgRepos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {orgRepos
                  .filter(r => !repoSearchKeyword || r.fullName.toLowerCase().includes(repoSearchKeyword.toLowerCase()) || (r.description && r.description.toLowerCase().includes(repoSearchKeyword.toLowerCase())))
                  .map((r) => {
                    const isSelected = repo.toLowerCase() === r.fullName.toLowerCase();
                    return (
                      <div
                        key={r.fullName}
                        onClick={() => {
                          setRepo(r.fullName);
                          setBranch(r.defaultBranch || 'main');
                          fetchBranches(r.fullName);
                          addToast(`Target set to '${r.fullName}' (branch: ${r.defaultBranch || 'main'})`, "info");
                        }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'bg-aba-gold/10 border-aba-gold/50 shadow-lg shadow-aba-gold/5'
                            : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold font-mono text-white truncate flex items-center gap-1.5">
                            <Github size={12} className={isSelected ? "text-aba-gold" : "text-white/40"} />
                            {r.fullName}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono ${
                            r.private ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                          }`}>
                            {r.private ? 'Private' : 'Public'}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/60 line-clamp-1">{r.description}</p>
                        <div className="flex items-center justify-between text-[9px] font-mono text-white/40 pt-1 border-t border-white/5">
                          <span>Default branch: {r.defaultBranch}</span>
                          {isSelected ? (
                            <span className="text-aba-gold font-bold flex items-center gap-1">
                              <Check size={10} /> Selected Target
                            </span>
                          ) : (
                            <span className="hover:text-white">Click to select</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* GitHub Personal Access Token */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
              <Key size={12} className="text-aba-gold" /> GitHub Personal Access Token (GITHUB_TOKEN)
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxx"
                className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-2xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-aba-gold/50 font-mono pr-14 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[9px] text-white/30">
              Required for private repositories or write operations. Classic PAT with 'repo' scope or fine-grained token.
            </p>
          </div>

          {/* Action Buttons: Save & Test Connection */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <IndustrialButton
              type="submit"
              variant="primary"
              size="md"
              icon={savingEnv ? Loader2 : Save}
              loading={savingEnv}
            >
              Save Repository Settings
            </IndustrialButton>

            <IndustrialButton
              type="button"
              variant="secondary"
              size="md"
              icon={testingConnection ? Loader2 : CheckCircle2}
              loading={testingConnection}
              onClick={handleTestConnection}
            >
              Test Connection
            </IndustrialButton>

            <IndustrialButton
              type="button"
              variant="ghost"
              size="md"
              icon={gitLoading ? Loader2 : RefreshCcw}
              loading={gitLoading}
              onClick={() => fullSync("Manual OS Refresh")}
            >
              Trigger Full OS Sync
            </IndustrialButton>

            <IndustrialButton
              type="button"
              variant="secondary"
              size="md"
              icon={runningDiagnostics ? Loader2 : Activity}
              loading={runningDiagnostics}
              onClick={runDiagnostics}
            >
              Run System Diagnostics
            </IndustrialButton>
          </div>
        </form>

        {/* Diagnostics Output */}
        {diagnostics && (
          <div className={`p-6 rounded-2xl border space-y-4 ${
            diagnostics.success ? 'bg-aba-green/5 border-aba-green/20' : 'bg-amber-500/5 border-amber-500/20'
          }`}>
            <div className="flex items-center gap-3">
              <Activity size={20} className={diagnostics.success ? "text-aba-green" : "text-amber-500"} />
              <h5 className="text-sm font-black uppercase text-white tracking-wide">
                System Git Diagnostics
              </h5>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-white/40">Environment Variable</span>
                  <span className={`text-[10px] font-mono font-bold ${diagnostics.checks?.envRepo === 'PRESENT' ? 'text-aba-green' : 'text-red-500'}`}>
                    {diagnostics.checks?.envRepo || (diagnostics.envRepo ? 'PRESENT' : 'MISSING')}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-white/40">GitHub Token</span>
                  <span className={`text-[10px] font-mono font-bold ${diagnostics.checks?.hasToken === 'PRESENT' ? 'text-aba-green' : 'text-red-500'}`}>
                    {diagnostics.checks?.hasToken || (diagnostics.hasToken ? 'PRESENT' : 'MISSING')}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-white/40">Repository Format</span>
                  <span className={`text-[10px] font-mono font-bold ${diagnostics.checks?.repoFormat === 'VALID' ? 'text-aba-green' : 'text-red-500'}`}>
                    {diagnostics.checks?.repoFormat || (diagnostics.repoValid ? 'VALID' : 'INVALID')}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-white/40">GitHub API Status</span>
                  <span className={`text-[10px] font-mono font-bold ${diagnostics.checks?.apiStatus === 'REACHABLE' ? 'text-aba-green' : 'text-red-500'}`}>
                    {diagnostics.checks?.apiStatus || (diagnostics.apiReachable ? 'REACHABLE' : 'UNREACHABLE')}
                  </span>
                </div>
              </div>
            </div>
            {diagnostics.message && (
              <p className="text-[10px] font-mono text-white/60 p-3 bg-black/40 rounded-xl border border-white/5">
                {diagnostics.message}
              </p>
            )}

            {!diagnostics.success && (
              <div className="p-4 bg-aba-gold/5 border border-aba-gold/20 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-aba-gold">
                  <ShieldCheck size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">How to Resolve</span>
                </div>
                <p className="text-[10px] text-white/60 leading-relaxed">
                  To persist these settings permanently in your live environment, go to the <strong>Settings</strong> menu in AI Studio, click on <strong>Secrets</strong>, and add:
                </p>
                <div className="space-y-2">
                   <div className="flex items-center justify-between p-2 bg-black/20 rounded-lg text-[9px]">
                     <code className="text-aba-gold">GITHUB_REPO</code>
                     <span className="text-white/40">Owner/Repository format</span>
                   </div>
                   <div className="flex items-center justify-between p-2 bg-black/20 rounded-lg text-[9px]">
                     <code className="text-aba-gold">GITHUB_TOKEN</code>
                     <span className="text-white/40">Personal Access Token (classic or fine-grained)</span>
                   </div>
                </div>
                <p className="text-[9px] text-white/40 italic">
                  Note: You can also save these temporarily below using the "Save Repository Config" button.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Test Connection Output Card */}
        {testResult && (
          <div className={`p-6 rounded-2xl border space-y-4 ${
            testResult.success ? 'bg-aba-green/5 border-aba-green/20' : 'bg-red-500/5 border-red-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {testResult.success ? (
                  <CheckCircle2 size={20} className="text-aba-green" />
                ) : (
                  <AlertCircle size={20} className="text-red-500" />
                )}
                <h5 className="text-sm font-black uppercase text-white tracking-wide">
                  {testResult.success ? "Connection Test Passed" : "Connection Test Failed"}
                </h5>
              </div>
              {testResult.repo && (
                <span className="text-[10px] font-mono px-3 py-1 bg-white/10 text-white rounded-full">
                  {testResult.repo}
                </span>
              )}
            </div>

            <p className="text-xs text-white/80 leading-relaxed font-mono">
              {testResult.message || testResult.details}
            </p>

            {testResult.success && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-white/5">
                <div>
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Visibility</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {testResult.private ? 'Private' : 'Public'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Default Branch</span>
                  <span className="text-xs font-mono font-bold text-white">{testResult.defaultBranch || 'main'}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-white/40 block">API Rate Remaining</span>
                  <span className="text-xs font-mono font-bold text-aba-gold">{testResult.rateLimitRemaining ?? '60'}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Auth Level</span>
                  <span className="text-xs font-mono font-bold text-white">{testResult.authStatus || 'OK'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Supabase Database to Git Commit Engine Section */}
      <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <h4 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-white">
              <Database className="text-aba-gold" size={20} /> Supabase Database Commit to Git
            </h4>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Export live Supabase state & tables directly into GitHub repository
            </p>
          </div>

          <IndustrialButton
            variant="secondary"
            size="sm"
            icon={isSnapshotting ? Loader2 : Layers}
            loading={isSnapshotting}
            onClick={handleInspectSupabaseData}
          >
            Inspect Database Tables
          </IndustrialButton>
        </div>

        {/* Table Selector */}
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/60 block">
            Select Supabase Tables to Include in Commit:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              "businesses",
              "profiles",
              "buyer_signals",
              "ledger",
              "orders",
              "thrift_accounts",
              "posts"
            ].map(table => {
              const isSelected = selectedTables.includes(table);
              const count = snapshotPreview[table];
              return (
                <button
                  key={table}
                  type="button"
                  onClick={() => toggleTableSelect(table)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all ${
                    isSelected
                      ? 'bg-aba-gold/10 border-aba-gold text-white shadow-lg'
                      : 'bg-black/40 border-white/5 text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black uppercase font-mono">{table}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'bg-aba-gold border-aba-gold text-aba-dark' : 'border-white/20'
                    }`}>
                      {isSelected && <Check size={10} className="stroke-[3]" />}
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-white/40">
                    {count !== undefined ? `${count} rows` : 'Ready'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Commit Message */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
            <GitCommit size={12} className="text-aba-gold" /> Git Commit Message
          </label>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Sync Supabase Database Registry to GitHub"
            className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-2xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-aba-gold/50 font-mono transition-all"
          />
        </div>

        {/* Commit Action */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
          <div className="text-[10px] font-bold text-white/40">
            Target Repository: <span className="text-aba-gold font-mono">{repo || 'Default'}</span> ({branch})
          </div>

          <IndustrialButton
            variant="primary"
            size="lg"
            icon={committing ? Loader2 : GitCommit}
            loading={committing}
            disabled={selectedTables.length === 0}
            onClick={handleCommitSupabaseToGit}
          >
            Commit Supabase Registry to Git
          </IndustrialButton>
        </div>

        {/* Commit Success Result Banner */}
        {lastCommitUrl && (
          <div className="p-6 bg-aba-green/10 border border-aba-green/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-aba-green shrink-0" />
              <div>
                <h5 className="text-sm font-black uppercase text-white tracking-wide">
                  Commit Deployed to GitHub
                </h5>
                <p className="text-[10px] text-white/60 font-mono">
                  Database snapshot written to registry.json and /supabase datasets.
                </p>
              </div>
            </div>
            <a
              href={lastCommitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-aba-green text-aba-dark font-black uppercase text-xs rounded-xl flex items-center gap-2 hover:bg-aba-green/90 transition-all shrink-0"
            >
              View Commit on GitHub <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitSyncSupabaseCommit;
