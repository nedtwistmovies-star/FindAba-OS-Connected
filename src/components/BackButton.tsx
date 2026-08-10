import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useOracle } from '../providers/OracleProvider';

interface BackButtonProps {
  onClick?: () => void;
  label?: string;
  className?: string;
  variant?: 'default' | 'minimal' | 'floating' | 'pill' | 'header';
  showPreviousViewName?: boolean;
}

const VIEW_NAMES: Record<string, string> = {
  home: 'Home',
  discover: 'Discover',
  explore: 'Explore',
  detail: 'Business',
  'merchant-portal': 'Merchant Portal',
  register: 'Register Business',
  pricing: 'Pricing',
  'ad-checkout': 'Ad Checkout',
  'business-verification': 'Verification',
  oracle: 'FindAba AI',
  about: 'About Us',
  legal: 'Legal Terms',
  support: 'Support Center',
  cargo: 'Logistics Hub',
  profile: 'Profile',
  messages: 'Messages',
  admin: 'Admin Console',
  'tech-setup': 'Tech Setup',
  'buyer-portal': 'Buyer Portal',
  'ad-manager': 'Ad Manager',
  login: 'Sign In',
  signup: 'Sign Up',
  onboarding: 'Onboarding',
  feed: 'Faces Feed',
  faces: 'Faces Feed',
  'purple-fleet': 'Purple Fleet',
  'sandals-hotels': 'Sandals Hotels',
  'srts-dashboard': 'Thrift System',
  'thrift-dashboard': 'Thrift System',
  lab: 'Audio Heritage',
  'audio-heritage': 'Audio Heritage',
  'about-aba': 'About Aba',
  editorial: 'Editorial Feed',
  'hardware-audit': 'Hardware Audit',
  'registry-setup': 'Registry Setup',
};

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label,
  className = '',
  variant = 'default',
  showPreviousViewName = true,
}) => {
  const { goBack, canGoBack, previousView, view } = useOracle();

  if (view === 'home') return null;

  const handleBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      goBack();
    }
  };

  const formattedPrevName = previousView && VIEW_NAMES[previousView] ? VIEW_NAMES[previousView] : 'Back';
  const displayLabel = label || (showPreviousViewName && previousView ? `Back to ${formattedPrevName}` : 'Back');

  if (variant === 'minimal') {
    return (
      <button
        type="button"
        onClick={handleBack}
        className={`inline-flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-aba-gold transition-all duration-200 group active:scale-95 ${className}`}
        aria-label={displayLabel}
        title={displayLabel}
      >
        <ArrowLeft size={16} className="text-aba-gold group-hover:-translate-x-1 transition-transform duration-200" />
        <span className="tracking-tight">{displayLabel}</span>
      </button>
    );
  }

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={handleBack}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-aba-gold/40 text-xs font-bold transition-all duration-200 group shadow-sm active:scale-95 ${className}`}
        aria-label={displayLabel}
        title={displayLabel}
      >
        <ArrowLeft size={14} className="text-aba-gold group-hover:-translate-x-0.5 transition-transform duration-200 shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-none tracking-tight">{displayLabel}</span>
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleBack}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-aba-deep/80 hover:bg-aba-deep text-white border border-white/15 hover:border-aba-gold/60 text-xs font-bold uppercase tracking-wider transition-all duration-200 group shadow-md backdrop-blur-md active:scale-95 ${className}`}
        aria-label={displayLabel}
        title={displayLabel}
      >
        <ArrowLeft size={14} className="text-aba-gold group-hover:-translate-x-1 transition-transform duration-200" />
        <span>{displayLabel}</span>
      </button>
    );
  }

  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={handleBack}
        className={`fixed top-20 left-4 z-[990] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/80 hover:bg-black text-white border border-white/15 hover:border-aba-gold/50 shadow-2xl backdrop-blur-xl text-xs font-bold transition-all duration-200 group active:scale-95 ${className}`}
        aria-label={displayLabel}
        title={displayLabel}
      >
        <ArrowLeft size={16} className="text-aba-gold group-hover:-translate-x-1 transition-transform duration-200" />
        <span className="tracking-tight">{displayLabel}</span>
      </button>
    );
  }

  // Default button style
  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-aba-gold/50 text-xs font-bold tracking-wide transition-all duration-200 group shadow-sm active:scale-95 ${className}`}
      aria-label={displayLabel}
      title={displayLabel}
    >
      <ArrowLeft size={16} className="text-aba-gold group-hover:-translate-x-1 transition-transform duration-200 shrink-0" />
      <span className="tracking-tight">{displayLabel}</span>
    </button>
  );
};

export default BackButton;
