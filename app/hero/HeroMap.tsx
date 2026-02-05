"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';

// --- Types ---
interface Location {
    lat: number;
    lng: number;
}

interface HelpRequest {
    id: string;
    location: Location;
    severity: 'critical' | 'urgent' | 'normal';
    phone: string;
    status: string;
    note?: string;
}

interface Shelter {
    id: string;
    name: string;
    location: Location;
}

interface HeroMapProps {
    requests: HelpRequest[];
    shelters: Shelter[];
}

// --- Icon Creator ---
const createIcon = (color: string) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

function RecenterMap({ lat, lng }: { lat: number, lng: number }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.setView([lat, lng], 13);
        }
    }, [lat, lng, map]);
    return null;
}

export default function HeroMap({ requests = [], shelters = [] }: HeroMapProps) {
    const defaultPos: [number, number] = [13.7563, 100.5018];

    // ใช้ useMemo เพื่อไม่ให้สร้าง Icon ใหม่ทุกครั้งที่ Render
    const icons = useMemo(() => ({
        green: createIcon('green'),
        gold: createIcon('gold'),
        red: createIcon('red'),
        blue: createIcon('blue'),
    }), []);

    const getRequestIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return icons.red;
            case 'urgent': return icons.gold;
            default: return icons.green;
        }
    };

    return (
        <div className="h-[450px] w-full rounded-2xl overflow-hidden z-0 border border-zinc-800 shadow-lg">
            <MapContainer 
                center={defaultPos} 
                zoom={6} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* --- 1. Markers สำหรับคำขอความช่วยเหลือ --- */}
                {requests.map((req) => (
                    req.location?.lat && req.location?.lng && (
                        <Marker 
                            key={`req-${req.id}`} 
                            position={[req.location.lat, req.location.lng]}
                            icon={getRequestIcon(req.severity)}
                        >
                            <Popup>
                                <div className="font-sans min-w-[150px]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`w-3 h-3 rounded-full animate-pulse ${
                                            req.severity === 'critical' ? 'bg-red-500' : 
                                            req.severity === 'urgent' ? 'bg-yellow-500' : 'bg-green-500'
                                        }`} />
                                        <p className="font-bold uppercase text-xs">
                                            {req.severity === 'critical' ? 'วิกฤต (ต้องการความช่วยเหลือด่วน)' : 
                                             req.severity === 'urgent' ? 'เร่งด่วน' : 'ปลอดภัย/รอการตรวจสอบ'}
                                        </p>
                                    </div>
                                    <div className="text-sm space-y-1 border-t pt-2">
                                        <p className="font-bold text-zinc-800">📞 {req.phone}</p>
                                        <p className="text-[11px] text-zinc-500 font-medium">สถานะ: <span className="text-blue-600">{req.status}</span></p>
                                        {req.note && (
                                            <p className="text-[11px] bg-zinc-50 p-2 mt-2 rounded border border-zinc-100 italic text-zinc-600">
                                                "{req.note}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}

                {/* --- 2. Markers สำหรับศูนย์พักพิง --- */}
                {shelters.map((shelter) => (
                    shelter.location?.lat && shelter.location?.lng && (
                        <Marker 
                            key={`shelter-${shelter.id}`} 
                            position={[shelter.location.lat, shelter.location.lng]}
                            icon={icons.blue}
                        >
                            <Popup>
                                <div className="font-sans">
                                    <p className="font-bold text-blue-700 flex items-center gap-1">🏠 {shelter.name}</p>
                                    <p className="text-[10px] text-slate-500 mb-2">ศูนย์พักพิงอย่างเป็นทางการ</p>
                                    <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${shelter.location.lat},${shelter.location.lng}`} 
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-blue-600 text-white text-[10px] py-1 px-3 rounded-full text-center block hover:bg-blue-700 transition-colors"
                                    >
                                        นำทางผ่าน Google Maps
                                    </a>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}

                {/* Recenter เมื่อมีข้อมูลใหม่เข้ามา */}
                {requests.length > 0 && requests[0].location && (
                    <RecenterMap lat={requests[0].location.lat} lng={requests[0].location.lng} />
                )}
            </MapContainer>
        </div>
    );
}