"use client";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ฟังก์ชันสร้าง Custom Icon ตามสี
const createCustomIcon = (color: string, opacity: number = 1) => {
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
      opacity: ${opacity};
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
};

// เตรียม Icon สำหรับสถานะต่างๆ
const redIcon = createCustomIcon('#dc2626');    // วิกฤต (แดง)
const yellowIcon = createCustomIcon('#facc15'); // เร่งด่วน (เหลือง)
const blueIcon = createCustomIcon('#2563eb');   // ปกติ (น้ำเงิน)
const grayIcon = createCustomIcon('#94a3b8', 0.6); // สำเร็จแล้ว (เทา/จาง)

export default function HeroMap({ requests }: { requests: any[] }) {
  // พิกัดกลาง (กรณีไม่มีข้อมูลให้เริ่มที่กรุงเทพ)
  const defaultCenter: [number, number] = [13.7563, 100.5018];

  return (
    <div className="h-[400px] w-full z-0 relative">
      <MapContainer 
        center={defaultCenter} 
        zoom={6} 
        scrollWheelZoom={true} 
        className="h-full w-full rounded-[28px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {requests.map((req) => {
          // --- Logic การเลือกสีหมุดให้ตรงกับ Dashboard ---
          let markerIcon = blueIcon;

          if (req.status === 'completed') {
            markerIcon = grayIcon; // ถ้าสำเร็จแล้วให้เป็นสีเทาจางๆ จะได้ไม่กวนสายตา
          } else if (req.priority === 1) {
            markerIcon = redIcon;    // วิกฤต
          } else if (req.priority === 2) {
            markerIcon = yellowIcon; // เร่งด่วน
          } else {
            markerIcon = blueIcon;   // ปกติ
          }

          return (
            <Marker 
              key={req.id} 
              position={[req.location.lat, req.location.lng]} 
              icon={markerIcon}
            >
              <Popup>
                <div className="font-sans p-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-3 h-3 rounded-full ${
                      req.status === 'completed' ? 'bg-slate-400' : 
                      req.priority === 1 ? 'bg-red-600 animate-pulse' : 
                      req.priority === 2 ? 'bg-yellow-500' : 'bg-blue-600'
                    }`}></span>
                    <p className="font-black text-sm text-slate-800 m-0">
                      {req.status === 'completed' ? 'ช่วยสำเร็จแล้ว' : req.priorityLabel}
                    </p>
                  </div>
                  
                  <p className="text-xs font-bold text-blue-600 mb-1">📞 {req.phone}</p>
                  <hr className="my-2 border-slate-100"/>
                  
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">รายการที่ขอ:</p>
                  <ul className="text-[11px] list-none p-0 m-0 space-y-1">
                    {req.items.water > 0 && <li className="flex justify-between"><span>น้ำดื่ม:</span> <b>{req.items.water}</b></li>}
                    {req.items.food > 0 && <li className="flex justify-between"><span>อาหาร:</span> <b>{req.items.food}</b></li>}
                    {req.items.battery > 0 && <li className="flex justify-between"><span>แบตสำรอง:</span> <b>{req.items.battery}</b></li>}
                    {req.items.medicine > 0 && <li className="flex justify-between text-red-600"><span>ยา:</span> <b>{req.items.medicine}</b></li>}
                  </ul>

                  <a 
                    href={`https://www.google.com/maps?q=${req.location.lat},${req.location.lng}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block mt-3 text-center bg-slate-800 text-white text-[10px] py-2 rounded-lg font-bold hover:bg-black transition-colors"
                  >
                    เปิดใน Google Maps
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}