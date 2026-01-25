"use client";

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const vertexShader = `
  uniform float u_time;
  uniform float u_intensity;
  varying vec2 vUv;

  // 2D simplex noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }


  void main() {
    vUv = uv;
    vec3 pos = position;
    float noise = snoise(pos.xy * 0.8 + u_time * 0.1);
    noise += snoise(pos.yz * 0.6 + u_time * 0.2);
    pos += normal * noise * 0.05 * u_intensity;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform float u_time;
  
  // Using colors from the theme
  const vec3 color1 = vec3(0.89, 0.92, 0.81); // Pale Matcha
  const vec3 color2 = vec3(0.90, 0.90, 0.98); // Muted Lavender
  const vec3 color3 = vec3(0.99, 0.98, 0.97); // Cream

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float d = length(p);
    
    vec3 color = mix(color1, color2, smoothstep(0.1, 0.8, d + 0.2 * sin(u_time + vUv.x * 2.0)));
    color = mix(color, color3, smoothstep(0.4, 1.0, d));
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function BackgroundBlob() {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseVelocity = useRef(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.IcosahedronGeometry(1, 64);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_intensity: { value: 0.2 },
      },
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    let lastMousePos = { x: 0, y: 0 };
    let lastTime = performance.now();

    const onMouseMove = (event: MouseEvent) => {
        const now = performance.now();
        const dt = now - lastTime;
        const dx = event.clientX - lastMousePos.x;
        const dy = event.clientY - lastMousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dt > 0) {
          mouseVelocity.current = dist / dt;
        }

        lastMousePos = { x: event.clientX, y: event.clientY };
        lastTime = now;
    };

    window.addEventListener('mousemove', onMouseMove);

    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);

      // Dampen velocity
      mouseVelocity.current *= 0.95;
      
      const intensity = 0.2 + Math.min(mouseVelocity.current * 0.1, 1.5);
      
      material.uniforms.u_time.value = clock.getElapsedTime();
      material.uniforms.u_intensity.value = THREE.MathUtils.lerp(material.uniforms.u_intensity.value, intensity, 0.05);

      mesh.rotation.y += 0.0005;
      mesh.rotation.x += 0.0003;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="fixed top-0 left-0 -z-10 h-full w-full opacity-100 dark:opacity-80" />;
}
