"use client";
import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  Camera,
  CheckCircle2,
  MapPin,
  Loader2,
  AlertCircle,
  Clock,
  Zap,
  ShieldCheck,
  Languages,
  Plus,
  Minus,
  Timer,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {supabase} from "@/lib/supabase";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SLOTS = [
  { id: 's1', time: "09:00 — 12:00", labelKey: "early" },
  { id: 's2', time: "13:30 — 16:30", labelKey: "standard" },
  { id: 's3', time: "17:30 — 20:30", labelKey: "late" }
];

const translations = {
  en: {
    systemReady: "System Ready",
    precision: "Precision",
    deployment: "Deployment",
    heroDesc: "Precision furniture assembly for residential and commercial interiors.",
    extension: "Hourly Rate",
    perHour: "Per Hour of Work",
    minOrder: "2h Minimum Order",
    step1: "1. Select Date",
    step2: "2. Launch Window",
    step3: "3. Expedition Intel",
    step4: "4. Duration Control",
    early: "Early Session",
    standard: "Standard Session",
    late: "Late Session",
    full: "FULL",
    addressPlaceholder: "Address in Tallinn",
    descPlaceholder: "What are we building?",
    addPhotos: "Add Photos",
    phone: "Phone Number",
    bookBtn: "BOOK EXPEDITION",
    transmitting: "TRANSMITTING...",
    confirmed: "Confirmed.",
    done: "Done",
    systemLive: "System Live",
    footer: "Autonomous precision deployment • TLL",
    agreement: "I agree to the processing of personal data",
    priceLabel: "Total Estimate",
    priceSubtext: "Based on selected duration",
    priceDisclaimer: "Materials not included",
    hoursLabel: "Estimated Hours",
    payAfter: "Pay after deployment",
    noUpfront: "No upfront payment required",
    secureBooking: "Secure reservation • Payment on-site",
    calculating: "Calculating...",
    bookButton: "Book for",
    callWait: "Our specialist will contact you within 60 minutes to confirm the details.",
    orderSummary: "Expedition Details",
    detailsDate: "Date",
    detailsSlot: "Time Window",
    detailsPrice: "Estimated Total",
    totalText: "total",
  },
  ee: {
    systemReady: "Süsteem Valmis",
    precision: "Täppis",
    deployment: "Paigaldus",
    heroDesc: "Professionaalne mööbli kokkupanek ja paigaldus elu- ning äripindadele.",
    extension: "Tunnihind",
    perHour: "Töötund",
    minOrder: "Minimaalne tellimus 2h",
    step1: "1. Vali Kuupäev",
    step2: "2. Ajaaken",
    step3: "3. Ekspeditsiooni Info",
    step4: "4. Kestuse kontroll",
    early: "Hommikune Seanss",
    standard: "Standardne Seanss",
    late: "Õhtune Seanss",
    full: "TÄIS",
    addressPlaceholder: "Aadress Tallinnas",
    descPlaceholder: "Mida me ehitame?",
    addPhotos: "Lisa Fotod",
    phone: "Telefoninumber",
    bookBtn: "BRONEERI EKSPEDITSIOON",
    transmitting: "EDASTAMINE...",
    confirmed: "Kinnitatud.",
    done: "Valmis",
    systemLive: "Süsteem Aktiivne",
    footer: "Autonoomne täppispaigaldus • TLL",
    agreement: "Nõustun isikuandmete töötlemisega",
    priceLabel: "Eeldatav maksumus",
    priceSubtext: "Valitud kestuse põhjal",
    priceDisclaimer: "Ei sisalda materjale",
    hoursLabel: "Eeldatavad tunnid",
    payAfter: "Tasumine pärast tööd",
    noUpfront: "Ettemaksu ei ole vaja",
    secureBooking: "Turvaline broneering • Tasumine kohapeal",
    calculating: "Arvutamine...",
    bookButton: "Telli hinnaga",
    callWait: "Meie spetsialist võtab teiega üksikasjade kinnitamiseks ühendust 60 minuti jooksul.",
    orderSummary: "Ekspeditsiooni andmed",
    detailsDate: "Kuupäev",
    detailsSlot: "Ajaaken",
    detailsPrice: "Eeldatav maksumus",
    totalText: "Kokku",
  }
};

