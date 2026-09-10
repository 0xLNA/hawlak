"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { EXPERIENCE_MAX_LENGTH, EXPERIENCE_MIN_LENGTH } from "../lib/experience-input";
import type { Place } from "../lib/types";

export default function ExperienceDialog({ place, onClose, onSubmitted }: { place: Place; onClose: () => void; onSubmitted: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [rawText, setRawText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (rawText.trim().length < EXPERIENCE_MIN_LENGTH) { setError("اكتب 10 أحرف على الأقل عن تجربتك."); return; }
    if (rawText.length > EXPERIENCE_MAX_LENGTH) { setError("اكتب 500 حرف كحد أقصى."); return; }
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/experiences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placeId: place.id, rawText }) });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "تعذر الحفظ. حاول مجددًا.");
      }
      onSubmitted();
    } catch (error) { setError(error instanceof Error ? error.message : "تعذر الاتصال. النص ما زال موجودًا، حاول مجددًا."); }
    finally { setSubmitting(false); }
  };

  return <dialog ref={dialog} className="modal" aria-labelledby="experience-title" onCancel={event => { event.preventDefault(); if (!submitting) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
    <div className="modal-inner">
      <button className="modalx icon-button" onClick={onClose} disabled={submitting} aria-label="إغلاق التجربة"><X size={20}/></button>
      <span className="modalicon"><MessageSquarePlus size={24}/></span>
      <h2 id="experience-title" tabIndex={-1}>شارك تجربتك</h2>
      <p>{place.name}</p>
      <form className="experience-form" onSubmit={submit} aria-busy={submitting}>
        <label htmlFor="experience-text">كيف كانت تجربتك؟</label>
        <textarea id="experience-text" value={rawText} onChange={event => setRawText(event.target.value)} minLength={EXPERIENCE_MIN_LENGTH} maxLength={EXPERIENCE_MAX_LENGTH} required autoFocus disabled={submitting} aria-describedby="experience-help experience-length" aria-invalid={!!error} placeholder="رحت العصر، المكان هادي ومناسب للشغل، بس المواقف كانت صعبة."/>
        <p id="experience-help">اكتب بطريقتك عن زيارتك لهذا المكان.</p>
        <p id="experience-length">{rawText.length} / {EXPERIENCE_MAX_LENGTH} حرف</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="quiz-submit" type="submit" disabled={submitting}>{submitting ? "جارٍ حفظ تجربتك…" : "إرسال التجربة"}</button>
      </form>
    </div>
  </dialog>;
}
