/* ===============================================================
   CSI SHARED HEADER — standardize the logo and navigation on
   interior pages without rewriting their content or forms.
   The homepage already has this header and is left untouched.
   =============================================================== */
(() => {
  const isHome = !!document.querySelector('.arrival');
  if (isHome) return;

  const sections = [
    ['framework.html', 'Framework'],
    ['human-os.html', 'Human OS'],
    ['discovery-session.html', 'Discovery Session'],
    ['index.html#dynamics', 'Dynamics'],
    ['index.html#journey', "Hero's Journey"],
    ['index.html#research', 'Research'],
    ['https://coherentsystems.discourse.group/', 'Community'],
    ['index.html#about', 'About']
  ];
  const currentFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  let header = document.querySelector('header.site-header');
  if (!header) {
    header = document.createElement('header');
    header.className = 'site-header';
    document.body.insertBefore(header, document.body.firstChild);
  }
  header.classList.add('csi-shared-header');
  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = 'index.html#home';
  brand.setAttribute('aria-label', 'Coherent Systems Institute home');
  const logo = document.createElement('img');
  logo.src = 'images/csi-logo.png';
  logo.alt = 'Coherent Systems Institute — Expanding Human Experience';
  logo.className = 'brand-logo';
  logo.decoding = 'async';
  brand.appendChild(logo);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Main navigation');
  for (const [href, title] of sections) {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = title;
    if (href.startsWith('https://')) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    if (href.toLowerCase() === currentFile) link.setAttribute('aria-current', 'page');
    nav.appendChild(link);
  }
  // Replace the old logo/nav; keep the rest of every page unmodified.
  header.replaceChildren(brand, nav);
})();

// Keep the footer year current.
const yearElement = document.getElementById("current-year");
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// Highlight the destination currently in view, giving the page a subtle
// "navigation through a world" feeling without hijacking normal scrolling.
const sectionLinks = [...document.querySelectorAll('.site-header nav a[href*="#"]')];
const trackedSections = sectionLinks
  .map((link) => {
    const hash = new URL(link.href, window.location.href).hash;
    return hash ? document.querySelector(hash) : null;
  })
  .filter(Boolean);

if ("IntersectionObserver" in window && trackedSections.length) {
  const linkById = new Map();
  sectionLinks.forEach((link) => {
    const hash = new URL(link.href, window.location.href).hash;
    if (hash) linkById.set(hash.slice(1), link);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach((link) => link.removeAttribute("aria-current"));
      const activeLink = linkById.get(entry.target.id);
      if (activeLink) activeLink.setAttribute("aria-current", "location");
    });
  }, {
    rootMargin: "-25% 0px -55% 0px",
    threshold: 0
  });

  [...new Set(trackedSections)].forEach((section) => observer.observe(section));
}

// Give the three CCF mode cards a small, accessible focus/hover response.
document.querySelectorAll('#framework .card').forEach((card) => {
  card.addEventListener('pointerenter', () => card.classList.add('is-highlighted'));
  card.addEventListener('pointerleave', () => card.classList.remove('is-highlighted'));
  card.addEventListener('focusin', () => card.classList.add('is-highlighted'));
  card.addEventListener('focusout', () => card.classList.remove('is-highlighted'));
});

// The arrival cards link to live descriptions further down the same page.
// Keyboard and pointer activation use normal anchors so browser history works.

/* ===============================================================
   CSI LIVING EARTH — automatic ambient Earth + stellar movement.
   Not a control or modal. Rendered on every page sharing this JS.
   =============================================================== */
