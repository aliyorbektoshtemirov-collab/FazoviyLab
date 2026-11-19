import * as T from 'three';

export function createBattery() {
  const group=new T.Group();
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d')!;
  const gradient=ctx.createLinearGradient(0,0,1024,0);gradient.addColorStop(0,'#152f5a');gradient.addColorStop(.45,'#294f82');gradient.addColorStop(1,'#102949');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,512);ctx.fillStyle='#dfb968';ctx.fillRect(0,0,1024,38);ctx.fillRect(0,474,1024,38);
  ctx.fillStyle='#f4e8b5';ctx.font='bold 75px sans-serif';ctx.textAlign='center';ctx.fillText('PHAZEX',512,234);ctx.font='36px sans-serif';ctx.fillText('DC POWER CELL',512,298);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const shell=new T.Mesh(new T.CylinderGeometry(.225,.225,.9,64),new T.MeshStandardMaterial({map:texture,metalness:.65,roughness:.24}));shell.rotation.z=Math.PI/2;group.add(shell);
  const metal=new T.MeshStandardMaterial({color:'#dcc082',metalness:1,roughness:.19});
  [-.46,.46].forEach(x=>{const cap=new T.Mesh(new T.CylinderGeometry(.228,.228,.045,64),metal);cap.rotation.z=Math.PI/2;cap.position.x=x;group.add(cap);});
  const terminal=new T.Mesh(new T.CylinderGeometry(.07,.09,.065,32),metal);terminal.rotation.z=Math.PI/2;terminal.position.x=.505;group.add(terminal);
  group.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=true;});return group;
}

export function createBulb(lit=true) {
  const group=new T.Group();
  const metal=new T.MeshStandardMaterial({color:'#b2a58d',metalness:.95,roughness:.22});
  const mount=new T.Mesh(new T.CylinderGeometry(.28,.34,.13,64),new T.MeshStandardMaterial({color:'#2a3040',metalness:.65,roughness:.23}));mount.position.y=.07;group.add(mount);
  const socket=new T.Mesh(new T.CylinderGeometry(.14,.19,.24,48),new T.MeshStandardMaterial({color:'#292b31',roughness:.3}));socket.position.y=.23;group.add(socket);
  for(let i=0;i<6;i++){const ring=new T.Mesh(new T.TorusGeometry(.145,.013,8,48),metal);ring.rotation.x=Math.PI/2;ring.position.y=.31+i*.025;group.add(ring);}
  const profile=[[.14,.39],[.145,.48],[.19,.57],[.28,.67],[.32,.81],[.31,.94],[.25,1.06],[.14,1.14],[.01,1.17]].map(([x,y])=>new T.Vector2(x,y));
  const glass=new T.Mesh(new T.LatheGeometry(profile,64),new T.MeshPhysicalMaterial({color:'#fff5df',transmission:.94,thickness:.025,roughness:.055,ior:1.47,transparent:true,opacity:.72,side:T.DoubleSide}));group.add(glass);
  const points=Array.from({length:100},(_,i)=>new T.Vector3(-.12+i/99*.24,.78+Math.sin(i/99*Math.PI*14)*.028,Math.cos(i/99*Math.PI*14)*.028));
  const filament=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),100,.006,6,false),new T.MeshStandardMaterial({color:'#ffcf6b',emissive:'#ffc15c',emissiveIntensity:lit?8:0,toneMapped:false}));group.add(filament);
  [-.12,.12].forEach(x=>{const wire=new T.Mesh(new T.CylinderGeometry(.004,.004,.38,8),metal);wire.position.set(x,.6,0);group.add(wire);});
  group.traverse(o=>{if(o instanceof T.Mesh && o!==glass)o.castShadow=true;});return group;
}

export function createCircuitDisplay() {
  const group=new T.Group();const battery=createBattery();battery.position.set(-.8,.28,0);group.add(battery);const bulb=createBulb();bulb.position.set(.7,.06,0);group.add(bulb);
  const base=new T.Mesh(new T.BoxGeometry(2.8,.1,1.5),new T.MeshStandardMaterial({color:'#485977',metalness:.6,roughness:.24}));group.add(base);
  const path=new T.CatmullRomCurve3([new T.Vector3(-1.3,.28,0),new T.Vector3(-1.5,.13,.6),new T.Vector3(.8,.13,.6),new T.Vector3(.9,.15,0)]);
  group.add(new T.Mesh(new T.TubeGeometry(path,64,.025,10,false),new T.MeshStandardMaterial({color:'#e52d41',roughness:.3})));
  const key=new T.PointLight('#ffb94e',1.2,4);key.position.set(.7,.8,.1);group.add(key);return group;
}

