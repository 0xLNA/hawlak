"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Compass, MapPin, Search, X, ArrowLeft, SlidersHorizontal, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { IntentProfile, PlaceInsights, PlaceRecord } from "../lib/types";
import { categoryLabels, preferenceLabels } from "../lib/intent";
import { recommend } from "../lib/recommend";
import { distanceKm } from "../lib/geo";
import PlaceDetails from "./place-details";
import OutingQuiz from "./outing-quiz";
import SocialVideoDemo from "./social-video-demo";

const PlaceMap = dynamic(() => import("./place-map"), { ssr: false, loading: () => <div className="map-loading" role="status">جارٍ تجهيز خريطة حولك…</div> });
const normalize = (text: string) => text.toLowerCase().normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا").trim();

export default function HawlakExplorer({ places: initialPlaces }: { places: PlaceRecord[] }) {
  const [places, setPlaces] = useState(initialPlaces);
  useEffect(() => { setPlaces(initialPlaces); }, [initialPlaces]);
  const refreshInsights = useCallback(async (placeId: string) => {
    const response = await fetch(`/api/places/${encodeURIComponent(placeId)}/insights`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to refresh place insights.");
    const data: { placeId: string; insights: PlaceInsights | null } = await response.json();
    if (data.placeId !== placeId || data.insights === undefined) throw new Error("Invalid place insights response.");
    setPlaces(current => current.map(place => place.id === placeId ? { ...place, insights: data.insights } : place));
  }, []);
  const [intent, setIntent] = useState<IntentProfile>({ category: "all", preferences: [] });
  const [screen, setScreen] = useState<"welcome" | "quiz" | "explore">("welcome");
  const quizOpen = screen === "quiz";
  const explorerOpen = screen === "explore";
  const [hasOpenedExplorer, setHasOpenedExplorer] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [storageStatus, setStorageStatus] = useState("");
  const [location, setLocation] = useState<[number, number] | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const sidebar = useRef<HTMLDivElement>(null);
  const reopen = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem("hawlak:saved:v1") || "[]");
      if (Array.isArray(stored)) setSavedIds(stored.filter((id): id is string => typeof id === "string" && initialPlaces.some(place => place.id === id)));
    } catch { setStorageStatus("تعذر قراءة المحفوظات؛ يمكنك الحفظ لهذه الجلسة."); }
  }, [initialPlaces]);
  const recommendations = useMemo(() => recommend(places, intent), [places, intent]);
  const results = useMemo(() => {
    const byId = new Map(places.map(place => [place.id, place]));
    const search = normalize(query);
    return recommendations.flatMap(recommendation => {
      const place = byId.get(recommendation.placeId)!;
      const searchable = normalize([place.name, place.nameEn, place.address, place.cuisine, categoryLabels[place.category]].filter(Boolean).join(" "));
      return (!savedOnly || savedIds.includes(place.id)) && (!search || searchable.includes(search)) ? [{ place, recommendation }] : [];
    });
  }, [places, recommendations, query, savedOnly, savedIds]);
  const primaryCount = results.filter(item => item.recommendation.isPrimary).length;
  const browsingAll = intent.category === "all" && intent.preferences.length === 0;
  const selected = results.find(item => item.place.id === selectedId);
  const select = useCallback((id: string) => { setSelectedId(id); setSidebarOpen(true); }, []);
  const socialDemoPlace = places.find(place => place.id === "osm-node-2530465471");
  const showSocialPlace = (id: string) => {
    // Reveal the matched place before using the normal card/marker selection path.
    if (!results.some(item => item.place.id === id)) { setQuery(""); setSavedOnly(false); }
    select(id);
  };
  const save = (id: string) => {
    const next = savedIds.includes(id) ? savedIds.filter(item => item !== id) : [...savedIds, id];
    setSavedIds(next);
    try { localStorage.setItem("hawlak:saved:v1", JSON.stringify(next)); setStorageStatus(next.includes(id) ? "تم حفظ المكان على هذا الجهاز." : "أُزيل المكان من المحفوظات."); }
    catch { setStorageStatus("تم التحديث لهذه الجلسة؛ تعذر الحفظ على الجهاز."); }
  };
  const finishQuiz = (nextIntent: IntentProfile) => {
    setIntent(nextIntent); setQuery(""); setSavedOnly(false); setSelectedId(null);
    setHasOpenedExplorer(true); setScreen("explore"); setSidebarOpen(true);
  };
  const editChoices = () => { setSelectedId(null); setScreen("quiz"); };
  const collapseSidebar = () => {
    setSidebarOpen(false);
    requestAnimationFrame(() => reopen.current?.focus({ preventScroll: true }));
  };
  const restoreSidebar = () => {
    setSidebarOpen(true);
  };
  useEffect(() => {
    if (explorerOpen && sidebarOpen) sidebar.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  }, [explorerOpen, sidebarOpen]);

  return <main className={`app ${!explorerOpen ? "quiz-open" : ""}`} dir="rtl">
    <header className="topbar">
      <a className="brand" href="/" aria-label="حولك، الصفحة الرئيسية"><span><MapPin size={23}/></span><div><b>حولك</b><small>اكتشف المكان المناسب لك</small></div></a>
      {explorerOpen && <div className="search"><Search size={19}/><input aria-label="ابحث عن مكان" value={query} onChange={event => { setQuery(event.target.value); setSelectedId(null); }} placeholder="ابحث عن مكان"/>{query && <button className="icon-button" aria-label="مسح البحث" onClick={() => setQuery("")}><X size={18}/></button>}</div>}
      <div className="city"><MapPin size={16}/> الرياض</div>
      {explorerOpen && <button className={`saved-filter ${savedOnly ? "active" : ""}`} aria-pressed={savedOnly} onClick={() => { setSavedOnly(!savedOnly); setSelectedId(null); }}><Bookmark size={18}/><span>المحفوظات</span><b>{savedIds.length}</b></button>}
    </header>
    {screen === "welcome" ? <section className="welcome" aria-labelledby="welcome-title">
      <div className="welcome-content">
        <span className="welcome-emblem" aria-hidden="true"><Compass size={32}/></span>
        <h1 id="welcome-title">حياك الله محمد!</h1>
        <p>كيف حاب تبدأ تجربتك وتكتشف اللي حولك؟</p>
        <div className="welcome-choices">
          <button className="welcome-choice personalize" onClick={() => setScreen("quiz")}><span className="welcome-choice-icon" aria-hidden="true"><SlidersHorizontal size={25}/></span><span><b>بخصص تجربتي</b><small>اختر نوع الطلعة والأجواء اللي تناسبك</small></span><ArrowLeft size={20} aria-hidden="true"/></button>
          <button className="welcome-choice discover" onClick={() => finishQuiz({ category: "all", preferences: [] })}><span className="welcome-choice-icon" aria-hidden="true"><Compass size={25}/></span><span><b>حاب أكتشف</b><small>استعرض الأماكن حولك مباشرة</small></span><ArrowLeft size={20} aria-hidden="true"/></button>
        </div>
      </div>
    </section> : quizOpen ? <OutingQuiz initialIntent={intent} onComplete={finishQuiz} onCancel={hasOpenedExplorer ? () => setScreen("explore") : undefined}/> : <>
      <section className="trip-summary" aria-label="اختيارات طلعتك"><div><b>{browsingAll ? "اكتشف الأماكن حولك" : "طلعتك على ذوقك"}</b><p>{browsingAll ? "كل الأماكن المتاحة في الرياض" : [categoryLabels[intent.category], ...intent.preferences.map(pref => preferenceLabels[pref])].join(" · ")}</p></div><button onClick={editChoices}><SlidersHorizontal size={17}/> تعديل الاختيارات</button></section>
      <section className={`workspace ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
        <div className="map-area">
          <div className="map-stage"><PlaceMap results={results} selectedId={selected?.place.id ?? null} onSelect={select} onLocation={setLocation}/>
            {!sidebarOpen && <button ref={reopen} className="sidebar-reopen" onClick={restoreSidebar} aria-controls="map-sidebar" aria-expanded={false}><PanelRightOpen size={19}/> عرض القائمة</button>}
          </div>
        </div>
        <div id="map-sidebar" className="map-sidebar" ref={sidebar} inert={!sidebarOpen} aria-hidden={!sidebarOpen}>
          {selected ? <PlaceDetails key={selected.place.id} result={selected} distance={location ? distanceKm(location, [selected.place.latitude, selected.place.longitude]) : undefined} saved={savedIds.includes(selected.place.id)} onSave={() => save(selected.place.id)} onRefreshInsights={refreshInsights} onCollapse={collapseSidebar} onClose={() => { setSelectedId(null); requestAnimationFrame(() => resultHeading.current?.focus({ preventScroll: true })); }}/> :
            <aside className="results-panel" aria-labelledby="results-title">
              <div className="results-heading"><div><h2 ref={resultHeading} tabIndex={-1} id="results-title">{browsingAll ? "أماكن للاستكشاف" : "أماكن لطلعتك"}</h2><p aria-live="polite">{browsingAll ? `${results.length} أماكن متاحة` : `${primaryCount} من نوع طلعتك · ${results.length - primaryCount} أماكن أخرى`}</p></div><button className="icon-button" onClick={collapseSidebar} aria-label="إخفاء القائمة" aria-controls="map-sidebar" aria-expanded={true}><PanelRightClose size={20}/></button></div>
              <div className="results-list">
                {socialDemoPlace && <SocialVideoDemo place={socialDemoPlace} onSelect={showSocialPlace}/>}
                {results.map(({ place, recommendation }) => <button className="result-card" data-category={place.category} key={place.id} onClick={() => select(place.id)}>
                  <div className="result-top"><span className="result-category">{categoryLabels[place.category]}</span>{recommendation.isPrimary ? <MapPin size={18} aria-label="من نوع طلعتك"/> : <span className="other-indicator" aria-label="مكان آخر"/>}</div>
                  <h3>{place.name}</h3>
                  <p className="result-match">{browsingAll ? "متاح للاستكشاف" : recommendation.basis === "preferences" ? "تجارب تدعم اختياراتك" : recommendation.isPrimary ? "يناسب نوع طلعتك" : "مكان آخر متاح"}{savedIds.includes(place.id) && <Bookmark size={14} fill="currentColor"/>}</p>
                  {place.address && <p className="address">{place.address}</p>}
                  <div className="result-footer"><span>{location ? `${distanceKm(location, [place.latitude, place.longitude]).toFixed(1)} كم بخط مستقيم` : "الرياض"}</span><span>تفاصيل المكان <ArrowLeft size={15}/></span></div>
                </button>)}
                {!results.length && <div className="empty"><Search size={30}/><h3>{savedOnly && !savedIds.length ? "محفوظاتك تبدأ من هنا" : "لا توجد نتائج مطابقة"}</h3><p>{savedOnly && !savedIds.length ? "افتح مكانًا واضغط حفظ لتجده هنا لاحقًا." : "جرّب تغيير اختياراتك أو كلمات البحث ضمن عينة الرياض."}</p><button onClick={editChoices}>تغيير الاختيارات</button></div>}
              </div>
              <div className="list-attribution">بيانات © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · ODbL</div>
            </aside>}
        </div>
      </section>
    </>}
    {storageStatus && <div className="toast" role="status">{storageStatus}<button className="icon-button" aria-label="إغلاق إشعار الحفظ" onClick={() => setStorageStatus("")}><X size={16}/></button></div>}
  </main>;
}
