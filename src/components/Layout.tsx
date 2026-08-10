import React, { useState, useEffect } from "react";
import { ViewState, AppNotification } from "../types";
import { useToast } from "../providers/ToastProvider";
import {
  Home,
  Compass,
  UserCircle,
  Search,
  Menu,
  X,
  Globe,
  Building2,
  Zap,
  Shield,
  ShieldCheck,
  MessageCircle,
  BookOpen,
  Map as MapIcon,
  Layers,
  Sparkles,
  Radio,
  Info,
  Loader2,
  Cpu,
  Rss,
  Users,
  Lock,
  Unlock,
  Bell,
  Car,
  Key,
  Truck,
  Wallet,
  Plus,
  Landmark,
  Facebook,
  Instagram,
  Twitter,
  Music,
  Send,
  Mail,
  LifeBuoy,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Github,
  Database,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Battery,
  BatteryCharging,
  Sun,
  Moon,
} from "lucide-react";
import Logo from "./Logo";
import { generateWelcomeMessage } from "../services/geminiService";
import {
  getSupabase,
  fetchNotifications,
  markNotificationAsRead,
} from "../services/supabaseService";
import { useAuth } from "../providers/AuthProvider";
import { useBusiness } from "../providers/BusinessProvider";
import { useLanguage } from "../providers/LanguageProvider";
import { useTheme } from "../providers/ThemeProvider";
import { useBattery } from "../hooks/useBattery";
import { useGitSync } from "../hooks/useGitSync";
import { SANDALS_BRAND } from "../constants";
import NotificationCenter from "./NotificationCenter";
import { LanguageSelector } from "./LanguageSelector";
import { BackButton } from "./BackButton";
import { useOracle } from "../providers/OracleProvider";
import {
  getIgboMarketDay,
  getAbaWeather,
  WeatherData,
} from "../services/signalService";
import SystemStatusIndicator from "./SystemStatusIndicator";
import { HealthCheck } from "./HealthCheck";

const SystemClock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [marketDay, setMarketDay] = useState<string>("");
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    setMarketDay(getIgboMarketDay());
    getAbaWeather().then(setWeather);
    return () => clearInterval(timer);
  }, []);

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex flex-col items-end px-4 border-x border-white/10">
      <div className="flex items-center gap-2">
        <span className="text-[10px] sm:text-[11px] font-bold text-aba-gold uppercase tracking-wider">
          {dateStr}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-white tracking-tight">
          {timeStr}
        </span>
      </div>
    </div>
  );
};

