import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Maximize2,
  Eye,
  EyeOff,
  Compass,
  Layers,
  Ruler,
  Palette,
  Grid,
  Sun,
  Moon,
  ChevronDown,
  Box,
  Sliders,
  Check,
  RefreshCw,
  X
} from 'lucide-react';
import {
  CadQueryMeshObject,
  ViewPreset,
  ViewerSettings,
  MeasurementState,
  CadQueryProperties
} from '../types';

interface CadViewer3DProps {
  objects: CadQueryMeshObject[];
  onToggleObjectVisibility: (id: string, visible: boolean) => void;
  onChangeObjectColor: (id: string, color: string) => void;
  onChangeObjectAlpha: (id: string, alpha: number) => void;
  highlightedSelector?: string | null;
  isStale?: boolean;
}

export const CadViewer3D: React.FC<CadViewer3DProps> = ({
  objects,
  onToggleObjectVisibility,
  onChangeObjectColor,
  onChangeObjectAlpha,
  highlightedSelector,
  isStale = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const axesGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Settings
  const [settings, setSettings] = useState<ViewerSettings>({
    showAxes: true,
    showGrid: true,
    renderMode: 'edges', // 'solid' | 'edges' | 'edges_only' | 'transparent'
    bgColor: '#090d16',
    defaultColor: '#38bdf8',
    wireframeColor: '#0284c7',
    highlightEdges: true,
  });

  // UI state
  const [activePanel, setActivePanel] = useState<'none' | 'pieces' | 'views' | 'render' | 'measure'>('none');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [measurementState, setMeasurementState] = useState<MeasurementState>({
    active: false,
    mode: 'distance',
    points: [],
  });

  // Interaction refs (orbit, pan, pinch)
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Camera spherical coordinates
  const sphericalRef = useRef({
    radius: 180,
    theta: Math.PI / 4, // azimuth
    phi: Math.PI / 3,   // elevation
  });
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Update camera position from spherical
  const updateCameraTransform = useCallback(() => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = sphericalRef.current;
    const clampedPhi = Math.max(0.01, Math.min(Math.PI - 0.01, phi));
    sphericalRef.current.phi = clampedPhi;

    const x = targetRef.current.x + radius * Math.sin(clampedPhi) * Math.sin(theta);
    const y = targetRef.current.y + radius * Math.cos(clampedPhi);
    const z = targetRef.current.z + radius * Math.sin(clampedPhi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(targetRef.current);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(settings.bgColor);
    sceneRef.current = scene;

    // 2. Camera (CadQuery uses Z-up convention; Three.js default is Y-up, but we can set camera up to (0, 0, 1)!)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.up.set(0, 0, 1); // CAD standard: Z is UP!
    cameraRef.current = camera;

    // 3. Renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(200, 300, 400);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.4);
    dirLight2.position.set(-200, -200, -100);
    scene.add(dirLight2);

    // 5. Grid Helper (XY Ground plane, Z = 0)
    const grid = new THREE.GridHelper(300, 30, 0x334155, 0x1e293b);
    grid.rotation.x = Math.PI / 2; // Rotate grid to XY plane!
    scene.add(grid);
    gridHelperRef.current = grid;

    // 6. Coordinate Axes starting strictly at (0, 0, 0) with arrows pointing positively!
    const axesGroup = new THREE.Group();
    const axisLength = 60;
    const headLength = 12;
    const headWidth = 6;

    // X Axis: Red (1, 0, 0)
    const arrowX = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0xef4444,
      headLength,
      headWidth
    );
    axesGroup.add(arrowX);

    // Y Axis: Green (0, 1, 0)
    const arrowY = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0x10b981,
      headLength,
      headWidth
    );
    axesGroup.add(arrowY);

    // Z Axis: Blue (0, 0, 1)
    const arrowZ = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0x0284c7,
      headLength,
      headWidth
    );
    axesGroup.add(arrowZ);

    // Text sprites / Canvas labels for X, Y, Z
    const createAxisLabel = (text: string, color: string, pos: THREE.Vector3) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = color;
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 32, 32);
      }
      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(pos);
      sprite.scale.set(16, 16, 1);
      return sprite;
    };

    axesGroup.add(createAxisLabel('X', '#ef4444', new THREE.Vector3(axisLength + 8, 0, 0)));
    axesGroup.add(createAxisLabel('Y', '#10b981', new THREE.Vector3(0, axisLength + 8, 0)));
    axesGroup.add(createAxisLabel('Z', '#38bdf8', new THREE.Vector3(0, 0, axisLength + 8)));

    scene.add(axesGroup);
    axesGroupRef.current = axesGroup;

    // 7. Model container group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Initial camera transform
    updateCameraTransform();

    // Render loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update background color & visibility of grid/axes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(settings.bgColor);
    }
    if (axesGroupRef.current) {
      axesGroupRef.current.visible = settings.showAxes;
    }
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = settings.showGrid;
    }
  }, [settings.bgColor, settings.showAxes, settings.showGrid]);

  // Build 3D Meshes and Edges from objects data
  useEffect(() => {
    if (!modelGroupRef.current) return;
    const group = modelGroupRef.current;

    // Clear existing children
    while (group.children.length > 0) {
      const child = group.children[0] as any;
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      group.remove(child);
    }

    if (!objects || objects.length === 0) return;

    let overallBBox = new THREE.Box3();
    let hasGeom = false;

    objects.forEach((obj) => {
      if (obj.visible === false) return;

      const objContainer = new THREE.Group();
      objContainer.name = obj.id;

      // 1. Solid Mesh
      if (obj.vertices && obj.vertices.length > 0 && obj.indices && obj.indices.length > 0) {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(obj.vertices, 3));
        geom.setIndex(obj.indices);
        geom.computeVertexNormals();

        const isTransparent = settings.renderMode === 'transparent' || (obj.alpha !== undefined && obj.alpha < 1);
        const opacity = settings.renderMode === 'transparent' ? 0.45 : (obj.alpha ?? 1.0);

        let mat: THREE.Material;
        if (settings.renderMode === 'edges_only') {
          // Invisible solid for edges only
          mat = new THREE.MeshBasicMaterial({ visible: false });
        } else {
          mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(obj.color || settings.defaultColor),
            roughness: 0.35,
            metalness: 0.15,
            transparent: isTransparent,
            opacity: opacity,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 1, // Avoid z-fighting with edges
            polygonOffsetUnits: 1,
          });
        }

        const mesh = new THREE.Mesh(geom, mat);
        mesh.userData = { objectId: obj.id, isSolid: true };
        objContainer.add(mesh);

        geom.computeBoundingBox();
        if (geom.boundingBox) {
          overallBBox.union(geom.boundingBox);
          hasGeom = true;
        }
      }

      // 2. CAD Wireframe Edges
      if (settings.renderMode !== 'solid' && obj.edges && obj.edges.length > 0) {
        const edgePoints: number[] = [];
        obj.edges.forEach((segment) => {
          if (segment.length >= 6) {
            edgePoints.push(segment[0], segment[1], segment[2]);
            edgePoints.push(segment[3], segment[4], segment[5]);
          }
        });

        if (edgePoints.length > 0) {
          const edgeGeom = new THREE.BufferGeometry();
          edgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(edgePoints, 3));

          const edgeMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(settings.wireframeColor),
            linewidth: 1.5,
            transparent: true,
            opacity: 0.85,
          });

          const edgeLines = new THREE.LineSegments(edgeGeom, edgeMat);
          edgeLines.userData = { objectId: obj.id, isEdge: true };
          objContainer.add(edgeLines);
        }
      }

      group.add(objContainer);
    });

    // Auto-fit camera if this is the first load
    if (hasGeom && !overallBBox.isEmpty()) {
      const center = new THREE.Vector3();
      overallBBox.getCenter(center);
      const size = new THREE.Vector3();
      overallBBox.getSize(size);

      targetRef.current.copy(center);
      const maxDim = Math.max(size.x, size.y, size.z, 20);
      sphericalRef.current.radius = maxDim * 2.5;
      updateCameraTransform();
    }
  }, [objects, settings.renderMode, settings.defaultColor, settings.wireframeColor]);

  // Center model
  const handleCenterModel = () => {
    if (!modelGroupRef.current) return;
    const bbox = new THREE.Box3().setFromObject(modelGroupRef.current);
    if (!bbox.isEmpty()) {
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      targetRef.current.copy(center);
      updateCameraTransform();
    }
  };

  // Fit camera zoom to model
  const handleFitZoom = () => {
    if (!modelGroupRef.current) return;
    const bbox = new THREE.Box3().setFromObject(modelGroupRef.current);
    if (!bbox.isEmpty()) {
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 20);
      sphericalRef.current.radius = maxDim * 2.2;
      handleCenterModel();
    }
  };

  // Reset camera view
  const handleResetCamera = () => {
    sphericalRef.current = {
      radius: 200,
      theta: Math.PI / 4,
      phi: Math.PI / 3,
    };
    handleCenterModel();
  };

  // Predefined Views
  const handleSetPresetView = (preset: ViewPreset) => {
    const r = sphericalRef.current.radius;
    switch (preset) {
      case 'iso':
        sphericalRef.current = { radius: r, theta: Math.PI / 4, phi: Math.PI / 3 };
        break;
      case 'top': // Z+ looking down
        sphericalRef.current = { radius: r, theta: 0, phi: 0.01 };
        break;
      case 'bottom': // Z- looking up
        sphericalRef.current = { radius: r, theta: 0, phi: Math.PI - 0.01 };
        break;
      case 'front': // -Y looking at +Y
        sphericalRef.current = { radius: r, theta: 0, phi: Math.PI / 2 };
        break;
      case 'back': // +Y looking at -Y
        sphericalRef.current = { radius: r, theta: Math.PI, phi: Math.PI / 2 };
        break;
      case 'right': // +X
        sphericalRef.current = { radius: r, theta: Math.PI / 2, phi: Math.PI / 2 };
        break;
      case 'left': // -X
        sphericalRef.current = { radius: r, theta: -Math.PI / 2, phi: Math.PI / 2 };
        break;
    }
    updateCameraTransform();
  };

  // Touch & Pointer gesture handlers (1 finger rotate, 2 finger pan & pinch zoom)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - prevMouseRef.current.x;
    const dy = e.clientY - prevMouseRef.current.y;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    if (e.buttons === 2 || isPanningRef.current) {
      // Pan
      const panSpeed = sphericalRef.current.radius * 0.0015;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      if (cameraRef.current) {
        cameraRef.current.matrix.extractBasis(right, up, new THREE.Vector3());
        targetRef.current.addScaledVector(right, -dx * panSpeed);
        targetRef.current.addScaledVector(up, dy * panSpeed);
      }
    } else {
      // Orbit rotate
      const rotateSpeed = 0.008;
      sphericalRef.current.theta -= dx * rotateSpeed;
      sphericalRef.current.phi -= dy * rotateSpeed;
    }
    updateCameraTransform();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    isPanningRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    sphericalRef.current.radius = Math.max(5, Math.min(2500, sphericalRef.current.radius * zoomFactor));
    updateCameraTransform();
  };

  // Multi-touch gestures (Pinch to zoom + 2-finger pan)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartDistRef.current = dist;
      touchStartCenterRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      isPanningRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null && touchStartCenterRef.current !== null) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };

      // Pinch zoom
      const zoomFactor = touchStartDistRef.current / (dist || 1);
      sphericalRef.current.radius = Math.max(5, Math.min(2500, sphericalRef.current.radius * zoomFactor));
      touchStartDistRef.current = dist;

      // Two-finger pan
      const dx = center.x - touchStartCenterRef.current.x;
      const dy = center.y - touchStartCenterRef.current.y;
      touchStartCenterRef.current = center;

      const panSpeed = sphericalRef.current.radius * 0.0018;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      if (cameraRef.current) {
        cameraRef.current.matrix.extractBasis(right, up, new THREE.Vector3());
        targetRef.current.addScaledVector(right, -dx * panSpeed);
        targetRef.current.addScaledVector(up, dy * panSpeed);
      }

      updateCameraTransform();
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    touchStartCenterRef.current = null;
    isPanningRef.current = false;
  };

  // Active object properties for measurement / inspect
  const activeObj = objects.find((o) => o.id === selectedObjectId) || objects[0];

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950 flex flex-col">
      {/* 3D Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Stale Model Warning Banner (Requirement 4.7) */}
      {isStale && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-500/90 text-slate-950 px-3 py-1 rounded-full text-xs font-semibold shadow-lg backdrop-blur flex items-center gap-1.5 border border-amber-300">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Geometría previa (La última ejecución falló)</span>
        </div>
      )}

      {/* Floating HUD: Top-right view cube & camera quick buttons */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          onClick={handleFitZoom}
          title="Ajustar zoom al tamaño de la pieza"
          className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg border border-slate-700/60 shadow-md backdrop-blur transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleCenterModel}
          title="Centrar modelo en el origen"
          className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg border border-slate-700/60 shadow-md backdrop-blur transition-colors"
        >
          <Compass className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetCamera}
          title="Restablecer cámara isométrica"
          className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg border border-slate-700/60 shadow-md backdrop-blur transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating HUD: Bottom toolbar controls */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Left: View preset selector & Pieces manager */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => setActivePanel(activePanel === 'pieces' ? 'none' : 'pieces')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border shadow-md backdrop-blur transition-colors ${
              activePanel === 'pieces'
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Objetos ({objects.filter((o) => o.visible !== false).length}/{objects.length})</span>
          </button>

          <button
            onClick={() => setActivePanel(activePanel === 'views' ? 'none' : 'views')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border shadow-md backdrop-blur transition-colors ${
              activePanel === 'views'
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Vistas</span>
          </button>

          <button
            onClick={() => setActivePanel(activePanel === 'measure' ? 'none' : 'measure')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border shadow-md backdrop-blur transition-colors ${
              activePanel === 'measure'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Medir</span>
          </button>
        </div>

        {/* Right: Render options & Display toggles */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => setActivePanel(activePanel === 'render' ? 'none' : 'render')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border shadow-md backdrop-blur transition-colors ${
              activePanel === 'render'
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Render</span>
          </button>
        </div>
      </div>

      {/* PANEL: Pieces / Objects Manager (Requirement 7) */}
      {activePanel === 'pieces' && (
        <div className="absolute bottom-14 left-3 w-80 max-h-72 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md p-3 z-30 flex flex-col text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
              Gestión de Piezas CAD
            </span>
            <button
              onClick={() => setActivePanel('none')}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 mt-2 space-y-2 pr-1">
            {objects.length === 0 ? (
              <p className="text-slate-500 italic py-3 text-center">No hay piezas generadas.</p>
            ) : (
              objects.map((obj) => (
                <div
                  key={obj.id}
                  className={`p-2 rounded-lg border transition-colors ${
                    selectedObjectId === obj.id
                      ? 'bg-slate-800/80 border-sky-500/60'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={obj.visible !== false}
                        onChange={(e) => onToggleObjectVisibility(obj.id, e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="font-medium text-slate-200 truncate">{obj.name}</span>
                    </label>

                    {/* Color swatch & alpha */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="color"
                        value={obj.color}
                        onChange={(e) => onChangeObjectColor(obj.id, e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                        title="Cambiar color de pieza"
                      />
                      <button
                        onClick={() => setSelectedObjectId(selectedObjectId === obj.id ? null : obj.id)}
                        className="text-slate-400 hover:text-sky-400 p-0.5"
                        title="Ver dimensiones y volumen"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded properties */}
                  {selectedObjectId === obj.id && obj.properties && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Dimensiones:</span>
                        <span className="font-mono text-slate-200">
                          {obj.properties.bbox?.size
                            ? `${obj.properties.bbox.size[0]} × ${obj.properties.bbox.size[1]} × ${obj.properties.bbox.size[2]} mm`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Volumen:</span>
                        <span className="font-mono text-slate-200">
                          {obj.properties.volume?.toLocaleString()} mm³
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Área superficial:</span>
                        <span className="font-mono text-slate-200">
                          {obj.properties.area?.toLocaleString()} mm²
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Caras / Aristas:</span>
                        <span className="font-mono text-slate-200">
                          {obj.properties.faceCount} caras · {obj.properties.edgeCount} aristas
                        </span>
                      </div>
                      {/* Opacity slider */}
                      <div className="flex items-center justify-between pt-1">
                        <span>Opacidad:</span>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={obj.alpha ?? 1.0}
                          onChange={(e) => onChangeObjectAlpha(obj.id, parseFloat(e.target.value))}
                          className="w-24 accent-sky-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PANEL: Predefined Views (Requirement 6.3) */}
      {activePanel === 'views' && (
        <div className="absolute bottom-14 left-16 w-56 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md p-3 z-30 flex flex-col text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
              Vistas Predefinidas
            </span>
            <button onClick={() => setActivePanel('none')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            <button
              onClick={() => handleSetPresetView('iso')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-center transition-colors"
            >
              Isométrica
            </button>
            <button
              onClick={() => handleSetPresetView('top')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-center transition-colors"
            >
              Superior (+Z)
            </button>
            <button
              onClick={() => handleSetPresetView('bottom')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-center transition-colors"
            >
              Inferior (-Z)
            </button>
            <button
              onClick={() => handleSetPresetView('front')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-center transition-colors"
            >
              Frontal (-Y)
            </button>
            <button
              onClick={() => handleSetPresetView('back')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-center transition-colors"
            >
              Posterior (+Y)
            </button>
            <button
              onClick={() => handleSetPresetView('right')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-center transition-colors"
            >
              Lateral Der (+X)
            </button>
            <button
              onClick={() => handleSetPresetView('left')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-center transition-colors col-span-2"
            >
              Lateral Izq (-X)
            </button>
          </div>
        </div>
      )}

      {/* PANEL: Render & Display Settings (Requirement 6.4) */}
      {activePanel === 'render' && (
        <div className="absolute bottom-14 right-3 w-64 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md p-3 z-30 flex flex-col text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
              Opciones de Representación
            </span>
            <button onClick={() => setActivePanel('none')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2.5 space-y-3">
            {/* Render mode */}
            <div>
              <span className="text-slate-400 block mb-1.5">Modo de visualización:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'edges', label: 'Sólido + Aristas' },
                  { id: 'solid', label: 'Solo Sólido' },
                  { id: 'edges_only', label: 'Solo Aristas' },
                  { id: 'transparent', label: 'Transparente' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSettings({ ...settings, renderMode: m.id as any })}
                    className={`px-2 py-1.5 rounded text-[11px] font-medium transition-colors ${
                      settings.renderMode === m.id
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Axes & Grid toggles */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">Ejes X, Y, Z (Positivos)</span>
                <input
                  type="checkbox"
                  checked={settings.showAxes}
                  onChange={(e) => setSettings({ ...settings, showAxes: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-sky-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">Cuadrícula Plano XY</span>
                <input
                  type="checkbox"
                  checked={settings.showGrid}
                  onChange={(e) => setSettings({ ...settings, showGrid: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-sky-500"
                />
              </label>
            </div>

            {/* Background palette */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-slate-400 block mb-1.5">Color de Fondo:</span>
              <div className="flex gap-2">
                {[
                  { bg: '#090d16', name: 'Oscuro CAD' },
                  { bg: '#0f172a', name: 'Azul Pizarra' },
                  { bg: '#18253d', name: 'Blueprint' },
                  { bg: '#f1f5f9', name: 'Claro' },
                ].map((b) => (
                  <button
                    key={b.bg}
                    onClick={() => setSettings({ ...settings, bgColor: b.bg })}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      settings.bgColor === b.bg ? 'scale-110 border-sky-400' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: b.bg }}
                    title={b.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL: Measurement Tools (Requirement 8) */}
      {activePanel === 'measure' && (
        <div className="absolute bottom-14 left-3 w-80 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md p-3 z-30 flex flex-col text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-emerald-400" />
              Medición CAD Exacta
            </span>
            <button onClick={() => setActivePanel('none')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 space-y-2 text-slate-300">
            <p className="text-[11px] text-slate-400">
              Datos analíticos exactos derivados del modelo OpenCASCADE:
            </p>

            {activeObj && activeObj.properties ? (
              <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                <div className="font-semibold text-sky-400 pb-1 border-b border-slate-800/80">
                  {activeObj.name}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Volumen analítico:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {activeObj.properties.volume.toLocaleString()} mm³
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Área total de caras:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {activeObj.properties.area.toLocaleString()} mm²
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Caja envolvente (X×Y×Z):</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {activeObj.properties.bbox?.size
                      ? `${activeObj.properties.bbox.size[0]} × ${activeObj.properties.bbox.size[1]} × ${activeObj.properties.bbox.size[2]} mm`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total de aristas:</span>
                  <span className="font-mono text-slate-200">{activeObj.properties.edgeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total de caras:</span>
                  <span className="font-mono text-slate-200">{activeObj.properties.faceCount}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 italic py-2 text-center">No hay pieza seleccionada.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
