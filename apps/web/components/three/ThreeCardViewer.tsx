'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CardTemplateJSON, renderCardToCanvas } from '@workspace/card-engine';
import { enterpriseStore } from '@/lib/data/enterpriseStore';

interface ThreeCardViewerProps {
  template: CardTemplateJSON;
  employeeNumber?: string;
  employeeData?: any;
  autoRotate?: boolean;
}

const fallbackEmployee = {
  id: 'preview-emp-125',
  employeeNumber: 'EMP-000125',
  firstName: 'Michael',
  lastName: 'Brown',
  fullName: 'Michael Brown',
  department: 'Global Operations',
  departmentName: 'Global Operations',
  position: 'Staff',
  positionTitle: 'Staff',
  branch: 'West Coast Tech Campus',
  branchName: 'West Coast Tech Campus',
  email: 'm.brown@magiccard.corp',
  photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
  status: 'active' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function ThreeCardViewer({
  template,
  employeeNumber,
  employeeData,
  autoRotate = false,
}: ThreeCardViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [rotating, setRotating] = useState(autoRotate);
  const [stageTheme, setStageTheme] = useState<'light' | 'dark'>('dark');

  const isFlippedRef = useRef(isFlipped);
  const rotatingRef = useRef(rotating);

  useEffect(() => {
    isFlippedRef.current = isFlipped;
  }, [isFlipped]);

  useEffect(() => {
    rotatingRef.current = rotating;
  }, [rotating]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let animationFrameId: number;
    const clock = new THREE.Clock();

    // ── Scene ──────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    // ── Camera ─────────────────────────────────────────────────────
    const isVertical = template?.card?.orientation === 'vertical' || (template?.card?.height > template?.card?.width);
    const width  = container.clientWidth  || 800;
    const height = container.clientHeight || 520;
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0, isVertical ? 5.2 : 4.4);

    // ── Renderer ───────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Neutral Linear tone mapping — avoids the washed-out ACES overbloom
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 0.92;

    // ── Procedural IBL environment (soft studio box) ────────────────
    // RoomEnvironment generates a balanced cube-map that gives MeshPhysicalMaterial
    // realistic specular reflections on the clearcoat layer without needing HDR files.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment()).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();


    // ── Balanced 3-Point Studio Lighting ──────────────────────────
    // Principle: total scene illumination kept ≤ 5.0 to avoid blowout

    // 1. Soft ambient — fills shadows without washing out
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    // 2. Key light — slightly elevated upper-left, primary illumination
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.8);
    keyLight.position.set(-3, 4, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0002;
    scene.add(keyLight);

    // 3. Fill light — right side, half strength of key, lifts shadow side
    const fillLight = new THREE.DirectionalLight(0xf0f6ff, 0.9);
    fillLight.position.set(4, 1, 4);
    scene.add(fillLight);

    // 4. Rim / back light — gives the card edge a subtle glow from behind
    const rimLight = new THREE.DirectionalLight(0xe8f0ff, 0.55);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    // ── OrbitControls ──────────────────────────────────────────────
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.2;
    controls.maxDistance = 7.5;
    controls.autoRotateSpeed = 1.4;
    controls.target.set(0, 0, 0);

    // Helper to construct rounded rectangle shape
    const createCardShape = (w: number, h: number, r: number) => {
      const s = new THREE.Shape();
      const x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      return s;
    };

    const cardWidth     = isVertical ? 2.14 : 3.4;
    const cardHeight    = isVertical ? 3.4 : 2.14;
    const cardThickness = 0.035;
    const cornerRadius  = 0.16; // Standard CR80 ID card ratio

    const bodyShape = createCardShape(cardWidth, cardHeight, cornerRadius);

    const extrudeSettings = {
      depth: cardThickness,
      bevelEnabled: true,
      bevelSegments: 6,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015,
    };

    const cardGroup = new THREE.Group();
    // Subtle initial Y-rotation to show 3D depth without an extreme tilt angle
    cardGroup.rotation.y = 0.18;
    scene.add(cardGroup);

    // ── PVC Edge / Body ────────────────────────────────────────────
    const geometry = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
    geometry.center();
    const pvcMaterial = new THREE.MeshStandardMaterial({
      color: 0xfafcff,
      roughness: 0.35,   // realistic PVC — not mirror, not matte
      metalness: 0.06,
    });
    const pvcMesh = new THREE.Mesh(geometry, pvcMaterial);
    pvcMesh.castShadow = true;
    pvcMesh.receiveShadow = true;
    cardGroup.add(pvcMesh);

    // Helper to generate front/back face geometry with rounded corners & explicit UV mapping
    const createFaceGeometry = (w: number, h: number, r: number) => {
      const shape = createCardShape(w, h, r);
      const faceGeo = new THREE.ShapeGeometry(shape);
      const pos = faceGeo.attributes.position;
      const uvs = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        uvs[i * 2] = (vx - (-w / 2)) / w;
        uvs[i * 2 + 1] = (vy - (-h / 2)) / h;
      }
      faceGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      return faceGeo;
    };

    const faceWidth = cardWidth - 0.01;
    const faceHeight = cardHeight - 0.01;
    const faceRadius = cornerRadius - 0.005;

    // ── Front Face ─────────────────────────────────────────────────
    // MeshBasicMaterial + ShapeGeometry: perfect rounded corners, exact texture rendering
    const frontPlaneGeo = createFaceGeometry(faceWidth, faceHeight, faceRadius);
    const frontMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const frontMesh = new THREE.Mesh(frontPlaneGeo, frontMaterial);
    frontMesh.position.set(0, 0, cardThickness / 2 + 0.0151);
    cardGroup.add(frontMesh);

    // ── Back Face ──────────────────────────────────────────────────
    const backPlaneGeo = createFaceGeometry(faceWidth, faceHeight, faceRadius);
    const backMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const backMesh = new THREE.Mesh(backPlaneGeo, backMaterial);
    backMesh.position.set(0, 0, -(cardThickness / 2 + 0.0151));
    backMesh.rotation.set(0, Math.PI, 0);
    cardGroup.add(backMesh);

    // ── Contact Shadow (soft blob under card) ──────────────────────
    const shadowGeo    = new THREE.PlaneGeometry(isVertical ? 3.0 : 4.4, isVertical ? 4.2 : 2.8);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width  = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(128, 128, 10, 128, 128, 118);
      grad.addColorStop(0,    'rgba(0,0,0,0.18)');
      grad.addColorStop(0.50, 'rgba(0,0,0,0.05)');
      grad.addColorStop(1,    'rgba(0,0,0,0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = isVertical ? -1.85 : -1.25;
    scene.add(shadowMesh);

    // ── Render card face textures ──────────────────────────────────
    const employee =
      employeeData ||
      (employeeNumber ? enterpriseStore.findEmployeeByNumber(employeeNumber) : null) ||
      fallbackEmployee;

    let frontTex: THREE.CanvasTexture | null = null;
    let backTex:  THREE.CanvasTexture | null = null;

    const frontCanvas = document.createElement('canvas');
    renderCardToCanvas(frontCanvas, template, 'front', employee, { scale: 2 })
      .then(() => {
        frontTex = new THREE.CanvasTexture(frontCanvas);
        frontTex.colorSpace = THREE.SRGBColorSpace;
        frontTex.anisotropy  = renderer.capabilities.getMaxAnisotropy();
        frontMaterial.map    = frontTex;
        frontMaterial.needsUpdate = true;
      })
      .catch((err) => console.warn('Front texture:', err));

    const backCanvas = document.createElement('canvas');
    renderCardToCanvas(backCanvas, template, 'back', employee, { scale: 2 })
      .then(() => {
        backTex = new THREE.CanvasTexture(backCanvas);
        backTex.colorSpace = THREE.SRGBColorSpace;
        backTex.anisotropy  = renderer.capabilities.getMaxAnisotropy();
        backMaterial.map    = backTex;
        backMaterial.needsUpdate = true;
      })
      .catch((err) => console.warn('Back texture:', err));

    // ── Double-click reset ─────────────────────────────────────────
    const handleDblClick = () => {
      camera.position.set(0, 0, 4.4);
      controls.target.set(0, 0, 0);
      controls.update();
    };
    canvas.addEventListener('dblclick', handleDblClick);

    // ── Resize observer ────────────────────────────────────────────
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: nW, height: nH } = entry.contentRect;
        if (nW > 0 && nH > 0) {
          camera.aspect = nW / nH;
          camera.updateProjectionMatrix();
          renderer.setSize(nW, nH);
        }
      }
    });
    resizeObserver.observe(container);

    // ── Animation loop ─────────────────────────────────────────────
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta   = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth flip — rest positions have a slight angle so depth is always visible
      // Front rests at +15° Y, Back rests at 180°+15° = 195° Y
      const targetY = isFlippedRef.current ? Math.PI + 0.26 : 0.26;
      cardGroup.rotation.y = THREE.MathUtils.damp(cardGroup.rotation.y, targetY, 5, delta);

      // Gentle float — very subtle (premium, not cartoon)
      cardGroup.position.y = Math.sin(elapsed * 1.1) * 0.028;

      controls.autoRotate = rotatingRef.current;
      controls.update();

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('dblclick', handleDblClick);

      geometry.dispose();
      frontPlaneGeo.dispose();
      backPlaneGeo.dispose();
      shadowGeo.dispose();
      pvcMaterial.dispose();
      frontMaterial.dispose();
      backMaterial.dispose();
      shadowMat.dispose();
      if (frontTex) frontTex.dispose();
      if (backTex)  backTex.dispose();
      shadowTex.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, [template, employeeNumber, employeeData]);

  return (

    <div
      ref={containerRef}
      className={`relative w-full h-[520px] rounded-2xl border overflow-hidden select-none transition-colors duration-500 ${
        stageTheme === 'light'
          ? 'bg-gradient-to-br from-[#c8d4e0] via-[#b8c8da] to-[#a8bad0] border-slate-400 shadow-xl'
          : 'bg-gradient-to-br from-[#111827] via-[#0a1020] to-[#060c18] border-slate-800/80 shadow-2xl'
      }`}
    >
      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold backdrop-blur shadow-md transition ${
            stageTheme === 'light'
              ? 'bg-white/90 hover:bg-white text-slate-800 border-slate-300'
              : 'bg-slate-900/80 hover:bg-slate-800 text-white border-slate-700'
          }`}
        >
          {isFlipped ? 'Show Front' : 'Show Back (Flip)'}
        </button>
        <button
          onClick={() => setRotating(!rotating)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold backdrop-blur shadow-md transition ${
            rotating
              ? 'bg-red-600 border-red-600 text-white'
              : stageTheme === 'light'
              ? 'bg-white/90 hover:bg-white text-slate-800 border-slate-300'
              : 'bg-slate-900/80 hover:bg-slate-800 text-white border-slate-700'
          }`}
        >
          {rotating ? 'Pause Rotation' : 'Auto Rotate'}
        </button>
        <button
          onClick={() => setStageTheme(stageTheme === 'light' ? 'dark' : 'light')}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold backdrop-blur shadow-md transition ${
            stageTheme === 'light'
              ? 'bg-white/90 hover:bg-white text-slate-800 border-slate-300'
              : 'bg-slate-900/80 hover:bg-slate-800 text-white border-slate-700'
          }`}
          title="Toggle Studio Lighting Environment"
        >
          {stageTheme === 'light' ? 'Showroom: Light' : 'Showroom: Dark'}
        </button>
      </div>



      {/* Pure WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />
    </div>
  );
}
