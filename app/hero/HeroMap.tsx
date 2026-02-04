"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// --- ฟังก์ชันสร้าง Icon ตามสี ---
const createIcon = (color: string) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// เตรียม Icon สีต่างๆ
const icons = {
    green: createIcon('green'),   // ปลอดภัย (Normal)
    gold: createIcon('gold'),     // เร่งด่วน (Urgent)
    red: createIcon('red'),       // วิกฤต (Critical)
    blue: createIcon('blue'),     // ศูนย์พักพิง (Shelter)
};

function RecenterMap({ lat, lng }: { lat: number, lng: number }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) map.setView([lat, lng], 13);
    }, [lat, lng, map]);
    return null;
}

interface HeroMapProps {
    requests: any[];
    shelters: any[];
}

export default function HeroMap({ requests, shelters = [] }: HeroMapProps) {
    const defaultPos: [number, number] = [13.7563, 100.5018];

    // ฟังก์ชันเลือก Icon ตาม severity
    const getRequestIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return icons.red;
            case 'urgent': return icons.gold;
            case 'normal': return icons.green;
            default: return icons.green;
        }
    };

    return (
        <div className="h-[450px] w-full rounded-2xl overflow-hidden z-0 border border-zinc-800">
            <MapContainer center={defaultPos} zoom={6} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* --- 1. หมุดคำขอความช่วยเหลือ (แยกสีตามความรุนแรง) --- */}
                {requests.map((req) => (
                    req.location && (
                        <Marker 
                            key={req.id} 
                            position={[req.location.lat, req.location.lng]}
                            icon={getRequestIcon(req.severity)}
                        >
                            <Popup>
                                <div className="font-sans p-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`w-3 h-3 rounded-full ${
                                            req.severity === 'critical' ? 'bg-red-500' : 
                                            req.severity === 'urgent' ? 'bg-yellow-500' : 'bg-green-500'
                                        }`} />
                                        <p className="font-black uppercase text-xs">
                                            {req.severity === 'critical' ? 'วิกฤต' : req.severity === 'urgent' ? 'เร่งด่วน' : 'ปลอดภัย'}
                                        </p>
                                    </div>
                                    <p className="text-sm font-bold border-t pt-1">โทร: {req.phone}</p>
                                    <p className="text-[10px] text-zinc-500">สถานะ: {req.status}</p>
                                    {req.note && <p className="text-[10px] bg-zinc-100 p-1 mt-1 rounded italic">"{req.note}"</p>}
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}

                {/* --- 2. หมุดศูนย์พักพิง (สีน้ำเงิน) --- */}
                {shelters.map((shelter) => (
                    shelter.location && (
                        <Marker 
                            key={shelter.id} 
                            position={[shelter.location.lat, shelter.location.lng]}
                            icon={icons.blue}
                        >
                            <Popup>
                                <div className="font-sans">
                                    <p className="font-bold text-blue-700 flex items-center gap-1">🏠 {shelter.name}</p>
                                    <p className="text-[10px] text-slate-500">ศูนย์พักพิงรองรับผู้ประสบภัย</p>
                                    <a 
                                        href={`https://www.google.com/maps?q=${shelter.location.lat},${shelter.location.lng}`} 
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 text-xs underline block mt-1 font-bold"
                                    >
                                        นำทางไปที่นี่
                                    </a>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}

                {requests.length > 0 && <RecenterMap lat={requests[0].location.lat} lng={requests[0].location.lng} />}
            </MapContainer>
        </div>
    );
}