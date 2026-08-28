"use client";

import { useMemo, useState } from "react";
import {
  Bookmark, ChevronDown, Clock3, Coffee, Compass, Dumbbell, MapPin,
  Navigation, Search, Share2, ShoppingBag, Sparkles, Star, Trees,
  Users, Utensils, X
} from "lucide-react";

type Place = {
  id:number; name:string; category:string; score:number; rating:number;
  reviews:string; distance:number; time:string; price:string; open:boolean;
  x:number; y:number; keywords:string[]; summary:string; pros:string[];
  notes:string[]; mentions:number; image:string;
};

const categories = [
  ["الكل", Compass], ["مطاعم", Utensils], ["مقاهٍ", Coffee],
  ["رياضة", Dumbbell], ["ترفيه", Sparkles], ["تسوق", ShoppingBag], ["عائلي", Trees],
] as const;

const places: Place[] = [
  {id:1,name:"ساحة البن",category:"مقاهٍ",score:9.2,rating:4.8,reviews:"1.2 ألف",distance:2.4,time:"7 دقائق",price:"$$",open:true,x:47,y:42,keywords:["هادئ","قهوة مختصة","مناسب للعمل"],summary:"يشيد الزوار بهدوء المكان وجودة القهوة، ويُعد مناسبًا للعمل والزيارات الصباحية، مع ملاحظات حول المواقف في أوقات الذروة.",pros:["أجواء هادئة","جودة القهوة","جلسات مريحة"],notes:["مواقف محدودة","مزدحم بعد 7 مساءً"],mentions:12,image:"https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1000&q=80"},
  {id:2,name:"مائدة نور",category:"مطاعم",score:8.9,rating:4.7,reviews:"860",distance:3.8,time:"11 دقيقة",price:"$$$",open:true,x:65,y:28,keywords:["مذاق متوازن","خدمة ممتازة","للمجموعات"],summary:"تجربة طعام معاصرة بخدمة لافتة وأطباق متقنة، ويوصى بالحجز قبل الزيارة في نهاية الأسبوع.",pros:["الخدمة","جودة الأطباق","الأجواء"],notes:["يتطلب حجزًا","سعر مرتفع نسبيًا"],mentions:18,image:"https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1000&q=80"},
  {id:3,name:"إلفيت للبادل",category:"رياضة",score:8.8,rating:4.7,reviews:"540",distance:5.1,time:"13 دقيقة",price:"$$",open:true,x:31,y:27,keywords:["ملاعب ممتازة","تنظيم جيد","حجز سهل"],summary:"خيار رياضي منظم بملاعب جيدة وتجربة حجز سلسة، مع ارتفاع الطلب على الفترات المسائية.",pros:["جودة الملاعب","التنظيم","المرافق"],notes:["المساء ممتلئ","الحجز المسبق مهم"],mentions:9,image:"https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1000&q=80"},
  {id:4,name:"مساحة كانفس",category:"ترفيه",score:8.6,rating:4.6,reviews:"390",distance:6.3,time:"16 دقيقة",price:"$$",open:false,x:75,y:54,keywords:["تجربة فنية","ورش ممتعة","تصوير"],summary:"مساحة فنية هادئة تقدم معارض وورشًا متغيرة، وتناسب الزيارات الفردية والأصدقاء.",pros:["تنوع الفعاليات","التصميم","فريق متعاون"],notes:["ساعات محدودة","يلزم حجز بعض الفعاليات"],mentions:16,image:"https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1000&q=80"},
  {id:5,name:"محمصة الشمال",category:"مقاهٍ",score:8.4,rating:4.6,reviews:"720",distance:7.2,time:"18 دقيقة",price:"$$",open:true,x:21,y:53,keywords:["حبوب متنوعة","جلسات خارجية","سريع"],summary:"محمصة محلية بتنوع واضح في الحبوب وخدمة سريعة، والجلسات الخارجية أبرز ما يفضله الزوار.",pros:["تنوع القهوة","سرعة الخدمة","الجلسات"],notes:["ضوضاء داخلية","طعام محدود"],mentions:7,image:"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085f?auto=format&fit=crop&w=1000&q=80"},
  {id:6,name:"مطعم درب",category:"مطاعم",score:8.2,rating:4.5,reviews:"1.8 ألف",distance:8.5,time:"20 دقيقة",price:"$$",open:true,x:82,y:36,keywords:["أطباق سعودية","عائلي","كميات جيدة"],summary:"أطباق سعودية معاصرة بكميات مرضية ومساحة مناسبة للعائلات، وقد يطول الانتظار في العطلة.",pros:["المذاق","الكميات","مناسب للعائلات"],notes:["انتظار بالعطلات","ازدحام"],mentions:21,image:"https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80"},
  {id:7,name:"موشن للتسلق",category:"رياضة",score:8.0,rating:4.5,reviews:"280",distance:9.7,time:"22 دقيقة",price:"$$",open:true,x:41,y:70,keywords:["للمبتدئين","مدربون","تحدٍ ممتع"],summary:"تجربة رياضية مختلفة تناسب المبتدئين، مع مدربين داعمين ومسارات متعددة المستويات.",pros:["المدربون","السلامة","تنوع المسارات"],notes:["مزدحم مساءً","المساحة متوسطة"],mentions:6,image:"https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1000&q=80"},
  {id:8,name:"الفناء",category:"عائلي",score:7.8,rating:4.4,reviews:"610",distance:11.2,time:"25 دقيقة",price:"$",open:true,x:58,y:76,keywords:["عائلي","مساحات مفتوحة","أطفال"],summary:"وجهة خارجية بسيطة بمساحات مناسبة للأطفال والعائلات، وتكون التجربة أفضل في الأجواء المعتدلة.",pros:["المساحة","مناسب للأطفال","قيمة جيدة"],notes:["يتأثر بالطقس","طعام محدود"],mentions:8,image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80"}
];

export default function Home() {
  const [category,setCategory]=useState("الكل");
  const [selectedId,setSelectedId]=useState(1);
  const [query,setQuery]=useState("");
  const [openOnly,setOpenOnly]=useState(false);
  const [panelOpen,setPanelOpen]=useState(true);
  const [whyOpen,setWhyOpen]=useState(false);
  const [saved,setSaved]=useState(false);
  const [shareOpen,setShareOpen]=useState(false);
  const filtered=useMemo(()=>places.filter(p=>(category==="الكل"||p.category===category)&&(!openOnly||p.open)&&(!query||[p.name,p.category,...p.keywords].join(" ").includes(query))),[category,openOnly,query]);
  const selected=places.find(p=>p.id===selectedId)??places[0];
  const choose=(id:number)=>{setSelectedId(id);setPanelOpen(true);setSaved(false)};

  return <main className="app" dir="rtl">
    <header className="topbar">
      <div className="brand"><span><MapPin size={21}/></span><div><b>حولك</b><small>اكتشف المكان المناسب لك</small></div></div>
      <div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن مكان أو تجربة"/>{query&&<button onClick={()=>setQuery("")}><X size={15}/></button>}</div>
      <button className="city"><MapPin size={16}/> الرياض <ChevronDown size={15}/></button>
      <button className="avatar">ل</button>
    </header>

    <section className="controls">
      <div className="categories">{categories.map(([name,Icon])=><button key={name} className={category===name?"active":""} onClick={()=>setCategory(name)}><Icon size={16}/>{name}</button>)}</div>
      <div className="filters">
        <button className={openOnly?"on":""} onClick={()=>setOpenOnly(!openOnly)}><i/>{openOnly?"مفتوح الآن فقط":"مفتوح الآن"}</button>
        <button>أقل من 10 كم <ChevronDown size={13}/></button>
        <button>مستوى السعر <ChevronDown size={13}/></button>
        <button>الأنسب لك <ChevronDown size={13}/></button>
      </div>
    </section>

    <section className="workspace">
      <iframe title="خريطة الرياض" className="map" src="https://www.openstreetmap.org/export/embed.html?bbox=46.590%2C24.620%2C46.810%2C24.790&layer=mapnik"/>
      <div className="mapwash"/>
      <div className="count"><b>{filtered.length}</b> أماكن حولك</div>
      <button className="recenter"><Navigation size={15}/> العودة لموقعي</button>
      <span className="you"><i/><em>موقعك</em></span>
      {filtered.map(p=><button key={p.id} className={"marker "+(selected.id===p.id?"selected":"")} style={{left:p.x+"%",top:p.y+"%"}} onClick={()=>choose(p.id)}>{p.score}<small>{p.name}</small></button>)}

      {!filtered.length&&<div className="empty"><Search/><b>لا توجد نتائج مطابقة</b><span>جرّبي تغيير التصنيف أو البحث</span><button onClick={()=>{setCategory("الكل");setQuery("");setOpenOnly(false)}}>إعادة ضبط الفلاتر</button></div>}

      {panelOpen&&<aside className="panel">
        <button className="close" onClick={()=>setPanelOpen(false)}><X size={17}/></button>
        <div className="hero" style={{backgroundImage:`url(${selected.image})`}}><span>{selected.category}</span><button className={saved?"saved":""} onClick={()=>setSaved(!saved)}><Bookmark size={18} fill={saved?"currentColor":"none"}/></button></div>
        <div className="content">
          <div className="heading"><div><small>اقتراح حولك</small><h1>{selected.name}</h1><em><Sparkles size={13}/> مناسب جدًا لك</em></div><div className="score"><b>{selected.score}</b><span>من 10</span></div></div>
          <div className="facts"><span><Star size={14} fill="currentColor"/>{selected.rating} ({selected.reviews})</span><span><Navigation size={14}/>{selected.time}</span><span><Clock3 size={14}/><b className={selected.open?"green":"red"}>{selected.open?"مفتوح":"مغلق"}</b></span><span>{selected.price}</span></div>
          <button className="why" onClick={()=>setWhyOpen(!whyOpen)}><span><Sparkles size={15}/> لماذا حصل على هذه الدرجة؟</span><ChevronDown size={15} className={whyOpen?"rotate":""}/></button>
          {whyOpen&&<div className="breakdown">{[["جودة التقييمات",94],["موثوقية التقييم",88],["ملاءمته لك",92],["القرب والتوفر",84]].map(([label,value])=><div key={label as string}><span>{label}</span><i><b style={{width:value+"%"}}/></i><em>{value}%</em></div>)}</div>}
          <section className="insights">
            <div className="title"><div><small>ذكاء التجربة</small><h2>أبرز ما ذكره الزوار</h2></div><Users size={20}/></div>
            <div className="keywords">{selected.keywords.map(x=><span key={x}>{x}</span>)}</div>
            <p>{selected.summary}</p>
            <div className="grid"><div className="pros"><b>ما أعجب الزوار</b>{selected.pros.map(x=><span key={x}>✓ {x}</span>)}</div><div className="notes"><b>قبل أن تذهب</b>{selected.notes.map(x=><span key={x}>• {x}</span>)}</div></div>
          </section>
          <div className="community"><Share2 size={17}/><div><b>اهتمام المجتمع</b><span>تمت مشاركة {selected.mentions} تجربة مرتبطة بالمكان هذا الشهر</span></div></div>
          <div className="actions"><button className="primary" onClick={()=>window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.name+" الرياض")}`,"_blank")}><Navigation size={16}/> الاتجاهات</button><button onClick={()=>setSaved(!saved)}><Bookmark size={16} fill={saved?"currentColor":"none"}/>{saved?"تم الحفظ":"حفظ"}</button><button className="share" onClick={()=>setShareOpen(true)}>شارك تجربتك</button></div>
        </div>
      </aside>}
    </section>

    {shareOpen&&<div className="overlay" onMouseDown={()=>setShareOpen(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><button className="modalx" onClick={()=>setShareOpen(false)}><X size={17}/></button><span className="modalicon"><Share2/></span><h2>شارك تجربتك في {selected.name}</h2><p>مساهمتك تساعد الآخرين على اختيار المكان المناسب.</p><label>كيف كانت تجربتك؟</label><div className="stars">{[1,2,3,4,5].map(n=><Star key={n} fill={n<5?"currentColor":"none"}/>)}</div><label>ملاحظتك</label><textarea placeholder="ما أكثر شيء أعجبك؟ وما الذي يجب معرفته قبل الزيارة؟"/><button className="submit" onClick={()=>setShareOpen(false)}>إرسال التجربة</button></div></div>}
  </main>
}
