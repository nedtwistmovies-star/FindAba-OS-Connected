
import React, { useEffect, useRef, useState } from 'react';
import { Business } from '../types';
import { Crosshair, Navigation, Maximize, MapPin, ExternalLink, ChevronRight } from 'lucide-react';
import { getCurrentPosition, calculateDistance } from '../services/locationService';

interface MapViewProps {
  businesses: (Business | any)[];
  onBusinessClick: (b: any) => void;
  userLocation?: { latitude: number, longitude: number } | null;
  route?: [number, number][]; // Added route prop
}

const MapView: React.FC<MapViewProps> = ({ businesses, onBusinessClick, userLocation, route }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null); // Added route layer ref
  const [isLocating, setIsLocating] = useState(false);
  const L = (window as any).L;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || !L) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        markerZoomAnimation: true
      }).setView([5.1065, 7.3633], 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapRef.current);
    }
  }, [L]);

  // Update Route
  useEffect(() => {
    if (!mapRef.current || !L || !route) return;

    if (routeLayerRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
    }

    if (route.length > 0) {
      routeLayerRef.current = L.polyline(route, {
        color: '#FFD700',
        weight: 6,
        opacity: 0.6,
        dashArray: '10, 10',
        lineJoin: 'round',
        className: 'industrial-route'
      }).addTo(mapRef.current);

      // Add glow effect with a second polyline
      L.polyline(route, {
        color: '#FFD700',
        weight: 12,
        opacity: 0.1,
        lineJoin: 'round'
      }).addTo(mapRef.current);
    }
  }, [route, L]);

  // Update Markers and Bounds
  useEffect(() => {
    if (!mapRef.current || !L) return;

    // Clear existing markers
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        mapRef.current.removeLayer(layer);
      }
    });

    const markerGroup: any[] = [];

    businesses.forEach(b => {
      if (b.latitude !== undefined && b.longitude !== undefined) {
        const isNearby = userLocation ? calculateDistance(userLocation, { latitude: b.latitude, longitude: b.longitude }) <= 3 : false;
        
        // Fleet Status Visualization Protocol
        let markerColor = 'bg-aba-gold';
        let pulseEffect = '';
        let iconHtml = '<div class="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>';

        // Driver/Vehicle Status Logic
        if (b.status === 'online') {
          markerColor = 'bg-aba-green';
          pulseEffect = '<div class="absolute w-12 h-12 bg-aba-green/20 rounded-full marker-pulse"></div>';
        } else if (b.status === 'active_ride' || b.status === 'busy') {
          markerColor = 'bg-blue-500';
          pulseEffect = '<div class="absolute w-14 h-14 bg-blue-500/10 rounded-full animate-pulse"></div>';
        } else if (b.status === 'emergency') {
          markerColor = 'bg-red-600';
          pulseEffect = '<div class="absolute w-16 h-16 bg-red-600/30 rounded-full animate-ping"></div>';
        } else if (b.status === 'offline') {
          markerColor = 'bg-slate-500';
        }

        // Category Icon Logic
        if (b.category === 'Standard (City)') {
          iconHtml = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="white" stroke-width="3" fill="none"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';
        } else if (b.category === 'Executive (SR_Luxury)' || b.category === 'Purple Shield (Armed Escort)') {
          iconHtml = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="white" stroke-width="3" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
        } else if (b.category === 'Small Cargo (Carry-Go Lite)') {
          iconHtml = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="white" stroke-width="3" fill="none"><path d="M10 17h4V5H2v12h3m15 0h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>';
        } else if (b.status === 'online') {
          iconHtml = '<svg viewBox="0 0 24 24" width="12" height="12" stroke="white" stroke-width="3" fill="none"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg>';
        }

        // Verification Badge Logic
        let badgeHtml = '';
        if (b.nin_verified) {
          badgeHtml += '<div class="absolute -top-1 -right-1 w-3 h-3 bg-aba-gold rounded-full border-2 border-slate-900 flex items-center justify-center"><svg viewBox="0 0 24 24" width="6" height="6" stroke="white" stroke-width="4" fill="none"><path d="M20 6L9 17l-5-5"/></svg></div>';
        } else if (b.verification_level === 'Signature') {
          badgeHtml += '<div class="absolute -top-1 -right-1 w-3 h-3 bg-aba-gold rounded-full border-2 border-slate-900 flex items-center justify-center"><svg viewBox="0 0 24 24" width="6" height="6" stroke="yellow" stroke-width="4" fill="yellow"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>';
        } else if (b.verification_level === 'Editorial') {
          badgeHtml += '<div class="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900 flex items-center justify-center"><svg viewBox="0 0 24 24" width="6" height="6" stroke="white" stroke-width="4" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>';
        } else if (b.verification_level === 'Verified') {
          badgeHtml += '<div class="absolute -top-1 -right-1 w-3 h-3 bg-aba-green rounded-full border-2 border-slate-900 flex items-center justify-center"><svg viewBox="0 0 24 24" width="6" height="6" stroke="white" stroke-width="4" fill="none"><path d="M20 6L9 17l-5-5"/></svg></div>';
        }

        const marker = L.marker([b.latitude, b.longitude], {
          icon: L.divIcon({
            className: 'industrial-marker',
            html: `
              <div class="relative flex items-center justify-center cursor-pointer">
                ${pulseEffect}
                <div class="w-8 h-8 ${markerColor} rounded-xl border-4 border-slate-900 shadow-xl flex items-center justify-center transform hover:scale-125 transition-transform duration-300">
                  ${iconHtml}
                </div>
                ${badgeHtml}
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          })
        }).addTo(mapRef.current);

        // Registry Partner Interactive Popup
        const popupEl = document.createElement('div');
        popupEl.className = 'p-0 w-64 rounded-3xl overflow-hidden bg-white border border-slate-100 shadow-2xl';
        popupEl.innerHTML = `
          <div class="relative h-24 w-full">
            <img src="${b.image_url || 'https://picsum.photos/seed/node/400/200'}" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-2 left-3 flex items-center gap-2">
              <p class="text-[8px] font-black uppercase text-aba-gold tracking-widest leading-none">${b.category || 'Vessel Unit'}</p>
              ${b.verification_level ? `<span class="px-1.5 py-0.5 ${b.verification_level === 'Signature' ? 'bg-aba-gold text-aba-dark' : b.verification_level === 'Editorial' ? 'bg-blue-500 text-white' : 'bg-aba-green text-white'} text-[6px] font-black rounded-full uppercase">${b.verification_level}</span>` : ''}
              ${b.nin_verified ? '<span class="px-1.5 py-0.5 bg-aba-gold text-aba-dark text-[6px] font-black rounded-full uppercase">NIN</span>' : ''}
              ${b.license_verified ? '<span class="px-1.5 py-0.5 bg-aba-green text-white text-[6px] font-black rounded-full uppercase">License</span>' : ''}
            </div>
          </div>
          <div class="p-4 space-y-4">
            <div>
              <h4 class="text-sm font-black uppercase tracking-tight text-slate-900 leading-none">${b.name || b.driver_name || 'Partner ' + b.id.substring(0,4)}</h4>
              <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                <span class="w-1 h-1 rounded-full ${markerColor}"></span> ${b.area || b.plate_number || 'Registry Partner'}
              </p>
            </div>
            <button id="view-node-${b.id}" class="w-full py-3 bg-aba-dark text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-aba-gold hover:text-aba-dark transition-all shadow-lg active:scale-95">
              Select Partner <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        `;

        marker.bindPopup(popupEl, { 
          closeButton: false, 
          offset: [0, -10],
          className: 'findaba-popup'
        });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`view-node-${b.id}`);
          if (btn) btn.onclick = () => onBusinessClick(b);
        });

        markerGroup.push([b.latitude, b.longitude]);
      }
    });

    if (userLocation) {
      L.marker([userLocation.latitude, userLocation.longitude], {
        icon: L.divIcon({
          className: 'user-marker-primary',
          html: `
            <div class="relative">
              <div class="absolute -inset-4 bg-blue-600/30 blur-xl rounded-full animate-pulse"></div>
              <div class="w-6 h-6 bg-white rounded-full border-4 border-blue-600 shadow-2xl flex items-center justify-center">
                <div class="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              </div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(mapRef.current);
      markerGroup.push([userLocation.latitude, userLocation.longitude]);
    }

    if (route && route.length > 0) {
      route.forEach(p => markerGroup.push(p));
    }

    if (markerGroup.length > 1) {
      mapRef.current.fitBounds(markerGroup, { padding: [80, 80], maxZoom: 16 });
    } else if (markerGroup.length === 1) {
      mapRef.current.setView(markerGroup[0], 16);
    }
  }, [businesses, L, onBusinessClick, userLocation, route]);

  const handleLocate = async () => {
    if (isLocating || !mapRef.current) return;
    setIsLocating(true);
    try {
      const pos = await getCurrentPosition();
      if (mapRef.current) {
        mapRef.current.flyTo([pos.latitude, pos.longitude], 16, { duration: 1.5 });
      }
    } catch (e) {
      console.warn("Location protocol denied or failed:", e);
    } finally {
      setIsLocating(false);
    }
  };

  const handleResetView = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([5.1065, 7.3633], 14);
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950">
      <style>{`
        .leaflet-popup-content-wrapper { padding: 0; background: transparent; box-shadow: none; border-radius: 2rem; }
        .leaflet-popup-content { margin: 0; width: 100% !important; }
        .leaflet-popup-tip { display: none; }
        .marker-pulse { animation: marker-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        @keyframes marker-ping { 75%, 100% { transform: scale(1.5); opacity: 0; } }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full grayscale-[0.2] brightness-[0.8]" />
      
      {/* Map Controls */}
      <div className="absolute top-6 right-6 z-[400] flex flex-col gap-3">
         <button 
           onClick={handleLocate}
           className={`p-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all active:scale-90 ${isLocating ? 'text-blue-500' : 'text-aba-gold'}`}
           title="Locate Me"
         >
            <Crosshair size={24} className={isLocating ? 'animate-spin' : ''} />
         </button>
         
         <button 
           onClick={handleResetView}
           className="p-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-white/60 active:scale-90 transition-all"
           title="Center City"
         >
            <Maximize size={24} />
         </button>
      </div>

      {/* Info Overlay */}
      <div className="absolute bottom-10 left-10 z-[400] bg-slate-900/80 backdrop-blur-xl border border-white/5 px-6 py-3 rounded-2xl shadow-2xl pointer-events-none animate-fade-in">
         <div className="flex items-center gap-3">
            <div className={`w-2 h-2 ${userLocation ? 'bg-blue-500' : 'bg-aba-green'} rounded-full animate-pulse`} />
            <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">
              {userLocation ? 'Proximity Scan Active' : 'Live Registry Mapping'}
            </span>
         </div>
         <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1">Enyimba Spatial Protocol v6.0</p>
      </div>
    </div>
  );
};

export default MapView;
