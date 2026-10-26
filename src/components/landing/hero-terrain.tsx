"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Low-poly olive terrain behind the hero (drawing v2). When WebGL is missing or motion is reduced the canvas
// stays empty and the SVG ridges (#lp-ridgeBack / #lp-ridgeFront) remain the background.
export function HeroTerrain({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const section = canvas?.parentElement;
    if (!canvas || !section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return;
    }
    const ridges = ["lp-ridgeBack", "lp-ridgeFront"].map((id) => document.getElementById(id));
    ridges.forEach((r) => r && (r.style.display = "none"));

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b0d08, 6, 26);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 2.2, 9);

    const geo = new THREE.PlaneGeometry(40, 20, 80, 40);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = Math.sin(x * 0.35) * 1.2 + Math.cos(z * 0.5 + x * 0.15) * 0.9 + Math.sin(x * 1.3 + z) * 0.25;
      pos.setY(i, Math.max(-0.6, h) - 1.5 + Math.max(0, -z) * 0.18);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0x486c2f, flatShading: true, roughness: 1 });
    const wireGeo = new THREE.WireframeGeometry(geo);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x2b3423, transparent: true, opacity: 0.35 });
    scene.add(new THREE.Mesh(geo, mat), new THREE.LineSegments(wireGeo, wireMat));
    scene.add(new THREE.HemisphereLight(0xf1e5a1, 0x0b0d08, 0.5));
    const sun = new THREE.DirectionalLight(0xef6905, 1.6);
    sun.position.set(-6, 4, -8);
    scene.add(sun);

    let mx = 0, my = 0, tx = 0, ty = 0, visible = true;
    const onMove = (e: MouseEvent) => { tx = (e.clientX / window.innerWidth) * 2 - 1; ty = (e.clientY / window.innerHeight) * 2 - 1; };
    const resize = () => {
      const w = section.clientWidth, h = section.clientHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(section);
    section.addEventListener("mousemove", onMove);
    window.addEventListener("resize", resize);
    resize();

    renderer.setAnimationLoop(() => {
      if (!visible) return;
      mx += (tx - mx) * 0.05;
      my += (ty - my) * 0.05;
      const s = Math.min(1, window.scrollY / section.clientHeight);
      camera.position.set(mx * 0.8, 2.2 - my * 0.3 + s * 1.5, 9 - s * 2);
      camera.lookAt(0, 0, -4);
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      io.disconnect();
      section.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
      geo.dispose(); mat.dispose(); wireGeo.dispose(); wireMat.dispose();
      renderer.dispose();
      ridges.forEach((r) => r && (r.style.display = ""));
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
