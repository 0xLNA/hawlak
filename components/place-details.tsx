"use client";
import { useEffect, useRef, useState } from "react";
import { Bookmark, MapPin, MessageSquarePlus, Navigation, PanelRightClose, X } from "lucide-react";
import { categoryLabels, preferenceLabels } from "../lib/intent";
import { usableInsights } from "../lib/insights";
import type { InsightItem, RankedPlace } from "../lib/types";
import ExperienceDialog from "./experience-dialog";

function InsightSection({ title, items }: { title: string; items: InsightItem[] }) {
  if (!items.length) return null;
  return <section className="insight-section"><h4>{title}</h4><ul>{items.map(item => <li key={item.value}><span>{item.value}</span><small>ورد في {item.mentionCount} تجارب</small></li>)}</ul></section>;
}

export default function PlaceDetails({ result, distance, saved, onSave, onClose, onCollapse }: {
  result: RankedPlace; distance?: number; saved: boolean; onSave: () => void; onClose: () => void; onCollapse: () => void;
}) {
  const { place, recommendation } = result;
  const insights = usableInsights(place.insights);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [place.id]);
  return <aside className="panel" aria-labelledby="place-title">
    <div className="panel-top"><span><MapPin size={15}/> {categoryLabels[place.category]} · الرياض</span><div className="panel-controls"><button className="icon-button" onClick={onClose} aria-label="العودة إلى النتائج"><X size={20}/></button><button className="icon-button" onClick={onCollapse} aria-label="إخفاء القائمة" aria-controls="map-sidebar" aria-expanded={true}><PanelRightClose size={20}/></button></div></div>
    <div className="content">
      <div className="heading"><div><small>{recommendation.isPrimary ? "من نوع طلعتك" : "مكان آخر على الخريطة"}</small><h2 id="place-title" ref={title} tabIndex={-1}>{place.name}</h2>{place.nameEn && place.nameEn !== place.name && <p className="english-name" dir="ltr">{place.nameEn}</p>}</div></div>
      <div className="facts">{distance !== undefined && Number.isFinite(distance) && <span><Navigation size={14}/>{distance.toFixed(1)} كم · خط مستقيم</span>}</div>
      {place.address && <p className="address"><MapPin size={14}/> {place.address}</p>}
      <p className="coordinates">الموقع: <bdi>{place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}</bdi></p>
      {place.openingHours && <p className="opening-hours">ساعات مسجلة في OpenStreetMap (قد تتغير): <bdi>{place.openingHours}</bdi></p>}
      {insights ? <div className="insights">
        {recommendation.isPrimary && recommendation.matchedPreferences.length > 0 && <section className="fit-section"><h3>لماذا يناسب طلبك؟</h3><p>{recommendation.explanation}</p><div className="keywords matched">{recommendation.matchedPreferences.map(pref => <span key={pref}>{preferenceLabels[pref]}</span>)}</div></section>}
        {recommendation.unconfirmedPreferences.length > 0 && <p className="data-disclosure">لم تؤكد التجارب: {recommendation.unconfirmedPreferences.map(pref => preferenceLabels[pref]).join(" · ")}</p>}
        <InsightSection title="الأجواء" items={insights.vibe}/>
        <InsightSection title="مناسب لـ" items={insights.bestFor}/>
        <InsightSection title="الأكثر ذكراً" items={insights.popularItems}/>
        <InsightSection title="ما أعجب الزوار" items={insights.positives}/>
        <InsightSection title="انتبه" items={insights.complaints}/>
        <p className="insight-provenance">خلاصة مستخرجة من {insights.evidenceCount} تجارب. تعبّر عن التجارب المتاحة.</p>
      </div> : <section className="no-insights"><MessageSquarePlus size={24}/><h3>لا توجد تجارب كافية بعد.</h3><p>لا توجد تجارب كافية بعد لبناء ملخص عن هذا المكان.</p></section>}
      <button className="source-button contribution-button" onClick={() => setExperienceOpen(true)}><MessageSquarePlus size={17}/> شارك تجربتك</button>
      <div className="metadata-note">بيانات المكان: <a href={place.metadataSource.url} target="_blank" rel="noopener noreferrer">OpenStreetMap</a> · عينة محفوظة بتاريخ {place.metadataSource.retrievedAt}.</div>
    </div>
    <div className="actions"><a className="primary" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}><Navigation size={17}/> الاتجاهات</a><button aria-pressed={saved} onClick={onSave}><Bookmark size={17} fill={saved ? "currentColor" : "none"}/>{saved ? "تم الحفظ" : "حفظ"}</button></div>
    {experienceOpen && <ExperienceDialog place={place} onClose={() => setExperienceOpen(false)}/>}
  </aside>;
}