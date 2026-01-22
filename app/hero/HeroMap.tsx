"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// --- สร้าง Icon แยกสี ---
// หมุดคำขอ (สีแดง/น้ำเงินปกติ)
const requestIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// หมุดศูนย์พักพิง (สีเขียว) ✨
const shelterIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// ส่วนจัดการการซูมเมื่อพิกัดเปลี่ยน
function RecenterMap({ lat, lng }: { lat: number, lng: number }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) map.setView([lat, lng], 13);
    }, [lat, lng, map]);
    return null;
}

interface HeroMapProps {
    requests: any[];
    shelters: any[]; // รับพารามิเตอร์ shelters เพิ่มเข้ามา
}

export default function HeroMap({ requests, shelters = [] }: HeroMapProps) {
    const defaultPos: [number, number] = [13.7563, 100.5018]; // กรุงเทพฯ

    return (
        <div className="h-[450px] w-full rounded-2xl overflow-hidden z-0">
            <MapContainer center={defaultPos} zoom={6} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* --- 1. แสดงหมุดคำขอความช่วยเหลือ (Requests) --- */}
                {requests.map((req) => (
                    req.location && (
                        <Marker 
                            key={req.id} 
                            position={[req.location.lat, req.location.lng]}
                            icon={requestIcon}
                        >
                            <Popup>
                                <div className="font-sans">
                                    <p className="font-bold text-red-600">เคสขอความช่วยเหลือ</p>
                                    <p className="text-xs">โทร: {req.phone}</p>
                                    <p className="text-xs font-bold">สถานะ: {req.status}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}

                {/* --- 2. แสดงหมุดศูนย์พักพิง (Shelters) สีเขียว ✨ --- */}
                {shelters.map((shelter) => (
                    shelter.location && (
                        <Marker 
                            key={shelter.id} 
                            position={[shelter.location.lat, shelter.location.lng]}
                            icon={shelterIcon}
                        >
                            <Popup>
                                <div className="font-sans">
                                    <p className="font-bold text-green-700">🏠 ศูนย์พักพิง: {shelter.name}</p>
                                    <p className="text-[10px] text-slate-500">พิกัด: {shelter.location.lat.toFixed(4)}, {shelter.location.lng.toFixed(4)}</p>
                                    <a 
                                        href={`https://www.google.com/maps?q=${shelter.location.lat},${shelter.location.lng}`} 
                                        target="_blank"
                                        className="text-blue-500 text-xs underline block mt-1"
                                    >
                                        เปิดใน Google Maps
                                    </a>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}

                <RecenterMap lat={requests[0]?.location?.lat} lng={requests[0]?.location?.lng} />
            </MapContainer>
        </div>
    );
}