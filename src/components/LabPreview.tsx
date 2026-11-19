import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Grid, Line, OrbitControls, RoundedBox } from '@react-three/drei';
import { ACESFilmicToneMapping, AdditiveBlending, CanvasTexture, Group, SRGBColorSpace } from 'three';
import { ArrowUpRight, Box, FlaskConical, Maximize, MousePointer2, Pause, Play, RotateCcw, RotateCw, Settings2, X } from 'lucide-react';
import { createBattery, createBulb } from './labObjects';

class PreviewBoundary extends Component<{children:ReactNode;onOpen:()=>void},{failed:boolean}> {
  state={failed:false}; static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="ph-webgl-fallback"><FlaskConical size={40}/><h3>Laboratoriyaga xush kelibsiz</h3><p>3D ko‘rinish uchun brauzeringizda WebGL yoqilgan bo‘lishi kerak.</p><button onClick={this.props.onOpen}>Tajribalarni ochish</button></div>:this.props.children;}
}
function Rod({a,b,r=0.025,color='#d7b46a'}:{a:[number,number,number];b:[number,number,number];r?:number;color?:string}) {return <Line points={[a,b]} color={color} lineWidth={r*130}/>;}
function CameraFraming() {
  const {camera,size}=useThree();
  useEffect(()=>{const distance=8.5*Math.max(1,1.7/(size.width/size.height));camera.position.set(3.2,2.8,distance);camera.lookAt(0,1.1,0);camera.updateProjectionMatrix();},[camera,size.width,size.height]);
  return null;
}
function Glow({position,color,size=1}:{position:[number,number,number];color:string;size?:number}) {
  const map=useMemo(()=>{const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d')!;const g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#ffffffcc');g.addColorStop(.15,'#ffffff70');g.addColorStop(.45,'#ffffff20');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new CanvasTexture(c);},[]);
  return <sprite position={position} scale={[size,size,1]}><spriteMaterial map={map} color={color} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false}/></sprite>;
}
function Blackboard() {
  const map=useMemo(()=>{const c=document.createElement('canvas');c.width=768;c.height=384;const ctx=c.getContext('2d')!;ctx.fillStyle='#243e46';ctx.fillRect(0,0,768,384);ctx.fillStyle='#d1e4df99';ctx.font='italic 62px Georgia';ctx.fillText('F = ma',65,115);ctx.fillText('E = mc²',65,225);ctx.font='20px sans-serif';ctx.fillStyle='#b3d4d066';ctx.fillText('PHAZEX SCIENCE LAB',65,315);ctx.strokeStyle='#c6e0dc66';ctx.lineWidth=4;[0,1,2].forEach(i=>{ctx.save();ctx.translate(580,160);ctx.rotate(i*Math.PI/3);ctx.beginPath();ctx.ellipse(0,0,105,37,0,0,Math.PI*2);ctx.stroke();ctx.restore();});const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;},[]);
  return <mesh position={[0,2.7,-3.16]}><planeGeometry args={[3.4,1.7]}/><meshStandardMaterial map={map} roughness={.95}/></mesh>;
}
function Cradle({running,length,angle,timeRef}:{running:boolean;length:number;angle:number;timeRef:React.MutableRefObject<number>}) {
  const left=useRef<Group>(null);const right=useRef<Group>(null);
  const pivot=2.35; const rope=1.1+length*0.45;
  useFrame((_,dt)=>{if(running)timeRef.current+=Math.min(dt,0.05); const v=Math.sin(timeRef.current*Math.sqrt(9.81/length))*angle*Math.PI/180;if(left.current)left.current.rotation.z=Math.max(0,v);if(right.current)right.current.rotation.z=Math.min(0,v);});
  return <group position={[-2.3,0,0]}>
    <RoundedBox args={[2.65,0.18,1.2]} radius={0.07} position={[0,0.12,0]} castShadow receiveShadow><meshStandardMaterial color="#33386c" metalness={0.6} roughness={0.25}/></RoundedBox>
    {[-0.43,0.43].map(z=><group key={z}>{[-1.1,1.1].map(x=><mesh key={x} position={[x*1.05,1.3,z]} rotation={[0,0,x>0?0.09:-0.09]} castShadow><cylinderGeometry args={[0.045,0.06,2.35,24]}/><meshStandardMaterial color="#d3aa52" metalness={0.95} roughness={0.18}/></mesh>)}<mesh position={[0,pivot,z]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[0.045,0.045,2.4,24]}/><meshStandardMaterial color="#e4bb6b" metalness={1} roughness={0.18}/></mesh></group>)}
    {[-0.72,-0.36,0,0.36,0.72].map((x,i)=><group key={x} position={[x,pivot,0]} ref={i===0?left:i===4?right:undefined}>
      {[-0.43,0.43].map(z=><Rod key={z} a={[0,0,z]} b={[0,-rope,0]} r={0.008} color="#dce4f4"/>)}
      <mesh position={[0,-rope,0]} castShadow><sphereGeometry args={[0.18,40,32]}/><meshStandardMaterial color={i===0?'#2863e4':'#d4ac52'} metalness={0.97} roughness={0.13}/></mesh>
    </group>)}
  </group>;
}
function Circuit({lit}:{lit:boolean}) {
  const battery=useMemo(()=>createBattery(),[]);
  const bulb=useMemo(()=>createBulb(lit),[lit]);
  return <group position={[0.45,0,0.3]}>
    <RoundedBox args={[2,0.08,1.3]} radius={0.04} position={[0,0.1,0]} receiveShadow><meshStandardMaterial color="#60677d" metalness={0.6} roughness={0.25}/></RoundedBox>
    <primitive object={battery} position={[-0.55,0.39,0]} scale={.85}/>
    <primitive object={bulb} position={[0.5,0.14,0]}/>
    {lit&&<><pointLight position={[0.5,1,0]} intensity={5} distance={3} color="#ffb548"/><Glow position={[0.5,0.95,0]} color="#ffb349" size={1.45}/></>}
    <Line points={[[-1,0.36,0],[-1.08,0.2,0.65],[0.8,0.2,0.65],[0.8,0.32,0]]} color="#f5484f" lineWidth={4}/>
    <Line points={[[-0.1,0.36,0],[-0.1,0.2,-0.4],[0.4,0.2,-0.4],[0.4,0.32,0]]} color="#252b42" lineWidth={4}/>
  </group>;
}
function AtomModel({running}:{running:boolean}) {
  const orbit=useRef<Group>(null);useFrame((_,dt)=>{if(orbit.current&&running)orbit.current.rotation.y+=dt*0.3;});
  return <group position={[2.65,0,0]}><mesh position={[0,0.16,0]} castShadow><cylinderGeometry args={[0.55,0.64,0.18,48]}/><meshStandardMaterial color="#303950" metalness={0.8} roughness={0.22}/></mesh><mesh position={[0,0.55,0]}><cylinderGeometry args={[0.045,0.07,0.7,24]}/><meshStandardMaterial metalness={0.9} roughness={0.2} color="#929cb3"/></mesh><group position={[0,1.42,0]} ref={orbit}>
    {Array.from({length:9},(_,i)=><mesh key={i} position={[Math.cos(i*2.4)*0.17,Math.sin(i*2.4)*0.17,(i%3-1)*0.13]}><sphereGeometry args={[0.14,24,24]}/><meshStandardMaterial color={i%2?'#e334a2':'#397be5'} metalness={0.45} roughness={0.2}/></mesh>)}
    {[0,1,2].map(i=><group key={i} rotation={[0.7+i*0.6,i*1.05,0]}><mesh><torusGeometry args={[0.78,0.009,8,100]}/><meshStandardMaterial color="#75c8ff" emissive="#3c9dff" emissiveIntensity={3} toneMapped={false}/></mesh><mesh position={[0.78,0,0]}><sphereGeometry args={[0.07,20,20]}/><meshStandardMaterial color="#f88cda" emissive="#e753d8" emissiveIntensity={2}/></mesh></group>)}
  </group></group>;
}
function LabRoom() {
  return <group><mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]} receiveShadow><planeGeometry args={[30,25]}/><meshStandardMaterial color="#303953" roughness={0.29} metalness={0.25}/></mesh><Grid position={[0,0.005,0]} args={[24,16]} cellSize={0.65} cellThickness={0.5} cellColor="#8993b4" sectionColor="#929cbe" sectionSize={3.25} fadeDistance={18}/>
    <mesh position={[0,2.6,-3.4]} receiveShadow><boxGeometry args={[22,5.2,0.15]}/><meshStandardMaterial color="#3c4869" roughness={0.85}/></mesh><Blackboard/>
    <RoundedBox args={[3.5,1.9,0.12]} radius={0.06} position={[0,2.7,-3.25]}><meshStandardMaterial color="#253e48" roughness={0.9}/></RoundedBox>
    {[-5,3.3].map(x=><group key={x} position={[x,0,-3]}>{[0.9,1.9,3,4.1].map(y=><mesh key={y} position={[0,y,0]} castShadow><boxGeometry args={[2.7,0.09,0.6]}/><meshStandardMaterial color="#57617d" metalness={0.3} roughness={0.4}/></mesh>)}{[0,1,2,3,4,5].map(i=><mesh key={i} position={[(i%3-1)*0.7,1.17+Math.floor(i/3)*1.1,0]}><cylinderGeometry args={[0.12,0.18,0.45,24]}/><meshPhysicalMaterial color={['#a680ce','#76b9cf','#a4c89e'][i%3]} transparent opacity={0.7} roughness={0.12} metalness={0.15}/></mesh>)}</group>)}
  </group>;
}
export default function LabPreview({onOpen}:{onOpen:()=>void}) {
  const [running,setRunning]=useState(true);const [length,setLength]=useState(1);const [angle,setAngle]=useState(30);const [mass,setMass]=useState(0.2);const [lit,setLit]=useState(true);const [settings,setSettings]=useState(false);const [fullscreen,setFullscreen]=useState(false);const [tool,setTool]=useState('rotate');const [reset,setReset]=useState(0);const time=useRef(0);
  return <div className={'ph-preview '+(fullscreen?'ph-preview-full':'')}>
    <div className="ph-preview-canvas"><PreviewBoundary onOpen={onOpen}><Canvas key={reset} shadows dpr={[1,1.5]} camera={{position:[3.2,2.8,8.5],fov:38}} gl={{antialias:true,toneMapping:ACESFilmicToneMapping,toneMappingExposure:0.9}}><CameraFraming/><color attach="background" args={['#616b8d']}/><fog attach="fog" args={['#616b8d',17,32]}/><ambientLight intensity={0.45}/><directionalLight position={[-3,7,4]} intensity={2} color="#fff3df" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0005}/><pointLight position={[-4,3,-1]} color="#9c91ff" intensity={12}/><pointLight position={[4,3,1]} color="#8acbff" intensity={10}/><Suspense fallback={null}><Environment files="/environments/studio_small_03_1k.hdr" environmentIntensity={0.8}/><LabRoom/><Cradle running={running} length={length} angle={angle} timeRef={time}/><Circuit lit={lit}/><AtomModel running={running}/><ContactShadows position={[0,0.01,0]} opacity={0.4} scale={14} blur={2} far={5}/></Suspense><OrbitControls makeDefault target={[0,1.1,0]} enablePan={tool==='pan'} enableRotate={tool!=='select'} minDistance={5} maxDistance={15} maxPolarAngle={Math.PI/2-0.04}/></Canvas></PreviewBoundary></div>
    <div className="ph-preview-top"><button className="ph-lab-label" onClick={onOpen}><FlaskConical size={17}/> Fizika laboratoriyasi <ArrowUpRight size={15}/></button><div><span className="ph-3d-badge">3D</span><button className="ph-icon-button" onClick={()=>setFullscreen(!fullscreen)} aria-label={fullscreen?'To‘liq ekrandan chiqish':'To‘liq ekran'}>{fullscreen?<X size={18}/>:<Maximize size={18}/>}</button></div></div>
    <div className="ph-tools">{[{id:'select',icon:MousePointer2,label:'Tanlash'},{id:'pan',icon:Box,label:'Siljitish'},{id:'rotate',icon:RotateCw,label:'Aylantirish'}].map(t=><button key={t.id} title={t.label} aria-label={t.label} className={tool===t.id?'active':''} onClick={()=>setTool(t.id)}><t.icon size={18}/></button>)}</div>
    <div className="ph-parameters"><h4>Mayatnik</h4><label>Uzunlik <b>{length.toFixed(2)} m</b><input aria-label="Mayatnik uzunligi" type="range" min="0.5" max="1.6" step="0.05" value={length} onChange={e=>setLength(+e.target.value)}/></label><label>Burchak <b>{angle}°</b><input aria-label="Mayatnik burchagi" type="range" min="5" max="50" value={angle} onChange={e=>setAngle(+e.target.value)}/></label><label>Og‘irlik <b>{mass.toFixed(2)} kg</b><input aria-label="Mayatnik massasi" type="range" min="0.1" max="1" step="0.05" value={mass} onChange={e=>setMass(+e.target.value)}/></label><small>T = {(2*Math.PI*Math.sqrt(length/9.81)).toFixed(2)} s · E = {(mass*9.81*length*(1-Math.cos(angle*Math.PI/180))).toFixed(2)} J</small></div>
    <div className="ph-preview-caption"><span/> Jonli tajriba <span>·</span> Sichqoncha bilan aylantiring</div>
    <div className="ph-playback"><button className="ph-play-button" onClick={()=>setRunning(!running)} aria-label={running?'To‘xtatish':'Davom ettirish'}>{running?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</button><button className="ph-icon-button" onClick={()=>{time.current=0;setLength(1);setAngle(30);setMass(0.2);setReset(v=>v+1)}} aria-label="Qayta boshlash"><RotateCcw size={18}/></button><span className="ph-play-state">{running?'Tajriba davom etmoqda':'Tajriba to‘xtatildi'}</span><div className={'ph-time-track '+(running?'running':'')}><i/></div><button className="ph-light-toggle" onClick={()=>setLit(!lit)} aria-pressed={lit}>{lit?'Chiroq yoniq':'Chiroq o‘chiq'}</button><button className="ph-icon-button" onClick={()=>setSettings(!settings)} aria-label="Sahna sozlamalari"><Settings2 size={19}/></button></div>
    {settings&&<div className="ph-scene-settings"><b>Sahna sozlamalari</b><label><input type="checkbox" checked={lit} onChange={e=>setLit(e.target.checked)}/> Lampochka yoritishi</label><p>Davr: T = 2π√(L/g). Massa davrga ta’sir qilmaydi. Nyuton beshigi — idealizatsiyalangan ko‘rgazma.</p><button onClick={onOpen}>To‘liq tajribani ochish <ArrowUpRight size={15}/></button></div>}
  </div>;
}



