"use client";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ฟังก์ชันสร้าง Custom Icon ตามสี
const createCustomIcon = (color: string) => {
  return new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${color}; 
      width: 24px; 
      height: 24px; 
      border-radius: 50% 50% 50% 0; 
      transform: rotate(-45deg); 
      border: 2px solid white;
      box-shadow: 0 0 10px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
};

// เตรียม Icon 3 สี
const redIcon = createCustomIcon('#dc2626');    // วิกฤต (แดง)
const yellowIcon = createCustomIcon('#facc15'); // เร่งด่วน (เหลือง)
const blueIcon = createCustomIcon('#2563eb');   // ปกติ (ฟ้า)

export default function HeroMap({ requests }: { requests: any[] }) {
  const center: [number, number] = [13.7563, 100.5018]; // พิกัดกลาง (กรุงเทพ)

  return (
    <div className="h-[400px] w-full z-0">
      <MapContainer center={center} zoom={6} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {requests.map((req) => {
          // --- Logic เลือกสีหมุด ---
          let markerIcon = blueIcon;
          
          if (req.status === 'completed') {
             // ถ้าช่วยแล้วอาจจะให้เป็นสีเทา หรือคงสีเดิมไว้จางๆ (ตัวอย่างนี้เลือกใช้สีฟ้าปกติ)
             markerIcon = blueIcon; 
          } else if (req.items.medicine > 0) {
            markerIcon = redIcon;    // วิกฤต
          } else if (req.items.battery > 0) {
            markerIcon = yellowIcon; // เร่งด่วน
          }

          return (
            <Marker 
              key={req.id} 
              position={[req.location.lat, req.location.lng]} 
              icon={markerIcon}
            >
              <Popup>
                <div className="font-sans">
                  <p className="font-bold text-slate-800">เบอร์ติดต่อ: {req.phone}</p>
                  <p className="text-xs text-slate-500">สถานะ: {req.priorityLabel || 'ทั่วไป'}</p>
                  <hr className="my-1"/>
                  <p className="text-xs font-bold">สิ่งที่ต้องการ:</p>
                  <ul className="text-[10px] list-disc ml-4">
                    {req.items.water > 0 && <li>น้ำดื่ม: {req.items.water}</li>}
                    {req.items.food > 0 && <li>อาหาร: {req.items.food}</li>}
                    {req.items.battery > 0 && <li>แบตสำรอง: {req.items.battery}</li>}
                    {req.items.medicine > 0 && <li>ยา: {req.items.medicine}</li>}
                  </ul>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}