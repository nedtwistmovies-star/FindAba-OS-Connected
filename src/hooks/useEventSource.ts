import { useState, useEffect, useCallback, useRef } from 'react';

export interface WhatsAppWebhookEvent {
  id: string;
  timestamp: string;
  sender: string;
  senderPhone: string;
  senderName: string;
  status: "received" | "processed" | "delivered" | "read" | "sent" | "failed";
  eventType: "message" | "status_update" | "location" | "image" | "interactive" | "test_simulation";
  summary: string;
  payload: any;
}

export interface UseEventSourceOptions {
  url?: string;
  autoConnect?: boolean;
  maxEvents?: number;
  onEventReceived?: (event: WhatsAppWebhookEvent) => void;
}

export function useEventSource(options: UseEventSourceOptions = {}) {
  const {
    url = "/api/whatsapp/events/stream",
    autoConnect = true,
    maxEvents = 50,
    onEventReceived,
  } = options;

  const [events, setEvents] = useState<WhatsAppWebhookEvent[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [newEventFlash, setNewEventFlash] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initial fetch of historical events from ring buffer
  const fetchHistoricalEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/events?limit=" + maxEvents);
      if (!res.ok) return;
      const text = await res.text();
      const data = text && text.trim() ? JSON.parse(text) : {};
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error("[useEventSource] Failed to fetch historical events:", err);
    }
  }, [maxEvents]);

  // Connect to Server-Sent Events stream
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionState('connecting');

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setConnectionState('connected');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };

      es.onmessage = (e) => {
        if (!e.data || e.data.startsWith(':')) return; // Ignore keepalive comments
        try {
          const newEvent: WhatsAppWebhookEvent = JSON.parse(e.data);
          if (newEvent && newEvent.id) {
            setEvents((prev) => {
              // Idempotency check: don't append if already present
              if (prev.some((item) => item.id === newEvent.id)) return prev;
              const updated = [newEvent, ...prev].slice(0, maxEvents);
              return updated;
            });
            setLastEventTime(new Date());
            setNewEventFlash(true);
            setTimeout(() => setNewEventFlash(false), 2000);
            if (onEventReceived) {
              onEventReceived(newEvent);
            }
          }
        } catch {
          // Parse error or non-JSON keepalive
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        setConnectionState('error');
        es.close();

        // Fallback polling if SSE connection closes/errors
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(fetchHistoricalEvents, 4000);
        }
      };
    } catch {
      setIsConnected(false);
      setConnectionState('error');
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(fetchHistoricalEvents, 4000);
      }
    }
  }, [url, maxEvents, onEventReceived, fetchHistoricalEvents]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  const clearEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/events", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setEvents([]);
      }
    } catch (err) {
      console.error("[useEventSource] Failed to clear events:", err);
    }
  }, []);

  useEffect(() => {
    fetchHistoricalEvents();
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect, fetchHistoricalEvents]);

  return {
    events,
    setEvents,
    isConnected,
    connectionState,
    lastEventTime,
    newEventFlash,
    connect,
    disconnect,
    clearEvents,
    refreshHistorical: fetchHistoricalEvents,
  };
}
