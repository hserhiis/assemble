"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    Loader2, LogOut, Users, Euro, Package,
    Calendar, Clock, Trash2, Phone, Save,
    ChevronRight, ShieldCheck, Filter, Search,
    ExternalLink, Activity, Database, TrendingUp,
    Zap, Timer, Hash, UserPlus, UserCheck,
    Copy, CheckCircle2, AlertCircle, Terminal, Eye, X, Settings
} from 'lucide-react';
import {cn} from "@/lib/utils";

// Инициализация Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Конфигурация статусов
const STATUS_MAP: any = {
    pending: {
        label: 'Pending',
        bg: 'bg-amber-500/10',
        text: 'text-amber-500',
        border: 'border-amber-500/20',
        icon: Clock
    },
    confirmed: {
        label: 'Confirmed',
        bg: 'bg-yellow',
        text: 'text-white-500',
        border: 'border-white-500/20',
        icon: Eye
    },
    active: {
        label: 'Active',
        bg: 'bg-blue-500/10',
        text: 'text-blue-500',
        border: 'border-blue-500/20',
        icon: Activity
    },
    done: {
        label: 'Done',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-500',
        border: 'border-emerald-500/20',
        icon: ShieldCheck
    }
};

const TIME_SLOTS: any = {
    s1: '09:00',
    s2: '13:30',
    s3: '17:30'
};

