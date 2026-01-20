"use client";
import React, { useState, useEffect } from 'react';
import { MapPin, Package, Droplets, Battery, Zap, Phone, UserCircle, LogOut, AlertTriangle, X, Clock, CheckCircle } from 'lucide-react';
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, orderBy, limit } from "firebase/firestore";

export default function SOSPage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // --- State สำหรับติดตามสถานะล่าสุด ---
  const [latestRequest, setLatestRequest] = useState<any>(null);

  const [items, setItems] = useState({
    water: 0, food: 0, battery: 0, medicine: 0,
  });

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const savedPhone = localStorage.getItem("userPhone");
    if (savedPhone) {
      setPhoneNumber(savedPhone);
      setIsLoggedIn(true);
    }
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // --- Effect สำหรับติดตามสถานะแบบ Real-time และเล่นเสียงแจ้งเตือน ---
  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      const q = query(
        collection(db, "requests"),
        where("phone", "==", phoneNumber),
        orderBy("timestamp", "desc"),
        limit(1)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const newData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          
          // --- Plan B: เล่นเสียงเมื่อสถานะเปลี่ยนจาก pending เป็น completed ---
          if (latestRequest && latestRequest.status === 'pending' && (newData as any).status === 'completed') {
            const audio = new Audio('/alert.mp3');
            audio.play().catch(() => console.log("Audio playback blocked by browser policy. Please interact with the page first."));
          }
          
          setLatestRequest(newData);
        }
      });

      return () => unsubscribe();
    }
  }, [isLoggedIn, phoneNumber, latestRequest]);

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
        (err) => alert("โปรดอนุญาตสิทธิ์ GPS เพื่อความแม่นยำในการช่วยเหลือ"),
        { enableHighAccuracy: true }
      );
    }
  };

  const confirmSend = async () => {
    setIsSending(true);
    const messageBody = `SOS! เบอร์:${phoneNumber} พิกัด:${location?.lat.toFixed(4)},${location?.lng.toFixed(4)} ต้องการ น้ำ:${items.water}, อาหาร:${items.food}, แบต:${items.battery}, ยา:${items.medicine}`;

    if (isOnline) {
      try {
        const q = query(collection(db, "requests"), where("phone", "==", phoneNumber), where("status", "==", "pending"));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          alert("❌ คุณมีรายการที่รอการช่วยเหลืออยู่ในระบบแล้ว");
          setShowConfirm(false);
          setIsSending(false);
          return;
        }

        await addDoc(collection(db, "requests"), {
          phone: phoneNumber,
          location,
          items,
          status: "pending",
          timestamp: serverTimestamp(),
        });
      } catch (e: any) {
        alert("เกิดข้อผิดพลาด: " + e.message);
      }
    } else {
      window.location.href = `sms:0812345678?body=${encodeURIComponent(messageBody)}`;
    }
    setShowConfirm(false);
    setIsSending(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-800 p-8 rounded-3xl border border-zinc-700 shadow-2xl text-center">
            <div className="bg-yellow-500 w-20 h-20 rounded-full flex items-center justify-center text-black mx-auto mb-6"><Phone size={40} /></div>
            <h1 className="text-4xl font-black text-yellow-500 mb-2">SOS_Connext</h1>
            <p className="text-zinc-400 mb-8 italic text-sm">ระบุเบอร์โทรศัพท์เพื่อเข้าถึงระบบช่วยเหลือ</p>
            <form onSubmit={(e) => { e.preventDefault(); if(phoneNumber.length>=10) { localStorage.setItem("userPhone", phoneNumber); setIsLoggedIn(true); } }} className="space-y-4 text-left">
                <input type="tel" placeholder="08X-XXX-XXXX" className="w-full bg-zinc-900 border border-zinc-600 p-5 rounded-2xl text-2xl text-center focus:border-yellow-500 outline-none font-mono text-white" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
                <button className="w-full bg-yellow-500 text-black font-black py-5 rounded-2xl text-xl hover:bg-yellow-600 active:scale-95 transition-all shadow-lg shadow-yellow-500/20">ลงทะเบียนเข้าใช้งาน</button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6 font-sans flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-yellow-500 tracking-tighter italic">SOS_Connext</h1>
          <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-bold">
            <UserCircle size={14} /> {phoneNumber}
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black border tracking-wider ${isOnline ? "bg-green-500/10 text-green-500 border-green-500" : "bg-red-500/10 text-red-500 border-red-500"}`}>
          {isOnline ? "LIVE ONLINE" : "OFFLINE (SMS MODE)"}
        </div>
      </div>

      {/* Item Grid */}
      <div className="w-full grid grid-cols-2 gap-3 mb-8">
        <ItemCard label="น้ำดื่ม" icon={<Droplets size={18}/>} count={items.water} onAdd={() => setItems({...items, water: items.water+1})} onSub={() => setItems({...items, water: Math.max(0, items.water-1)})} />
        <ItemCard label="อาหาร" icon={<Package size={18}/>} count={items.food} onAdd={() => setItems({...items, food: items.food+1})} onSub={() => setItems({...items, food: Math.max(0, items.food-1)})} />
        <ItemCard label="แบตสำรอง" icon={<Battery size={18}/>} count={items.battery} onAdd={() => setItems({...items, battery: items.battery+1})} onSub={() => setItems({...items, battery: Math.max(0, items.battery-1)})} />
        <ItemCard label="ยารักษาโรค" icon={<Zap size={18}/>} count={items.medicine} onAdd={() => setItems({...items, medicine: items.medicine+1})} onSub={() => setItems({...items, medicine: Math.max(0, items.medicine-1)})} />
      </div>

      {/* Big Action Button */}
      <div className="relative flex flex-col items-center justify-center w-full flex-grow py-4">
        <button 
          onClick={handleMainButtonClick}
          className={`w-60 h-60 rounded-full border-[12px] shadow-[0_0_60px_rgba(220,38,38,0.2)] flex flex-col items-center justify-center transition-all active:scale-90 ${
            isOnline ? "bg-red-600 border-red-900/40" : "bg-orange-600 border-orange-900/40 shadow-[0_0_60px_rgba(234,88,12,0.2)]"
          }`}
        >
          <Zap size={50} fill="white" className="mb-2" />
          <span className="text-lg font-black leading-tight text-center px-6">
            {!location ? "ระบุพิกัดช่วยเหลือ" : isOnline ? "กดเพื่อส่งสัญญาณ SOS" : "ส่ง SMS ช่วยเหลือ"}
          </span>
        </button>
        
        {location && (
          <div className="mt-4 flex items-center gap-2 text-zinc-500 bg-zinc-800/80 px-4 py-2 rounded-full border border-zinc-700/50 backdrop-blur-md">
            <MapPin size={14} className="text-yellow-500" />
            <span className="text-[11px] font-mono font-bold tracking-tight">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
          </div>
        )}
      </div>

      {/* --- ส่วนแสดงสถานะล่าสุด (Live Status Display) --- */}
      {latestRequest && (
        <div className={`w-full mb-6 p-4 rounded-[24px] border transition-all duration-500 ${
          latestRequest.status === 'pending' 
          ? 'bg-red-500/10 border-red-500/30' 
          : 'bg-green-500/10 border-green-500/30 animate-bounce'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${latestRequest.status === 'pending' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                {latestRequest.status === 'pending' ? <Clock size={16} /> : <CheckCircle size={16} />}
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">สถานะคำขอล่าสุด</p>
                <p className={`text-sm font-bold ${latestRequest.status === 'pending' ? 'text-red-400' : 'text-green-400'}`}>
                  {latestRequest.status === 'pending' ? "เจ้าหน้าที่รับเรื่องแล้ว กำลังเดินทาง..." : "ช่วยเหลือเสร็จสิ้น ขอบคุณครับ"}
                </p>
              </div>
            </div>
            <span className="text-[9px] font-mono text-zinc-600">
              ID: {latestRequest.id.slice(-4).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Popup Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-zinc-800 w-full max-sm:w-full max-w-sm rounded-[40px] p-8 border border-zinc-700 shadow-2xl relative">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-600/20 p-5 rounded-full text-red-500 mb-6 animate-pulse">
                <AlertTriangle size={48} />
              </div>
              <h2 className="text-3xl font-black mb-3 text-white">ยืนยันส่ง SOS?</h2>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                สัญญาณของคุณจะถูกส่งไปที่ศูนย์ Dashboard เพื่อแจ้งตำแหน่งและความต้องการทันที
              </p>
              <div className="w-full space-y-3">
                <button 
                  disabled={isSending}
                  onClick={confirmSend}
                  className="w-full bg-red-600 hover:bg-red-700 py-5 rounded-[20px] font-black text-xl text-white active:scale-95 transition-all"
                >
                  {isSending ? "กำลังส่ง..." : "ใช่, ส่งเลย!"}
                </button>
                <button onClick={() => setShowConfirm(false)} className="w-full bg-zinc-700 hover:bg-zinc-600 py-5 rounded-[20px] font-bold text-lg text-zinc-400">ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-4 text-zinc-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
        <LogOut size={12} /> Sign Out
      </button>
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
        <button onClick={onSub} className="w-10 h-10 flex items-center justify-center text-2xl text-yellow-500 active:bg-zinc-800 rounded-full transition-colors">-</button>
        <span className="font-black text-xl text-white">{count}</span>
        <button onClick={onAdd} className="w-10 h-10 flex items-center justify-center text-2xl text-yellow-500 active:bg-zinc-800 rounded-full transition-colors">+</button>
      </div>
    </div>
  );
}