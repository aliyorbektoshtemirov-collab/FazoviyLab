import { useMemo, useState } from 'react';
import { ArrowRight, Atom, Box, Eye, FlaskConical, Globe2, Play, Search, X, BookOpen, Sparkles } from 'lucide-react';
import { SUBJECTS } from '../data/catalog';
import type { SubjectId } from '../types';
import LabPreview from './LabPreview';
import ModelThumbnail from './ModelThumbnail';

const subjects: {id: SubjectId; name: string; note: string; model: string}[] = [
  {id:'physics', name:'Fizika', note:'Harakatdan kashfiyotgacha', model:'/models/math/pendulum.glb'},
  {id:'chemistry', name:'Kimyo', note:'Har bir atom — yangi olam', model:'/models/chemistry/flask-erlenmeyer.glb'},
  {id:'biology', name:'Biologiya', note:'Hayot sirlarini o‘rganing', model:'/models/biology/dna-helix.glb'},
  {id:'math', name:'Matematika', note:'G‘oyalarni shakllantiring', model:'/models/math/weight-block-set.glb'},
];
const popular = [
  {id:'physics-circuit-construction-dc', title:'Elektr zanjiri', tag:'Fizika', kind:'circuit', text:'Zanjirni ulang. Chiroqni yoqing.'},
  {id:'chemistry-build-a-molecule', title:'Molekulalar olami', tag:'Kimyo', kind:'molecule', text:'Kichik atomlar. Katta kashfiyotlar.'},
  {id:'math-pendulum', title:'Mayatnik va harakat', tag:'Matematika', kind:'pendulum', text:'Tebranish qonunlarini tajribada sinang.'},
];

