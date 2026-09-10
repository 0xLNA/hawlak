"use client";

import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";

export default function PlaceStar({ placeId, count, onCount }: {
  placeId: string; count?: number; onCount: (count: number) => void;
}) {
  const key = `hawlak-starred-${placeId}`;
  const [starred, setStarred] = useState(false);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const countVersion = useRef(0);
  const updateCount = useRef(onCount);
  updateCount.current = onCount;

  useEffect(() => {
    const read = () => {
      try {
        const value = localStorage.getItem(key);
        setStarred(value === "1");
        setPending(value === "pending");
        setReady(true);
      } catch { setMessage("اسمح بالحفظ على هذا الجهاز لإضافة ترشيحك."); }
    };
    read();
    const controller = new AbortController();
    const version = countVersion.current;
    fetch(`/api/places/${encodeURIComponent(placeId)}/star`, { cache: "no-store", signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (version === countVersion.current) updateCount.current(data.starCount); })
      .catch(() => { if (!controller.signal.aborted) setMessage("تعذر تحميل عدد الترشيحات الآن."); });
    const storage = (event: StorageEvent) => { if (event.key === key) read(); };
    window.addEventListener("storage", storage);
    return () => { controller.abort(); window.removeEventListener("storage", storage); };
  }, [key, placeId]);

  async function submit() {
    if (busy.current || starred || pending || !ready) return;
    busy.current = true;
    countVersion.current++;
    setMessage("");
    const send = async () => {
      // Reserve before sending so rapid clicks, tabs and refreshes cannot repeat it.
      try {
        const previous = localStorage.getItem(key);
        if (previous) { setStarred(previous === "1"); setPending(previous === "pending"); return; }
        localStorage.setItem(key, "pending");
      } catch { setMessage("اسمح بالحفظ على هذا الجهاز لإضافة ترشيحك."); return; }
      setPending(true);
      try {
        const response = await fetch(`/api/places/${encodeURIComponent(placeId)}/star`, { method: "POST" });
        if (!response.ok) {
          localStorage.removeItem(key);
          setPending(false);
          setMessage("تعذر حفظ ترشيحك. حاول مجددًا.");
          return;
        }
        localStorage.setItem(key, "1");
        setStarred(true);
        setPending(false);
        const data = await response.json();
        if (typeof data.starCount === "number") updateCount.current(data.starCount);
        else setMessage("تم ترشيح المكان. تعذر تحديث العدد الآن.");
      } catch {
        // The server may have committed the insert. Keep the reservation instead of duplicating it.
        setMessage("تعذر تأكيد الترشيح الآن. تحقق من اتصالك.");
      }
    };
    try {
      if (navigator.locks) await navigator.locks.request(key, send);
      else await send();
    } finally { busy.current = false; }
  }

  return <div className="star-control">
    <button className="star-button" aria-label={starred ? "تم ترشيح المكان" : "مميز"} aria-pressed={starred}
      disabled={!ready || starred || pending} onClick={submit}>
      <Star size={18} fill={starred ? "currentColor" : "none"}/>
      <span>{starred ? "رشحته" : "مميز"}</span>
      {typeof count === "number" && count > 0 && <b aria-label={`${count} ترشيحات`}>{count}</b>}
    </button>
    {message && <small role="status">{message}</small>}
  </div>;
}
