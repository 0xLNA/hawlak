"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  MapPin,
  MessageSquarePlus,
  Navigation,
  PanelRightClose,
  X,
} from "lucide-react";

import { categoryLabels } from "../lib/intent";
import { usableInsights } from "../lib/insights";
import type {
  InsightItem,
  PlaceInsights,
  RankedPlace,
} from "../lib/types";

import ExperienceDialog from "./experience-dialog";
import PlaceStar from "./place-star";
import { experienceCount, formatInsightValue, presentInsights } from "../lib/insight-presentation";
import type { PlaceRecord } from "../lib/types";

function InsightSection({ title, items, tone = "supporting", showEmpty = false }: {
  title: string; items: InsightItem[]; tone?: string; showEmpty?: boolean;
}) {
  if (!items.length && !showEmpty) return null;
  return <section className={`insight-section insight-${tone}`}>
    <h4>{title}</h4>
    {items.length ? <ul>{items.map(item => <li key={item.value}>
      <span>{formatInsightValue(item.value)}</span>
      <small>ورد في {experienceCount(item.mentionCount)}</small>
    </li>)}</ul> : <p className="insight-empty">لا توجد ملاحظات كافية بعد.</p>}
  </section>;
}

export default function PlaceDetails({
  result,
  distance,
  saved,
  onSave,
  onClose,
  onCollapse,
  onUpdate,
}: {
  result: RankedPlace;
  distance?: number;
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
  onCollapse: () => void;
  onUpdate: (id: string, updates: Partial<Pick<PlaceRecord, "insights" | "starCount">>) => void;
}) {
  const { place, recommendation } = result;

  const [experienceOpen, setExperienceOpen] = useState(false);
  const [liveInsights, setLiveInsights] =
    useState<PlaceInsights | null>(place.insights);
  const [insightsLoading, setInsightsLoading] = useState(true);

  const [insightsError, setInsightsError] = useState(false);
  const [notice, setNotice] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const title = useRef<HTMLHeadingElement>(null);

  const loadInsights = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setInsightsLoading(true);
    setInsightsError(false);

    try {
      const response = await fetch(
        `/api/places/${encodeURIComponent(place.id)}/insights`,
        {
          cache: "no-store",
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load insights.");
      }

      const data = await response.json();

      if (controller.signal.aborted) return;
      setLiveInsights(data.insights ?? null);
      onUpdate(place.id, { insights: data.insights ?? null });
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("loadInsights:", error);
      setInsightsError(true);
    } finally {
      if (!controller.signal.aborted) setInsightsLoading(false);
    }
  }, [place.id, onUpdate]);

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [place.id]);

  useEffect(() => {
    void loadInsights();
    return () => requestRef.current?.abort();
  }, [loadInsights]);

  const insights = usableInsights(liveInsights);
  const presentation = presentInsights(insights);

  return (
    <aside className="panel" aria-labelledby="place-title">
      <div className="panel-top">
        <span>
          <MapPin size={15} /> {categoryLabels[place.category]} · الرياض
        </span>

        <div className="panel-controls">
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="العودة إلى النتائج"
          >
            <X size={20} />
          </button>

          <button
            className="icon-button"
            onClick={onCollapse}
            aria-label="إخفاء القائمة"
            aria-controls="map-sidebar"
            aria-expanded={true}
          >
            <PanelRightClose size={20} />
          </button>
        </div>
      </div>

      <div className="content">
        <div className="heading">
          <div>
            <small>
              {recommendation.isPrimary
                ? "من نوع طلعتك"
                : "مكان آخر على الخريطة"}
            </small>

            <h2 id="place-title" ref={title} tabIndex={-1}>
              {place.name}
            </h2>

            {place.nameEn && place.nameEn !== place.name && (
              <p className="english-name" dir="ltr">
                {place.nameEn}
              </p>
            )}
          </div>
        </div>

        <div className="facts">
          {distance !== undefined && Number.isFinite(distance) && (
            <span>
              <Navigation size={14} />
              {distance.toFixed(1)} كم · خط مستقيم
            </span>
          )}
        </div>

        {place.address && (
          <p className="address">
            <MapPin size={14} /> {place.address}
          </p>
        )}

        <p className="coordinates">
          الموقع:{" "}
          <bdi>
            {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
          </bdi>
        </p>

        {place.openingHours && (
          <p className="opening-hours">
            ساعات مسجلة في OpenStreetMap (قد تتغير):{" "}
            <bdi>{place.openingHours}</bdi>
          </p>
        )}

        <div className="match" aria-live="polite">
          <b>{!insightsError && !insightsLoading && insights && recommendation.score !== null
            ? `${recommendation.score} / 100 · مناسب لطلبك` : "بيانات أولية"}</b>
          <PlaceStar placeId={place.id} count={place.starCount} onCount={starCount => onUpdate(place.id, { starCount })}/>
        </div>

        <section className="place-summary" aria-labelledby="summary-title" aria-busy={insightsLoading}>
          <h3 id="summary-title">ملخص المكان</h3>
          {insightsLoading ? <p role="status">جاري تحميل التجارب...</p> : insightsError ?
            <p role="status">تعذر تحميل التجارب. <button onClick={() => void loadInsights()}>حاول مجددًا</button></p> : <>
              <p>{presentation.summary}</p>
              {insights && <small>مبني على {experienceCount(insights.evidenceCount)}</small>}
            </>}
        </section>
        {!insightsLoading && !insightsError && insights && <>
          <div className="decision-grid">
            <InsightSection title="الإيجابيات" items={presentation.positives} tone="positive" showEmpty/>
            <InsightSection title="السلبيات" items={presentation.negatives} tone="negative" showEmpty/>
          </div>
          <div className="supporting-insights">
            <InsightSection title="الأكثر ذكرًا" items={presentation.popularItems}/>
            <InsightSection title="أوقات وردت في التجارب" items={presentation.timeContext}/>
          </div>
        </>}
        {notice && <p className="submission-notice" role="status">{notice}</p>}

        <button
          className="source-button contribution-button"
          onClick={() => setExperienceOpen(true)}
        >
          <MessageSquarePlus size={17} />
          شارك تجربتك
        </button>

        <div className="metadata-note">
          بيانات المكان:{" "}
          <a
            href={place.metadataSource.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenStreetMap
          </a>{" "}
          · عينة محفوظة بتاريخ {place.metadataSource.retrievedAt}.
        </div>
      </div>

      <div className="actions">
        <a
          className="primary"
          target="_blank"
          rel="noopener noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
        >
          <Navigation size={17} />
          الاتجاهات
        </a>

        <button aria-pressed={saved} onClick={onSave}>
          <Bookmark
            size={17}
            fill={saved ? "currentColor" : "none"}
          />
          {saved ? "تم الحفظ" : "حفظ"}
        </button>
      </div>

      {experienceOpen && (
        <ExperienceDialog
          place={place}
          onClose={() => setExperienceOpen(false)}
          onSubmitted={() => {
            setExperienceOpen(false);
            setNotice("تم حفظ تجربتك. شكرًا لمشاركتك.");
            void loadInsights();
          }}
        />
      )}
    </aside>
  );
}
