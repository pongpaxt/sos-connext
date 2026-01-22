"use client";
import React, { useState, useEffect } from 'react';
import { 
  MapPin, Package, Droplets, Battery, Zap, Phone, UserCircle, 
  LogOut, AlertTriangle, Clock, CheckCircle, Home, Navigation 
} from 'lucide-react';
import { db } from './firebaseConfig';
import { 
  collection, addDoc, serverTimestamp, query, where, 
  getDocs, onSnapshot, orderBy, limit 
} from "firebase/firestore";

// --- อินเตอร์เฟสสำหรับศูนย์พักพิง ---
interface Shelter {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  distance?: string;
}

export default function SOSPage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [latestRequest, setLatestRequest] = useState<any>(null);
  const [items, setItems] = useState({ water: 0, food: 0, battery: 0, medicine: 0 });

  // --- State ใหม่สำหรับศูนย์พักพิง ---
  const [shelters, setShelters] = useState<Shelter[]>([]);

  // ฟังก์ชันคำนวณระยะทาง (Haversine Formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(2);
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const savedPhone = localStorage.getItem("userPhone");
    if (savedPhone) {
      setPhoneNumber(savedPhone);
      setIsLoggedIn(true);
    }
    
    // ดึงพิกัดเริ่มต้นทันที
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }

    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // --- ติดตามสถานะคำขอ & ดึงข้อมูลศูนย์พักพิง ---
  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      // 1. ติดตาม Request ล่าสุด
      const qReq = query(
        collection(db, "requests"),
        where("phone", "==", phoneNumber),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const unsubReq = onSnapshot(qReq, (snapshot) => {
        if (!snapshot.empty) {
          const newData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          if (latestRequest && latestRequest.status === 'pending' && (newData as any).status === 'completed') {
            new Audio('/alert.mp3').play().catch(() => {});
          }
          setLatestRequest(newData);
        }
      });

      // 2. ดึงข้อมูลศูนย์พักพิง
      const qShelter = query(collection(db, "shelters"));
      const unsubShelter = onSnapshot(qShelter, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shelter[];
        if (location) {
          const sorted = data.map(s => ({
            ...s,
            distance: calculateDistance(location.lat, location.lng, s.location.lat, s.location.lng)
          })).sort((a, b) => parseFloat(a.distance!) - parseFloat(b.distance!));
          setShelters(sorted);
        } else {
          setShelters(data);
        }
      });

      return () => { unsubReq(); unsubShelter(); };
    }
  }, [isLoggedIn, phoneNumber, location, latestRequest]);

  const handleMainButtonClick = () => {
    if (!location) {
      getLocation();
    } else {
      setShowConfirm(true);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setShowConfirm(true);
        },
        (err) => alert("โปรดอนุญาตสิทธิ์ GPS"),
        { enableHighAccuracy: true }
      );
    }
  };

  const confirmSend = async () => {
    setIsSending(true);
    if (isOnline) {
      try {
        const q = query(collection(db, "requests"), where("phone", "==", phoneNumber), where("status", "==", "pending"));
        const snap = await getDocs(q);
        if (!snap.empty) {
          alert("❌ มีรายการที่รออยู่แล้ว");
          setShowConfirm(false); setIsSending(false); return;
        }
        await addDoc(collection(db, "requests"), {
          phone: phoneNumber, location, items, status: "pending", timestamp: serverTimestamp(),
        });
      } catch (e: any) { alert(e.message); }
    } else {
      const msg = `SOS! เบอร์:${phoneNumber} พิกัด:${location?.lat.toFixed(4)},${location?.lng.toFixed(4)} ต้องการ น้ำ:${items.water}, อาหาร:${items.food}, แบต:${items.battery}, ยา:${items.medicine}`;
      window.location.href = `sms:0822654210?body=${encodeURIComponent(msg)}`;
    }
    setShowConfirm(false); setIsSending(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-800 p-8 rounded-[40px] text-center border border-zinc-700">
          <div className="bg-yellow-500 w-20 h-20 rounded-3xl flex items-center justify-center text-black mx-auto mb-6 shadow-lg shadow-yellow-500/20"><Phone size={40} /></div>
          <h1 className="text-4xl font-black text-yellow-500 mb-2 italic">SOS_Connext</h1>
          <form onSubmit={(e) => { e.preventDefault(); if(phoneNumber.length>=10) { localStorage.setItem("userPhone", phoneNumber); setIsLoggedIn(true); } }} className="space-y-4">
            <input type="tel" placeholder="08X-XXX-XXXX" className="w-full bg-zinc-900 border border-zinc-600 p-5 rounded-2xl text-2xl text-center outline-none text-white font-mono" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
            <button className="w-full bg-yellow-500 text-black font-black py-5 rounded-2xl text-xl hover:bg-yellow-600 transition-all">ลงทะเบียนเข้าใช้งาน</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6 pb-20 font-sans flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-yellow-500 italic uppercase">SOS_Connext</h1>
          <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-bold"><UserCircle size={14} /> {phoneNumber}</div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black border ${isOnline ? "bg-green-500/10 text-green-500 border-green-500" : "bg-red-500/10 text-red-500 border-red-500"}`}>
          {isOnline ? "ONLINE" : "SMS MODE"}
        </div>
      </div>

      {/* --- ส่วนศูนย์พักพิงใกล้คุณ (New Section) --- */}
      <div className="w-full mb-8">
        <h2 className="text-sm font-black text-zinc-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
          <Home size={16} className="text-green-500" /> Nearby Shelters
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {shelters.length > 0 ? shelters.map((s) => (
            <div key={s.id} className="min-w-[280px] bg-zinc-800/50 border border-zinc-700 p-5 rounded-[32px] backdrop-blur-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-lg text-white leading-tight mb-1">{s.name}</h3>
                  <p className="text-green-400 text-xs font-black flex items-center gap-1">
                    <Navigation size={12} fill="currentColor" /> {s.distance || "..."} KM AWAY
                  </p>
                </div>
                <a href={`https://www.google.com/maps?q=${s.location.lat},${s.location.lng}`} target="_blank" className="bg-green-600 p-3 rounded-2xl text-white shadow-lg shadow-green-900/20 active:scale-90 transition-all">
                  <Navigation size={18} />
                </a>
              </div>
            </div>
          )) : (
            <div className="w-full p-6 bg-zinc-800/20 rounded-[32px] border border-dashed border-zinc-700 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
              No shelters found nearby
            </div>
          )}
        </div>
      </div>

      {/* Item Grid */}
      <div className="w-full grid grid-cols-2 gap-3 mb-8">
        <ItemCard label="น้ำดื่ม" icon={<Droplets size={18}/>} count={items.water} onAdd={() => setItems({...items, water: items.water+1})} onSub={() => setItems({...items, water: Math.max(0, items.water-1)})} />
        <ItemCard label="อาหาร" icon={<Package size={18}/>} count={items.food} onAdd={() => setItems({...items, food: items.food+1})} onSub={() => setItems({...items, food: Math.max(0, items.food-1)})} />
        <ItemCard label="แบตสำรอง" icon={<Battery size={18}/>} count={items.battery} onAdd={() => setItems({...items, battery: items.battery+1})} onSub={() => setItems({...items, battery: Math.max(0, items.battery-1)})} />
        <ItemCard label="ยารักษาโรค" icon={<Zap size={18}/>} count={items.medicine} onAdd={() => setItems({...items, medicine: items.medicine+1})} onSub={() => setItems({...items, medicine: Math.max(0, items.medicine-1)})} />
      </div>

      {/* Big SOS Button */}
      <div className="relative flex flex-col items-center justify-center w-full mb-8">
        <button onClick={handleMainButtonClick} className={`w-52 h-52 rounded-full border-[10px] shadow-2xl flex flex-col items-center justify-center transition-all active:scale-95 ${isOnline ? "bg-red-600 border-red-900/40 shadow-red-600/20" : "bg-orange-600 border-orange-900/40 shadow-orange-600/20"}`}>
          <Zap size={40} fill="white" className="mb-2" />
          <span className="text-sm font-black text-center px-4 leading-tight">
            {!location ? "ระบุพิกัดช่วยเหลือ" : isOnline ? "กดเพื่อส่งสัญญาณ SOS" : "ส่ง SMS ช่วยเหลือ"}
          </span>
        </button>
        {location && (
          <div className="mt-4 flex items-center gap-2 text-zinc-500 text-[10px] font-mono bg-black/20 px-3 py-1 rounded-full border border-zinc-800">
            <MapPin size={12} className="text-yellow-500" /> {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </div>
        )}
      </div>

      {/* Live Status Display */}
      {latestRequest && (
        <div className={`w-full mb-6 p-4 rounded-[24px] border transition-all ${latestRequest.status === 'pending' ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30 animate-pulse'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${latestRequest.status === 'pending' ? 'bg-red-500' : 'bg-green-500'}`}>
                {latestRequest.status === 'pending' ? <Clock size={16} /> : <CheckCircle size={16} />}
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">สถานะล่าสุด</p>
                <p className={`text-sm font-bold ${latestRequest.status === 'pending' ? 'text-red-400' : 'text-green-400'}`}>
                  {latestRequest.status === 'pending' ? "กำลังดำเนินการช่วยเหลือ..." : "ความช่วยเหลือเสร็จสิ้น"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-zinc-800 w-full max-w-sm rounded-[40px] p-8 border border-zinc-700 text-center">
            <div className="bg-red-600/20 p-5 rounded-full text-red-500 mx-auto mb-6 w-fit animate-pulse"><AlertTriangle size={48} /></div>
            <h2 className="text-3xl font-black mb-3">ยืนยันส่ง SOS?</h2>
            <p className="text-zinc-400 text-sm mb-8">ข้อมูลพิกัดและความต้องการจะถูกส่งไปที่ศูนย์ทันที</p>
            <div className="space-y-3">
              <button disabled={isSending} onClick={confirmSend} className="w-full bg-red-600 py-5 rounded-2xl font-black text-xl active:scale-95 transition-all">
                {isSending ? "กำลังส่ง..." : "ใช่, ส่งเลย!"}
              </button>
              <button onClick={() => setShowConfirm(false)} className="w-full bg-zinc-700 py-5 rounded-2xl font-bold text-zinc-400">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-4 text-zinc-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><LogOut size={12} /> Sign Out</button>
    </div>
  );
}

function ItemCard({ label, icon, count, onAdd, onSub }: any) {
  return (
    <div className="bg-zinc-800/40 p-4 rounded-[28px] border border-zinc-700/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-zinc-500 mb-3 font-bold">
        <span className="text-yellow-500/80">{icon}</span>
        <span className="text-[12px] uppercase tracking-tight">{label}</span>
      </div>
      <div className="flex justify-between items-center bg-zinc-900/80 rounded-[20px] p-1 border border-zinc-700/80 shadow-inner">
        <button onClick={onSub} className="w-10 h-10 flex items-center justify-center text-2xl text-yellow-500 active:bg-zinc-800 rounded-full">-</button>
        <span className="font-black text-xl text-white">{count}</span>
        <button onClick={onAdd} className="w-10 h-10 flex items-center justify-center text-2xl text-yellow-500 active:bg-zinc-800 rounded-full">+</button>
      </div>
    </div>
  );
}