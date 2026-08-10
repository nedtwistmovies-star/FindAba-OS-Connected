
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, Phone, Mail, X, 
  ChevronRight, Globe, ShieldCheck, 
  Zap, MessageSquare 
} from 'lucide-react';
import { Business } from '../types';
import { useOracle, useAuth, useToast } from '../providers';

interface ContactGatewayProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
}

export const ContactGateway: React.FC<ContactGatewayProps> = ({ isOpen, onClose, business }) => {
  const { setIsAuthModalOpen, setAuthModalMode, setView, setPostAuthAction } = useOracle();
  const { isAuth, userIdentifier, profile } = useAuth();
  const { addToast } = useToast();

  if (!business) return null;

  const contactMethods = [
    {
      id: 'chat',
      label: 'In-App Message',
      desc: 'Secure end-to-end industrial chat',
      icon: <MessageSquare size={20} />,
      color: 'bg-blue-500',
      action: () => {
        if (!isAuth) {
           console.log("GUEST_CHAT_CLICKED", "SAVING_CONTEXT");
           setPostAuthAction({ type: 'OPEN_CHAT', payload: { businessId: business.id } });
           setAuthModalMode('signin');
           setIsAuthModalOpen(true);
           onClose();
           return;
        }
        console.log("CONTACT_METHOD_SELECTED", "IN_APP_CHAT", business.id);
        window.dispatchEvent(new CustomEvent('OPEN_BUSINESS_CHAT', { 
          detail: { businessId: business.id } 
        }));
        onClose();
      }
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      desc: 'Connect via Meta Cloud API',
      icon: <MessageCircle size={20} />,
      color: 'bg-green-500',
      action: async () => {
        console.log("CONTACT_METHOD_SELECTED", "WHATSAPP", business.id);
        
        // 1. Immediate optimistic feedback
        addToast(`Initiating Meta WhatsApp link with ${business.name}...`, 'info');

        try {
          // 2. Trigger Server-Side Meta API & Make.com Sync with LocalStorage webhook override if configured
          const makeUrlOverride = localStorage.getItem('findaba_make_webhook_url') || undefined;
          
          const response = await fetch('/api/whatsapp/inquiry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId: business.id,
              businessName: business.name,
              phone: business.phone_whatsapp,
              message: `Inquiry from FindAba: Interested in ${business.name}`,
              userName: profile?.full_name || userIdentifier || 'Anonymous Industrial Guest',
              userEmail: userIdentifier,
              makeWebhookUrlOverride: makeUrlOverride
            })
          });

          const data = await response.json();
          
          if (data.make?.success) {
            addToast(`Lead successfully synchronized with Make.com!`, 'success');
          }

          if (data.whatsapp?.success) {
            addToast(`WhatsApp alert dispatched successfully via Meta API!`, 'success');
          } else if (data.whatsapp?.error === 'CREDENTIALS_MISSING') {
            addToast(`Meta API Credentials not yet configured in env. Launching direct wa.me chat link.`, 'info');
          } else if (data.whatsapp?.error) {
            const hint = data.whatsapp.details?.diagnosticHint || '';
            const msg = `WhatsApp Integration Alert: ${data.whatsapp.error}. ${hint}`;
            addToast(msg, 'info');
          }

          // 3. Always provide the direct wa.me fallback for the best CX
          // The API call happens in the background to log/sync/send template
          setTimeout(() => {
            window.open(`https://wa.me/${business.phone_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent("Hello! I found your business on FindAba and would like to inquire about your services.")}`, '_blank');
          }, 500);

        } catch (err) {
          console.error("[WhatsApp] API Integration Error:", err);
          // Fallback to direct link if server logic fails
          window.open(`https://wa.me/${business.phone_whatsapp.replace(/\D/g, '')}`, '_blank');
        }
        
        onClose();
      }
    },
    {
      id: 'phone',
      label: 'Voice Signal',
      desc: 'Direct cellular communication',
      icon: <Phone size={20} />,
      color: 'bg-aba-red',
      action: () => {
        console.log("CONTACT_METHOD_SELECTED", "PHONE", business.id);
        window.location.href = `tel:${business.phone_whatsapp}`;
      }
    },
    {
      id: 'email',
      label: 'Email Artifact',
      desc: 'Formal industrial correspondence',
      icon: <Mail size={20} />,
      color: 'bg-aba-gold',
      action: () => {
        console.log("CONTACT_METHOD_SELECTED", "EMAIL", business.id);
        window.location.href = `mailto:${business.email || 'support@findaba.com'}`;
      }
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-aba-deep border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-8 pb-0 flex justify-between items-start">
               <div className="space-y-2">
                  <div className="flex items-center gap-3">
                     <span className="text-[10px] font-black text-aba-gold uppercase tracking-[0.3em]">Connectivity Node</span>
                     <div className="w-1.5 h-1.5 rounded-full bg-aba-gold animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold text-white uppercase tracking-tight leading-none">Contact {business.name}</h2>
               </div>
               <button onClick={onClose} className="p-3 bg-white/5 text-white/40 hover:text-white rounded-2xl transition-standard">
                  <X size={20} />
               </button>
            </div>

            {/* Methods */}
            <div className="p-8 space-y-4">
               {contactMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={method.action}
                    className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 hover:border-aba-gold/30 transition-standard group text-left"
                  >
                     <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 ${method.color} text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-standard shadow-lg`}>
                           {method.icon}
                        </div>
                        <div>
                           <h4 className="text-sm font-bold text-white uppercase tracking-tight">{method.label}</h4>
                           <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest">{method.desc}</p>
                        </div>
                     </div>
                     <ChevronRight className="text-white/20 group-hover:text-aba-gold group-hover:translate-x-1 transition-standard" />
                  </button>
               ))}
            </div>

            {/* Footer / Trust signal */}
            <div className="p-8 pt-0 mt-4">
               <div className="bg-aba-gold/10 border border-aba-gold/20 rounded-2xl p-4 flex items-center gap-4">
                  <ShieldCheck className="text-aba-gold shrink-0" size={24} />
                  <p className="text-[9px] font-black text-aba-gold/80 uppercase tracking-widest leading-relaxed">
                     All commercial communications are monitored for integrity and quality assurance by the FindAba Registry.
                  </p>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
