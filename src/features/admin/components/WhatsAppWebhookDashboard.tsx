import React, { useState, useMemo } from "react";
import {
  MessageSquare,
  Radio,
  RefreshCcw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Send,
  Code2,
  User,
  Phone,
  ArrowUpRight,
  Activity,
  Zap,
  ShieldCheck,
  FileJson,
  Volume2,
  VolumeX,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import IndustrialButton from "../../../components/IndustrialButton";
import StatCard from "../../../components/StatCard";
import { useToast } from "../../../providers/ToastProvider";
import { useEventSource, WhatsAppWebhookEvent } from "../../../hooks/useEventSource";

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  received: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
  processed: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  delivered: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  read: { bg: "bg-teal-500/10", text: "text-teal-300", border: "border-teal-500/30" },
  sent: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  failed: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
};

export const WhatsAppWebhookDashboard: React.FC = () => {
  const { addToast } = useToast();
  const [search, setSearch] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSimulateOpen, setIsSimulateOpen] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Simulation form fields
  const [simName, setSimName] = useState("Aba Merchant Guest");
  const [simPhone, setSimPhone] = useState("+234803" + Math.floor(1000000 + Math.random() * 9000000));
  const [simMessage, setSimMessage] = useState("Hello! Can I order wholesale leather footwear for bulk shipping?");
  const [simStatus, setSimStatus] = useState<"received" | "processed" | "delivered">("received");
  const [simType, setSimType] = useState<"message" | "status_update" | "test_simulation">("message");

  // Real-time EventSource Stream hook
  const {
    events,
    isConnected,
    connectionState,
    lastEventTime,
    newEventFlash,
    clearEvents,
    refreshHistorical,
  } = useEventSource({
    url: "/api/whatsapp/events/stream",
    onEventReceived: (evt) => {
      addToast(`Real-time event: ${evt.senderName} (${evt.eventType})`, "info");
    },
  });

  const handleCopyPayload = (id: string, payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(id);
    addToast("Payload JSON copied to clipboard", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSimulateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const res = await fetch("/api/whatsapp/events/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: simName,
          senderPhone: simPhone,
          messageText: simMessage,
          status: simStatus,
          eventType: simType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        addToast("Simulated WhatsApp webhook event dispatched!", "success");
        setIsSimulateOpen(false);
      } else {
        addToast("Simulation failed: " + (data.error || "Unknown error"), "error");
      }
    } catch (err: any) {
      addToast("Failed to simulate webhook: " + err.message, "error");
    } finally {
      setSimulating(false);
    }
  };

  const handleClearEvents = async () => {
    if (!window.confirm("Are you sure you want to clear the incoming WhatsApp webhook buffer?")) return;
    await clearEvents();
    addToast("Webhook events buffer cleared", "info");
  };

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesStatus = selectedStatus === "all" || evt.status === selectedStatus;
      const query = search.toLowerCase().trim();
      if (!query) return matchesStatus;

      const matchesQuery =
        evt.sender.toLowerCase().includes(query) ||
        evt.senderName.toLowerCase().includes(query) ||
        evt.senderPhone.toLowerCase().includes(query) ||
        evt.summary.toLowerCase().includes(query) ||
        evt.id.toLowerCase().includes(query) ||
        JSON.stringify(evt.payload).toLowerCase().includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [events, selectedStatus, search]);

  const stats = useMemo(() => {
    const total = events.length;
    const senders = new Set(events.map((e) => e.senderPhone || e.sender)).size;
    const deliveredCount = events.filter((e) => e.status === "delivered" || e.status === "read" || e.status === "processed").length;
    const latestEvent = events[0]?.timestamp ? new Date(events[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A";
    return { total, senders, deliveredCount, latestEvent };
  }, [events]);

  return (
    <div className="space-y-8">
      {/* Top Banner & Status Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <MessageSquare size={28} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                WhatsApp Webhook Stream
              </h2>
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  isConnected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {isConnected ? "Live Stream Active" : "Polling Mode"}
              </div>
            </div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mt-1">
              Real-time ingestion monitor for server/routes/whatsapp.ts (Last 50 Events)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <IndustrialButton
            variant="primary"
            size="md"
            icon={Play}
            onClick={() => setIsSimulateOpen(true)}
          >
            Simulate Webhook
          </IndustrialButton>

          <IndustrialButton
            variant="secondary"
            size="md"
            icon={RefreshCcw}
            onClick={refreshHistorical}
          >
            Refresh
          </IndustrialButton>

          <IndustrialButton
            variant="danger"
            size="md"
            icon={Trash2}
            onClick={handleClearEvents}
          >
            Clear
          </IndustrialButton>
        </div>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Buffer Capacity"
          value={`${stats.total} / 50`}
          icon={FileJson}
          description="Stored Webhook Events"
        />
        <StatCard
          title="Unique Senders"
          value={stats.senders.toString()}
          icon={User}
          description="Active WhatsApp Contacts"
        />
        <StatCard
          title="Processed / Delivered"
          value={stats.deliveredCount.toString()}
          icon={CheckCircle2}
          color="text-emerald-400"
          description="Successful Events"
        />
        <StatCard
          title="Latest Ingestion"
          value={stats.latestEvent}
          icon={Clock}
          color="text-aba-gold"
          description="Last Event Received"
        />
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between gap-4 p-4 bg-white/5 rounded-3xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
          <input
            type="text"
            placeholder="Search payload, sender name, phone number or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-aba-gold/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {["all", "received", "processed", "delivered", "read", "failed"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                selectedStatus === st
                  ? "bg-white text-aba-dark shadow-lg scale-[1.02]"
                  : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time SSE Stream Banner / Flash Indicator */}
      <AnimatePresence>
        {newEventFlash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-4 text-emerald-400"
          >
            <div className="flex items-center gap-3">
              <Zap size={18} className="animate-bounce" />
              <span className="text-xs font-black uppercase tracking-wider">
                New incoming WhatsApp webhook event appended via Server-Sent Events stream!
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-500/60 uppercase">
              {lastEventTime?.toLocaleTimeString()}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webhook Events List */}
      <div className="space-y-3">
        {connectionState === 'connecting' && events.length === 0 ? (
          <div className="p-12 text-center bg-white/5 rounded-3xl border border-white/5 space-y-4">
            <RefreshCcw size={32} className="mx-auto text-aba-gold animate-spin" />
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest">
              Syncing Webhook Event Stream...
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center bg-white/5 rounded-3xl border border-white/5 space-y-3">
            <AlertCircle size={32} className="mx-auto text-white/20" />
            <p className="text-sm font-bold text-white/60">No Webhook Events Found</p>
            <p className="text-xs text-white/30 max-w-md mx-auto">
              No WhatsApp webhook events match your filter criteria or search query. Click "Simulate Webhook" to send a sample test event.
            </p>
          </div>
        ) : (
          filteredEvents.map((evt, idx) => {
            const isExpanded = expandedEventId === evt.id;
            const statusStyle = STATUS_COLORS[evt.status] || STATUS_COLORS.received;
            const formattedTime = new Date(evt.timestamp).toLocaleString();

            return (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-3xl border border-white/5 hover:border-white/10 transition-all overflow-hidden"
              >
                {/* Event Main Row */}
                <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40 font-mono">
                      #{idx + 1}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-white truncate max-w-[200px] md:max-w-[300px]">
                          {evt.sender}
                        </span>
                        
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          {evt.status}
                        </span>

                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/5 text-white/50 border border-white/10">
                          {evt.eventType}
                        </span>
                      </div>

                      <p className="text-xs text-white/70 font-medium truncate">
                        {evt.summary}
                      </p>

                      <div className="flex items-center gap-4 text-[10px] font-bold text-white/30 tracking-wider">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {formattedTime}
                        </span>
                        <span className="font-mono text-white/20">
                          ID: {evt.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                    <button
                      onClick={() => handleCopyPayload(evt.id, evt.payload)}
                      className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Copy Payload JSON"
                    >
                      {copiedId === evt.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span className="text-[10px] uppercase font-black tracking-wider hidden sm:inline">JSON</span>
                    </button>

                    <button
                      onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                      className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isExpanded
                          ? "bg-aba-gold/10 text-aba-gold border-aba-gold/30"
                          : "bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white"
                      }`}
                    >
                      <Code2 size={14} />
                      <span className="text-[10px] uppercase font-black tracking-wider">
                        {isExpanded ? "Hide Payload" : "Inspect Payload"}
                      </span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Payload Inspector */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5 bg-[#070b09] p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileJson size={14} className="text-aba-gold" />
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-white/80">
                            Raw Ingested Webhook Payload
                          </h4>
                        </div>
                        <button
                          onClick={() => handleCopyPayload(evt.id, evt.payload)}
                          className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                        >
                          {copiedId === evt.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          Copy Full JSON
                        </button>
                      </div>

                      <div className="max-h-96 overflow-y-auto rounded-2xl bg-black/60 p-4 border border-white/5 font-mono text-[11px] text-emerald-400 leading-relaxed no-scrollbar">
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(evt.payload, null, 2)}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Simulate Webhook Modal */}
      <AnimatePresence>
        {isSimulateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e1411] border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-aba-gold/10 rounded-2xl text-aba-gold border border-aba-gold/20">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">
                      Simulate Incoming Webhook
                    </h3>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      Inject Meta WhatsApp payload into server stream
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSimulateOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSimulateEvent} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">
                    Sender Contact Name
                  </label>
                  <input
                    type="text"
                    required
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-aba-gold/50"
                    placeholder="e.g. Chidi Nwachukwu"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">
                    Phone Number (E.164)
                  </label>
                  <input
                    type="text"
                    required
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-aba-gold/50"
                    placeholder="e.g. +2348039998888"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">
                    Message Body / Inquiry Text
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={simMessage}
                    onChange={(e) => setSimMessage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-aba-gold/50"
                    placeholder="Type simulated message..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/60">
                      Event Type
                    </label>
                    <select
                      value={simType}
                      onChange={(e) => setSimType(e.target.value as any)}
                      className="w-full bg-[#141b17] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-aba-gold/50"
                    >
                      <option value="message">Text Message</option>
                      <option value="status_update">Status Update</option>
                      <option value="test_simulation">Test Handshake</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/60">
                      Initial Status
                    </label>
                    <select
                      value={simStatus}
                      onChange={(e) => setSimStatus(e.target.value as any)}
                      className="w-full bg-[#141b17] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-aba-gold/50"
                    >
                      <option value="received">Received</option>
                      <option value="processed">Processed</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/5">
                  <IndustrialButton
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setIsSimulateOpen(false)}
                  >
                    Cancel
                  </IndustrialButton>
                  <IndustrialButton
                    type="submit"
                    variant="primary"
                    size="md"
                    icon={Send}
                    loading={simulating}
                  >
                    Dispatch Event
                  </IndustrialButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WhatsAppWebhookDashboard;
