import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { createCircuitDisplay } from './labObjects';

// One renderer shared by every thumbnail; cards don't create WebGL contexts.
const cache = new Map<string, Promise<string>>();
let queue = Promise.resolve();
let renderer: THREE.WebGLRenderer | undefined;
let environment: THREE.Texture | undefined;
async function renderModel(url: string) {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(640,460); renderer.setPixelRatio(1);
    renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=0.85;
    const pmrem=new THREE.PMREMGenerator(renderer);
    const hdr=await new HDRLoader().loadAsync('/environments/studio_small_03_1k.hdr');
    const target=pmrem.fromEquirectangular(hdr);
    environment=target.texture; hdr.dispose(); pmrem.dispose();
  }
  const gltf=url.includes('light-bulb')?{scene:createCircuitDisplay()}:await new GLTFLoader().loadAsync(url);
  const scene=new THREE.Scene(); scene.environment=environment!;
  const model=gltf.scene;
  model.traverse(object=>{
    if(!(object instanceof THREE.Mesh)) return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    materials.forEach(material=>{
      if(!(material instanceof THREE.MeshStandardMaterial))return;
      if(url.includes('pendulum')) {
        material.color.set(material.name.includes('bob')?'#dbab3d':'#3c4d75');
        material.metalnessMap=null; material.metalness=.85; material.roughness=.23;
      }
      if(url.includes('dna-helix')){material.color.set('#1b9cbd');material.metalness=.5;material.roughness=.25;}
      if(material.name.includes('fluid')){material.color.set('#9425dd');material.emissive.set('#7018b5');material.emissiveIntensity=.2;material.opacity=.9;}
      if(material.name.includes('filament')){material.emissive.set('#ffb130');material.emissiveIntensity=4;}
      if(url.includes('light-bulb')&&material.name.includes('body')){material.color.set('#8d774a');material.metalnessMap=null;material.metalness=.9;material.roughness=.25;}
    });
  });
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model);
  const size=bounds.getSize(new THREE.Vector3()); const center=bounds.getCenter(new THREE.Vector3());
  const scale=3/Math.max(size.x,size.y,size.z);
  const group=new THREE.Group(); group.add(model); model.position.sub(center); group.scale.setScalar(scale);
  group.rotation.y=-0.35; scene.add(group);
  scene.add(new THREE.AmbientLight('#d9dfff',0.3));
  const key=new THREE.DirectionalLight('#fff0da',1.5); key.position.set(3,5,5); scene.add(key);
  const rim=new THREE.DirectionalLight('#a998ff',0.8); rim.position.set(-4,2,-2); scene.add(rim);
  const camera=new THREE.PerspectiveCamera(36,640/460,0.01,100); camera.position.set(3,1.8,6.7); camera.lookAt(0,0,0);
  await renderer.compileAsync(scene,camera);
  renderer.render(scene,camera);
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  renderer.render(scene,camera); const result=renderer.domElement.toDataURL('image/png');
  model.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose(); const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)v.dispose();});m.dispose();});}});
  return result;
}
function thumbnail(url:string) {
  if(!cache.has(url)) {const task=queue.then(()=>renderModel(url));cache.set(url,task);queue=task.then(()=>{},()=>{});}
  return cache.get(url)!;
}
export default function ModelThumbnail({model,subject,large=false}:{model:string;subject:string;large?:boolean}) {
  const [src,setSrc]=useState(''); const [failed,setFailed]=useState(false);
  useEffect(()=>{let active=true;thumbnail(model).then(s=>{if(active)setSrc(s);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[model]);
  return src?<img className={'ph-model-thumb '+(large?'large':'')} src={src} alt={subject+' — teksturali 3D model'} loading="lazy"/>:<span className="ph-model-loading">{failed?'3D model': '3D model yuklanmoqda…'}</span>;
}