export default function BookingPage() {
  const [lang, setLang] = useState<'en' | 'ee'>('en');
  const t = translations[lang];

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [scrolled, setScrolled] = useState(false);

  // LOGIC: Pure hourly rate
  const [hours, setHours] = useState(2);
  const [pricing, setPricing] = useState<{initial: number, extra: number} | null>(null);  const [isPricingLoading, setIsPricingLoading] = useState(true);

  const totalPrice = useMemo(() => {
    // Проверка на дурака: если данные еще грузятся, ставим 0 или базу
    if (!pricing?.initial) return 0;

    const hoursNum = parseInt(hours.toString()) || 2;
    // Сама логика: первый час — база, остальные — экстра
    return pricing?.initial + Math.max(0, hoursNum - 1) * pricing.extra;
  }, [hours, pricing]);
  const HOURLY_RATE = useMemo(() => {
    if (!pricing) return null;
    return new Intl.NumberFormat('de-DE').format(pricing.initial); // de-DE лучше для евро (запятая вместо точки)
  }, [pricing]);

  const [availability, setAvailability] = useState({
    staffLimit: 0,
    bookedSlots: {} as any
  });

  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function fetchPricing() {
      setIsPricingLoading(true);
      const { data, error } = await supabase
          .from('settings')
          .select('initial_price, extra_price')
          .eq('id', 'pricing')
          .single();

      if (data && !error) {
        setPricing({
          initial: Number(data.initial_price),
          extra: Number(data.extra_price)
        });
      }
      setIsPricingLoading(false);
    }
    fetchPricing();
  }, []);

  useEffect(() => {
    async function checkAvailability() {
      try {
        const res = await fetch(`/api/availability?date=${selectedDate}&t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setAvailability(data);
        }
      } catch (err) { console.error("Database sync failed:", err); }
    }
    checkAvailability();
  }, [selectedDate]);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (address.length < 3 || !showSuggestions) { setSuggestions([]); return; }
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&lat=59.437&lon=24.753&limit=5`);
        const data = await res.json();
        const estonianResults = data.features.filter((f: any) =>
            f.properties.country === "Estonia" || f.properties.postcode?.startsWith('1')
        );
        setSuggestions(estonianResults);
      } catch (err) { console.error(err); }
    };
    const timeoutId = setTimeout(fetchAddresses, 300);
    return () => clearTimeout(timeoutId);
  }, [address, showSuggestions]);

  const isSlotPast = (slotId: string, selectedDate: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Если выбран любой день в будущем — всё ок
    if (selectedDate > today) return false;
    // Если выбран прошедший день (мало ли) — блокируем
    if (selectedDate < today) return true;

    // Если выбрано СЕГОДНЯ — проверяем часы
    const currentHour = now.getHours();

    // Маппинг начала слотов (в часах)
    const slotStartTimes: Record<string, number> = {
      s1: 9,  // 09:00
      s2: 13, // 13:30 (округлим до 13 для запаса)
      s3: 17  // 17:30 (округлим до 17)
    };

    // Блокируем слот, если до его начала осталось меньше 2 часов
    return currentHour >= (slotStartTimes[slotId] - 1);
  };

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);

    const uploadToCloudinary = async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'assemble');

      const res = await fetch('https://api.cloudinary.com/v1_1/df54bqvpl/image/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Cloudinary upload failed');
      const data = await res.json();
      return data.secure_url;
    };

    try {
      const formElement = e.target;
      const formData = new FormData(formElement);
      const formValues = Object.fromEntries(formData);

      // ИЗМЕНЕНО: Параллельная загрузка всех файлов
      let uploadedUrls: string[] = [];
      if (files.length > 0) {
        uploadedUrls = await Promise.all(files.map(file => uploadToCloudinary(file)));
      }

      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formValues,
          image_url: uploadedUrls, // Массив ссылок для Supabase (тип column: jsonb или text[])
          slot_id: selectedSlotId,
          target_date: selectedDate,
          language: lang,
          total_price: totalPrice,
          estimated_hours: hours
        }),
      });

      if (res.ok) setSent(true);
      else alert("Transmission Error");
    } catch (err) {
      console.error(err);
      alert("System Failure during deployment.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6 text-white font-sans selection:bg-blue-500/30">
        <div className="relative w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-700">

          {/* Главная карточка успеха */}
          <div className="relative p-8 md:p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl text-center space-y-6 shadow-2xl overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-600/20 blur-[60px] rounded-full" />

            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(37,99,235,0.4)] relative z-10">
              <CheckCircle2 size={40} strokeWidth={2} className="animate-in zoom-in delay-300 duration-500" />
            </div>

            <div className="space-y-3 relative z-10">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight italic uppercase">{t.confirmed}</h1>
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed px-4">
                {t.callWait}
              </p>
            </div>

            {/* Мини-сводка заказа */}
            <div className="bg-white/5 rounded-3xl p-6 text-left space-y-4 border border-white/5">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{t.orderSummary}</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] uppercase text-zinc-500 font-bold mb-1">{t.detailsDate}</p>
                  <p className="text-sm font-semibold">{new Date(selectedDate).toLocaleDateString(lang, { day: 'numeric', month: 'long' })}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-zinc-500 font-bold mb-1">{t.detailsSlot}</p>
                  <p className="text-sm font-semibold">{SLOTS.find(s => s.id === selectedSlotId)?.time}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                <div>
                  <p className="text-[9px] uppercase text-zinc-500 font-bold mb-1">{t.detailsPrice}</p>
                  <p className="text-2xl font-black italic">€{totalPrice}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase text-zinc-500 font-bold mb-1">{t.hoursLabel}</p>
                  <p className="text-sm font-bold">{hours}h</p>
                </div>
              </div>
            </div>

            <button
                onClick={() => window.location.reload()}
                className="w-full py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all active:scale-95 shadow-xl"
            >
              {t.done}
            </button>
          </div>

          {/* Дополнительный футер на экране успеха */}
          <div className="flex items-center justify-center gap-3 opacity-40">
            <ShieldCheck size={14} className="text-blue-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest">{t.secureBooking}</span>
          </div>
        </div>
      </div>
  );

  return (
      <div className="min-h-screen bg-[#000] text-white selection:bg-blue-500/30 font-sans antialiased overflow-x-hidden">

        <button
            onClick={() => setLang(l => l === 'en' ? 'ee' : 'en')}
            className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-4 bg-white text-black rounded-full font-black text-xs shadow-2xl hover:scale-110 active:scale-95 transition-all"
        >
          <Languages size={18} />
          <span className="uppercase tracking-tighter">{lang === 'en' ? 'EE' : 'EN'}</span>
        </button>

        <header className={cn(
            "fixed top-0 inset-x-0 z-50 transition-all duration-500 border-b",
            scrolled ? "bg-black/80 backdrop-blur-xl border-white/10 py-3 md:py-4" : "bg-transparent border-transparent py-6 md:py-8"
        )}>
          <div className="max-w-5xl mx-auto px-5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Zap size={16} className="md:size-5" fill="currentColor" />
              </div>
              <span className="text-lg md:text-xl font-semibold tracking-tight italic">Assemble<span className="text-blue-500 not-italic">.</span></span>
            </div>
            <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/10">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[9px] md:text-[10px] font-bold text-zinc-300 tracking-widest uppercase">{t.systemLive}</span>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-2xl mx-auto px-5 pt-32 md:pt-40 pb-20">

          <section className="mb-12 md:mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 text-center md:text-left">
            <h1 className="text-5xl md:text-9xl font-bold tracking-tighter leading-[0.9] mb-6 italic text-white">
              {t.precision} <br />{t.deployment}<span className="text-blue-600 not-italic">.</span>
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl font-light leading-relaxed max-w-md mx-auto md:mx-0">
              {t.heroDesc}
            </p>
          </section>

          {/* Single Pricing Info Card */}
          <section className="mb-12">
            <div className="relative p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] bg-white/[0.02] border border-white/10 backdrop-blur-2xl overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/10 blur-[80px] rounded-full group-hover:bg-blue-600/20 transition-all duration-700" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-4 block">
          {t.extension}
        </span>

                  <div className="flex items-baseline text-white">
                    {isPricingLoading ? (
                        // СПИННЕР вместо цены
                        <div className="flex items-center gap-3 py-4">
                          <Loader2 className="animate-spin text-blue-600" size={40} />
                          <span className="text-zinc-500 text-xs font-black uppercase tracking-widest animate-pulse">
                Syncing Rates...
              </span>
                        </div>
                    ) : (
                        // ЦЕНА когда данные загружены
                        <>
              <span className="text-6xl md:text-8xl font-semibold tracking-tighter">
                {HOURLY_RATE}
              </span>
                          <span className="text-2xl ml-2 text-zinc-600 font-light">€</span>
                        </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-zinc-400">
                    <Timer size={18} className="text-blue-500" />
                    <span className="text-xs font-bold uppercase tracking-widest">{t.perHour}</span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-500">
                    <ShieldCheck size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t.minOrder}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="relative rounded-[2.5rem] md:rounded-[3.5rem] bg-white/[0.01] border border-white/[0.08] backdrop-blur-[80px] shadow-2xl">
            <form id="form" onSubmit={handleSubmit} className="p-6 md:p-12 space-y-10 md:space-y-14">

              {/* Step 1: Date */}
              <section>
                <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-6">{t.step1}</h3>
                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
                  {[...Array(14)].map((_, i) => {
                    const d = new Date(); d.setDate(d.getDate() + i);
                    const dateStr = d.toISOString().split('T')[0];
                    return (
                        <button key={dateStr} type="button" onClick={() => setSelectedDate(dateStr)}
                                className={cn("flex-shrink-0 w-14 md:w-16 py-5 md:py-6 rounded-2xl border transition-all duration-500",
                                    selectedDate === dateStr ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105" : "border-white/5 bg-white/5 text-zinc-500 hover:border-white/20")}>
                          <div className="text-[8px] md:text-[9px] font-black uppercase mb-1">{d.toLocaleDateString(lang, { weekday: 'short' })}</div>
                          <div className="text-lg md:text-xl font-bold">{d.getDate()}</div>
                        </button>
                    );
                  })}
                </div>
              </section>

              {/* Step 2: Slots */}
              <section className="space-y-4">
                <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-6">{t.step2}</h3>
                <div className="grid grid-cols-1 gap-3">
                  {SLOTS.map((slot) => {
                    const isFull = (availability.bookedSlots[slot.id] || 0) >= availability.staffLimit;
                    const isSelected = selectedSlotId === slot.id;
                    const isPast = isSlotPast(slot.id, selectedDate);
                    const isDisabled = isFull || isPast;
                    return (
                        <label key={slot.id} className={cn(
                            "group flex items-center justify-between p-5 md:p-7 rounded-[1.5rem] md:rounded-[2rem] border transition-all duration-500",
                            isDisabled ? "opacity-20 pointer-events-none grayscale" : "cursor-pointer active:scale-[0.98]",
                            isSelected ? "border-blue-500 bg-blue-500/5" : "border-white/5 bg-white/[0.03] hover:border-white/20"
                        )}>
                          <input
                              type="radio"
                              name="slot_id"
                              required
                              disabled={isDisabled}
                              className="sr-only"
                              onChange={() => setSelectedSlotId(slot.id)}
                          />
                          <div>
                            <span className={cn(
                                "text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 block",
                                isSelected ? "text-blue-500" : "text-zinc-600"
                            )}>
                              {(t as any)[slot.labelKey]}
                              {isFull && ` — ${t.full}`}
                              {isPast && !isFull && ` — EXPIRED`} {/* Пометка для клиента */}
                            </span>
                            <span className="text-2xl md:text-3xl font-semibold tracking-tighter">{slot.time}</span>
                          </div>
                          <div className={cn("w-6 h-6 md:w-7 md:h-7 rounded-full border flex items-center justify-center transition-all duration-500",
                              isSelected ? "bg-blue-600 border-blue-600 shadow-lg" : "border-white/10 group-hover:border-white/30")}>
                            {isSelected && <CheckCircle2 size={14} strokeWidth={3} />}
                          </div>
                        </label>
                    );
                  })}
                </div>
              </section>

              {/* Step 4: Duration Control */}
              <section className="space-y-4">
                <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-6">{t.step4}</h3>

                {/* Добавляем скрытый инпут, чтобы FormData подхватила значение */}
                <input type="hidden" name="estimated_hours" value={hours} />

                <div className="flex items-center justify-between p-6 md:p-8 bg-white/[0.03] border border-white/5 rounded-[2rem]">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.hoursLabel}</span>
                    <div className="text-5xl font-medium">{hours}h</div>
                  </div>
                  <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => setHours(h => Math.max(2, h - 1))}
                        className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all border border-white/5"
                    >
                      <Minus size={24} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setHours(h => Math.min(10, h + 1))}
                        className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center hover:bg-blue-500 active:scale-90 transition-all shadow-lg shadow-blue-600/20"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>
              </section>

              {/* Step 3: Info */}
              <section className="space-y-4 md:space-y-5">
                <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-6">{t.step3}</h3>
                <div className="relative group" ref={suggestionRef}>
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input name="address" placeholder={t.addressPlaceholder} required value={address} onFocus={() => setShowSuggestions(true)} onChange={(e) => setAddress(e.target.value)}
                         className="w-full p-5 md:p-7 pl-14 md:pl-16 bg-white/[0.04] rounded-2xl md:rounded-3xl border border-gray-200/15 focus:border-blue-500 focus:bg-white/[0.08] outline-none transition-all placeholder:text-zinc-600 text-white font-medium text-base md:text-lg" />
                  {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-zinc-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl">
                        {suggestions.map((s, i) => (
                            <div key={i} onClick={() => { setAddress(`${s.properties.street || s.properties.name || ""} ${s.properties.housenumber || ""}, ${s.properties.city || "Tallinn"}`.trim()); setShowSuggestions(false); }}
                                 className="p-5 hover:bg-blue-600/20 cursor-pointer border-b border-white/5 last:border-none">
                              <p className="text-white font-medium italic">{s.properties.name} {s.properties.housenumber}</p>
                              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1">{s.properties.city}</p>
                            </div>
                        ))}
                      </div>
                  )}
                </div>

                <input name="phone" type="tel" placeholder={t.phone} required
                       className="w-full p-5 md:p-7 bg-white/[0.04] rounded-2xl md:rounded-3xl border border-gray-200/15 focus:border-blue-500 focus:bg-white/[0.08] outline-none transition-all placeholder:text-zinc-600 text-white font-medium text-base md:text-lg" />
                <textarea name="desc" placeholder={t.descPlaceholder} required
                          className="w-full p-5 md:p-7 bg-white/[0.04] rounded-2xl md:rounded-3xl border border-gray-200/15 focus:border-blue-500 focus:bg-white/[0.08] outline-none transition-all placeholder:text-zinc-600 text-white font-medium text-base md:text-lg h-36 md:h-44 resize-none" />


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <label className="flex flex-col gap-4 p-5 bg-white/[0.04] rounded-3xl border border-gray-200/15 hover:border-white/20 transition-all cursor-pointer group">
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files) {
                            const newFiles = Array.from(e.target.files);
                            setFiles(prev => [...prev, ...newFiles]);
                          }
                        }}
                        className="hidden"
                    />
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", files.length > 0 ? "bg-blue-600 shadow-lg shadow-blue-600/40" : "bg-white/5 text-zinc-600")}>
                        <Camera size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white tracking-tight">{t.addPhotos}</span>
                        <span className="text-[10px] text-zinc-500 uppercase font-black">{files.length} selected</span>
                      </div>
                    </div>
                  </label>

                </div>
                {files.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar">
                      {files.map((f, i) => (
                          <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-xl border border-white/10 overflow-hidden group">
                            <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="preview" />
                            <button
                                type="button"
                                onClick={() => setFiles(prev => prev.filter((_, index) => index !== i))}
                                className="absolute top-1 right-1 p-1 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </div>
                      ))}
                    </div>
                )}
              </section>

              {/* Dynamic Price Calculation Section */}
              <section className="space-y-6">
                <div className="relative overflow-hidden p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl group transition-all duration-500">
                  {/* Мягкое свечение вместо яркого фона */}
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full group-hover:bg-blue-600/20 transition-all duration-700" />

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                      <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 block">
            {t.priceLabel}
          </span>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                          {t.priceSubtext}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
           <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
            {t.payAfter}
           </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline gap-2">
                        {isPricingLoading ? (
                            <div className="flex items-center gap-3 py-2">
                              <Loader2 size={24} className="animate-spin text-blue-500" />
                              <span className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">
                {t.calculating}
              </span>
                            </div>
                        ) : (
                            <>
              <span className="text-4xl md:text-6xl font-black tracking-tighter text-white">
                €{totalPrice}
              </span>
                              <span className="text-xl font-light text-zinc-500 lowercase">
                / {`${hours}h ${t.totalText}`}
              </span>
                            </>
                        )}
                      </div>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                        {t.priceDisclaimer}
                      </p>
                    </div>

                    {/* Разделитель и мелкие детали */}
                    <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-blue-500">
                        <ShieldCheck size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white font-bold uppercase tracking-tight">{t.noUpfront}</span>
                        <span className="text-[9px] text-zinc-600 font-medium uppercase tracking-widest">{t.secureBooking}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Чекбокс согласия */}
                <label className="flex items-center gap-4 cursor-pointer group px-4 py-2">
                  <div className="relative mt-0.5">
                    <input type="checkbox" required className="sr-only peer" />
                    <div className="w-5 h-5 border-2 border-gray-200/25 rounded-lg peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all duration-300" />
                    <CheckCircle2 className="absolute inset-0 m-auto text-white scale-0 peer-checked:scale-75 transition-transform duration-300" size={16} />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-snug group-hover:text-zinc-400 transition-colors">
      {t.agreement}
    </span>
                </label>
              </section>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-dashed border-white/10 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 flex-shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white uppercase tracking-tight">{t.noUpfront}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-medium">{t.secureBooking}</p>
                </div>
              </div>
              <button
                  type="submit"
                  disabled={loading || !selectedSlotId}
                      className="w-full py-6 md:py-8 bg-white text-black rounded-2xl font-black text-lg md:text-xl hover:bg-zinc-200 active:scale-95 transition-all disabled:bg-zinc-900 disabled:text-zinc-700 shadow-xl">
                {loading ? t.transmitting : t.bookBtn}
              </button>

            </form>
          </div>

          <footer className="mt-20 text-center opacity-30">
            <div className="h-px w-10 bg-blue-600 mx-auto mb-6" />
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em] italic">{t.footer}</p>
          </footer>
        </main>

        <style jsx global>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
  );
}