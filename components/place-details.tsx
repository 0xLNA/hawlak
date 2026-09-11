"use client";
import { useEffect, useRef, useState } from "react";
import { Bookmark, CakeSlice, Check, CircleAlert, Coffee, MapPin, MessageSquarePlus, Navigation, PanelRightClose, Sparkles, Trees, Utensils, X } from "lucide-react";
import { categoryLabels, preferenceLabels } from "../lib/intent";
import { usableInsights } from "../lib/insights";
import type { Category, InsightItem, RankedPlace } from "../lib/types";
import ExperienceDialog from "./experience-dialog";

const categoryIcons = { cafe: Coffee, restaurant: Utensils, dessert: CakeSlice, activity: Sparkles, walk: Trees };
function CategoryCover({ category }: { category: Category }) {
  const Icon = categoryIcons[category];
  return <div className="destination-cover" aria-hidden="true"><Icon size={48} strokeWidth={1.5}/><span>{categoryLabels[category]}</span></div>;
}

function InsightSection({ title, items, tone }: { title: string; items: InsightItem[]; tone?: "positive" | "negative" }) {
  if (!items.length && !tone) return null;
  const Icon = tone === "negative" ? CircleAlert : Check;
  return <section className={`insight-section ${tone ?? ""}`}><h4>{title}</h4>{items.length ? <ul>{items.map(item => <li key={item.value}>{tone && <Icon size={14}/>}<div><span>{item.value}</span><small>ورد في {item.mentionCount} تجارب</small></div></li>)}</ul> : <p className="insight-empty">لا توجد ملاحظات بعد</p>}</section>;
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
      <CategoryCover category={place.category}/>
      <div className="heading"><div><h2 id="place-title" ref={title} tabIndex={-1} dir="auto">{place.name}</h2><p className="destination-meta">{categoryLabels[place.category]} · الرياض</p>{place.nameEn && place.nameEn !== place.name && <p className="english-name" dir="ltr">{place.nameEn}</p>}</div></div>
      <p className={`detail-match ${recommendation.isPrimary ? "primary" : ""}`}>{recommendation.isPrimary && <Check size={14}/>} {recommendation.basis === "preferences" ? "مناسب لطلبك" : recommendation.isPrimary ? "من نوع طلعتك" : "مكان آخر على الخريطة"}</p>
      <div className="facts">{distance !== undefined && Number.isFinite(distance) && <span><Navigation size={14}/>{distance.toFixed(1)} كم · خط مستقيم</span>}</div>
      <section className="place-summary"><h3>ملخص المكان</h3><p>{insights ? [...insights.vibe, ...insights.bestFor].map(item => item.value).slice(0, 3).join(" · ") || recommendation.explanation : "لا توجد تجارب كافية بعد لتلخيص المكان. زرت المكان؟ شاركنا تجربتك."}</p></section>
      {insights && <div className="insights">
        <div className="insight-columns"><InsightSection title="الإيجابيات" items={insights.positives} tone="positive"/><InsightSection title="السلبيات" items={insights.complaints} tone="negative"/></div>
        <p className="insight-provenance">من {insights.evidenceCount} تجارب متاحة</p>
        <details className="place-more"><summary>المزيد عن المكان</summary>
          <p className="result-explanation">{recommendation.explanation}</p>
          {recommendation.unconfirmedPreferences.length > 0 && <p className="data-disclosure">لم تؤكد التجارب: {recommendation.unconfirmedPreferences.map(pref => preferenceLabels[pref]).join(" · ")}</p>}
          <InsightSection title="الأجواء" items={insights.vibe}/><InsightSection title="مناسب لـ" items={insights.bestFor}/><InsightSection title="الأكثر ذكراً" items={insights.popularItems}/>
        </details>
      </div>}
      {(place.address || place.openingHours) && <details className="place-more"><summary>العنوان وأوقات العمل</summary>{place.address && <p className="address">{place.address}</p>}{place.openingHours && <p className="opening-hours">الأوقات المسجلة (قد تتغير): <bdi>{place.openingHours}</bdi></p>}</details>}
      <button className="source-button contribution-button" onClick={() => setExperienceOpen(true)}><MessageSquarePlus size={17}/> شارك تجربتك</button>
      <div className="metadata-note">بيانات المكان © <a href={place.metadataSource.url} target="_blank" rel="noopener noreferrer">OpenStreetMap</a></div>
    </div>
    <div className="actions"><a className="primary" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}><Navigation size={17}/> الاتجاهات</a><button aria-pressed={saved} onClick={onSave}><Bookmark size={17} fill={saved ? "currentColor" : "none"}/>{saved ? "تم الحفظ" : "حفظ"}</button></div>
    {experienceOpen && <ExperienceDialog place={place} onClose={() => setExperienceOpen(false)}/>}
  </aside>;
}
