
import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, ExternalLink, ShieldAlert, Loader2 } from 'lucide-react';
import IndustrialButton from './IndustrialButton';

export const HealthCheck: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (err) {
        console.warn('[HealthCheck] Health check fetch soft fallback:', err);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  if (loading) return null;

  const env = status?.environment || {};
  const missingVars = Object.entries(env).filter(([_, v]) => v === 'MISSING');
  const allOk = missingVars.length === 0;

  if (allOk && !isExpanded) return null;

  return (
    <div className={`fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[2000] animate-slide-up`}>
      <div className={`bg-aba-deep/95 backdrop-blur-2xl border-2 rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 ${allOk ? 'border-aba-green/30' : 'border-red-500/30'}`}>
        <div 
          className={`p-6 flex items-center justify-between cursor-pointer ${allOk ? 'bg-aba-green/5' : 'bg-red-500/5'}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${allOk ? 'bg-aba-green/10 text-aba-green' : 'bg-red-500/10 text-red-500'}`}>
              {allOk ? <CheckCircle size={20} /> : <ShieldAlert size={20} />}
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white">System Integrity</h4>
              <p className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${allOk ? 'text-aba-green' : 'text-red-500'}`}>
                {allOk ? 'All Systems Operational' : `${missingVars.length} Critical Gaps Detected`}
              </p>
            </div>
          </div>
          <button className="text-white/20 hover:text-white transition-colors">
            <Info size={16} />
          </button>
        </div>

        {isExpanded && (
          <div className="p-6 space-y-6 border-t border-white/5 animate-fade-in">
            <div className="space-y-3">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest px-1">Infrastructure Check</p>
              <div className="space-y-2">
                {Object.entries(env).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                    <code className="text-[10px] text-aba-gold">{key}</code>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${val === 'PRESENT' ? 'text-aba-green' : 'text-red-500'}`}>
                      {val as string}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {!allOk && (
              <div className="p-4 bg-aba-gold/5 border border-aba-gold/20 rounded-xl space-y-3">
                <p className="text-[9px] text-white/60 leading-relaxed">
                  Missing variables will limit Git Sync, WhatsApp Notifications, and Database Registry exports.
                </p>
                <a 
                  href="https://ai.studio/build" 
                  target="_blank" 
                  className="flex items-center gap-2 text-[9px] font-black uppercase text-aba-gold hover:underline"
                >
                  Configure in AI Studio Settings <ExternalLink size={10} />
                </a>
              </div>
            )}

            <IndustrialButton 
              variant="secondary" 
              size="sm" 
              className="w-full"
              onClick={() => setIsExpanded(false)}
            >
              Dismiss Panel
            </IndustrialButton>
          </div>
        )}
      </div>
    </div>
  );
};
