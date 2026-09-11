"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

export default function PlaceStar({ placeId }: { placeId: string }) {
  const key = `hawlak:local-star:v1:${placeId}`;
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    try { setStarred(localStorage.getItem(key) === "1"); }
    catch { setStarred(false); }
  }, [key]);

  const toggle = () => {
    const next = !starred;
    setStarred(next);
    try { localStorage.setItem(key, next ? "1" : "0"); }
    catch { /* React state keeps the interaction usable without localStorage. */ }
  };

  return <div className="star-control">
    <button type="button" className="star-button" aria-label={starred ? "إلغاء التمييز" : "مميز"} aria-pressed={starred} onClick={toggle}>
      <Star size={18} fill={starred ? "currentColor" : "none"} aria-hidden="true"/>
      <span>مميز</span>
    </button>
  </div>;
}
