"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CakeSlice, Check, Coffee, Compass, Moon, Sparkles, Trees, Users, Utensils, Wallet, Laptop, Leaf, Heart } from "lucide-react";
import { categoryLabels, preferenceLabels } from "../lib/intent";
import type { Category, IntentProfile, Preference } from "../lib/types";

const categoryIcons = { all: Compass, cafe: Coffee, restaurant: Utensils, dessert: CakeSlice, activity: Sparkles, walk: Trees };
const preferenceIcons = { quiet: Leaf, work: Laptop, friends: Users, family: Heart, budget: Wallet, late: Moon };

export default function OutingQuiz({ initialIntent, onComplete, onCancel }: {
  initialIntent: IntentProfile;
  onComplete: (intent: IntentProfile) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initialIntent);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step]);

  return <section className="quiz" aria-labelledby="quiz-title">
    <div className="quiz-card">
      <div className="quiz-meta"><span><Sparkles size={16}/> طلعتك تبدأ هنا</span><span>سؤال {step + 1} من 2</span></div>
      <div className="quiz-progress" aria-hidden="true"><span className="complete"/><span className={step === 1 ? "complete" : ""}/></div>
      <div className="quiz-heading">
        <span className="quiz-emblem">{step === 0 ? <Compass size={32}/> : <Sparkles size={32}/>}</span>
        <h1 id="quiz-title" ref={heading} tabIndex={-1}>{step === 0 ? "وش ودك اليوم؟" : "وش يهمك في طلعتك؟"}</h1>
        <p>{step === 0 ? "اختيارين بس، ونستكشف أماكن لطلعتك في الرياض." : "اختر اللي يهمك. نبدأ بنوع الطلعة، والتفضيلات نؤكدها لما تتوفر تجارب كافية."}</p>
      </div>
      {step === 0 ? <div className="quiz-options" role="group" aria-label="نوع الطلعة">
        {(Object.keys(categoryLabels) as (Category | "all")[]).map(category => {
          const Icon = categoryIcons[category];
          return <button key={category} aria-pressed={draft.category === category} onClick={() => { setDraft(current => ({ ...current, category })); setStep(1); }}><Icon size={25}/><span>{category === "all" ? "خلّها مفتوحة" : categoryLabels[category]}</span><ArrowLeft className="choice-arrow" size={17}/></button>;
        })}
      </div> : <>
        <div className="quiz-options" role="group" aria-label="تفضيلات الطلعة">
          {(Object.keys(preferenceLabels) as Preference[]).map(pref => {
            const Icon = preferenceIcons[pref];
            const checked = draft.preferences.includes(pref);
            return <button key={pref} aria-pressed={checked} onClick={() => setDraft(current => ({ ...current, preferences: checked ? current.preferences.filter(item => item !== pref) : [...current.preferences, pref] }))}><Icon size={25}/><span>{preferenceLabels[pref]}</span><span className="choice-check" aria-hidden="true">{checked && <Check size={15}/>}</span></button>;
          })}
        </div>
        <div className="quiz-actions"><button className="quiz-submit" onClick={() => onComplete(draft)}>اعرض الأماكن على الخريطة <ArrowLeft size={19}/></button><button className="quiz-skip" onClick={() => onComplete({ ...draft, preferences: [] })}>بدون تفضيلات</button></div>
      </>}
      <div className="quiz-footer">{step === 1 ? <button onClick={() => setStep(0)}><ArrowRight size={17}/> السابق</button> : <span>اختَر نوع الطلعة للمتابعة</span>}{onCancel && <button onClick={onCancel}>العودة للخريطة</button>}</div>
    </div>
    <p className="quiz-note"><MapNote/> أماكن قريبة من جوّك، بخطوتين.</p>
  </section>;
}

function MapNote() { return <Compass size={15} aria-hidden="true"/>; }