export default function Dashboard({onSelectSimulation}: {onSelectSimulation:(id:string)=>void}) {
  const [filter,setFilter] = useState<SubjectId|'all'>('all');
  const [search,setSearch] = useState('');
  const [lessons,setLessons] = useState(false);
  const simulations = useMemo(()=>SUBJECTS.filter(s=>filter==='all'||s.id===filter).flatMap(s=>s.simulations.map(sim=>({...sim,subject:s}))).filter(s=>(s.title+' '+s.shortDescription).toLocaleLowerCase().includes(search.toLocaleLowerCase())),[filter,search]);
  const goCatalog = (id:SubjectId|'all'='all') => {setFilter(id); document.getElementById('catalog')?.scrollIntoView({behavior:'smooth'});};
  return <div className="ph-page">
    <header className="ph-nav">
      <a className="ph-logo" href="#" aria-label="Phazex 3D bosh sahifa"><span className="ph-mark"><Box size={30}/><i/></span> PHAZEX <em>3D</em></a><span className="ph-nav-divider"/>
      <nav aria-label="Asosiy navigatsiya"><button onClick={()=>goCatalog()}>Simulyatsiyalar</button><a href="#subjects">Fanlar</a><button onClick={()=>setLessons(true)}>Darslar</button></nav>
      <div className="ph-nav-right"><span className="ph-language"><Globe2 size={20}/> UZ</span><button className="ph-nav-cta" onClick={()=>onSelectSimulation('math-pendulum')}><FlaskConical size={17}/> Laboratoriya <ArrowRight size={16}/></button></div>
    </header>
    <main>
      <section className="ph-hero">
        <div className="ph-hero-copy"><span className="ph-eyebrow"><span/> BILIMNING YANGI O‘LCHAMI</span><h1>Ilmni <em>3D olamda</em><br/>kashf eting<span>.</span></h1><p>Tajriba qiling. Kuzating. Tushuning.<br/><span>Murakkab g‘oyalarni o‘z ko‘zingiz bilan ko‘ring.</span></p>
          <div className="ph-hero-actions"><button className="ph-primary" onClick={()=>onSelectSimulation('math-pendulum')}><Play size={18} fill="currentColor"/> Tajribani boshlash</button><button className="ph-secondary" onClick={()=>goCatalog()}><Eye size={19}/> Barchasini ko‘rish</button></div><div className="ph-proof"><span><Box size={15}/> Haqiqiy 3D modellar</span><i/><span><Sparkles size={15}/> 40 ta interaktiv tajriba</span></div>
        </div><LabPreview onOpen={()=>onSelectSimulation('math-pendulum')}/>
      </section>
      <section id="subjects" className="ph-section"><div className="ph-section-heading"><h2>Fanlar bo‘yicha o‘rganing</h2><span>Qiziqishingizdan boshlang</span></div><div className="ph-subjects">{subjects.map(s=><button key={s.id} className={'ph-subject ph-'+s.id} onClick={()=>goCatalog(s.id)}><div><h3>{s.name}</h3><p>{s.note}</p><span className="ph-round-arrow"><ArrowRight size={22}/></span></div><ModelThumbnail model={s.model} subject={s.id}/><span className="ph-subject-count">10 ta tajriba</span></button>)}</div></section>
      <section className="ph-section"><div className="ph-section-heading"><h2>Mashhur simulyatsiyalar</h2><button onClick={()=>goCatalog()}>Barchasi <ArrowRight size={20}/></button></div><div className="ph-popular">{popular.map((p,i)=><button className="ph-sim-card" key={p.id} onClick={()=>onSelectSimulation(p.id)}><div className={'ph-sim-image ph-sim-'+p.kind}><span className="ph-live"><span/> INTERAKTIV 3D</span><ModelThumbnail model={i===0?'/models/physics/light-bulb.glb':i===1?'/models/chemistry/molecule-tetrahedral.glb':'/models/math/pendulum.glb'} subject={i===1?'chemistry':'physics'} large/><span className="ph-sim-formula">{i===0?'U = I · R':i===1?'H₂O':'T = 2π√(L/g)'}</span></div><div className="ph-sim-body"><div><span className={'ph-tag tag-'+i}>{p.tag}</span><h3>{p.title}</h3><p>{p.text}</p></div><span className="ph-card-arrow"><ArrowRight size={22}/></span></div></button>)}</div></section>
      <section id="catalog" className="ph-section ph-catalog"><div className="ph-section-heading"><div><span className="ph-eyebrow">SIZNING VIRTUAL LABORATORIYANGIZ</span><h2>Kashf qilishda davom eting</h2></div><label className="ph-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tajribani qidirish…" aria-label="Tajribani qidirish"/>{search&&<button onClick={()=>setSearch('')} aria-label="Qidiruvni tozalash"><X size={16}/></button>}</label></div><div className="ph-filters">{[{id:'all' as const,name:'Barcha fanlar'},...subjects].map(s=><button className={filter===s.id?'active':''} key={s.id} onClick={()=>setFilter(s.id)}>{s.name}<span>{s.id==='all'?'40':'10'}</span></button>)}</div><div className="ph-catalog-grid">{simulations.map(s=><button key={s.id} onClick={()=>onSelectSimulation(s.id)}><span className={'ph-catalog-icon '+s.subjectId}>{s.subjectId==='chemistry'?<FlaskConical/>:s.subjectId==='math'?<Box/>:<Atom/>}</span><div><small>{s.subject.name}</small><h3>{s.title}</h3><p>{s.shortDescription}</p></div><ArrowRight size={18}/></button>)}</div>{!simulations.length&&<p className="ph-empty">Tajriba topilmadi. Boshqa so‘z bilan qidiring.</p>}</section>
      <section className="ph-bottom-banner"><span className="ph-banner-icon"><FlaskConical size={30}/></span><div><h2>O‘qishdan — sinab ko‘rishga.</h2><p>Xatolardan qo‘rqmang. Har bir tajriba — yangi bilim.</p></div><button className="ph-primary" onClick={()=>onSelectSimulation('physics-circuit-construction-dc')}>O‘z tajribamni boshlash <ArrowRight size={18}/></button></section>
    </main><footer className="ph-footer"><a className="ph-logo" href="#"><Box size={24}/> PHAZEX <em>3D</em></a><span>Ilmni his qiling. Kelajakni yarating.</span><span>O‘zbek tilidagi virtual laboratoriya</span></footer>
    {lessons&&<div className="ph-modal-backdrop" onClick={()=>setLessons(false)}><section className="ph-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-title" onClick={e=>e.stopPropagation()}><button className="ph-modal-close" onClick={()=>setLessons(false)} aria-label="Yopish"><X/></button><BookOpen size={32}/><h2 id="lesson-title">Bugun nimani kashf etamiz?</h2><p>Tayyor tajribani tanlang va bosqichma-bosqich o‘rganing.</p>{[{id:'math-pendulum',name:'1. Mayatnik: uzunlik davrga qanday ta’sir qiladi?'},{id:'physics-ohms-law',name:'2. Om qonuni: kuchlanish va qarshilik'},{id:'chemistry-balancing-equations',name:'3. Kimyoviy reaksiyalarni tenglashtirish'}].map(l=><button key={l.id} onClick={()=>{setLessons(false);onSelectSimulation(l.id)}}>{l.name}<ArrowRight size={18}/></button>)}</section></div>}
  </div>;
}
