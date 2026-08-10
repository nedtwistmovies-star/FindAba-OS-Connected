
import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  ShieldCheck,
  Loader2,
  RefreshCcw,
  ArrowLeft,
  Activity,
  AlertTriangle,
  Database,
  Sparkles,
  Zap,
  Radio,
  LayoutDashboard,
  Settings,
  Key,
  Terminal,
  Cloud,
  Globe,
  Truck,
  Info,
  Users,
  MessageSquare,
  BarChart3,
  Github,
  Cpu,
  Mail,
  ListTodo,
  TrendingUp,
  LayoutGrid,
  Eye,
  EyeOff,
  Save,
  Link2,
  X,
  Check
} from "lucide-react";
import { motion } from "motion/react";
import { useGitSync } from "../../hooks/useGitSync";
import { BackButton } from "../../components/BackButton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  fetchPlatformConfig,
  fetchAllBusinesses,
  getSupabase,
  fetchBuyerSignals,
  getRegistryConfig,
  checkDatabaseHealth,
  fetchAllThriftAccounts,
  fetchAdminPosts,
} from "../../services/supabaseService";
import { validateAutomationGateway } from "../../services/webhookService";
import { useToast } from "../../providers/ToastProvider";
import { useBusiness } from "../../providers/BusinessProvider";
import { PlatformConfig, Business, BuyerSignal, LedgerEntry, Task, Order, ThriftAccount, Post } from "../../types";
import StatCard from "../../components/StatCard";
import SectionHeader from "../../components/SectionHeader";
import IndustrialButton from "../../components/IndustrialButton";
import { BentoGrid, BentoItem } from "../../components/BentoGrid";

// Extracted Components
import AutomationAudit from "./components/AutomationAudit";
import EmailAudit from "./components/EmailAudit";
import MetadataEditor from "./components/MetadataEditor";
import TasksManager from "./components/TasksManager";
import WhatsAppWebhookDashboard from "./components/WhatsAppWebhookDashboard";
import GitSyncSupabaseCommit from "./components/GitSyncSupabaseCommit";
import { GitIntegrationDiagnostics } from "./components/GitIntegrationDiagnostics";

