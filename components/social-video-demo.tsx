"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, Sparkles, Video, X } from "lucide-react";
import { categoryLabels } from "../lib/intent";
import { presentInsights } from "../lib/insight-presentation";
import type { PlaceRecord } from "../lib/types";

function SocialVideoDialog({ place, onClose, onShowPlace }: { place: PlaceRecord; onClose: () => void; onShowPlace: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const resultTitle = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<"preview" | "loading" | "result">("preview");
  const preview = presentInsights(place.insights);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); previous?.focus({ preventScroll: true }); };
  }, []);

  useEffect(() => {
    if (step !== "loading") return;
    // A local animation only: no requests, extraction or place-state updates.
    const timer = window.setTimeout(() => setStep("result"), 1250);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step === "result") resultTitle.current?.focus({ preventScroll: true });
  }, [step]);

  return <dialog ref={dialog} className={`modal social-demo ${step === "preview" ? "social-demo-preview" : ""}`} dir="rtl" aria-labelledby="social-demo-title" aria-describedby="social-demo-disclosure"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-inner">
      <button type="button" className="modalx icon-button" aria-label="إغلاق العرض التجريبي" onClick={onClose}><X size={20}/></button>
      <span id="social-demo-disclosure" className="social-demo-badge"><Sparkles size={13} aria-hidden="true"/> نموذج توضيحي — ميزة قادمة</span>
      <h2 id="social-demo-title">من السوشال إلى حولك</h2>

      {step === "preview" && <div className="social-share-image">
        <img src="/social-share-demo.png" width={390} height={844} alt="نموذج شاشة اجتماعية مع قائمة مشاركة تتضمن تطبيق حولك"/>
        <button type="button" className="social-share-hotspot" aria-label="تطبيق حولك" onClick={() => setStep("loading")}/>
      </div>}

      {step === "loading" && <>
        <div className="social-demo-loading" role="status">
          <span className="modalicon"><LoaderCircle className="locating-spinner" size={26} aria-hidden="true"/></span>
          <h3>جاري تحليل المحتوى...</h3>
          <p>نستخرج المكان وأبرز ما قيل عنه</p>
        </div>
        <div className="social-demo-actions"><button type="button" className="quiz-skip" onClick={onClose}>إلغاء</button></div>
      </>}

      {step === "result" && <>
        <div className="social-demo-result">
          <span className="modalicon"><Check size={24} aria-hidden="true"/></span>
          <h3 ref={resultTitle} tabIndex={-1}>تم التعرف على المكان</h3>
          <p className="social-demo-place-name" dir="auto">{place.name}</p>
          <p>{[categoryLabels[place.category], place.address].filter(Boolean).join(" · ")}</p>
          <h4>معلومات المكان في حولك</h4>
          <p>{preview.summary}</p>
        </div>
        <div className="social-demo-actions"><button type="button" className="quiz-submit" onClick={onShowPlace}>عرض المكان <ArrowLeft size={17} aria-hidden="true"/></button></div>
      </>}
    </div>
  </dialog>;
}

export default function SocialVideoDemo({ place, onSelect }: { place: PlaceRecord; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="social-demo-entry" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <span className="social-demo-entry-icon"><Video size={22} aria-hidden="true"/></span>
      <span><b>شفت مكان في السوشال؟</b><small>أضفه إلى حولك <span>· عرض تجريبي</span></small></span>
      <ArrowLeft size={17} aria-hidden="true"/>
    </button>
    {open && <SocialVideoDialog place={place} onClose={() => setOpen(false)} onShowPlace={() => { setOpen(false); onSelect(place.id); }}/>}
  </>;
}
