"use client";
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { 
    collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc, addDoc, serverTimestamp 
} from "firebase/firestore";
import {
    MapPin, Package, Clock, Droplets, Zap, Trash2, Lock, ShieldCheck, LogOut, 
    Phone, AlertCircle, Maximize2, CheckCircle2, ChevronRight, Image as ImageIcon,
    MessageSquare, Users, Baby, Accessibility, Sparkles, Syringe, X as CloseIcon,
    Home, Plus, Map, Volume2, VolumeX
} from 'lucide-react';
import dynamic from 'next/dynamic';

// โหลด Map แบบ Dynamic เพื่อเลี่ยงปัญหา SSR
const HeroMap = dynamic(() => import('./HeroMap'), {
    ssr: false,
    loading: () => <div className="h-[450px] bg-slate-200 animate-pulse rounded-[40px] flex items-center justify-center text-slate-400 font-bold border-2 border-dashed border-slate-300">กำลังเชื่อมต่อระบบแผนที่ดาวเทียม...</div>
});

export default function HeroDashboard() {
    const [requests, setRequests] = useState<any[]>([]);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [accessCode, setAccessCode] = useState("");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
    
    // --- State สำหรับ Shelter ---
    const [shelters, setShelters] = useState<any[]>([]);
    const [newShelter, setNewShelter] = useState({ name: "", lat: "", lng: "" });
    const [isAddingShelter, setIsAddingShelter] = useState(false);
    
    // --- Refs สำหรับระบบ Real-time & Audio ---
    const isFirstLoad = useRef(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const MASTER_CODE = "HERO2026";

    useEffect(() => {
        // เตรียมไฟล์เสียงแจ้งเตือน
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

        const authStatus = localStorage.getItem("heroAuth");
        if (authStatus === "true") setIsAuthorized(true);

        if (isAuthorized) {
            // 1. ฟังข้อมูล Requests แบบ Real-time
            const qReq = query(collection(db, "requests"), orderBy("timestamp", "desc"));
            const unsubReq = onSnapshot(qReq, (snap) => {
                const data: any[] = [];
                let hasNewItem = false;

                snap.docChanges().forEach((change) => {
                    if (change.type === "added") hasNewItem = true;
                });

                snap.forEach((doc) => {
                    const d = doc.data();
                    let priorityScore = 3; 
                    let label = "ปกติ";
                    let colorClass = "bg-emerald-500";
                    
                    if (d.severity === 'critical') { 
                        priorityScore = 1; label = "วิกฤต"; colorClass = "bg-rose-600 animate-pulse"; 
                    } else if (d.severity === 'urgent') { 
                        priorityScore = 2; label = "เร่งด่วน"; colorClass = "bg-amber-500"; 
                    }
                    
                    data.push({ 
                        id: doc.id, 
                        ...d, 
                        priorityScore, 
                        priorityLabel: label, 
                        priorityColor: colorClass 
                    });
                });

                // เล่นเสียงถ้ามีเคสใหม่ (และไม่ใช่การโหลดหน้าเว็บครั้งแรก)
                if (!isFirstLoad.current && hasNewItem && isNotificationEnabled) {
                    audioRef.current?.play().catch(() => console.log("Audio Play Blocked by Browser"));
                }

                setRequests(data.sort((a, b) => {
                    if (a.status !== b.status) return a.status === 'completed' ? 1 : -1;
                    return a.priorityScore - b.priorityScore;
                }));
                
                isFirstLoad.current = false;
            });

            // 2. ฟังข้อมูล Shelters แบบ Real-time
            const qShelter = query(collection(db, "shelters"), orderBy("timestamp", "desc"));
            const unsubShelter = onSnapshot(qShelter, (snap) => {
                setShelters(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });

            return () => { unsubReq(); unsubShelter(); };
        }
    }, [isAuthorized, isNotificationEnabled]);

    // --- Functions ---
    const handleAddShelter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newShelter.name || !newShelter.lat || !newShelter.lng) return alert("กรุณากรอกข้อมูลให้ครบ");
        try {
            await addDoc(collection(db, "shelters"), {
                name: newShelter.name,
                location: { lat: parseFloat(newShelter.lat), lng: parseFloat(newShelter.lng) },
                timestamp: serverTimestamp()
            });
            setNewShelter({ name: "", lat: "", lng: "" });
            setIsAddingShelter(false);
        } catch (err) { alert("เกิดข้อผิดพลาด"); }
    };

    const deleteShelter = async (id: string) => {
        if (confirm("ต้องการลบศูนย์พักพิงนี้ใช่หรือไม่?")) await deleteDoc(doc(db, "shelters", id));
    };

    const updateStatus = async (id: string, s: string) => { 
        await updateDoc(doc(db, "requests", id), { status: s }); 
    };

    const handleDeleteReq = async (id: string) => { 
        if (confirm("ยืนยันการลบข้อมูลถาวร?")) await deleteDoc(doc(db, "requests", id)); 
    };

    const handleLogin = (e: any) => {
        e.preventDefault();
        if (accessCode === MASTER_CODE) { 
            localStorage.setItem("heroAuth", "true"); 
            setIsAuthorized(true); 
        } else { alert("รหัสผ่านไม่ถูกต้อง"); }
    };

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-black">
                <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl text-center">
                    <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-500/20">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tighter italic">HERO LOGIN</h1>
                    <p className="text-slate-400 mb-8 font-bold text-[10px] uppercase tracking-widest">เฉพาะเจ้าหน้าที่กู้ภัยเท่านั้น</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="password" placeholder="รหัสผ่านเจ้าหน้าที่" className="w-full bg-slate-50 p-6 rounded-[24px] text-center text-2xl outline-none text-blue-600 font-mono border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} required />
                        <button className="w-full bg-blue-600 text-white font-black py-6 rounded-[24px] text-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">เข้าสู่ระบบปฏิบัติการ</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
            {/* Nav Bar */}
            <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-[50] border-b border-slate-100 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-200"><ShieldCheck size={24} /></div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tighter italic uppercase hidden md:block">Hero_Panel</h1>
                        
                        {/* ปุ่มเปิดเสียงแจ้งเตือน */}
                        <button 
                            onClick={() => setIsNotificationEnabled(!isNotificationEnabled)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase transition-all ${
                                isNotificationEnabled 
                                ? 'bg-emerald-500 text-white shadow-md' 
                                : 'bg-slate-100 text-slate-400'
                            }`}
                        >
                            {isNotificationEnabled ? <Volume2 size={14}/> : <VolumeX size={14}/>}
                            {isNotificationEnabled ? "ระบบแจ้งเตือนเปิดอยู่" : "ปิดเสียงแจ้งเตือน"}
                        </button>
                    </div>
                    <button onClick={() => { localStorage.removeItem("heroAuth"); location.reload(); }} className="text-slate-400 hover:text-red-500 font-bold flex items-center gap-2 transition-all text-xs uppercase tracking-widest"><LogOut size={18} /> Logout</button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-4 md:p-6">
                
                {/* --- Shelter Section --- */}
                <div className="mb-10 mt-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tighter italic uppercase flex items-center gap-2">
                                <Home className="text-blue-600" /> Shelter Management
                            </h2>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">จุดพักพิงปลอดภัยและโรงครัวอาสา</p>
                        </div>
                        <button onClick={() => setIsAddingShelter(!isAddingShelter)} className="w-full md:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-xl shadow-blue-100">
                            {isAddingShelter ? <CloseIcon size={16}/> : <Plus size={16}/>} 
                            {isAddingShelter ? "ปิดหน้าต่าง" : "เพิ่มศูนย์พักพิง"}
                        </button>
                    </div>

                    {isAddingShelter && (
                        <div className="bg-white p-8 rounded-[40px] border-2 border-blue-50 mb-8 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                            <form onSubmit={handleAddShelter} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">ชื่อสถานที่</label>
                                    <input type="text" placeholder="เช่น วัด / รร. / หอประชุม" className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-blue-500 transition-all border border-slate-100 font-bold" value={newShelter.name} onChange={(e) => setNewShelter({...newShelter, name: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Latitude</label>
                                    <input type="number" step="any" placeholder="13.XXXX" className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-mono" value={newShelter.lat} onChange={(e) => setNewShelter({...newShelter, lat: e.target.value})} />
                                </div>
                                <div className="flex gap-2 items-end">
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Longitude</label>
                                        <input type="number" step="any" placeholder="100.XXXX" className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-mono" value={newShelter.lng} onChange={(e) => setNewShelter({...newShelter, lng: e.target.value})} />
                                    </div>
                                    <button type="submit" className="bg-slate-900 text-white p-4.5 rounded-2xl hover:bg-emerald-500 transition-colors shadow-lg">
                                        <CheckCircle2 size={24} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-2 px-2">
                        {shelters.map((s) => (
                            <div key={s.id} className="min-w-[300px] bg-white p-6 rounded-[35px] border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><Map size={20}/></div>
                                        <button onClick={() => deleteShelter(s.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={18}/></button>
                                    </div>
                                    <h4 className="font-black text-slate-800 text-lg mb-2 truncate">{s.name}</h4>
                                    <div className="flex gap-4">
                                        <div className="text-[9px] text-slate-400 font-mono uppercase">Lat: {s.location.lat.toFixed(4)}</div>
                                        <div className="text-[9px] text-slate-400 font-mono uppercase">Lng: {s.location.lng.toFixed(4)}</div>
                                    </div>
                                </div>
                                <a 
                                    href={`https://www.google.com/maps?q=${s.location.lat},${s.location.lng}`} 
                                    target="_blank" 
                                    className="mt-6 flex items-center justify-center gap-2 bg-slate-50 py-3 rounded-2xl text-[10px] font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all uppercase tracking-tighter"
                                >
                                    ตรวจสอบพิกัด <ChevronRight size={14}/>
                                </a>
                            </div>
                        ))}
                    </div>
                </div>

                <hr className="border-slate-200/60 mb-10" />

                {/* --- Requests Header --- */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                    <div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic uppercase leading-none mb-2">Live Requests</h2>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">ศูนย์บริหารจัดการเหตุการณ์แบบเรียลไทม์</p>
                    </div>
                    <div className="flex bg-white p-1.5 rounded-[25px] shadow-sm border border-slate-100 w-full lg:w-auto">
                        {(['all', 'pending', 'completed'] as const).map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)} className={`flex-1 lg:flex-none px-8 py-3 rounded-[20px] text-[10px] font-black uppercase transition-all ${filterStatus === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
                                {s === 'all' ? 'ทั้งหมด' : s === 'pending' ? 'รอช่วยเหลือ' : 'สำเร็จแล้ว'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Map Section */}
                <div className="mb-10 bg-white p-2 rounded-[45px] border border-slate-100 shadow-2xl overflow-hidden relative z-10">
                    <HeroMap 
                        requests={requests.filter(r => r.status === 'pending')} 
                        shelters={shelters}
                    /> 
                </div>

                {/* Case Grid */}
                <div className="grid gap-8">
                    {requests.filter(r => filterStatus === 'all' ? true : r.status === filterStatus).map((req) => (
                        <div key={req.id} className={`bg-white rounded-[45px] border-2 transition-all duration-500 overflow-hidden ${req.status === 'completed' ? 'opacity-60 border-transparent grayscale-[0.5]' : req.severity === 'critical' ? 'border-rose-500 shadow-[0_20px_50px_rgba(244,63,94,0.15)]' : 'border-slate-100 shadow-xl shadow-slate-200/40'}`}>
                            <div className="flex flex-col lg:flex-row">
                                
                                {/* Photo Side */}
                                <div className="lg:w-80 w-full bg-slate-50 p-8 flex flex-col border-r border-slate-100">
                                    <div className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center justify-between tracking-widest">
                                        <span className="flex items-center gap-2"><ImageIcon size={14}/> Evidence</span>
                                        <span className="bg-slate-200 px-2.5 py-1 rounded-lg text-slate-600">{(req.imageUrls?.length || 0)}</span>
                                    </div>
                                    <div className="flex lg:flex-col gap-4 overflow-x-auto no-scrollbar snap-x">
                                        {req.imageUrls && req.imageUrls.length > 0 ? (
                                            req.imageUrls.map((img: string, idx: number) => (
                                                <div key={idx} className="relative group flex-shrink-0 w-36 lg:w-full h-36 rounded-[30px] overflow-hidden cursor-pointer snap-center shadow-lg border-4 border-white transition-transform hover:rotate-2" onClick={() => setSelectedImage(img)}>
                                                    <img src={img} className="w-full h-full object-cover" alt="Incident" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Maximize2 className="text-white" size={24} />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="w-full h-40 rounded-[30px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 italic bg-white">
                                                <ImageIcon size={40} strokeWidth={1} />
                                                <span className="text-[9px] font-black mt-2 uppercase tracking-widest">No Photos</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Content Side */}
                                <div className="flex-1 p-8 lg:p-12 relative">
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
                                        <div className="space-y-4">
                                            <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg ${req.status === 'completed' ? 'bg-slate-400' : req.priorityColor}`}>
                                                {req.severity === 'critical' && <AlertCircle size={14} className="animate-spin-slow"/>}
                                                {req.status === 'completed' ? 'สำเร็จภารกิจ' : req.priorityLabel}
                                            </div>
                                            <h3 className="text-4xl font-black text-slate-800 flex items-center gap-4 tracking-tighter">
                                                <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><Phone size={28} /></div>
                                                {req.phone}
                                            </h3>
                                            <div className="flex items-center gap-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                                <Clock size={14} className="text-blue-500"/> {req.timestamp?.toDate().toLocaleString('th-TH')}
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteReq(req.id)} className="text-slate-300 hover:text-rose-500 transition-all p-4 hover:bg-rose-50 rounded-[25px]">
                                            <Trash2 size={24} />
                                        </button>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex flex-wrap gap-3 mb-10">
                                        <VulnerableBadge icon={<Users size={16}/>} count={req.vulnerable?.elders} label="ผู้สูงอายุ" activeColor="bg-slate-800 text-white shadow-md" />
                                        <VulnerableBadge icon={<Baby size={16}/>} count={req.vulnerable?.children} label="เด็กเล็ก" activeColor="bg-blue-500 text-white shadow-md" />
                                        <VulnerableBadge icon={<Accessibility size={16}/>} count={req.vulnerable?.disabled} label="ผู้พิการ" activeColor="bg-purple-600 text-white shadow-md" />
                                    </div>

                                    {/* Items */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                                        <ItemTag label="ชุดยังชีพ" active={req.needs?.survival} icon={<Droplets size={18}/>} activeColor="bg-amber-50 text-amber-700 border-amber-200" />
                                        <ItemTag label="ยารักษาโรค" active={req.needs?.medical} icon={<Syringe size={18}/>} activeColor="bg-rose-50 text-rose-700 border-rose-200" />
                                        <ItemTag label="สุขอนามัย" active={req.needs?.sanitary} icon={<Sparkles size={18}/>} activeColor="bg-emerald-50 text-emerald-700 border-emerald-200" />
                                        <ItemTag label="แม่และเด็ก" active={req.needs?.momAndBaby} icon={<Baby size={18}/>} activeColor="bg-blue-50 text-blue-700 border-blue-200" />
                                    </div>

                                    {/* Message */}
                                    {req.note && (
                                        <div className="bg-slate-50 border border-slate-100 rounded-[35px] p-8 mb-10 relative">
                                            <MessageSquare size={20} className="text-blue-500 absolute top-6 left-6" />
                                            <p className="text-slate-700 text-lg font-bold pl-10 leading-relaxed italic">"{req.note}"</p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-10 border-t border-slate-100/60">
                                        <a 
                                            href={`https://www.google.com/maps?q=${req.location.lat},${req.location.lng}`} 
                                            target="_blank" 
                                            className="flex items-center gap-3 text-blue-600 font-black text-sm hover:translate-x-2 transition-transform group"
                                        >
                                            <div className="bg-blue-600 text-white p-3.5 rounded-2xl shadow-lg shadow-blue-200 group-hover:bg-slate-900 transition-colors">
                                                <NavigationIcon size={24} />
                                            </div>
                                            เริ่มนำทางกู้ภัย <ChevronRight size={18}/>
                                        </a>
                                        <div className="flex w-full sm:w-auto gap-4">
                                            {req.status === 'pending' ? (
                                                <button onClick={() => updateStatus(req.id, 'completed')} className="flex-1 sm:flex-none bg-slate-900 text-white px-14 py-5 rounded-[25px] font-black text-sm flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all shadow-xl hover:shadow-emerald-200">
                                                    <CheckCircle2 size={24} /> เสร็จสิ้นภารกิจ
                                                </button>
                                            ) : (
                                                <button onClick={() => updateStatus(req.id, 'pending')} className="flex-1 sm:flex-none bg-white border-2 border-slate-100 text-slate-400 px-14 py-5 rounded-[25px] font-black text-sm hover:bg-slate-50 transition-all">
                                                    กู้คืนรายการ
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Lightbox */}
            {selectedImage && (
                <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-6 cursor-zoom-out animate-in fade-in duration-300" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-5xl w-full flex items-center justify-center">
                        <button className="absolute -top-14 right-0 text-white flex items-center gap-2 font-black uppercase text-xs tracking-widest bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full transition-all">
                            Close <CloseIcon size={24}/>
                        </button>
                        <img src={selectedImage} className="max-w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl animate-in zoom-in-95 duration-500" alt="Preview" onClick={(e) => e.stopPropagation()} />
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Helper Components ---
function VulnerableBadge({ icon, count, label, activeColor }: any) {
    if (!count || count === 0) return null;
    return (
        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-[12px] uppercase tracking-tighter ${activeColor}`}>
            {icon} {count} {label}
        </div>
    );
}

function ItemTag({ label, active, icon, activeColor }: any) {
    return (
        <div className={`flex items-center gap-4 p-5 rounded-[30px] border-2 transition-all ${active ? `${activeColor} shadow-md border-current/10` : 'bg-slate-50 text-slate-300 border-slate-100 opacity-40 grayscale'}`}>
            <span className={active ? "animate-bounce" : ""}>{icon}</span>
            <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-tighter leading-none mb-1">{label}</span>
                <span className="text-xs font-black italic">{active ? 'YES' : 'NO'}</span>
            </div>
        </div>
    );
}

function NavigationIcon({ size }: { size: number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>;
}