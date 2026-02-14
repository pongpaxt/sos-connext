"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Droplets, Zap, Phone, UserCircle,
  LogOut, AlertTriangle, Clock, CheckCircle, Home, Navigation,
  Camera, X, PlusCircle, Baby, Users, Syringe, Sparkles, MessageSquare,
  Map as MapIcon, Truck, Heart
} from 'lucide-react';
import { db } from './firebaseConfig';
import {
  collection, addDoc, serverTimestamp, query, where,
  onSnapshot, orderBy, limit
} from "firebase/firestore";

// --- Translations Dictionary ---
const translations = {
  th: {
    statusLabel: "สถานะการช่วยเหลือ",
    statusText: {
      pending: "ส่งเรื่องแล้ว รอเจ้าหน้าที่",
      accepted: "เจ้าหน้าที่รับเรื่องแล้ว",
      dispatching: "กำลังเดินทางมาหาคุณ",
      arrived: "เจ้าหน้าที่ถึงจุดเกิดเหตุแล้ว",
      completed: "ช่วยเหลือเสร็จสิ้น"
    },
    shelterHeader: "ศูนย์พักพิงใกล้คุณ",
    severityLabel: "ระดับความรุนแรง",
    severityText: { normal: "ปลอดภัย", urgent: "เร่งด่วน", critical: "วิกฤต" },
    vulnerableLabel: "กลุ่มเปราะบาง",
    vulnerableText: { elders: "ผู้สูงอายุ", children: "เด็ก", disabled: "ผู้พิการ" },
    needs: {
      survival: ["ชุดยังชีพ", "อาหาร/น้ำ"],
      medical: ["ยารักษาโรค", "ปฐมพยาบาล"],
      sanitary: ["สุขอนามัย", "ผ้าอนามัย"],
      momAndBaby: ["แม่และเด็ก", "นม/แพมเพิส"]
    },
    placeholder: "รายละเอียดเพิ่มเติม เช่น พิกัดบ้าน, ผู้บาดเจ็บ...",
    sosButton: { send: "กดเพื่อส่ง SOS", sending: "กำลังส่ง...", pending: "รอการช่วยเหลือ" },
    pendingWarning: "คำขอก่อนหน้ายังดำเนินการอยู่",
    modalTitle: "ยืนยันส่ง SOS?",
    modalSub: "กู้ภัยจะได้รับพิกัดของคุณทันที",
    modalConfirm: "ใช่, ส่งตอนนี้!",
    modalCancel: "ยกเลิก",
    addPhoto: "เพิ่มรูปภาพ",
    offlineNotice: "ไม่พบสัญญาณอินเทอร์เน็ต ระบบจะส่งขอความช่วยเหลือผ่าน SMS แทน"
  },
  en: {
    statusLabel: "Help Status",
    statusText: {
      pending: "Request Sent, Waiting",
      accepted: "Request Accepted",
      dispatching: "Rescuer is on the way",
      arrived: "Rescuer at your location",
      completed: "Mission Completed"
    },
    shelterHeader: "Nearby Shelters",
    severityLabel: "Severity Level",
    severityText: { normal: "Normal", urgent: "Urgent", critical: "Critical" },
    vulnerableLabel: "Vulnerable Groups",
    vulnerableText: { elders: "Elders", children: "Children", disabled: "Disabled" },
    needs: {
      survival: ["Survival Kit", "Food/Water"],
      medical: ["Medical", "First Aid"],
      sanitary: ["Sanitary", "Personal Care"],
      momAndBaby: ["Mom & Baby", "Milk/Diapers"]
    },
    placeholder: "Additional details, e.g., house color, injuries...",
    sosButton: { send: "Press for SOS", sending: "Sending...", pending: "Awaiting Help" },
    pendingWarning: "A request is already in progress",
    modalTitle: "Confirm SOS?",
    modalSub: "Rescuers will receive your location immediately.",
    modalConfirm: "Yes, Send Now!",
    modalCancel: "Cancel",
    addPhoto: "Add Photo",
    offlineNotice: "No internet connection. Switching to SMS help request."
  }
};

// --- Types ---
interface Location { lat: number; lng: number }
interface Shelter { id: string; name: string; location: Location; distance?: string }

