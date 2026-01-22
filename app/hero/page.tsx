"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { 
    collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc, addDoc, serverTimestamp 
} from "firebase/firestore";
import {
    MapPin, Package, Clock, Droplets, Battery, Zap, Trash2, Lock, ShieldCheck, LogOut, Phone, AlertCircle, Home, Plus
} from 'lucide-react';
import dynamic from 'next/dynamic';

const HeroMap = dynamic(() => import('./HeroMap'), {
    ssr: false,
    loading: () => <div className="h-[400px] bg-slate-200 animate-pulse rounded-2xl flex items-center justify-center text-black">กำลังโหลดแผนที่...</div>
});

export default function HeroDashboard() {
    const [requests, setRequests] = useState<any[]>([]);
    const [shelters, setShelters] = useState<any[]>([]); // สำหรับเก็บศูนย์พักพิง
    const [prevCount, setPrevCount] = useState(0);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [accessCode, setAccessCode] = useState("");
    
    // State สำหรับฟอร์มเพิ่มศูนย์พักพิง
    const [newShelter, setNewShelter] = useState({ name: '', lat: '', lng: '' });
    
    const MASTER_CODE = "HERO2026";

    useEffect(() => {
        const authStatus = localStorage.getItem("heroAuth");
        if (authStatus === "true") setIsAuthorized(true);

        if (isAuthorized) {
            // 1. ดึงข้อมูล Requests (คำขอความช่วยเหลือ)
            const qReq = query(collection(db, "requests"), orderBy("timestamp", "desc"));
            const unsubReq = onSnapshot(qReq, (snap) => {
                const data: any[] = [];
                snap.forEach((doc) => {
                    const dataDoc = doc.data();
                    const items = dataDoc.items;
                    let priority = 3;
                    let label = "ปกติ";
                    let colorClass = "bg-blue-600";

                    if (items.medicine > 0) { priority = 1; label = "วิกฤต"; colorClass = "bg-red-600"; }
                    else if (items.battery > 0) { priority = 2; label = "เร่งด่วน"; colorClass = "bg-yellow-500"; }
                    else { priority = 3; label = "ปกติ"; colorClass = "bg-blue-600"; }

                    data.push({ id: doc.id, ...dataDoc, priority, priorityLabel: label, priorityColor: colorClass });
                });

                if (data.length > prevCount && prevCount !== 0) {
                    new Audio('alert.mp3').play().catch(() => {});
                }
                setPrevCount(data.length);
                setRequests(data.sort((a, b) => (a.status === 'completed' ? 1 : b.status === 'completed' ? -1 : a.priority - b.priority)));
            });

            // 2. ดึงข้อมูล Shelters (ศูนย์พักพิง)
            const qShelter = query(collection(db, "shelters"), orderBy("timestamp", "desc"));
            const unsubShelter = onSnapshot(qShelter, (snap) => {
                const sData: any[] = [];
                snap.forEach(doc => sData.push({ id: doc.id, ...doc.data() }));
                setShelters(sData);
            });

            return () => { unsubReq(); unsubShelter(); };
        }
    }, [isAuthorized, prevCount]);

    // --- ฟังก์ชันจัดการข้อมูล ---
    const handleAddShelter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newShelter.name || !newShelter.lat || !newShelter.lng) return alert("กรุณากรอกข้อมูลให้ครบ");
        await addDoc(collection(db, "shelters"), {
            name: newShelter.name,
            location: { lat: parseFloat(newShelter.lat), lng: parseFloat(newShelter.lng) },
            timestamp: serverTimestamp()
        });
        setNewShelter({ name: '', lat: '', lng: '' });
        alert("เพิ่มศูนย์พักพิงสำเร็จ");
    };

    const deleteShelter = async (id: string) => {
        if (confirm("ลบศูนย์พักพิงนี้?")) await deleteDoc(doc(db, "shelters", id));
    };

    const deleteCompletedRequests = async () => {
        const completed = requests.filter(r => r.status === 'completed');
        if (completed.length === 0) return alert("ไม่มีรายการให้ลบ");
        if (confirm(`ลบรายการสำเร็จแล้ว ${completed.length} รายการ?`)) {
            await Promise.all(completed.map(req => deleteDoc(doc(db, "requests", req.id))));
        }
    };

    const updateStatus = async (id: string, s: string) => {
        await updateDoc(doc(db, "requests", id), { status: s });
    };

    const handleDeleteReq = async (id: string) => {
        if (confirm("ยืนยันการลบข้อมูลถาวร?")) await deleteDoc(doc(db, "requests", id));
    };

    const handleLogin = (e: any) => {
        e.preventDefault();
        if (accessCode === MASTER_CODE) { localStorage.setItem("heroAuth", "true"); setIsAuthorized(true); }
        else { alert("รหัสผ่านไม่ถูกต้อง"); }
    };

    const totals = requests.reduce((acc, curr) => {
        if (curr.status === 'pending') {
            acc.w += curr.items.water || 0; acc.f += curr.items.food || 0;
            acc.b += curr.items.battery || 0; acc.m += curr.items.medicine || 0;
        }
        return acc;
    }, { w: 0, f: 0, b: 0, m: 0 });

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-black">
                <div className="w-full max-w-md bg-white rounded-[32px] p-10 shadow-2xl text-center">
                    <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center text-white mx-auto mb-6"><Lock size={40} /></div>
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Hero_Connext</h1>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="password" placeholder="รหัสผ่านเจ้าหน้าที่" className="w-full bg-slate-100 p-5 rounded-2xl text-center text-xl outline-none text-black font-mono border-2 border-transparent focus:border-blue-500" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} required />
                        <button className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl text-xl hover:bg-blue-700 transition-all">เข้าสู่ระบบ</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            {/* Header & Stats */}
            <header className="mb-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-2 rounded-xl text-white relative">
                        <ShieldCheck size={32} /><span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping"></span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">Hero_Connext</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase">Rescue Center</p>
                    </div>
                </div>
                <button onClick={() => { localStorage.removeItem("heroAuth"); location.reload(); }} className="text-slate-400 hover:text-red-500 font-bold flex items-center gap-2"><LogOut size={20} /> ออกจากระบบ</button>
            </header>

            <section className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="น้ำดื่ม" count={totals.w} unit="ขวด" color="bg-blue-500" icon={<Droplets size={20} />} />
                <StatCard label="อาหาร" count={totals.f} unit="ชุด" color="bg-orange-500" icon={<Package size={20} />} />
                <StatCard label="แบต" count={totals.b} unit="เครื่อง" color="bg-yellow-600" icon={<Battery size={20} />} />
                <StatCard label="ยา" count={totals.m} unit="ชุด" color="bg-red-600" icon={<Zap size={20} />} />
            </section>

            {/* Map Section */}
            <section className="mb-10 bg-white p-2 rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                <HeroMap requests={requests} shelters={shelters} /> 
            </section>

            {/* Shelter Management Section */}
            <div className="mb-12 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-green-100 p-2 rounded-lg text-green-600"><Home size={24}/></div>
                    <h2 className="text-2xl font-black text-slate-800 italic uppercase">Manage Shelters</h2>
                </div>
                
                <form onSubmit={handleAddShelter} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-6 rounded-2xl">
                    <input placeholder="ชื่อศูนย์พักพิง" className="p-3 rounded-xl border-none ring-1 ring-slate-200" value={newShelter.name} onChange={e => setNewShelter({...newShelter, name: e.target.value})} />
                    <input placeholder="Latitude" className="p-3 rounded-xl border-none ring-1 ring-slate-200" value={newShelter.lat} onChange={e => setNewShelter({...newShelter, lat: e.target.value})} />
                    <input placeholder="Longitude" className="p-3 rounded-xl border-none ring-1 ring-slate-200" value={newShelter.lng} onChange={e => setNewShelter({...newShelter, lng: e.target.value})} />
                    <button className="bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-all"><Plus size={18}/> เพิ่มศูนย์พักพิง</button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {shelters.map(s => (
                        <div key={s.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl bg-white hover:shadow-md transition-shadow">
                            <div>
                                <p className="font-bold text-slate-800">{s.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{s.location.lat.toFixed(4)}, {s.location.lng.toFixed(4)}</p>
                            </div>
                            <button onClick={() => deleteShelter(s.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Case Dashboard Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Case Dashboard</h2>
                <div className="flex items-center gap-3">
                    <button onClick={deleteCompletedRequests} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-100 border border-red-100"><Trash2 size={14} /> ล้างเคสที่สำเร็จ</button>
                    <div className="flex bg-slate-200 p-1 rounded-xl">
                        {(['all', 'pending', 'completed'] as const).map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === s ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{s === 'all' ? 'ทั้งหมด' : s === 'pending' ? 'รอช่วย' : 'สำเร็จ'}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {requests.filter(r => filterStatus === 'all' ? true : r.status === filterStatus).map((req) => (
                    <div key={req.id} className={`bg-white p-6 rounded-[28px] border-2 transition-all ${req.status === 'completed' ? 'opacity-60 border-transparent' : req.priority === 1 ? 'border-red-500 shadow-lg shadow-red-100' : req.priority === 2 ? 'border-yellow-400 shadow-md shadow-yellow-50' : 'border-blue-100'}`}>
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase text-white ${req.status === 'completed' ? 'bg-slate-400' : req.priorityColor} ${req.priority === 1 && req.status !== 'completed' ? 'animate-pulse' : ''}`}>
                                        {req.status === 'completed' ? '✓ สำเร็จ' : <><AlertCircle size={12} />{req.priorityLabel}</>}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">ID: {req.id.slice(-6).toUpperCase()}</span>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4 font-bold text-sm">
                                    {req.items.water > 0 && <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">น้ำ: {req.items.water}</span>}
                                    {req.items.food > 0 && <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-lg">อาหาร: {req.items.food}</span>}
                                    {req.items.battery > 0 && <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-lg border border-yellow-200">แบต: {req.items.battery}</span>}
                                    {req.items.medicine > 0 && <span className="bg-red-50 text-red-700 px-3 py-1 rounded-lg border border-red-200 italic">ยา: {req.items.medicine}</span>}
                                </div>
                                <div className="text-xs font-bold text-slate-500 flex items-center gap-4">
                                    <span className="flex items-center gap-1"><Clock size={14} /> {req.timestamp?.toDate().toLocaleTimeString()}</span>
                                    <span className="flex items-center gap-1 text-blue-600 font-black"><Phone size={14} /> {req.phone}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <a href={`https://www.google.com/maps?q=${req.location.lat},${req.location.lng}`} target="_blank" className="bg-slate-100 p-4 rounded-2xl text-blue-600 hover:bg-blue-50"><MapPin size={24} /></a>
                                {req.status === 'pending' ?
                                    <button onClick={() => updateStatus(req.id, 'completed')} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">ยืนยันการช่วย</button> :
                                    <button onClick={() => updateStatus(req.id, 'pending')} className="bg-slate-200 text-slate-600 px-6 py-4 rounded-2xl font-bold">กู้คืน</button>
                                }
                                <button onClick={() => handleDeleteReq(req.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={20} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatCard({ label, count, unit, color, icon }: any) {
    return (
        <div className={`${color} text-white p-6 rounded-[28px] shadow-lg shadow-current/20`}>
            <div className="flex items-center gap-2 opacity-80 mb-2 font-bold text-[10px] uppercase tracking-widest">{icon} {label}</div>
            <div className="flex items-baseline gap-1"><span className="text-4xl font-black">{count}</span><span className="text-xs font-bold opacity-80">{unit}</span></div>
        </div>
    );
}