const BatteryIndicator: React.FC = () => {
  const { level, charging, supported } = useBattery();
  const { isDark } = useTheme();

  if (!supported) return null;

  const percentage = Math.round(level * 100);
  
  let batteryColor = "text-emerald-500";
  if (level <= 0.2) {
    batteryColor = "text-rose-500 animate-pulse";
  } else if (level <= 0.5) {
    batteryColor = "text-amber-500";
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold font-mono select-none ${
      isDark 
        ? "bg-white/5 border-white/10 text-white/70" 
        : "bg-black/5 border-black/10 text-aba-deep/70"
    }`} title="Device Battery Level">
      {charging ? (
        <BatteryCharging size={13} className="text-emerald-400 animate-pulse" />
      ) : (
        <Battery size={13} className={batteryColor} />
      )}
      <span>{percentage}%</span>
    </div>
  );
};

export const BrandSignature: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div
    className={`py-12 flex flex-col items-center justify-center gap-4 select-none w-full text-center px-4 ${className}`}
  >
    <div className="flex flex-col items-center">
      <span className="text-lg font-bold uppercase tracking-[0.4em] text-aba-gold">
        FindAba
      </span>
    </div>
  </div>
);

const AIWelcomeSection: React.FC<{ light?: boolean }> = ({ light }) => {
  const { userIdentifier, userName } = useAuth();
  const [welcome, setWelcome] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userName && userIdentifier) {
      const savedWelcome = sessionStorage.getItem(
        `findaba_layout_welcome_${userIdentifier}`,
      );
      if (savedWelcome) {
        setWelcome(savedWelcome);
      } else {
        setLoading(true);
        generateWelcomeMessage(userName, userIdentifier)
          .then((msg) => {
            setWelcome(msg);
            sessionStorage.setItem(
              `findaba_layout_welcome_${userIdentifier}`,
              msg,
            );
            setLoading(false);
          })
          .catch(() => setLoading(false));
      }
    } else {
      setWelcome(null);
    }
  }, [userName, userIdentifier]);

  if (loading) return null;
  if (!welcome) return null;

  return (
    <div
      className={`max-w-xl px-8 py-12 mx-auto text-center space-y-6 animate-fade-in ${light ? "text-white/40" : "text-aba-deep/40"}`}
    >
      <div
        className={`h-px w-12 mx-auto ${light ? "bg-white/10" : "bg-aba-green/10"}`}
      />
      <p className="text-sm font-medium leading-relaxed tracking-tight text-white/80">
        {welcome.split("**").map((part, i) =>
          i % 2 === 1 ? (
            <span key={i} className="text-aba-gold font-bold">
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </p>
      <div className="flex items-center justify-center gap-2 opacity-30">
        <ShieldCheck size={12} className="text-aba-green" />
        <span className="text-[9px] font-bold uppercase tracking-widest">
          Handshake Verified
        </span>
      </div>
    </div>
  );
};

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setView: (view: ViewState) => void;
  appLogo?: string | null;
  oracleAvatar: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
}

const Layout: React.FC<LayoutProps> = ({
  children,
  currentView,
  setView,
  appLogo,
  oracleAvatar,
  socialLinks,
}) => {
  const { addToast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { userIdentifier, userName, isAuth, profile, userRole } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const safeProfile = profile || {};
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    setSelectedBusiness,
    commitAll,
  } = useBusiness();
  const { status: gitStatus, loading: gitLoading, sync: syncGit, fullSync } = useGitSync();
  const handleFullSync = async (reason: string) => {
    addToast("Initiating GitHub synchronization...", "info");
    const result = await fullSync(reason);
    if (result && result.success) {
      addToast("Repository synced successfully!", "success");
    } else {
      addToast(result?.error || "Synchronization completed with warning alerts or error status.", "error");
    }
  };
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRegistryActive, setIsRegistryActive] = useState(false);
  const [isSignalHealthy, setIsSignalHealthy] = useState(true);
  const [healthMessage, setHealthMessage] = useState<string>("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [activeLogo, setActiveLogo] = useState<string>(
    appLogo || SANDALS_BRAND.logo,
  );

  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: "1",
      title: "Registry Synchronized",
      message: "Industrial Partner v6.0 mesh established.",
      type: "info",
      read: false,
      timestamp: new Date().toISOString(),
    },
    {
      id: "2",
      title: "Security Protocol",
      message: "Fidelity Handshake verified via Paystack.",
      type: "success",
      read: false,
      timestamp: new Date().toISOString(),
    },
  ]);

  const [gitSynced, setGitSynced] = useState<boolean>(true);
  const [liveRepo, setLiveRepo] = useState<string>("");

  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        const response = await fetch("/metadata.json");
        if (response.ok) {
          const metadata = await response.json();
          if (metadata.repository && metadata.repository.url) {
            setGitSynced(true);
          }
        }
      } catch (err) {
        console.warn("Failed to calculate sync status:", err);
      }
    };

    checkSyncStatus();
    window.addEventListener("storage", checkSyncStatus);
    return () => {
      window.removeEventListener("storage", checkSyncStatus);
    };
  }, []);

  useEffect(() => {
    if (isAuth && userIdentifier) {
      fetchNotifications(userIdentifier).then((data: AppNotification[]) => {
        if (data && data.length > 0) {
          setNotifications((prev) => {
            // Merge with local hardcoded ones, avoiding duplicates if any
            const existingIds = new Set(prev.map((n) => n.id));
            const newOnes = data.filter((n) => !existingIds.has(n.id));
            return [...newOnes, ...prev];
          });
        }
      });
    }
  }, [isAuth, userIdentifier]);

  const isSealed = localStorage.getItem("findaba_registry_sealed") === "true";

  useEffect(() => {
    const checkHealth = async () => {
      const sb = getSupabase();
      setIsRegistryActive(!!sb);

      const { checkDatabaseHealth } =
        await import("../services/supabaseService");
      const { syncGeminiConfig } = await import("../services/geminiService");

      const dbHealth = await checkDatabaseHealth();
      const gHealth = await syncGeminiConfig();
      
      // Also trigger a background git sync to keep status fresh
      syncGit();

      const healthy =
        dbHealth.status === "healthy" && gHealth.status !== "unhealthy";
      setIsSignalHealthy(healthy);
      setHealthMessage(dbHealth.message || gHealth.message || "");
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, [currentView, syncGit]);

  useEffect(() => {
    if (appLogo) setActiveLogo(appLogo);
    else setActiveLogo(SANDALS_BRAND.logo);
  }, [appLogo]);

  // Robust scroll to top when view changes
  useEffect(() => {
    // Force scroll to top on view change
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    document.body.scrollTo(0, 0);

    // Also scroll any potential internal containers
    const mainContent = document.querySelector("main");
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [currentView]);

  const menuItems = [
    {
      label: t("City Registry", "City Registry"),
      icon: <Layers size={20} />,
      view: "explore" as ViewState,
    },
    {
      label: t("Oracle Hub", "Oracle Hub"),
      icon: <Cpu size={20} />,
      view: "oracle" as ViewState,
    },
    {
      id: "home",
      label: t("Home Node", "Home Node"),
      icon: <Home size={20} />,
      view: "home" as ViewState,
    },
  ];

  const visibleMenuItems = [...menuItems];
  const isAdmin = true; // Always enable Admin Console access so repository credentials and sync can be managed in live/preview
  if (isAdmin) {
    visibleMenuItems.unshift({
      id: "admin",
      label: t("Admin Console", "Admin Console"),
      icon: <ShieldCheck size={20} />,
      view: "admin" as ViewState,
    });
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const isDarkThemeActive = isDark;

  const PUBLIC_VIEWS: ViewState[] = [
    "splash",
    "onboarding",
    "login",
    "signup",
    "legal",
    "support",
    "about",
    "about-aba",
  ];

  if (PUBLIC_VIEWS.includes(currentView)) {
    return (
      <div
        className={`min-h-screen transition-colors duration-500 overflow-x-hidden ${isDarkThemeActive ? "bg-aba-deep text-white" : "bg-aba-white text-aba-deep"}`}
      >
        {children}
      </div>
    );
  }

  const SidebarItem = ({ item }: { item: (typeof menuItems)[0] }) => (
    <button
      onClick={() => {
        setView(item.view);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-standard group ${
        currentView === item.view
          ? "bg-aba-green text-white shadow-sm"
          : "hover:bg-white/5 text-white/60 hover:text-white"
      }`}
    >
      <div
        className={`transition-standard ${
          currentView === item.view ? "text-white" : "text-aba-gold"
        }`}
      >
        {item.icon}
      </div>
      {!isSidebarCollapsed && (
        <span className="truncate tracking-tight">{item.label}</span>
      )}
    </button>
  );

  return (
    <div
      className={`flex flex-col min-h-[100dvh] w-full transition-colors duration-500 font-sans relative ${isDarkThemeActive ? "bg-aba-deep text-white" : "bg-aba-white text-aba-deep"}`}
    >
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-[1100] transition-standard border-r border-white/5 bg-black/20 backdrop-blur-xl ${isSidebarCollapsed ? "w-20" : "w-64"}`}
      >
        <div className="p-6 border-b border-white/5 flex items-center gap-3 overflow-hidden">
          <Logo src={activeLogo} size={32} className="shrink-0" />
          {!isSidebarCollapsed && (
            <div className="flex flex-col animate-fade-in">
              <h1 className="text-lg font-bold tracking-tight leading-none">
                FindAba
              </h1>
              <span className="text-[9px] font-bold uppercase text-aba-gold tracking-widest mt-1">
                SANDALSroyalle
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-hide">
          {visibleMenuItems.map((item, i) => (
            <SidebarItem key={i} item={item} />
          ))}

          {isAdmin && (
            <div className="pt-6 pb-2 space-y-2">
              <div className="px-4 py-2 text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
                Industrial Control
              </div>
              <button
                onClick={() => handleFullSync("Manual Sidebar Sync")}
                disabled={gitLoading}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-standard hover:bg-white/5 text-white/60 hover:text-white disabled:opacity-50 group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Github
                    size={20}
                    className="text-aba-gold group-hover:scale-110 transition-transform shrink-0"
                  />
                  {!isSidebarCollapsed && (
                    <span className="truncate tracking-tight">GitHub Sync</span>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <div
                    className="flex items-center select-none shrink-0 pr-1"
                    title={
                      gitSynced
                        ? `Repository In-Sync: ${liveRepo || "System Default"}`
                        : `Repository Out of Sync: ${liveRepo}`
                    }
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${gitSynced ? "bg-aba-green shadow-[0_0_8px_#10b981]" : "bg-amber-500 shadow-[0_0_8px_#f59e0b] animate-pulse"}`}
                    />
                  </div>
                )}
              </button>
              <button
                onClick={commitAll}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-standard hover:bg-white/5 text-white/60 hover:text-white group"
              >
                <Database
                  size={20}
                  className="text-aba-gold group-hover:scale-110 transition-transform"
                />
                {!isSidebarCollapsed && (
                  <span className="truncate tracking-tight">
                    Supabase Commit
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 flex items-center justify-center transition-standard"
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ArrowLeft size={18} />
            )}
          </button>
        </div>
      </aside>

      <div
        className={`flex-1 flex flex-col transition-standard ${isDarkThemeActive ? "bg-aba-deep" : "bg-aba-white"} ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <header
          className={`fixed top-0 left-0 right-0 z-[1000] px-4 md:px-6 py-3 md:py-4 flex justify-between items-center backdrop-blur-xl transition-standard ${isSidebarCollapsed ? "lg:left-20" : "lg:left-64"} ${isDarkThemeActive ? "bg-black/60 border-b border-white/5 shadow-2xl" : "bg-white/90 border-b border-black/5 shadow-lg"}`}
        >
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Universal Top Header Back Button */}
            <div className="flex items-center">
              {currentView !== 'home' && <BackButton variant="header" />}
            </div>

            <div
              className="flex items-center gap-3 sm:gap-4 cursor-pointer group shrink-0 lg:hidden"
              onClick={() => setView("home")}
            >
              <Logo
                src={activeLogo}
                size={34}
                className="sm:w-9 sm:h-9 group-hover:scale-105 transition-standard shadow-lg border-aba-gold/20"
              />
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl font-black tracking-tighter leading-none group-hover:text-aba-gold transition-standard italic uppercase">
                  FindAba
                </h1>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-aba-gold text-[7px] sm:text-[9px] font-bold uppercase tracking-widest opacity-80 leading-none">
                    SANDALSroyalle
                  </p>
                  {isRegistryActive && (
                    <div
                      className="flex items-center border-l border-white/10 pl-2 leading-none"
                      title={healthMessage}
                    >
                      <div
                        className={`w-1 h-1 rounded-full ${isSignalHealthy ? "bg-aba-green" : "bg-red-500 animate-pulse"}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 ml-auto lg:ml-0">
            <div className="hidden lg:block flex-1 max-w-md mr-12">
              <div className="relative group">
                <Search
                  className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? "text-aba-gold" : "text-white/20 group-focus-within:text-aba-gold"}`}
                  size={18}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Universal Industrial Search..."
                  className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs outline-none focus:border-aba-gold/50 transition-all font-bold tracking-tight"
                />

                {/* Search Results Dropdown */}
                {searchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-aba-deep/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up z-[2000]">
                    {isSearching ? (
                      <div className="p-8 flex flex-col items-center justify-center gap-4">
                        <Loader2
                          className="animate-spin text-aba-gold"
                          size={24}
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                          Syncing Registry...
                        </span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                        {searchResults.map((biz) => (
                          <button
                            key={biz.id}
                            onClick={() => {
                              setSelectedBusiness(biz);
                              setView("explore");
                              setSearchQuery("");
                            }}
                            className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-all group/result text-left"
                          >
                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/5 bg-black/20">
                              <img
                                src={
                                  biz.image_url ||
                                  (biz.catalog_images &&
                                    biz.catalog_images[0]) ||
                                  "https://via.placeholder.com/100"
                                }
                                className="w-full h-full object-cover group-hover/result:scale-110 transition-transform duration-500"
                                alt={biz.name}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-bold text-white truncate">
                                {biz.name}
                              </h5>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-aba-gold px-1.5 py-0.5 bg-aba-gold/10 rounded-sm">
                                  {biz.category}
                                </span>
                                <span className="text-[9px] font-medium text-white/40 truncate">
                                  {biz.area}
                                </span>
                              </div>
                            </div>
                            <ChevronRight
                              size={14}
                              className="text-white/20 group-hover/result:text-aba-gold group-hover/result:translate-x-1 transition-all"
                            />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center flex flex-col items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                          <X className="text-white/20" size={32} />
                        </div>
                        <div className="space-y-2">
                          <h6 className="text-sm font-black uppercase tracking-widest">
                            No Matches Found
                          </h6>
                          <p className="text-[10px] font-medium text-white/40">
                            The industrial signal for "{searchQuery}" is not
                            present in the verified mesh.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-white/5 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
                        FindAba OS Search Engine
                      </span>
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-[9px] font-black uppercase tracking-widest text-aba-gold hover:underline"
                      >
                        Clear Signal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Git Repository Sync Indicator */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border text-xs font-bold leading-none select-none transition-all ${
                !gitStatus.connected 
                  ? 'border-rose-500/40 hover:border-rose-500 cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.1)]' 
                  : 'border-white/10 hover:border-white/30 cursor-help'
              }`}
              onClick={() => {
                setView('admin');
              }}
              title={
                !gitStatus.connected 
                  ? `GIT PROTOCOL ERROR: ${gitStatus.error || "Registry Sync Interrupted"}. Click to open Admin Console and set Git credentials.` 
                  : (gitSynced ? `Industrial Grid Synchronized: ${liveRepo || "Main Hub"}. Click to open Admin Console.` : `Local/Cloud Drift Detected! Active Repo: ${liveRepo}. Click to open Admin Console.`)
              }
              id="git-repo-indicator"
            >
              {!gitStatus.connected ? (
                <Activity size={13} className="text-rose-500 shrink-0 animate-pulse" />
              ) : gitSynced ? (
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle size={13} className="text-amber-500 shrink-0 animate-pulse" />
              )}
              <div className="flex flex-col items-start gap-0.5">
                <span className={`text-[9px] uppercase tracking-wider font-black ${
                  !gitStatus.connected ? 'text-rose-500' : (gitSynced ? 'text-white/60' : 'text-amber-500')
                }`}>
                  {!gitStatus.connected ? 'Git Offline' : (gitSynced ? 'Repo Match' : 'Repo Diff')}
                </span>
                {!gitStatus.connected && isAdmin && (
                  <span className="text-[6px] text-rose-400/50 uppercase font-bold tracking-[0.2em] leading-none">
                    Fix Connection
                  </span>
                )}
              </div>
            </div>

            {/* Battery Level Indicator */}
            <BatteryIndicator />

            {/* Daylight Mode Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                isDarkThemeActive 
                  ? "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-aba-gold" 
                  : "bg-black/5 border-black/10 text-aba-deep hover:bg-black/10 hover:border-aba-green"
              }`}
              title={isDarkThemeActive ? "Switch to Daylight Mode" : "Switch to Dark OS Mode"}
              aria-label="Toggle Theme"
              id="theme-toggle-btn"
            >
              {isDarkThemeActive ? (
                <Sun size={15} className="text-aba-gold" />
              ) : (
                <Moon size={15} className="text-aba-green" />
              )}
            </button>

            <div className="hidden md:block">
              <SystemClock />
            </div>

            <div className="lg:hidden flex items-center gap-1">
              <LanguageSelector />
              <button
                onClick={() => {
                  setView("explore");
                }}
                className="p-2.5 text-white/40 hover:text-aba-gold transition-standard hover:bg-white/5 rounded-xl border border-transparent active:border-white/10"
              >
                <Search size={22} strokeWidth={2.5} />
              </button>

              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2.5 text-white/40 hover:text-aba-gold transition-standard hover:bg-white/5 rounded-xl border border-transparent active:border-white/10"
              >
                <Bell size={22} strokeWidth={2.5} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-aba-red text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-aba-deep shadow-lg">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setView(isAuth ? "profile" : "login")}
                className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-standard ml-1 group ${
                  isAuth
                    ? "bg-aba-green/10 border-aba-green/20"
                    : "bg-white/5 border-white/10"
                }`}
              >
                {isAuth ? (
                  <UserCircle size={20} className="text-aba-green" />
                ) : (
                  <Key
                    size={18}
                    className="text-white/20 group-hover:text-aba-gold"
                  />
                )}
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <LanguageSelector />
              <button
                onClick={() => setView("register")}
                className="flex items-center gap-2 px-4 py-2 bg-aba-green text-white rounded-lg font-bold uppercase text-[10px] tracking-widest shadow-sm hover:bg-aba-green/90 transition-standard active:scale-95"
              >
                <Plus size={14} /> Add Listing
              </button>

              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-white/40 hover:text-aba-gold transition-standard hover:bg-white/5 rounded-lg"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-aba-gold text-aba-deep text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-aba-deep">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setView(isAuth ? "profile" : "login")}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-standard group active:scale-95 ${
                  isAuth
                    ? "bg-aba-green/10 border-aba-green/20 hover:border-aba-green text-aba-green"
                    : "bg-white/5 border-white/10 hover:border-aba-gold hover:text-aba-gold text-white/40"
                }`}
              >
                {isAuth ? (
                  <>
                    <UserCircle size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {userName?.split(" ")[0] || "PROFILE"}
                    </span>
                  </>
                ) : (
                  <>
                    <Key size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      SIGN IN
                    </span>
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => setIsMenuOpen(true)}
              className="lg:hidden p-2 text-white/40 hover:text-aba-gold transition-standard hover:bg-white/5 rounded-lg"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {notificationsOpen && (
          <NotificationCenter
            notifications={notifications}
            onClose={() => setNotificationsOpen(false)}
            onClear={() => setNotifications([])}
            onMarkRead={(id) => {
              markNotificationAsRead(id);
              setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
              );
            }}
          />
        )}

        <main
          className={`flex-1 flex flex-col pt-16 sm:pt-20 md:pt-32 lg:pt-36 w-full max-w-full overflow-x-hidden`}
        >
          <div className="flex-1 w-full max-w-full">{children}</div>
          <footer
            className={`w-full relative flex flex-col transition-standard pb-48 sm:pb-52 ${isDarkThemeActive ? "bg-aba-deep" : "bg-aba-white"}`}
          >
            {/* Requested Menu Structure */}
            <div className="px-6 md:px-8 py-16 md:py-24 space-y-16 max-w-5xl mx-auto w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-12">
                <div className="space-y-6">
                  <h4 className="text-aba-green text-sm font-bold uppercase tracking-widest">
                    Registry
                  </h4>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setSearchQuery("VERIFIED");
                        setView("explore");
                      }}
                      className="block text-xs font-medium text-white/60 hover:text-aba-gold transition-standard uppercase tracking-widest"
                    >
                      Verified Hubs
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery("Industrial");
                        setView("explore");
                      }}
                      className="block text-xs font-medium text-white/60 hover:text-aba-gold transition-standard uppercase tracking-widest"
                    >
                      Industrial Partners
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery("Export");
                        setView("explore");
                      }}
                      className="block text-xs font-medium text-white/60 hover:text-aba-gold transition-standard uppercase tracking-widest"
                    >
                      Export Readiness
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setView("faces");
                      }}
                      className="block text-xs font-medium text-white/60 hover:text-aba-gold transition-standard uppercase tracking-widest"
                    >
                      Trade Analytics
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-aba-green text-sm font-bold uppercase tracking-widest">
                    Ecosystem
                  </h4>
                  <div className="space-y-3">
                    <button
                      onClick={() => setView("cargo")}
                      className="block text-xs font-medium text-white/60 hover:text-aba-gold transition-standard uppercase tracking-widest"
                    >
                      Carry-Go Cargo
                    </button>
                    <button
                      onClick={() => setView("explore")}
                      className="block text-xs font-medium text-white/60 hover:text-aba-gold transition-standard uppercase tracking-widest"
                    >
                      Fidelity Hubs
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-aba-green text-sm font-bold uppercase tracking-widest">
                    Support
                  </h4>
                  <div className="space-y-3">
                    <button
                      onClick={() => setView("oracle")}
                      className="block text-xs font-medium text-white/60 hover:text-aba-gold transition-standard uppercase tracking-widest"
                    >
                      Oracle AI
                    </button>
                    <button
                      onClick={() => setView("legal")}
                      className="block text-xs font-medium text-white/60 hover:text-aba-gold transition-standard uppercase tracking-widest"
                    >
                      Safety Protocols
                    </button>
                    <button
                      onClick={() => setView("contact")}
                      className="block text-xs font-medium text-white/60 hover:text-aba-gold transition-standard uppercase tracking-widest"
                    >
                      Help Center
                    </button>
                    <button
                      onClick={() => setView("editorial")}
                      className="block text-xs font-medium text-white/60 hover:text-aba-gold transition-standard uppercase tracking-widest"
                    >
                      News
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-aba-green text-sm font-bold uppercase tracking-widest">
                    About
                  </h4>
                  <div className="space-y-3">
                    <button
                      onClick={() => setView("about")}
                      className="block text-xs font-medium text-white/60 hover:text-aba-gold transition-standard uppercase tracking-widest text-left"
                    >
                      Who we are
                    </button>
                    <button
                      onClick={() => setView("about")}
                      className="block text-xs font-medium text-white/60 hover:text-aba-gold transition-standard uppercase tracking-widest text-left"
                    >
                      Our Vision
                    </button>
                    <button
                      onClick={() => setView("about")}
                      className="block text-xs font-medium text-white/60 hover:text-aba-gold transition-standard uppercase tracking-widest text-left"
                    >
                      Our Mission
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`w-full py-16 px-8 border-t ${isDarkThemeActive ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"}`}
            >
              <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                <div className="space-y-8">
                  <h4 className="text-aba-green text-sm font-bold uppercase tracking-widest">
                    Connect With Us
                  </h4>
                  <div className="flex gap-4">
                    {[
                      { icon: <Facebook size={18} />, key: "facebook" },
                      { icon: <Instagram size={18} />, key: "instagram" },
                      { icon: <Twitter size={18} />, key: "twitter" },
                      { icon: <Music size={18} />, key: "tiktok" },
                    ].map((social, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const url =
                            (socialLinks as any)?.[social.key] ||
                            (SANDALS_BRAND as any)[social.key];
                          if (url)
                            window.open(
                              url.startsWith("http")
                                ? url
                                : `https://${social.key}.com/${url}`,
                              "_blank",
                            );
                          else addToast(`${social.key} Link not set.`, "info");
                        }}
                        className="p-3 bg-white/5 rounded-lg hover:text-aba-gold transition-standard border border-white/5 hover:border-white/20"
                      >
                        {social.icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <h4 className="text-aba-green text-sm font-bold uppercase tracking-widest">
                    Send Message
                  </h4>
                  <div className="flex flex-col gap-3">
                    <div className="relative">
                      <Mail
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                        size={16}
                      />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm outline-none focus:border-aba-gold transition-standard"
                      />
                    </div>
                    <button
                      onClick={() =>
                        addToast(
                          "Signal Transmitted. We will contact you.",
                          "success",
                        )
                      }
                      className="w-full py-3 bg-aba-gold text-aba-deep rounded-lg font-bold uppercase text-[10px] tracking-widest shadow-sm active:scale-[0.98] transition-standard flex items-center justify-center gap-2"
                    >
                      <Send size={14} /> Send Signal
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`w-full py-12 px-8 text-center space-y-2 border-t ${isDarkThemeActive ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"}`}
            >
              <p className="text-[10px] font-medium opacity-40 uppercase tracking-widest">
                © 2026 FindAba Industrial Hub
              </p>
              <p className="text-[10px] font-medium opacity-40 uppercase tracking-widest">
                Built by{" "}
                <a
                  href="#"
                  className="underline hover:text-aba-gold transition-standard"
                >
                  SANDALSroyalle S&P
                </a>
              </p>
            </div>

            <BrandSignature
              className={isDarkThemeActive ? "text-white" : "text-aba-deep"}
            />
            <AIWelcomeSection light={isDarkThemeActive} />
            <div className="h-20 w-full" />
          </footer>
        </main>
      </div>

      <nav
        className={`fixed bottom-0 left-0 right-0 z-[1000] backdrop-blur-3xl border-t px-2 md:px-8 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:py-6 flex justify-around items-center transition-standard lg:hidden ${isDarkThemeActive ? "bg-aba-deep/90 border-white/5 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]" : "bg-aba-white/90 border-aba-green/5 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]"}`}
      >
        {[
          { id: "home", icon: <Home size={18} />, label: "HOME" },
          { id: "faces", icon: <Users size={18} />, label: "FACES" },
          { id: "oracle", icon: <Cpu size={18} />, label: "ORACLE" },
          { id: "fidelity", icon: <Landmark size={18} />, label: "Fidelity" },
          isAdmin && { id: "admin", icon: <ShieldCheck size={18} />, label: "ADMIN" },
          { id: "profile", icon: <UserCircle size={18} />, label: "PROFILE" },
        ].filter(Boolean).map((btn: any, i) => (
          <button
            key={i}
            onClick={() => {
              if (!isAuth && btn.id !== 'home') {
                addToast("Authentication required.", "info");
                setView("login");
                return;
              }
              setView(btn.id as ViewState);
            }}
            className={`flex flex-col items-center gap-1 transition-all active:scale-90 group pb-1 ${currentView === btn.id ? "text-aba-gold" : isDarkThemeActive ? "text-white/30 hover:text-white/50" : "text-aba-deep/30 hover:text-aba-deep/50"}`}
          >
            <div
              className={`transition-transform duration-500 ${currentView === btn.id ? "scale-110 drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" : "group-hover:scale-105"}`}
            >
              {btn.icon}
            </div>
            <span
              className={`text-[6.5px] font-black uppercase tracking-[0.05em] transition-opacity ${currentView === btn.id ? "opacity-100" : "opacity-60"}`}
            >
              {btn.label}
            </span>
          </button>
        ))}
      </nav>

      <div
        className={`fixed inset-0 z-[3000] transition-all duration-700 ${isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <div
          className="absolute inset-0 bg-aba-deep/80 backdrop-blur-md"
          onClick={() => setIsMenuOpen(false)}
        />
        <div
          className={`absolute top-0 right-0 h-full w-[85%] max-w-xs bg-aba-deep shadow-[0_0_100px_rgba(0,0,0,0.5)] transition-transform duration-700 transform ${isMenuOpen ? "translate-x-0" : "translate-x-full"} flex flex-col border-l border-aba-white/5`}
        >
          <div className="p-8 border-b border-aba-white/5 flex justify-between items-center text-aba-white">
            <div className="flex items-center gap-5">
              <Logo
                src={activeLogo}
                size={50}
                className="shadow-2xl border border-aba-gold/10"
              />
              <div className="flex flex-col">
                <h3 className="uppercase tracking-tight text-xl leading-none">
                  <span className="font-black">Find</span>
                  <span className="font-medium opacity-60">ABA</span>
                </h3>
                <span className="text-[8px] font-black uppercase text-aba-gold tracking-[0.4em] mt-2">
                  v6.0
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-4 bg-aba-white/5 hover:bg-aba-white/10 rounded-2xl transition-all text-aba-white/40 active:scale-90"
            >
              <X size={24} />
            </button>
          </div>
          <div className="px-8 py-4 border-b border-aba-white/5 lg:hidden flex flex-col gap-4">
            <button
              onClick={() => {
                setView("register");
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-aba-green text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-white hover:text-aba-green transition-all active:scale-95"
            >
              <Plus size={16} /> Add Listing
            </button>
          </div>
          <div className="flex-1 p-8 space-y-3 overflow-y-auto scrollbar-hide">
            {visibleMenuItems.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  setView(item.view);
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center gap-6 p-6 rounded-[2.5rem] font-black uppercase text-[12px] tracking-widest transition-all group ${currentView === item.view ? "bg-aba-gold text-aba-dark shadow-xl" : "hover:bg-aba-white/5 text-aba-white/40 hover:text-aba-white"}`}
              >
                <div
                  className={`transition-transform duration-500 group-hover:scale-110 ${currentView === item.view ? "text-aba-deep" : "text-aba-gold"}`}
                >
                  {item.icon}
                </div>
                {item.label}
              </button>
            ))}

          {isAdmin && (
              <div className="pt-8 space-y-4">
                <div className="px-6 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                  Industrial Handshake
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setView('admin');
                      setIsMenuOpen(false);
                    }}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-aba-gold/30 transition-all active:scale-95"
                  >
                    <Shield size={24} className="text-aba-gold" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-white">
                      Admin
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      handleFullSync("Mobile Menu Sync");
                      setIsMenuOpen(false);
                    }}
                    disabled={gitLoading}
                    className="relative flex flex-col items-center gap-3 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-aba-gold/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Github size={24} className="text-aba-gold" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-white">
                      Git Sync
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="p-8 border-t border-aba-white/5">
            <div className="p-6 bg-aba-white/5 rounded-[2.5rem] border border-aba-white/5 text-center flex flex-col gap-2">
              <span className="text-[10px] font-black text-aba-gold uppercase tracking-[0.2em]">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
              <span className="text-[10px] font-black text-aba-white/60 uppercase tracking-widest">
                SANDALSroyalle Industrial HQ
              </span>
            </div>
          </div>
        </div>
      </div>
      <SystemStatusIndicator />
      <HealthCheck />
    </div>
  );
};

export default Layout;