(() => {
  'use strict';
  const root = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const home = !!document.querySelector('.arrival');
  root.classList.add('csi-living-earth');
  if (home) root.classList.add('home-page');
  if (document.querySelector('.csi-space-environment')) return;

  const environment = document.createElement('div');
  environment.className = 'csi-space-environment';
  environment.setAttribute('aria-hidden', 'true');
  const stars = document.createElement('canvas');
  stars.className = 'csi-constellations';
  const earth = document.createElement('canvas');
  earth.className = 'csi-earth-render';
  const horizon = document.createElement('div');
  horizon.className = 'csi-horizon-light';
  const shade = document.createElement('div');
  shade.className = 'csi-space-vignette';
  environment.append(stars,earth,horizon,shade);
  root.insertBefore(environment,root.firstChild);

  // Store one continuous orbit angle through normal HTML page changes.
  const ORBIT_KEY = 'csi-living-earth-orbit';
  let orbit = -1.55;
  try {
    const previous = JSON.parse(sessionStorage.getItem(ORBIT_KEY)||'null');
    if (previous && Number.isFinite(previous.angle) && Number.isFinite(previous.at)) {
      orbit = previous.angle + Math.min(180,(Date.now()-previous.at)/1000) * (reducedMotion ? 0 : .044);
    }
  } catch (_) {}
  let driftExtra = 0, desiredExtra = 0;
  let lastTime = 0, lastSave = 0, lastStar = 0, lastScroll = window.scrollY;
  let gl = null, program, resolution, yawLoc, texture, hasTexture = false;
  let softwareContext=null,softwareSource=null,softwareOutput=null;
  let softwareU=null,softwareV=null,softwareShade=null,softwareAlpha=null,softwareRim=null;
  let softWidth=0,softHeight=0,lastSoftware=-500;
  const starCtx = stars.getContext('2d');

  const vertexSource = `
    attribute vec2 aPosition;
    void main(){gl_Position=vec4(aPosition,0.,1.);}
  `;
  const fragmentSource = `
    precision highp float;
    uniform vec2 uResolution;
    uniform sampler2D uEarth;
    uniform float uYaw;
    const float PI=3.141592653589793;
    void main(){
      vec2 frag = vec2(gl_FragCoord.x,uResolution.y-gl_FragCoord.y);
      float w=uResolution.x, h=uResolution.y;
      float radius=max(1300.,w*1.24);
      float top=h*0.555;
      vec2 center=vec2(w*.50,top+radius);
      vec2 p=(frag-center)/radius;
      float r2=dot(p,p);
      if(r2>=1.){
        // Only a fine luminous horizon, never a broad sphere-shaped halo.
        float d=(sqrt(r2)-1.)*radius;
        float glow=exp(-d*d/(2.*21.*21.));
        vec3 hue=vec3(.03,.42,.74);
        gl_FragColor=vec4(hue,glow*.28);
        return;
      }
      vec3 n=vec3(p.x,-p.y,sqrt(max(0.,1.-r2)));
      // Incline the world so the cap displays real geography, not a polar ice disc.
      float tilt=1.14;
      vec3 geo=vec3(n.x,n.y*cos(tilt)-n.z*sin(tilt),n.y*sin(tilt)+n.z*cos(tilt));
      float longitude=atan(geo.x,geo.z)+uYaw;
      float latitude=asin(clamp(geo.y,-1.,1.));
      vec2 uv=vec2(fract(.5+longitude/(2.*PI)),.5-latitude/PI);
      vec3 surface=texture2D(uEarth,uv).rgb;
      float sun=dot(n,normalize(vec3(-.25,.78,.78)));
      float light=.29+.82*smoothstep(-.28,.9,sun);
      float limb=pow(1.-n.z,4.0);
      vec3 color=surface*light;
      color+=limb*vec3(.006,.13,.21)*.5;
      // blue atmosphere follows Earth’s narrow edge, not a separate circle
      float rim=pow(1.-n.z,12.);
      color+=rim*vec3(.02,.30,.51)*.56;
      gl_FragColor=vec4(color,.98);
    }
  `;
  const compile=(type,source)=>{
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  function prepareGL(){
    try {
      gl=earth.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,depth:false}) || earth.getContext('experimental-webgl',{alpha:true});
      if(!gl) throw Error('WebGL unavailable');
      program=gl.createProgram();
      gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexSource));
      gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentSource));
      gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const vertex=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertex);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      const attrib=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(attrib);
      gl.vertexAttribPointer(attrib,2,gl.FLOAT,false,0,0);
      resolution=gl.getUniformLocation(program,'uResolution');
      yawLoc=gl.getUniformLocation(program,'uYaw');
      texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([8,24,44,255]));
      gl.uniform1i(gl.getUniformLocation(program,'uEarth'),0);
      const textureImage=new Image();
      textureImage.onload=()=>{
        if (!gl) return;
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textureImage);
        hasTexture=true;
        paintWorld();
      };
      textureImage.onerror=()=>useFallback();
      textureImage.src='images/earth-texture.webp';
    } catch(e){ useFallback(); }
  }
  // Canvas 2D fallback: real equirectangular sphere projection, automatically rotating.
  // All visible continents and ocean texture move, even on browsers without WebGL.
  function useFallback(){
    gl=null;
    root.classList.add('csi-earth-software');
    try { softwareContext=earth.getContext('2d',{alpha:true}); }
    catch(_) { softwareContext=null; }
    if(!softwareContext) return;
    const source=new Image();
    source.onload=()=>{
      const offscreen=document.createElement('canvas');
      offscreen.width=2048;offscreen.height=1024;
      const ctx=offscreen.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(source,0,0,2048,1024);
      softwareSource=ctx.getImageData(0,0,2048,1024).data;
      resize();
    };
    source.src='images/earth-texture.webp';
  }
  function prepareSoftwareProjection(){
    if(!softwareContext||!softwareSource)return;
    softWidth=earth.width;softHeight=earth.height;
    const len=softWidth*softHeight;
    softwareOutput=softwareContext.createImageData(softWidth,softHeight);
    softwareU=new Float32Array(len);
    softwareV=new Uint16Array(len);
    softwareShade=new Float32Array(len);
    softwareAlpha=new Uint8Array(len);
    softwareRim=new Float32Array(len);
    const radius=Math.max(1300,innerWidth*1.24);
    const top=innerHeight*.555;
    const scaleX=innerWidth/softWidth,scaleY=innerHeight/softHeight;
    const c=Math.cos(1.14),s=Math.sin(1.14);
    for(let y=0;y<softHeight;y++){
      const py=(y+.5)*scaleY;
      const ny=(top+radius-py)/radius;
      for(let x=0;x<softWidth;x++){
        const i=y*softWidth+x;
        const nx=((x+.5)*scaleX-innerWidth*.50)/radius;
        const r2=nx*nx+ny*ny;
        if(r2>=1){
          const distance=(Math.sqrt(r2)-1)*radius;
          softwareAlpha[i]=Math.round(65*Math.exp(-(distance*distance)/(2*21*21)));
          continue;
        }
        const z=Math.sqrt(1-r2);
        const gy=ny*c-z*s;
        const gz=ny*s+z*c;
        softwareU[i]=.5+Math.atan2(nx,gz)/(2*Math.PI);
        softwareV[i]=Math.max(0,Math.min(1023,Math.floor((.5-Math.asin(Math.max(-1,Math.min(1,gy)))/Math.PI)*1024)));
        const sun=nx*-.25+ny*.78+z*.78;
        const smooth=Math.max(0,Math.min(1,(sun+.28)/1.18));
        const light=.29+.82*smooth*smooth*(3-2*smooth);
        const rim=Math.pow(1-z,14);
        softwareShade[i]=light;softwareRim[i]=rim;
        softwareAlpha[i]=250;
      }
    }
  }
  function renderSoftware(time){
    if(!softwareSource||!softwareOutput||!softwareContext||time-lastSoftware<180)return;
    lastSoftware=time;
    const out=softwareOutput.data;
    const theta=(orbit+driftExtra)/(2*Math.PI);
    for(let i=0;i<softwareU.length;i++){
      const offset=i*4;
      const alpha=softwareAlpha[i];
      if(alpha===0){out[offset+3]=0;continue;}
      if(alpha<200){out[offset]=8;out[offset+1]=108;out[offset+2]=189;out[offset+3]=alpha;continue;}
      let u=softwareU[i]+theta;u=u-Math.floor(u);
      const ix=Math.min(2047,Math.floor(u*2048));
      const src=(softwareV[i]*2048+ix)*4;
      const shade=softwareShade[i];
      out[offset]=Math.min(255,softwareSource[src]*shade*.82 + softwareRim[i]*12);
      out[offset+1]=Math.min(255,softwareSource[src+1]*shade*.96 + softwareRim[i]*84);
      out[offset+2]=Math.min(255,softwareSource[src+2]*shade*1.16+ softwareRim[i]*155);
      out[offset+3]=alpha;
    }
    softwareContext.putImageData(softwareOutput,0,0);
  }
  function resize(){
    const w=innerWidth,h=innerHeight;
    const dpr=Math.min(devicePixelRatio||1,1.4);
    stars.width=Math.max(1,Math.round(w*dpr));stars.height=Math.max(1,Math.round(h*dpr));
    starCtx.setTransform(dpr,0,0,dpr,0,0);
    if(gl){
      earth.width=Math.max(1,Math.round(w*dpr));earth.height=Math.max(1,Math.round(h*dpr));
      gl.viewport(0,0,earth.width,earth.height);
    } else if(softwareContext){
      earth.width=Math.min(1672,Math.max(420,Math.round(w*.97)));
      earth.height=Math.round(earth.width*h/w);
      prepareSoftwareProjection();
    }
    paintStars(performance.now());paintWorld();
  }
  function paintWorld(){
    if(!gl)return;
    gl.viewport(0,0,earth.width,earth.height);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(resolution,earth.width,earth.height);
    gl.uniform1f(yawLoc,orbit+driftExtra);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  // Handpicked illustrative line groups, not labels for real constellations.
  const connections=[
    [[.085,.28],[.145,.21],[.214,.26],[.265,.18],[.315,.25]],
    [[.72,.21],[.79,.28],[.85,.24],[.91,.31],[.951,.22]],
    [[.32,.12],[.38,.07],[.44,.145],[.51,.105]]
  ];
  let seed=87123;
  function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
  const particles=Array.from({length:170},()=>({x:random(),y:random()*.68,r:.28+random()*1.23,phase:random()*6.283,depth:.4+random()}));
  function paintStars(t){
    if(!starCtx)return;
    const w=innerWidth,h=innerHeight;
    starCtx.clearRect(0,0,w,h);
    const shift=reducedMotion?0:t*.0000025;
    for(const star of particles){
      const x=((star.x+shift*star.depth)%1)*w;
      const y=star.y*h;
      const flicker=reducedMotion? .6 : .45+.24*Math.sin(t*.00067+star.phase);
      starCtx.beginPath();starCtx.arc(x,y,star.r,0,Math.PI*2);
      starCtx.fillStyle=`rgba(130,216,255,${flicker})`;starCtx.fill();
    }
    connections.forEach((points,i)=>{
      const translated=points.map(([x,y])=>[x*w+Math.sin(shift*12+i)*12,y*h+Math.cos(shift*7+i)*5]);
      starCtx.beginPath();
      translated.forEach(([x,y],idx)=>idx?starCtx.lineTo(x,y):starCtx.moveTo(x,y));
      starCtx.strokeStyle='rgba(77,199,254,.15)';starCtx.lineWidth=.85;starCtx.stroke();
      translated.forEach(([x,y])=>{
        starCtx.beginPath();starCtx.arc(x,y,1.55,0,Math.PI*2);
        starCtx.fillStyle='rgba(114,232,255,.67)';starCtx.fill();
      });
    });
  }
  prepareGL();
  window.addEventListener('resize',resize,{passive:true});resize();
  const save=()=>{try{sessionStorage.setItem(ORBIT_KEY,JSON.stringify({angle:orbit+driftExtra,at:Date.now()}));}catch(_){}};
  window.addEventListener('pagehide',save);
  // Scrolling nudges the orbit, but never turns the globe into a draggable toy.
  window.addEventListener('scroll',()=>{
    if (reducedMotion)return;
    const difference=scrollY-lastScroll;
    lastScroll=scrollY;
    desiredExtra+=Math.max(-.035,Math.min(.035,difference*.00011));
  },{passive:true});
  document.querySelectorAll('a[href]').forEach((link)=>{
    const target=link.getAttribute('href')||'';
    if(!target||target.startsWith('mailto:')||target.startsWith('tel:'))return;
    link.addEventListener('pointerenter',()=>{if(!reducedMotion)desiredExtra+=.04;},{passive:true});
    link.addEventListener('click',(event)=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target==='_blank')return;
      const url=new URL(link.href,location.href);
      if(url.origin!==location.origin)return;
      if(!reducedMotion)desiredExtra+=.22;
      save();
      // Keep a short, subtle navigation motion for full HTML page changes.
      if(reducedMotion || (url.pathname===location.pathname && !!url.hash))return;
      event.preventDefault();root.classList.add('csi-page-leaving');
      setTimeout(()=>{save();location.href=url.href;},235);
    });
  });
  function frame(t){
    if(document.hidden){lastTime=t;requestAnimationFrame(frame);return;}
    const dt=Math.min(.08,Math.max(0,(t-lastTime)/1000||0));lastTime=t;
    if(!reducedMotion){orbit+=dt*.044;driftExtra+=(desiredExtra-driftExtra)*Math.min(1,dt*2.0);}
    if(t-lastStar>52){paintStars(t);lastStar=t;}
    if(gl&&hasTexture)paintWorld();else renderSoftware(t);
    if(t-lastSave>4000){save();lastSave=t;}
    if(!reducedMotion)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
