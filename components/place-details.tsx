"use client";
import { useEffect, useRef, useState } from "react";
import { Bookmark, CakeSlice, Check, CircleAlert, Coffee, MapPin, MessageSquarePlus, Navigation, PanelRightClose, Sparkles, Trees, Utensils, X } from "lucide-react";
import { categoryLabels, preferenceLabels } from "../lib/intent";
import { usableInsights } from "../lib/insights";
import { experienceCount, formatInsightValue } from "../lib/insight-presentation";
import type { Category, InsightItem, RankedPlace } from "../lib/types";
import ExperienceDialog from "./experience-dialog";
import PlaceStar from "./place-star";

const categoryIcons = { cafe: Coffee, restaurant: Utensils, dessert: CakeSlice, activity: Sparkles, walk: Trees };
const placeImages: Record<string, string> = {
  starbucks: "/places/coffee1.jpg",
  las: "/places/coffee2.jpg",
  "las cafe": "/places/coffee2.jpg",
  foam: "/places/coffee3.jpg",
};
function CategoryCover({ category, imageSrc }: { category: Category; imageSrc?: string }) {
  const Icon = categoryIcons[category];
  if (imageSrc) return <div className="destination-cover" aria-hidden="true" style={{ position: "relative" }}><img src={imageSrc} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}/></div>;
  return <div className="destination-cover" aria-hidden="true"><Icon size={48} strokeWidth={1.5}/><span>{categoryLabels[category]}</span></div>;
}

function InsightSection({ title, items, tone }: { title: string; items: InsightItem[]; tone?: "positive" | "negative" }) {
  if (!items.length && !tone) return null;
  const Icon = tone === "negative" ? CircleAlert : Check;
  return <section className={`insight-section ${tone ?? ""}`}><h4>{tone && <Icon size={16} aria-hidden="true"/>}{title}</h4>{items.length ? <ul>{items.map(item => <li key={item.value}><div><span>{formatInsightValue(item.value)}</span>{!tone && <small>ورد في {experienceCount(item.mentionCount)}</small>}</div></li>)}</ul> : <p className="insight-empty">لا توجد ملاحظات بعد</p>}</section>;
}

export default function PlaceDetails({ result, distance, saved, onSave, onClose, onCollapse, onRefreshInsights }: {
  result: RankedPlace; distance?: number; saved: boolean; onSave: () => void; onClose: () => void; onCollapse: () => void; onRefreshInsights: (placeId: string) => Promise<void>;
}) {
  const { place, recommendation } = result;
  const insights = usableInsights(place.insights);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState("");
  const onSubmitted = async () => {
    setExperienceOpen(false);
    setSubmissionNotice("تم حفظ تجربتك. جارٍ تحديث تجارب المكان…");
    try {
      await onRefreshInsights(place.id);
      setSubmissionNotice("تم حفظ تجربتك. شكرًا لمشاركتك.");
    } catch {
      setSubmissionNotice("تم حفظ تجربتك، لكن تعذر تحديث تجارب المكان الآن.");
    }
  };
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [place.id]);
  return <aside className="panel" aria-labelledby="place-title">
    <div className="panel-top"><span><MapPin size={15}/> {categoryLabels[place.category]} · الرياض</span><div className="panel-controls"><button className="icon-button" onClick={onClose} aria-label="العودة إلى النتائج"><X size={20}/></button><button className="icon-button" onClick={onCollapse} aria-label="إخفاء القائمة" aria-controls="map-sidebar" aria-expanded={true}><PanelRightClose size={20}/></button></div></div>
    <div className="content">
      <CategoryCover category={place.category} imageSrc={placeImages[place.name.trim().toLowerCase()] ?? placeImages[place.nameEn?.trim().toLowerCase() ?? ""]}/>
      <div className="heading"><div><h2 id="place-title" ref={title} tabIndex={-1} dir="auto">{place.name}</h2><p className="destination-meta">{categoryLabels[place.category]} · الرياض</p>{place.nameEn && place.nameEn !== place.name && <p className="english-name" dir="ltr">{place.nameEn}</p>}</div></div>
      <p className={`detail-match ${recommendation.isPrimary ? "primary" : ""}`}>{recommendation.isPrimary && <Check size={14}/>} {recommendation.basis === "preferences" ? "مناسب لطلبك" : recommendation.isPrimary ? "من نوع طلعتك" : "مكان آخر على الخريطة"}</p>
      <div className="facts">{distance !== undefined && Number.isFinite(distance) && <span><Navigation size={14}/>{distance.toFixed(1)} كم · خط مستقيم</span>}<PlaceStar placeId={place.id}/></div>
      <section className="place-summary"><h3>ملخص المكان</h3><p>{insights ? [...insights.vibe, ...insights.bestFor].map(item => formatInsightValue(item.value)).slice(0, 3).join(" · ") || recommendation.explanation : "لا توجد تجارب كافية بعد."}</p></section>
      {insights && <div className="insights">
        <div className="insight-columns"><InsightSection title="الإيجابيات" items={insights.positives} tone="positive"/><InsightSection title="للانتباه" items={insights.complaints} tone="negative"/></div>
        <p className="insight-provenance">من {insights.evidenceCount} تجارب متاحة</p>
        <details className="place-more"><summary>المزيد عن المكان</summary>
          <p className="result-explanation">{recommendation.explanation}</p>
          {recommendation.unconfirmedPreferences.length > 0 && <p className="data-disclosure">لم تؤكد التجارب: {recommendation.unconfirmedPreferences.map(pref => preferenceLabels[pref]).join(" · ")}</p>}
          <InsightSection title="الأجواء" items={insights.vibe}/><InsightSection title="مناسب لـ" items={insights.bestFor}/><InsightSection title="الأكثر ذكراً" items={insights.popularItems}/>
        </details>
      </div>}
      {(place.address || place.openingHours) && <details className="place-more"><summary>العنوان وأوقات العمل</summary>{place.address && <p className="address">{place.address}</p>}{place.openingHours && <p className="opening-hours">الأوقات المسجلة (قد تتغير): <bdi>{place.openingHours}</bdi></p>}</details>}
      <button className="source-button contribution-button" onClick={() => setExperienceOpen(true)}><MessageSquarePlus size={17}/> شارك تجربتك</button>
      {submissionNotice && <p className="submission-notice" role="status">{submissionNotice}</p>}
      <div className="metadata-note">بيانات المكان © <a href={place.metadataSource.url} target="_blank" rel="noopener noreferrer">OpenStreetMap</a></div>
    </div>
    <div className="actions"><a className="primary" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}><Navigation size={17}/> الاتجاهات</a><button aria-pressed={saved} onClick={onSave}><Bookmark size={17} fill={saved ? "currentColor" : "none"}/>{saved ? "تم الحفظ" : "حفظ"}</button></div>
    {experienceOpen && <ExperienceDialog place={place} onClose={() => setExperienceOpen(false)} onSubmitted={onSubmitted}/>}
  </aside>;
}
