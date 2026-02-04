"use client";
import React, { useState, useEffect } from 'react';
import {
  MapPin, Package, Droplets, Battery, Zap, Phone, UserCircle,
  LogOut, AlertTriangle, Clock, CheckCircle, Home, Navigation,
  Camera, X, PlusCircle, Baby, Accessibility, Users, Syringe, Sparkles, MessageSquare,
  Map as MapIcon, ChevronRight
} from 'lucide-react';
import { db } from './firebaseConfig';
import {
  collection, addDoc, serverTimestamp, query, where,
  getDocs, onSnapshot, orderBy, limit
} from "firebase/firestore";

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
  const [hasPendingRequest, setHasPendingRequest] = useState(false); // ระบบป้องกันส่งซ้ำ

  // --- States ข้อมูล SOS ---
  const [severity, setSeverity] = useState<'normal' | 'urgent' | 'critical'>('normal');
  const [vulnerable, setVulnerable] = useState({ elders: 0, children: 0, disabled: 0 });
  const [needs, setNeeds] = useState({
    survival: false,
    medical: false,
    sanitary: false,
    momAndBaby: false
  });
  const [note, setNote] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);

  // คำนวณระยะทาง
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const savedPhone = localStorage.getItem("userPhone");
    if (savedPhone) { setPhoneNumber(savedPhone); setIsLoggedIn(true); }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }

    // ดึงข้อมูลศูนย์พักพิง
    const unsubShelters = onSnapshot(collection(db, "shelters"), (snapshot) => {
      const shelterData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Shelter[];
      setShelters(shelterData);
    });

    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      unsubShelters();
    };
  }, []);

  // เรียงลำดับศูนย์พักพิงที่ใกล้ที่สุด
  const sortedShelters = shelters.map(s => ({
    ...s,
    distance: location ? calculateDistance(location.lat, location.lng, s.location.lat, s.location.lng) : "..."
  })).sort((a, b) => parseFloat(a.distance!) - parseFloat(b.distance!));

  // ตรวจสอบสถานะคำขอล่าสุดเพื่อป้องกันการส่งซ้ำ
  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      const qReq = query(
        collection(db, "requests"),
        where("phone", "==", phoneNumber),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const unsubReq = onSnapshot(qReq, (snapshot) => {
        if (!snapshot.empty) {
          const reqData = snapshot.docs[0].data();
          setLatestRequest({ id: snapshot.docs[0].id, ...reqData });
          // ถ้าสถานะเป็น pending จะล็อคปุ่มส่ง SOS
          setHasPendingRequest(reqData.status === "pending");
        }
      });
      return () => unsubReq();
    }
  }, [isLoggedIn, phoneNumber]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...newFiles]);
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (imageFiles.length === 0) return [];
    const uploadPromises = imageFiles.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'sos_preset');
      const res = await fetch('https://api.cloudinary.com/v1_1/dlehvr2sk/image/upload', { method: 'POST', body: formData });
      const data = await res.json();
      return data.secure_url;
    });
    return await Promise.all(uploadPromises);
  };

  const confirmSend = async () => {
    if (hasPendingRequest) return;
    setIsSending(true);
    try {
      const imageUrls = await uploadImages();
      await addDoc(collection(db, "requests"), {
        phone: phoneNumber,
        location,
        needs,
        severity,
        vulnerable,
        note,
        imageUrls,
        status: "pending",
        timestamp: serverTimestamp(),
      });
      setImageFiles([]); setPreviewUrls([]); setNote(""); setShowConfirm(false);
    } catch (e: any) { alert(e.message); } finally { setIsSending(false); }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-zinc-800 p-8 rounded-[40px] border border-zinc-700">
          <div className="bg-yellow-500 w-20 h-20 rounded-3xl flex items-center justify-center text-black mx-auto mb-6 shadow-lg shadow-yellow-500/20"><Phone size={40} /></div>
          <h1 className="text-4xl font-black text-yellow-500 mb-2 italic tracking-tighter">SOS_Connext</h1>
          <form onSubmit={(e) => { e.preventDefault(); if (phoneNumber.length >= 10) { localStorage.setItem("userPhone", phoneNumber); setIsLoggedIn(true); } }} className="space-y-4">
            <input type="tel" placeholder="08X-XXX-XXXX" className="w-full bg-zinc-900 border border-zinc-600 p-5 rounded-2xl text-2xl text-center outline-none focus:border-yellow-500 transition-all" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
            <button className="w-full bg-yellow-500 text-black font-black py-5 rounded-2xl text-xl hover:bg-yellow-400">ลงทะเบียน</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6 pb-24 font-sans flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-yellow-500 italic uppercase">SOS_Connext</h1>
          <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-bold mt-1"><UserCircle size={14} /> {phoneNumber}</div>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black border-2 ${isOnline ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
          {isOnline ? "• ONLINE" : "• OFFLINE (SMS)"}
        </div>
      </div>

      {/* 1. ศูนย์พักพิงใกล้คุณ */}
      <div className="w-full mb-8">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-[11px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2">
            <Home size={14} className="text-yellow-500" /> ศูนย์พักพิงใกล้คุณ
          </h3>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
          {sortedShelters.length > 0 ? (
            sortedShelters.map((s) => (
              <div key={s.id} className="min-w-[240px] bg-zinc-800/60 border border-zinc-700/50 p-4 rounded-[28px] snap-center backdrop-blur-md">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500">
                    <MapIcon size={20} />
                  </div>
                  <span className="text-[10px] font-black bg-zinc-900 text-green-400 px-3 py-1 rounded-full border border-zinc-700">
                    {s.distance} กม.
                  </span>
                </div>
                <h4 className="font-black text-sm mb-3 text-zinc-100 line-clamp-1">{s.name}</h4>
                <a
                  href={`https://www.google.com/maps?q=${s.location.lat},${s.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-zinc-700/50 py-2.5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase hover:bg-yellow-500 hover:text-black transition-all"
                >
                  <Navigation size={12} /> นำทาง
                </a>
              </div>
            ))
          ) : (
            <div className="w-full py-8 text-center bg-zinc-800/30 rounded-[32px] border border-dashed border-zinc-700 text-zinc-600 text-[10px] font-black uppercase">
              ไม่มีข้อมูลศูนย์พักพิง
            </div>
          )}
        </div>
      </div>

      <div className="w-full h-[1px] bg-zinc-800/50 mb-8" />

      {/* 2. ระดับความรุนแรง */}
      <div className="w-full mb-6">
        <label className="text-[10px] font-black uppercase text-zinc-500 mb-3 block tracking-widest text-center">ระดับความรุนแรง</label>
        <div className="grid grid-cols-3 gap-2">
          {['normal', 'urgent', 'critical'].map((lvl) => (
            <button key={lvl} disabled={hasPendingRequest} onClick={() => setSeverity(lvl as any)} className={`py-4 rounded-2xl border-2 flex flex-col items-center transition-all ${severity === lvl ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-lg' : 'bg-zinc-800/40 border-transparent text-zinc-500'} ${hasPendingRequest ? 'opacity-30 cursor-not-allowed' : ''}`}>
              <span className="text-xl mb-1">{lvl === 'normal' ? '🟢' : lvl === 'urgent' ? '🟡' : '🔴'}</span>
              <span className="text-[10px] font-black uppercase">{lvl === 'normal' ? 'ปลอดภัย' : lvl === 'urgent' ? 'เร่งด่วน' : 'วิกฤต'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. จำนวนผู้ประสบภัย */}
      <div className="w-full mb-6 p-5 bg-zinc-800/40 rounded-[32px] border border-zinc-700/50 backdrop-blur-sm">
        <h3 className="text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest flex items-center gap-2"><Users size={14} /> จำนวนผู้ประสบภัย</h3>
        <div className="grid grid-cols-3 gap-4">
          <VulnerableCounter
            label="ผู้สูงอายุ"
            count={vulnerable.elders}
            onUpdate={(v: number) => !hasPendingRequest && setVulnerable({ ...vulnerable, elders: v })}
          />
          <VulnerableCounter
            label="เด็ก"
            count={vulnerable.children}
            onUpdate={(v: number) => !hasPendingRequest && setVulnerable({ ...vulnerable, children: v })}
          />
          <VulnerableCounter
            label="ผู้พิการ"
            count={vulnerable.disabled}
            onUpdate={(v: number) => !hasPendingRequest && setVulnerable({ ...vulnerable, disabled: v })}
          />
        </div>
      </div>

      {/* 4. สิ่งที่ต้องการ */}
      <div className="w-full mb-6">
        <label className="text-[10px] font-black uppercase text-zinc-500 mb-3 block tracking-widest text-center">สิ่งที่ต้องการ</label>
        <div className="grid grid-cols-2 gap-3">
          <NeedCard label="ชุดยังชีพ" sub="อาหาร/น้ำ" icon={<Droplets size={24} />} active={needs.survival} onClick={() => !hasPendingRequest && setNeeds({ ...needs, survival: !needs.survival })} />
          <NeedCard label="ยารักษาโรค" sub="ปฐมพยาบาล" icon={<Syringe size={24} />} active={needs.medical} onClick={() => !hasPendingRequest && setNeeds({ ...needs, medical: !needs.medical })} />
          <NeedCard label="สุขอนามัย" sub="ผ้าอนามัย/ทิชชู่" icon={<Sparkles size={24} />} active={needs.sanitary} onClick={() => !hasPendingRequest && setNeeds({ ...needs, sanitary: !needs.sanitary })} />
          <NeedCard label="แม่และเด็ก" sub="นม/แพมเพิส" icon={<Baby size={24} />} active={needs.momAndBaby} highlight={vulnerable.children > 0} onClick={() => !hasPendingRequest && setNeeds({ ...needs, momAndBaby: !needs.momAndBaby })} />
        </div>
      </div>

      {/* 5. รายละเอียดเพิ่มเติม */}
      <div className="w-full mb-6">
        <label className="text-[10px] font-black uppercase text-zinc-500 mb-3 block tracking-widest text-center flex items-center justify-center gap-2">
          <MessageSquare size={12} /> รายละเอียดเพิ่มเติม
        </label>
        <div className="relative">
          <textarea
            disabled={hasPendingRequest}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 100))}
            placeholder="เช่น มีคนเจ็บขา, น้ำสูงถึงเอว..."
            className="w-full bg-zinc-800/40 border border-zinc-700/50 rounded-[28px] p-5 text-sm text-white outline-none focus:border-yellow-500/50 transition-all resize-none h-24 font-sans"
          />
          <div className="absolute bottom-4 right-5 text-[10px] font-black text-zinc-600">{note.length}/100</div>
        </div>
      </div>

      {/* 6. ถ่ายรูป */}
      <div className="w-full mb-8">
        <div className="bg-zinc-800/40 border-2 border-dashed border-zinc-700/50 rounded-[32px] p-5 flex flex-wrap gap-3">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative w-16 h-16 shadow-xl">
              <img src={url} alt="Preview" className="w-full h-full object-cover rounded-2xl border border-zinc-600" />
              {!hasPendingRequest && <button onClick={() => removeImage(index)} className="absolute -top-2 -right-2 bg-red-600 p-1.5 rounded-full border-2 border-zinc-900"><X size={10} /></button>}
            </div>
          ))}
          {!hasPendingRequest && previewUrls.length < 5 && (
            <label className="w-16 h-16 bg-zinc-700/30 hover:bg-zinc-700/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer border border-zinc-600 border-dashed transition-colors">
              <PlusCircle size={20} className="text-yellow-500" />
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
            </label>
          )}
          {previewUrls.length === 0 && (
            <div className="flex-1 flex flex-col items-center py-2 opacity-40">
              <Camera size={24} className="mb-1" />
              <span className="text-[9px] font-black uppercase">ถ่ายรูปสถานการณ์</span>
            </div>
          )}
        </div>
      </div>

      {/* SOS Button + Logic ส่งซ้ำ */}
      <div className="relative flex flex-col items-center justify-center w-full mb-10">
        <button
          disabled={isSending || hasPendingRequest || !location}
          onClick={() => setShowConfirm(true)}
          className={`w-48 h-48 rounded-full border-[12px] shadow-2xl flex flex-col items-center justify-center transition-all 
            ${hasPendingRequest
              ? 'bg-zinc-700 border-zinc-800 shadow-none grayscale cursor-not-allowed'
              : severity === 'critical' ? 'bg-red-600 animate-pulse border-red-900/30 shadow-red-600/30 active:scale-95' : 'bg-orange-600 border-orange-900/30 shadow-orange-600/30 active:scale-95'
            }`}
        >
          {hasPendingRequest ? (
            <>
              <CheckCircle size={44} className="text-green-500 mb-1" />
              <span className="text-xs font-black uppercase tracking-tighter text-zinc-400">ส่งคำขอแล้ว</span>
            </>
          ) : (
            <>
              <Zap size={44} fill="white" className="mb-1" />
              <span className="text-sm font-black uppercase tracking-tighter">{isSending ? "กำลังส่ง..." : "กดเพื่อส่ง SOS"}</span>
            </>
          )}
        </button>
        {hasPendingRequest && (
          <p className="mt-4 text-[10px] text-yellow-500/70 font-bold uppercase animate-pulse">กู้ภัยได้รับพิกัดแล้ว อยู่ระหว่างรอกู้ภัยตอบรับ</p>
        )}
        {location && !hasPendingRequest && (
          <div className="mt-6 text-zinc-500 text-[10px] font-mono bg-black/40 px-4 py-1.5 rounded-full border border-zinc-800 flex items-center gap-2">
            <MapPin size={10} className="text-yellow-500" /> {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </div>
        )}
      </div>

      {/* Live Status Bar */}
      {latestRequest && (
        <div className={`w-full mb-6 p-5 rounded-[32px] border transition-all ${latestRequest.status === 'pending' ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20 shadow-lg shadow-green-500/10'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${latestRequest.status === 'pending' ? 'bg-red-500 shadow-lg shadow-red-500/20' : 'bg-green-500 shadow-lg shadow-green-500/20'}`}>
              {latestRequest.status === 'pending' ? <Clock size={20} /> : <CheckCircle size={20} />}
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">สถานะการช่วยเหลือ</p>
              <p className={`text-lg font-black ${latestRequest.status === 'pending' ? 'text-red-400' : 'text-green-400'}`}>
                {latestRequest.status === 'pending' ? "กำลังรอเจ้าหน้าที่..." : "ช่วยเหลือสำเร็จ!"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <div className="bg-zinc-800 w-full max-w-sm rounded-[48px] p-10 border border-zinc-700 text-center shadow-2xl">
            <div className={`p-6 rounded-full mx-auto mb-6 w-fit animate-pulse ${severity === 'critical' ? 'bg-red-600/20 text-red-500' : 'bg-yellow-600/20 text-yellow-500'}`}><AlertTriangle size={56} /></div>
            <h2 className="text-3xl font-black mb-4 tracking-tight uppercase">ยืนยันส่ง SOS?</h2>
            <p className="text-zinc-400 text-sm mb-10 leading-relaxed font-medium">กู้ภัยที่ใกล้ที่สุดจะได้รับพิกัดและข้อมูลของคุณทันที</p>
            <div className="space-y-4">
              <button disabled={isSending} onClick={confirmSend} className="w-full bg-red-600 py-6 rounded-[24px] font-black text-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all">ใช่, ส่งตอนนี้!</button>
              <button onClick={() => setShowConfirm(false)} className="w-full bg-zinc-700/50 py-5 rounded-[24px] font-bold text-zinc-400 hover:bg-zinc-700 transition-all">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-10 text-zinc-700 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:text-red-500 transition-colors"><LogOut size={14} /> Sign Out</button>
    </div>
  );
}

// --- Components ---

function NeedCard({ label, sub, icon, active, onClick, highlight }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative p-5 rounded-[32px] border-2 transition-all flex flex-col items-center text-center gap-1.5
        ${active
          ? 'bg-yellow-500 border-yellow-400 text-black shadow-xl shadow-yellow-500/20 scale-[1.02]'
          : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400'
        }
        ${highlight && !active ? 'border-blue-500/50 animate-pulse' : ''}
      `}
    >
      <div className={`transition-colors ${active ? 'text-black' : 'text-yellow-500'}`}>{icon}</div>
      <span className="text-[14px] font-black uppercase tracking-tighter leading-none">{label}</span>
      <span className={`text-[10px] font-bold opacity-60 ${active ? 'text-black' : 'text-zinc-500'}`}>{sub}</span>
    </button>
  );
}

function VulnerableCounter({ label, count, onUpdate }: any) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-zinc-500 text-[9px] font-black uppercase tracking-tight">{label}</span>
      <div className="flex items-center gap-3 bg-zinc-900/80 p-2 rounded-2xl border border-zinc-700/50 shadow-inner">
        <button onClick={() => onUpdate(Math.max(0, count - 1))} className="text-yellow-500 font-black w-6 h-6 flex items-center justify-center bg-zinc-800 rounded-lg">-</button>
        <span className="text-[16px] font-black w-4 text-center">{count}</span>
        <button onClick={() => onUpdate(count + 1)} className="text-yellow-500 font-black w-6 h-6 flex items-center justify-center bg-zinc-800 rounded-lg">+</button>
      </div>
    </div>
  )
}