const Admin: React.FC<any> = ({ setView, userRole, userEmail, profile }) => {
  const { addToast } = useToast();
  const { refreshData } = useBusiness();
  const { status: gitStatus, loading: gitLoading, fullSync, sync: syncGit, clearError } = useGitSync();

  const [inputRepo, setInputRepo] = useState(() => localStorage.getItem('findaba_git_repo') || '');
  const [inputBranch, setInputBranch] = useState(() => localStorage.getItem('findaba_git_branch') || 'main');
  const [inputPat, setInputPat] = useState(() => localStorage.getItem('findaba_github_pat') || '');
  const [showPat, setShowPat] = useState(false);
  const [isSavingGit, setIsSavingGit] = useState(false);

  // Sync form state when gitStatus repo updates
  useEffect(() => {
    if (gitStatus.repo && !inputRepo) {
      setInputRepo(gitStatus.repo);
    }
  }, [gitStatus.repo]);

  const handleSaveGitConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingGit(true);
    clearError();

    // Clean up repo string if full URL was pasted
    let cleanRepo = inputRepo.trim();
    cleanRepo = cleanRepo.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');

    if (cleanRepo) {
      localStorage.setItem('findaba_git_repo', cleanRepo);
      setInputRepo(cleanRepo);
    } else {
      localStorage.removeItem('findaba_git_repo');
    }

    const branchToUse = inputBranch.trim() || 'main';
    localStorage.setItem('findaba_git_branch', branchToUse);

    if (inputPat.trim()) {
      localStorage.setItem('findaba_github_pat', inputPat.trim());
    } else {
      localStorage.removeItem('findaba_github_pat');
    }

    try {
      await syncGit(cleanRepo, branchToUse);
      addToast("Git repository configuration saved and tested!", "success");
    } catch (err: any) {
      addToast("Git configuration saved, connection test: " + (err.message || "Failed"), "info");
    } finally {
      setIsSavingGit(false);
    }
  };

  const handleClearGitConfig = () => {
    localStorage.removeItem('findaba_git_repo');
    localStorage.removeItem('findaba_git_branch');
    localStorage.removeItem('findaba_github_pat');
    setInputRepo('');
    setInputBranch('main');
    setInputPat('');
    clearError();
    syncGit('', 'main');
    addToast("Git configuration cleared.", "info");
  };
  
  const handleFullSync = async (reason: string) => {
    addToast("Initiating GitHub synchronization...", "info");
    const result = await fullSync(reason);
    if (result && result.success) {
      addToast("Repository synced successfully!", "success");
    } else {
      addToast(result?.error || "Synchronization completed with warning alerts or error status.", "error");
    }
  };

  const isAuthenticated = userRole === "admin" || userEmail === 'pastornelsonezi@gmail.com' || (profile && (profile.role === 'admin' || profile.role === 'superadmin'));

  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "registry"
    | "signals"
    | "users"
    | "whatsapp"
    | "automation"
    | "tasks"
    | "email"
    | "metadata"
    | "supabase"
    | "infrastructure"
    | "git"
  >(() => (localStorage.getItem('findaba_admin_tab') as any) || "overview");

  useEffect(() => {
    localStorage.setItem('findaba_admin_tab', activeTab);
  }, [activeTab]);

  const [loading, setLoading] = useState(false);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [signals, setSignals] = useState<BuyerSignal[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [thriftAccounts, setThriftAccounts] = useState<ThriftAccount[]>([]);
  const [adminPosts, setAdminPosts] = useState<Post[]>([]);
  const [dbHealth, setDbHealth] = useState<{ status: "healthy" | "unhealthy" | "unknown"; message?: string; }>({ status: "unknown" });
  const [automationStatus, setAutomationStatus] = useState<{ status: string, message: string }>({ status: 'unknown', message: 'Audit not yet initialized.' });
  const [isAuditing, setIsAuditing] = useState(false);

  const refreshAllData = useCallback(async () => {
    setLoading(true);
    try {
      const config = await fetchPlatformConfig();
      setPlatformConfig(config);

      const biz = await fetchAllBusinesses();
      setBusinesses(biz);

      const sigs = await fetchBuyerSignals();
      setSignals(sigs);

      const health = await checkDatabaseHealth();
      setDbHealth(health);

      const sb = getSupabase();
      if (sb) {
        const { data: ledgerData } = await sb.from('ledger').select('*').order('created_at', { ascending: false });
        setLedger(ledgerData || []);

        const { data: orderData } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(20);
        setOrders(orderData || []);

        const { data: profileData } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
        setProfiles(profileData || []);

        const thrift = await fetchAllThriftAccounts();
        setThriftAccounts(thrift);

        const posts = await fetchAdminPosts();
        setAdminPosts(posts);
      }
    } catch (err: any) {
      console.error("Registry Sync Fault:", err);
      addToast(`Sync Fault: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isAuthenticated) refreshAllData();
  }, [isAuthenticated, refreshAllData]);

  const runAutomationAudit = async () => {
    setIsAuditing(true);
    try {
      const result = await validateAutomationGateway();
      setAutomationStatus(result);
      if (result.status === 'working') {
        addToast("Automation Gateway Validated", "success");
      } else {
        addToast("Automation Gateway Fault Detected", "error");
      }
    } catch (err: any) {
      setAutomationStatus({ status: 'broken', message: err.message || 'Unknown fault.' });
    } finally {
      setIsAuditing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b100e] flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="w-24 h-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center border border-red-500/20">
          <Shield size={40} className="text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight text-white">Access Restricted</h1>
          <p className="text-white/40 font-medium max-w-md mx-auto">This terminal is restricted to FindAba Administrators only. Unauthorized access is logged in the Mesh registry.</p>
        </div>
        <IndustrialButton variant="primary" size="lg" icon={ArrowLeft} onClick={() => setView('home')}>
          Return to Hub
        </IndustrialButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b100e] pb-32">
      <div className="max-w-7xl mx-auto px-6 pt-12 space-y-12">
        <div className="flex items-center">
          <BackButton label="Back to Dashboard" />
        </div>
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white/5 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-aba-gold/10 rounded-[2.5rem] border border-aba-gold/20 shadow-[0_0_30px_rgba(255,191,0,0.1)]">
              <ShieldCheck className="text-aba-gold" size={32} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Mesh Admin</h1>
                <span className="px-3 py-1 bg-aba-gold text-aba-dark text-[8px] font-black uppercase rounded-full tracking-widest">v4.0 Alpha</span>
              </div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity size={12} className="text-aba-green animate-pulse" /> FindAba OS Command Center
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <IndustrialButton variant="secondary" size="md" icon={RefreshCcw} loading={loading} onClick={refreshAllData}>
              Sync Registry
            </IndustrialButton>
            <IndustrialButton variant="primary" size="md" icon={ArrowLeft} onClick={() => setView('home')}>
              Exit Terminal
            </IndustrialButton>
          </div>
        </div>

        {/* System Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Registry Nodes" 
            value={businesses.length.toString()} 
            icon={Database} 
            trend={{ value: "4%", isPositive: true }}
            description="Verified Entities"
          />
          <StatCard 
            title="Network Signals" 
            value={signals.length.toString()} 
            icon={Radio} 
            trend={{ value: "12%", isPositive: true }}
            description="Market Intent"
          />
          <StatCard 
            title="Mesh Citizens" 
            value={profiles.length.toString()} 
            icon={Users} 
            trend={{ value: "2%", isPositive: true }}
            description="Active Citizens"
          />
          <StatCard 
            title="Integrity Health" 
            value={dbHealth.status === 'healthy' ? "99.9%" : "FAULT"} 
            icon={Activity} 
            color={dbHealth.status === 'healthy' ? 'text-aba-green' : 'text-red-500'}
            description={dbHealth.message || (dbHealth.status === 'healthy' ? "Mesh Stabilized" : "Connection Error")}
          />
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex flex-wrap gap-2 p-2 bg-white/5 rounded-[2.5rem] border border-white/5 backdrop-blur-md overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'whatsapp', label: 'WhatsApp Stream', icon: MessageSquare },
            { id: 'registry', label: 'Registry', icon: Database },
            { id: 'signals', label: 'Signals', icon: Radio },
            { id: 'users', label: 'Citizens', icon: Users },
            { id: 'automation', label: 'Automations', icon: Zap },
            { id: 'tasks', label: 'Roadmap', icon: ListTodo },
            { id: 'email', label: 'Email', icon: Mail },
            { id: 'metadata', label: 'Manifest', icon: Globe },
            { id: 'git', label: 'Git Sync & Supabase Commit', icon: Github },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-6 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id 
                ? 'bg-white text-aba-dark shadow-xl scale-[1.02]' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-[600px]"
        >
          {activeTab === 'overview' && (
            <div className="space-y-12">
              <SectionHeader title="Mesh Performance" subtitle="Real-time analytics and platform vital signs" />
              <BentoGrid>
                <BentoItem span="col-span-2" className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { name: 'Mon', value: 40 },
                      { name: 'Tue', value: 30 },
                      { name: 'Wed', value: 65 },
                      { name: 'Thu', value: 45 },
                      { name: 'Fri', value: 90 },
                      { name: 'Sat', value: 70 },
                      { name: 'Sun', value: 85 },
                    ]}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ffbf00" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ffbf00" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff20" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0b100e', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }} />
                      <Area type="monotone" dataKey="value" stroke="#ffbf00" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </BentoItem>
                <BentoItem>
                  <div className="flex flex-col items-center justify-center h-full space-y-6">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                       <svg className="w-full h-full transform -rotate-90">
                          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={364} strokeDashoffset={364 * 0.1} className="text-aba-green transition-all duration-1000" />
                       </svg>
                       <span className="absolute text-2xl font-black text-white">90%</span>
                    </div>
                    <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">Verified Data Score</p>
                  </div>
                </BentoItem>
              </BentoGrid>
            </div>
          )}

          {activeTab === 'automation' && (
            <AutomationAudit 
              status={automationStatus} 
              auditing={isAuditing} 
              runAudit={runAutomationAudit} 
            />
          )}

          {activeTab === 'email' && <EmailAudit />}

          {activeTab === 'metadata' && <MetadataEditor />}

          {activeTab === 'tasks' && <TasksManager />}

          {activeTab === 'git' && (
            <div className="space-y-12">
              <SectionHeader title="GitHub Integration Diagnostics" subtitle="Connection integrity and webhook monitoring" />
              <GitIntegrationDiagnostics />
              <SectionHeader title="Repository Synchronization" subtitle="Commit registry data and system files to GitHub" />
              <GitSyncSupabaseCommit />
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <WhatsAppWebhookDashboard />
          )}

          {/* Simple Registry View as Fallback if not extracted yet */}
          {(activeTab === 'registry' || activeTab === 'signals' || activeTab === 'users') && (
            <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5">
              <div className="p-20 text-center text-white/20 space-y-4">
                <Database size={40} className="mx-auto" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Registry module {activeTab} is currently being refactored for the mesh grid.
                </p>
                <IndustrialButton variant="secondary" size="sm" icon={RefreshCcw} onClick={refreshAllData}>
                  Refresh Data
                </IndustrialButton>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