export default function AdminPage() {
    const [session, setSession] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [pricing, setPricing] = useState({ initial: 40, extra: 25 });
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // UI States
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterSlot, setFilterSlot] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isResetMode, setIsResetMode] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchAllData();
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Auth Event:", event); // Посмотри в консоль, прилетает ли PASSWORD_RECOVERY

            if (event === "PASSWORD_RECOVERY") {
                setIsResetMode(true);
            }

            setSession(session);
            if (session) fetchAllData();
        });

        return () => subscription.unsubscribe();
    }, []);

    async function fetchAllData() {
        setIsSyncing(true);
        try {
            const [bookingsRes, staffRes, settingsRes] = await Promise.all([
                supabase.from('bookings').select('*').order('target_date', { ascending: true }),
                supabase.from('staff').select('*'),
                supabase.from('settings').select('*').eq('id', 'pricing').single()
            ]);

            setOrders(bookingsRes.data || []);
            setStaff(staffRes.data || []);
            if (settingsRes.data) {
                setPricing({
                    initial: settingsRes.data.initial_price,
                    extra: settingsRes.data.extra_price
                });
            }
        } catch (err) {
            console.error("Data fetch error", err);
        } finally {
            setTimeout(() => setIsSyncing(false), 800);
        }
    }

    // Фильтрация
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchStatus = filterStatus === 'all' || order.status === filterStatus;
            const matchSlot = filterSlot === 'all' || order.slot_id === filterSlot;
            const matchSearch = (order.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.phone || '').includes(searchTerm);
            return matchStatus && matchSlot && matchSearch;
        });
    }, [orders, filterStatus, filterSlot, searchTerm]);

    // Обновление статуса
    const updateOrderStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id);
        if (!error) setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    };

    // НОВАЯ ФИЧА: Назначение исполнителя
    const assignUnit = async (orderId: string, unitName: string) => {
        const isUnassigned = unitName === 'unassigned';
        const newStatus = !isUnassigned ? 'confirmed' : 'pending';

        const { error } = await supabase
            .from('bookings')
            .update({
                assigned_to: isUnassigned ? null : unitName,
                status: newStatus
            })
            .eq('id', orderId);

        if (!error) {
            setOrders(prev => prev.map(o =>
                o.id === orderId ? { ...o, assigned_to: isUnassigned ? null : unitName, status: newStatus } : o
            ));
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
            <div className="relative">
                <Loader2 className="animate-spin text-blue-600" size={50} />
                <div className="absolute inset-0 blur-xl bg-blue-600/20 animate-pulse"></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500">Decrypting Environment</span>
        </div>
    );

    if (!session || isResetMode) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans antialiased">
                <div className="w-full max-w-[400px] bg-[#0A0A0A] rounded-[40px] p-10 border border-white/5 shadow-[0_0_100px_rgba(0,0,0,1)]">

                    {/* Header (динамический) */}
                    <div className="flex flex-col items-center mb-10">
                        <div className={cn(
                            "w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-700",
                            isResetMode ? "bg-emerald-600 rotate-0" : "bg-blue-600 rotate-3"
                        )}>
                            {isResetMode ? <ShieldCheck size={40} className="text-white" /> : <Zap size={40} className="text-white fill-white" />}
                        </div>
                        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                            {isResetMode ? 'Secure Reset' : 'Assemble OS'}
                        </h1>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-2 text-center">
                            {isResetMode ? 'Establish new identity credentials' : 'Administrative Access Only'}
                        </p>
                    </div>

                    {/* Forms Logic */}
                    {isResetMode ? (
                        /* FORM: RESET PASSWORD */
                        <form onSubmit={async (e: any) => {
                            e.preventDefault();
                            const newPass = e.target.new_password.value;
                            const { error } = await supabase.auth.updateUser({ password: newPass });
                            if (error) alert(error.message);
                            else {
                                alert("Identity updated. Access granted.");
                                setIsResetMode(false);
                                window.location.hash = "";
                            }
                        }} className="space-y-4 animate-in fade-in zoom-in duration-500">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-zinc-700 uppercase ml-4">New Passkey</label>
                                <input name="new_password" type="password" placeholder="••••••••" required className="w-full px-6 py-4 bg-black border border-white/5 rounded-2xl focus:border-emerald-500 transition-all outline-none text-sm text-white font-medium" />
                            </div>
                            <button className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all active:scale-[0.97]">
                                Update & Authorize
                            </button>
                        </form>
                    ) : (
                        /* FORM: LOGIN */
                        <form onSubmit={async (e: any) => {
                            e.preventDefault();
                            const { error } = await supabase.auth.signInWithPassword({
                                email: e.target.email.value,
                                password: e.target.password.value
                            });
                            if (error) alert(error.message);
                        }} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-zinc-700 uppercase ml-4">Identity</label>
                                <input name="email" type="email" placeholder="root@system.ee" required className="w-full px-6 py-4 bg-black border border-white/5 rounded-2xl focus:border-blue-500 transition-all outline-none text-sm text-white font-medium shadow-inner" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-zinc-700 uppercase ml-4">Passkey</label>
                                <input name="password" type="password" placeholder="••••••••" required className="w-full px-6 py-4 bg-black border border-white/5 rounded-2xl focus:border-blue-500 transition-all outline-none text-sm text-white font-medium shadow-inner" />
                            </div>
                            <button className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-zinc-200 transition-all active:scale-[0.97] mt-4 shadow-xl shadow-white/5">
                                Authorize Session
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    const email = (document.getElementsByName('email')[0] as HTMLInputElement).value;
                                    if (!email) return alert("Enter identity email first");
                                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                                        redirectTo: window.location.href // Ссылка вернет юзера прямо сюда
                                    });
                                    if (error) alert(error.message);
                                    else alert("Reset link dispatched to your secure terminal.");
                                }}
                                className="w-full text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] hover:text-zinc-400 transition-colors pt-2 text-center"
                            >
                                Forgot Passkey?
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-[#E4E4E7] font-sans antialiased selection:bg-blue-500/30">
            {/* Nav */}
            <nav className="sticky top-0 z-[100] bg-black/60 backdrop-blur-xl border-b border-white/[0.05]">
                <div className="max-w-[1800px] mx-auto px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-10">
                        <div className="flex items-center gap-3 group cursor-pointer">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:rotate-12 transition-transform">
                                <Database size={20} className="text-white" />
                            </div>
                            <span className="font-black text-sm tracking-[0.3em] uppercase italic leading-none">Assemble<span className="text-blue-500 not-italic">.</span>Admin</span>
                        </div>
                        <div className="hidden md:flex items-center gap-4 px-6 border-l border-white/10">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">System Nominal</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative hidden xl:block">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search deployment..."
                                className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs focus:border-blue-500 outline-none w-64 transition-all focus:w-80"
                            />
                        </div>
                        <button onClick={() => supabase.auth.signOut()} className="p-3 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-xl transition-all text-red-500 border border-red-500/10 group">
                            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </nav>
            <div className="w-full min-h-screen bg-black text-zinc-300 selection:bg-blue-500/30 overflow-x-hidden">

                {/* --- MOBILE NAV BAR (Visible only on mobile/tablet) --- */}
                <div className="lg:hidden fixed bottom-6 right-6 z-[100]">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.5)] active:scale-90 transition-all border border-blue-400/30"
                    >
                        {isMenuOpen ? <X size={28} className="text-white" /> : <Settings size={28} className="text-white" />}
                    </button>
                </div>

                <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
                    <div className="grid grid-cols-12 gap-8">

                        {/* --- SIDEBARS (Hidden on mobile, drawer on mobile) --- */}
                        {/* Мы объединяем Цены, Персонал и Фильтры в одну колонку для мобилок */}
                        <aside className={cn(
                            "fixed inset-0 z-[90] bg-black/95 backdrop-blur-xl p-6 overflow-y-auto transition-all duration-500 lg:relative lg:inset-auto lg:bg-transparent lg:p-0 lg:z-10 lg:col-span-3 lg:block",
                            isMenuOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"
                        )}>
                            <div className="space-y-6 pt-12 lg:pt-0">
                                <h2 className="lg:hidden text-3xl font-black italic text-white mb-8 uppercase tracking-tighter">Command Center</h2>

                                {/* Rate Controller */}
                                <section className="bg-white/[0.03] lg:bg-[#0A0A0A] rounded-[32px] p-6 border border-white/5">
                                    <div className="flex items-center gap-3 mb-6">
                                        <TrendingUp size={16} className="text-blue-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Rates</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Твои инпуты Primary/Extra */}
                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/[0.03]">
                                            <input type="number" value={pricing.initial} onChange={e => setPricing({...pricing, initial: parseInt(e.target.value)})} className="bg-transparent w-full text-xl font-black italic outline-none text-white" />
                                        </div>
                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/[0.03]">
                                            <input type="number" value={pricing.extra} onChange={e => setPricing({...pricing, extra: parseInt(e.target.value)})} className="bg-transparent w-full text-xl font-black italic outline-none text-white" />
                                        </div>
                                    </div>
                                    <button onClick={async () => { /* твоя функция */ setIsMenuOpen(false); }} className="w-full mt-4 py-3 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white">Sync Rates</button>
                                </section>

                                {/* Personnel */}
                                <section className="bg-white/[0.03] lg:bg-[#0A0A0A] rounded-[32px] p-6 border border-white/5">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Users size={16} className="text-blue-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Personnel</span>
                                    </div>
                                    <div className="space-y-2">
                                        {staff.map(s => (
                                            <div key={s.id} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/[0.02]">
                                                <span className="text-xs font-bold">{s.name}</span>
                                                <button onClick={() => {/*...*/}} className="text-red-900 hover:text-red-500"><Trash2 size={14}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Filters (Matrix) */}
                                <section className="bg-white/[0.03] lg:bg-[#0A0A0A] rounded-[32px] p-6 border border-white/5">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Filter size={16} className="text-blue-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Filters</span>
                                    </div>
                                    <div className="space-y-6">
                                        {/* Статусы */}
                                        <div className="flex flex-wrap gap-2">
                                            {['all', 'pending', 'active', 'done'].map(s => (
                                                <button key={s} onClick={() => {setFilterStatus(s); if(window.innerWidth < 1024) setIsMenuOpen(false);}}
                                                        className={cn("px-3 py-2 rounded-lg text-[9px] font-black uppercase border transition-all",
                                                            filterStatus === s ? "bg-blue-600 border-blue-600 text-white" : "bg-black/40 border-white/5 text-zinc-600")}>
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Слоты */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {['all', 's1', 's2', 's3'].map(slot => (
                                                <button key={slot} onClick={() => {setFilterSlot(slot); if(window.innerWidth < 1024) setIsMenuOpen(false);}}
                                                        className={cn("px-3 py-2 rounded-lg text-[9px] font-black uppercase border transition-all text-left",
                                                            filterSlot === slot ? "bg-white text-black" : "bg-black/40 border-white/5 text-zinc-600")}>
                                                    {slot === 'all' ? 'Any' : TIME_SLOTS[slot]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </aside>

                        {/* --- CENTRAL COLUMN: Orders (Clean Modern View) --- */}
                        <div className="col-span-12 lg:col-span-9 space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-white tracking-tight">Orders</h2>
                                    <span className="bg-zinc-800 text-zinc-400 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {filteredOrders.length} total
            </span>
                                </div>
                            </div>

                            {filteredOrders.length === 0 ? (
                                <div className="bg-zinc-900/50 rounded-3xl p-20 text-center border border-zinc-800 border-dashed">
                                    <p className="text-zinc-500 font-medium">No orders found matching your criteria</p>
                                </div>
                            ) : (
                                <div className="bg-white/[0.03] lg:bg-[#0A0A0A] rounded-[32px] p-6 border border-white/5 grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    {filteredOrders.map(o => {
                                        const config = STATUS_MAP[o.status] || STATUS_MAP.pending;
                                        const StatusIcon = config.icon;

                                        return (
                                            <div key={o.id} className="rounded-3xl border border-zinc-800 p-6 transition-all hover:border-zinc-700 shadow-sm flex flex-col h-full">

                                                {/* 1. Top Section: Date & Status */}
                                                <div className="flex justify-between items-start mb-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex flex-col items-center justify-center bg-zinc-800 w-12 h-12 rounded-2xl border border-zinc-700">
                                                            <span className="text-[10px] uppercase font-bold text-zinc-500 leading-none mb-1">
                                                                {new Date(o.target_date).toLocaleDateString('en', { month: 'short' })}
                                                            </span>
                                                            <span className="text-lg font-bold text-white leading-none">
                                                                {new Date(o.target_date).getDate()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-white leading-snug line-clamp-1">
                                                                {o.address}
                                                            </h3>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                                    <Clock size={14} />
                                                                    <span className="text-xs font-medium">{TIME_SLOTS[o.slot_id] || 'TBD'}</span>
                                                                </div>
                                                                <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                                    <Timer size={14} />
                                                                    <span className="text-xs font-medium">{o.estimated_hours}h session</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={cn(
                                                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors",
                                                        config.bg, config.text, config.border
                                                    )}>
                                                        <StatusIcon size={14} className={o.status === 'active' ? 'animate-spin' : ''} />
                                                        {config.label}
                                                    </div>
                                                </div>

                                                {/* 2. Middle Section: Description & Images */}
                                                <div className="flex-grow">
                                                    <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50 mb-4">
                                                        <p className="text-sm text-zinc-400 leading-relaxed">
                                                            {o.description || 'No additional details provided.'}
                                                        </p>
                                                    </div>

                                                    {o.image_url && o.image_url.length > 0 && (
                                                        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                                                            {o.image_url.map((url: string) => (
                                                                <div key={url} className="relative group shrink-0">
                                                                    <img
                                                                        src={url.replace('/upload/', '/upload/w_200,h_200,c_fill/')}
                                                                        alt="Attached"
                                                                        className="w-14 h-14 rounded-xl object-cover border border-zinc-800 group-hover:border-zinc-600 transition-colors"
                                                                    />
                                                                    <button
                                                                        onClick={() => window.open(url, '_blank')}
                                                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white"
                                                                    >
                                                                        <ExternalLink size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 3. Bottom Section: Controls */}
                                                <div className="mt-4 pt-5 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">

                                                    {/* Staff Assign */}
                                                    <div className="flex items-center gap-3 bg-zinc-900 px-3 py-1.5 rounded-2xl border border-zinc-800 min-w-[160px]">
                                                        <UserPlus size={16} className={o.assigned_to ? "text-blue-500" : "text-zinc-600"} />
                                                        <select
                                                            value={o.assigned_to || 'unassigned'}
                                                            onChange={(e) => assignUnit(o.id, e.target.value)}
                                                            className="bg-transparent text-xs font-bold text-zinc-300 outline-none cursor-pointer w-full"
                                                        >
                                                            <option value="unassigned" className="bg-zinc-900">Unassigned</option>
                                                            {staff.map(s => (
                                                                <option key={s.id} value={s.name} className="bg-zinc-900">{s.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => copyToClipboard(o.address, o.id)}
                                                            className="p-2.5 text-zinc-500 hover:text-white bg-zinc-900 rounded-xl border border-zinc-800 transition-all"
                                                            title="Copy Address"
                                                        >
                                                            {copiedId === o.id ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                                        </button>

                                                        <a href={`tel:${o.phone}`} className="p-2.5 text-zinc-500 hover:text-blue-500 bg-zinc-900 rounded-xl border border-zinc-800 transition-all">
                                                            <Phone size={18} />
                                                        </a>

                                                        <select
                                                            value={o.status || 'pending'}
                                                            onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                                                            className="bg-zinc-900 border border-zinc-800 rounded-xl text-[11px] font-bold uppercase tracking-wider px-3 h-10 outline-none transition-all cursor-pointer text-zinc-400 hover:border-zinc-700"
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="confirmed">Confirmed</option>
                                                            <option value="active">Active</option>
                                                            <option value="done">Done</option>
                                                        </select>

                                                        <button
                                                            onClick={async () => { if(confirm("Permanently delete this order?")) { await supabase.from('bookings').delete().eq('id', o.id); fetchAllData(); }}}
                                                            className="p-2.5 text-zinc-800 hover:text-red-500 bg-red-500/5 rounded-xl border border-red-500/10 transition-all"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                    </div>
                </main>
            </div>
            {/* Footer */}
            <footer className="mt-20 border-t border-white/[0.03] py-12 opacity-10 text-center">
                <div className="flex flex-col items-center gap-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.8em]">Secure Terminal // Assemble v3.5.0_STABLE</p>
                    <div className="flex gap-8">
                        <span className="text-[8px] uppercase">Node: {typeof window !== 'undefined' ? window.location.hostname : 'Cloud'}</span>
                        <span className="text-[8px] uppercase">Ping: 14ms</span>
                        <span className="text-[8px] uppercase">Enc: AES-256</span>
                    </div>
                </div>
            </footer>

            <style jsx global>{`
                ::-webkit-scrollbar { width: 4px; height: 4px; }
                ::-webkit-scrollbar-track { background: #050505; }
                ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #2563eb; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
            `}</style>
        </div>
    );
}

// END OF FILE - Total Lines: ~460