export default function SOSPage() {
  const [lang, setLang] = useState<'th' | 'en'>('th');
  const t = translations[lang];

  const [location, setLocation] = useState<Location | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [latestRequest, setLatestRequest] = useState<any>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // SOS Form States
  const [severity, setSeverity] = useState<'normal' | 'urgent' | 'critical'>('normal');
  const [vulnerable, setVulnerable] = useState({ elders: 0, children: 0, disabled: 0 });
  const [needs, setNeeds] = useState({ survival: false, medical: false, sanitary: false, momAndBaby: false });
  const [note, setNote] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);

  // Distance Calculation
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
    // Update online status
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    setIsOnline(navigator.onLine);

    const savedPhone = localStorage.getItem("userPhone");
    if (savedPhone) { setPhoneNumber(savedPhone); setIsLoggedIn(true); }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    }

    const unsubShelters = onSnapshot(collection(db, "shelters"), (snapshot) => {
      const shelterData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shelter[];
      setShelters(shelterData);
    });

    return () => {
        unsubShelters();
        window.removeEventListener('online', handleStatus);
        window.removeEventListener('offline', handleStatus);
    }
  }, []);

  const sortedShelters = useMemo(() => {
    return shelters.map(s => ({
      ...s,
      distance: location ? calculateDistance(location.lat, location.lng, s.location.lat, s.location.lng) : "..."
    })).sort((a, b) => parseFloat(a.distance!) - parseFloat(b.distance!));
  }, [shelters, location]);

  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      const qReq = query(collection(db, "requests"), where("phone", "==", phoneNumber), orderBy("timestamp", "desc"), limit(1));
      const unsubReq = onSnapshot(qReq, (snapshot) => {
        if (!snapshot.empty) {
          const reqData = snapshot.docs[0].data();
          setLatestRequest({ id: snapshot.docs[0].id, ...reqData });
          setHasPendingRequest(reqData.status !== "completed");
        }
      });
      return () => unsubReq();
    }
  }, [isLoggedIn, phoneNumber]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...newFiles]);
      setPreviewUrls(prev => [...prev, ...newFiles.map(file => URL.createObjectURL(file))]);
    }
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
    if (hasPendingRequest || !location) return;
    setIsSending(true);

    // --- LOGIC: OFFLINE SMS FALLBACK ---
    if (!navigator.onLine) {
        const SOS_NUMBER = "0822654210"; // เบอร์ศูนย์กู้ภัย
        const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
        const activeNeeds = Object.entries(needs).filter(([_, v]) => v).map(([k]) => k).join(", ");
        
        const smsMessage = `SOS! ช่วยเหลือด่วน\nพิกัด: ${mapsUrl}\nระดับ: ${severity}\nเบอร์: ${phoneNumber}\nต้องการ: ${activeNeeds}\nเพิ่มเติม: ${note}`;

        alert(t.offlineNotice);
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const smsUrl = isIOS 
            ? `sms:${SOS_NUMBER}&body=${encodeURIComponent(smsMessage)}` 
            : `sms:${SOS_NUMBER}?body=${encodeURIComponent(smsMessage)}`;

        window.location.href = smsUrl;
        setIsSending(false);
        setShowConfirm(false);
        return;
    }

    // --- LOGIC: ONLINE FIREBASE UPLOAD ---
    try {
      const imageUrls = await uploadImages();
      await addDoc(collection(db, "requests"), {
        phone: phoneNumber,
        location: { lat: location.lat, lng: location.lng },
        needs, severity, vulnerable, note, imageUrls,
        status: "pending",
        timestamp: serverTimestamp(),
      });
      setImageFiles([]); setPreviewUrls([]); setNote(""); setShowConfirm(false);
    } catch (e: any) { 
        alert(e.message); 
    } finally { 
        setIsSending(false); 
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-zinc-800 p-8 rounded-[40px] border border-zinc-700 shadow-2xl">
          <div className="bg-yellow-500 w-20 h-20 rounded-3xl flex items-center justify-center text-black mx-auto mb-6 shadow-lg shadow-yellow-500/20"><Phone size={40} /></div>
          <h1 className="text-4xl font-black text-yellow-500 mb-2 italic tracking-tighter uppercase">SOS_Connect</h1>
          <p className="text-zinc-500 text-sm mb-8 font-bold">Register with phone number</p>
          <form onSubmit={(e) => { e.preventDefault(); if (phoneNumber.length >= 10) { localStorage.setItem("userPhone", phoneNumber); setIsLoggedIn(true); } }} className="space-y-4">
            <input type="tel" placeholder="08X-XXX-XXXX" className="w-full bg-zinc-900 border border-zinc-600 p-5 rounded-2xl text-2xl text-center outline-none focus:border-yellow-500 transition-all font-mono" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
            <button className="w-full bg-yellow-500 text-black font-black py-5 rounded-2xl text-xl hover:bg-yellow-400 active:scale-95 transition-transform">Register</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6 pb-24 font-sans flex flex-col items-center">
      {/* Header & Language Switch */}
      <div className="w-full flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-black text-yellow-500 italic uppercase tracking-tight">SOS_Connext</h1>
          <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-bold mt-1 tracking-wider"><UserCircle size={14} className="text-yellow-500/50" /> {phoneNumber}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className="flex bg-zinc-800 p-1 rounded-xl border border-zinc-700">
            {(['th', 'en'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${lang === l ? 'bg-yellow-500 text-black' : 'text-zinc-500'}`}>{l.toUpperCase()}</button>
            ))}
          </div>
          <div className={`px-4 py-1.5 rounded-full text-[9px] font-black border-2 transition-colors ${isOnline ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
            {isOnline ? "• ONLINE" : "• OFFLINE"}
          </div>
        </div>
      </div>

      {/* Live Status Bar */}
      {latestRequest && (
        <div className={`w-full mb-8 p-6 rounded-[32px] border transition-all ${latestRequest.status === 'completed' ? 'bg-green-500/10 border-green-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
          <div className="flex items-start gap-4">
            <div className={`p-4 rounded-2xl shrink-0 ${
              latestRequest.status === 'pending' ? 'bg-zinc-700 animate-pulse' :
              latestRequest.status === 'accepted' ? 'bg-blue-600' :
              latestRequest.status === 'dispatching' ? 'bg-orange-500 animate-bounce' :
              latestRequest.status === 'arrived' ? 'bg-red-500 animate-pulse' : 'bg-green-500'
            }`}>
              {latestRequest.status === 'pending' && <Clock size={24} />}
              {latestRequest.status === 'accepted' && <CheckCircle size={24} />}
              {latestRequest.status === 'dispatching' && <Truck size={24} />}
              {latestRequest.status === 'arrived' && <MapPin size={24} />}
              {latestRequest.status === 'completed' && <Heart size={24} />}
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-zinc-500 font-black uppercase mb-1 tracking-widest">{t.statusLabel}</p>
              <h3 className="text-xl font-black leading-none mb-2">{t.statusText[latestRequest.status as keyof typeof t.statusText]}</h3>
              {latestRequest.rescuerName && (
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold mt-2 pt-2 border-t border-blue-500/10">
                  <Navigation size={12} /> {latestRequest.rescuerName} 
                  {latestRequest.rescuerPhone && <span className="text-zinc-500 ml-1">({latestRequest.rescuerPhone})</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nearby Shelters */}
      <div className="w-full mb-8">
        <h3 className="text-[11px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2 mb-4 px-2"><Home size={14} className="text-yellow-500" /> {t.shelterHeader}</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
          {sortedShelters.map((s) => (
            <div key={s.id} className="min-w-[240px] bg-zinc-800/60 border border-zinc-700/50 p-4 rounded-[28px] snap-center backdrop-blur-md">
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500"><MapIcon size={20} /></div>
                <span className="text-[10px] font-black bg-zinc-900 text-green-400 px-3 py-1 rounded-full border border-zinc-700">{s.distance} km</span>
              </div>
              <h4 className="font-black text-sm mb-3 text-zinc-100 line-clamp-1">{s.name}</h4>
              <a href={`https://www.google.com/maps?q=${s.location.lat},${s.location.lng}`} target="_blank" rel="noopener noreferrer" className="w-full bg-zinc-700/50 py-2.5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase hover:bg-yellow-500 hover:text-black transition-all">
                <Navigation size={12} /> GO
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className={`w-full transition-all duration-700 ${hasPendingRequest ? 'opacity-30 blur-[2px] pointer-events-none scale-[0.98]' : 'opacity-100'}`}>
        {/* Severity */}
        <div className="w-full mb-6 text-center">
          <label className="text-[10px] font-black uppercase text-zinc-500 mb-3 block tracking-widest">{t.severityLabel}</label>
          <div className="grid grid-cols-3 gap-2">
            {(['normal', 'urgent', 'critical'] as const).map((lvl) => (
              <button key={lvl} onClick={() => setSeverity(lvl)} className={`py-4 rounded-2xl border-2 flex flex-col items-center transition-all ${severity === lvl ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : 'bg-zinc-800/40 border-transparent text-zinc-500'}`}>
                <span className="text-xl mb-1">{lvl === 'normal' ? '🟢' : lvl === 'urgent' ? '🟡' : '🔴'}</span>
                <span className="text-[10px] font-black uppercase">{t.severityText[lvl]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Vulnerable Group */}
        <div className="w-full mb-6 p-5 bg-zinc-800/40 rounded-[32px] border border-zinc-700/50">
          <h3 className="text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest flex items-center gap-2"><Users size={14} /> {t.vulnerableLabel}</h3>
          <div className="grid grid-cols-3 gap-4">
            <VulnerableCounter label={t.vulnerableText.elders} count={vulnerable.elders} onUpdate={(v: number) => setVulnerable({ ...vulnerable, elders: v })} />
            <VulnerableCounter label={t.vulnerableText.children} count={vulnerable.children} onUpdate={(v: number) => setVulnerable({ ...vulnerable, children: v })} />
            <VulnerableCounter label={t.vulnerableText.disabled} count={vulnerable.disabled} onUpdate={(v: number) => setVulnerable({ ...vulnerable, disabled: v })} />
          </div>
        </div>

        {/* Needs */}
        <div className="w-full mb-6 grid grid-cols-2 gap-3">
          <NeedCard label={t.needs.survival[0]} sub={t.needs.survival[1]} icon={<Droplets size={24} />} active={needs.survival} onClick={() => setNeeds({ ...needs, survival: !needs.survival })} />
          <NeedCard label={t.needs.medical[0]} sub={t.needs.medical[1]} icon={<Syringe size={24} />} active={needs.medical} onClick={() => setNeeds({ ...needs, medical: !needs.medical })} />
          <NeedCard label={t.needs.sanitary[0]} sub={t.needs.sanitary[1]} icon={<Sparkles size={24} />} active={needs.sanitary} onClick={() => setNeeds({ ...needs, sanitary: !needs.sanitary })} />
          <NeedCard label={t.needs.momAndBaby[0]} sub={t.needs.momAndBaby[1]} icon={<Baby size={24} />} active={needs.momAndBaby} highlight={vulnerable.children > 0} onClick={() => setNeeds({ ...needs, momAndBaby: !needs.momAndBaby })} />
        </div>

        {/* Note */}
        <div className="w-full mb-6 relative">
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 100))} placeholder={t.placeholder} className="w-full bg-zinc-800/40 border border-zinc-700/50 rounded-[28px] p-5 text-sm text-white outline-none focus:border-yellow-500/50 h-24" />
          <div className="absolute bottom-4 right-5 text-[10px] font-black text-zinc-600">{note.length}/100</div>
        </div>

        {/* Photo Upload */}
        <div className="w-full mb-8 bg-zinc-800/40 border-2 border-dashed border-zinc-700/50 rounded-[32px] p-5 flex flex-wrap gap-3">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative w-16 h-16"><img src={url} alt="P" className="w-full h-full object-cover rounded-2xl" /><button onClick={() => { setImageFiles(imageFiles.filter((_, i) => i !== index)); setPreviewUrls(previewUrls.filter((_, i) => i !== index)); }} className="absolute -top-2 -right-2 bg-red-600 p-1 rounded-full"><X size={10} /></button></div>
          ))}
          {previewUrls.length < 3 && (
            <label className="w-16 h-16 bg-zinc-700/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer border border-zinc-600 border-dashed"><PlusCircle size={20} className="text-yellow-500" /><input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} /></label>
          )}
          {previewUrls.length === 0 && <div className="flex-1 text-center py-2 opacity-40 text-[9px] font-black uppercase tracking-widest"><Camera size={20} className="mx-auto mb-1" />{t.addPhoto}</div>}
        </div>
      </div>

      {/* SOS MAIN BUTTON */}
      <div className="relative flex flex-col items-center justify-center w-full mb-10">
        <button
          disabled={isSending || hasPendingRequest || !location}
          onClick={() => setShowConfirm(true)}
          className={`w-48 h-48 rounded-full border-[12px] shadow-2xl flex flex-col items-center justify-center transition-all 
            ${hasPendingRequest 
              ? 'bg-zinc-700 border-zinc-800 shadow-none grayscale opacity-50' 
              : severity === 'critical' ? 'bg-red-600 animate-pulse border-red-900/30' : 'bg-orange-600 border-orange-900/30'
            } active:scale-90`}
        >
          {hasPendingRequest ? <CheckCircle size={44} className="text-zinc-500 mb-1" /> : <Zap size={44} fill="white" className="mb-1" />}
          <span className="text-sm font-black uppercase tracking-tighter text-center px-4">
            {isSending ? t.sosButton.sending : hasPendingRequest ? t.sosButton.pending : t.sosButton.send}
          </span>
        </button>
        {hasPendingRequest && <p className="mt-6 px-6 py-2 bg-zinc-800 rounded-full border border-zinc-700 text-[10px] text-zinc-400 font-bold uppercase">{t.pendingWarning}</p>}
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <div className="bg-zinc-800 w-full max-w-sm rounded-[48px] p-10 border border-zinc-700 text-center shadow-2xl">
            <div className={`p-6 rounded-full mx-auto mb-6 w-fit animate-pulse ${severity === 'critical' ? 'bg-red-600/20 text-red-500' : 'bg-yellow-600/20 text-yellow-500'}`}><AlertTriangle size={56} /></div>
            <h2 className="text-3xl font-black mb-4 tracking-tight uppercase">{t.modalTitle}</h2>
            <p className="text-zinc-400 text-sm mb-10 leading-relaxed font-medium">{t.modalSub}</p>
            <div className="space-y-4">
              <button disabled={isSending} onClick={confirmSend} className="w-full bg-red-600 py-6 rounded-[24px] font-black text-2xl shadow-xl active:scale-95 transition-all">
                  {!isOnline ? "ส่งผ่าน SMS" : t.modalConfirm}
              </button>
              <button onClick={() => setShowConfirm(false)} className="w-full bg-zinc-700/50 py-5 rounded-[24px] font-bold text-zinc-400">{t.modalCancel}</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-10 text-zinc-700 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:text-red-500 transition-colors"><LogOut size={14} /> Sign Out</button>
    </div>
  );
}

// --- Internal Components ---
function NeedCard({ label, sub, icon, active, onClick, highlight }: any) {
  return (
    <button onClick={onClick} className={`p-5 rounded-[32px] border-2 transition-all flex flex-col items-center text-center gap-1.5 ${active ? 'bg-yellow-500 border-yellow-400 text-black shadow-xl scale-[1.02]' : highlight ? 'bg-zinc-800/40 border-blue-500 animate-pulse text-zinc-400' : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400'}`}>
      <div className={`transition-colors ${active ? 'text-black' : 'text-yellow-500'}`}>{icon}</div>
      <span className="text-[14px] font-black uppercase tracking-tighter">{label}</span>
      <span className={`text-[10px] font-bold opacity-60 ${active ? 'text-black' : 'text-zinc-500'}`}>{sub}</span>
    </button>
  );
}

function VulnerableCounter({ label, count, onUpdate }: any) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-zinc-500 text-[9px] font-black uppercase">{label}</span>
      <div className="flex items-center gap-3 bg-zinc-900/80 p-2 rounded-2xl border border-zinc-700/50">
        <button onClick={() => onUpdate(Math.max(0, count - 1))} className="text-yellow-500 font-black w-6 h-6 flex items-center justify-center bg-zinc-800 rounded-lg">-</button>
        <span className="text-[16px] font-black w-4 text-center">{count}</span>
        <button onClick={() => onUpdate(count + 1)} className="text-yellow-500 font-black w-6 h-6 flex items-center justify-center bg-zinc-800 rounded-lg">+</button>
      </div>
    </div>
  );
}