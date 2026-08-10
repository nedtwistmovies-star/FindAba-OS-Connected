
import React, { useState, useEffect } from 'react';
import { 
  Github, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Activity, 
  RefreshCcw, 
  Clock, 
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';
import { useGitSync } from '../../../hooks/useGitSync';
import IndustrialButton from '../../../components/IndustrialButton';
import { useToast } from '../../../providers/ToastProvider';

interface DiagnosticResult {
  success: boolean;
  repoValid: boolean;
  apiReachable: boolean;
  message: string;
  envRepo: string | null;
  envBranch: string;
  hasToken: boolean;
  checks: {
    envRepo: string;
    hasToken: string;
    repoFormat: string;
    apiStatus: string;
  };
}

interface WebhookLog {
  id: string;
  timestamp: string;
  event: string;
  status: string;
  message: string;
}

export const GitIntegrationDiagnostics: React.FC = () => {
  const { status: gitStatus, sync: syncGit } = useGitSync();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [webhookActive, setWebhookActive] = useState<boolean | 'unknown'>('unknown');

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const diagRes = await fetch('/api/git/diagnostic');
      const diagData = await diagRes.json();
      setDiagnostics(diagData);

      const logsRes = await fetch('/api/git/webhook-logs');
      const logsData = await logsRes.json();
      const logs = logsData.logs || [];
      setWebhookLogs(logs);

      // Webhook is considered active if we have received a ping or a push event recently
      const hasActivity = logs.some((log: any) => log.event === 'ping' || log.event === 'push');
      setWebhookActive(hasActivity);

      if (diagData.success) {
        addToast("GitHub integration diagnostics complete.", "success");
      } else {
        addToast("Diagnostics found configuration issues.", "info");
      }
    } catch (err) {
      console.error("Diagnostics failed:", err);
      addToast("Failed to run GitHub diagnostics.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-2xl ${gitStatus.connected ? 'bg-aba-green/10 text-aba-green' : 'bg-red-500/10 text-red-500'}`}>
              <Github size={24} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-black uppercase tracking-tighter text-white">GitHub Integration Status</h3>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                  gitStatus.connected 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    gitStatus.connected 
                      ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' 
                      : 'bg-rose-500'
                  }`} />
                  {gitStatus.connected ? 'Active' : 'Inactive'}
                </div>
              </div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {gitStatus.connected ? 'Connected & Operational' : 'Connection Interrupted'}
              </p>
            </div>
          </div>
          <IndustrialButton 
            variant="secondary" 
            size="sm" 
            icon={RefreshCcw} 
            loading={loading}
            onClick={runDiagnostics}
          >
            Refresh Diagnostics
          </IndustrialButton>
        </div>

        {/* Diagnostic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Connection Status Card */}
          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">API Connectivity</span>
              {diagnostics?.apiReachable ? (
                <CheckCircle2 size={16} className="text-aba-green" />
              ) : (
                <XCircle size={16} className="text-red-500" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">
                {diagnostics?.apiReachable ? 'API Reachable' : 'API Unreachable'}
              </p>
              <p className="text-[10px] text-white/40 font-medium leading-relaxed">
                {diagnostics?.message || 'Awaiting diagnostic handshake...'}
              </p>
            </div>
          </div>

          {/* Webhook Status Card */}
          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Webhook Stream</span>
              {webhookActive === true ? (
                <Zap size={16} className="text-aba-gold animate-pulse" />
              ) : webhookActive === false ? (
                <AlertCircle size={16} className="text-white/20" />
              ) : (
                <Activity size={16} className="text-white/10" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">
                {webhookActive === true ? 'Webhook Active' : webhookActive === false ? 'No Activity' : 'Testing...'}
              </p>
              <p className="text-[10px] text-white/40 font-medium leading-relaxed">
                {webhookActive === true 
                  ? 'Receiving real-time updates from GitHub.' 
                  : 'No push/ping events detected in current session.'}
              </p>
            </div>
          </div>

          {/* Sync History Card */}
          <div className="bg-black/40 border border-white/5 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Registry Sync</span>
              <Clock size={16} className="text-aba-gold" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Last Successful Sync</p>
              <p className="text-[10px] text-white/40 font-medium leading-relaxed">
                {gitStatus.lastUpdated 
                  ? new Date(gitStatus.lastUpdated).toLocaleString() 
                  : 'No successful sync recorded yet.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environment Configuration */}
        <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-aba-gold" />
            <h4 className="text-xs font-black uppercase tracking-widest text-white">System Environment</h4>
          </div>
          
          <div className="space-y-3">
            {[
              { label: 'Repository', value: diagnostics?.envRepo || 'Not Configured', status: diagnostics?.checks?.envRepo || 'PENDING' },
              { label: 'Repo Format', value: diagnostics?.repoValid ? 'Valid' : 'Invalid', status: diagnostics?.checks?.repoFormat || 'PENDING' },
              { label: 'API Token', value: diagnostics?.hasToken ? 'Active' : 'Missing', status: diagnostics?.checks?.hasToken || 'PENDING' },
              { label: 'Target Branch', value: diagnostics?.envBranch || 'main', status: 'OK' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{item.label}</span>
                <div className="flex items-center gap-3">
                  <code className="text-[10px] text-aba-gold">{item.value}</code>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                    item.status === 'PRESENT' || item.status === 'VALID' || item.status === 'OK'
                      ? 'bg-aba-green/10 text-aba-green'
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook Activity Log */}
        <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-aba-gold" />
            <h4 className="text-xs font-black uppercase tracking-widest text-white">Recent Activity</h4>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
            {webhookLogs.length === 0 ? (
              <div className="p-12 text-center text-white/10 italic text-[10px] uppercase tracking-widest">
                No recent integration activity recorded.
              </div>
            ) : (
              webhookLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-white/5 text-[8px] font-black text-white/40 uppercase rounded-md tracking-widest">
                      {log.event}
                    </span>
                    <span className="text-[8px] font-bold text-white/20">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/60 leading-relaxed">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
