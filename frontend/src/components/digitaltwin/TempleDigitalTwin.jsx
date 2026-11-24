import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Convert GPS coordinates to local Cartesian coordinates (meters relative to temple centroid)
export const gpsToMeters = (lat, lng, centerLat, centerLng) => {
  const metersPerLat = 111320;
  const metersPerLng = 40075000 * Math.cos((centerLat * Math.PI) / 180) / 360;
  const x = (lng - centerLng) * metersPerLng;
  const z = -(lat - centerLat) * metersPerLat;
  return { x, z };
};

// Procedural texture generator for realistic temple masonry and courtyard paving
export const createStoneTexture = (baseHex = '#cfa878', mortarHex = '#8c7050') => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Ashlar stone block lines
  ctx.strokeStyle = mortarHex;
  ctx.lineWidth = 2;
  const rowH = 32;
  for (let y = 0; y < 256; y += rowH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();

    const offset = (y / rowH) % 2 === 0 ? 0 : 32;
    for (let x = offset; x < 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowH);
      ctx.stroke();
    }
  }

  // Micro-noise grain
  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 18;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
};

// Procedural dynamic 2D canvas text sprite generator for floating 3D labels
const createFloatingLabel = (text, subtitle = '', themeColor = '#00f0ff', bgColor = 'rgba(5, 18, 38, 0.88)', textColor = null) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 4;
  
  const r = 24;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, r);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = textColor || themeColor;
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 54);

  if (subtitle) {
    ctx.font = '22px sans-serif';
    ctx.fillStyle = textColor ? '#665544' : '#D0E4F5';
    ctx.fillText(subtitle, 256, 94);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({ 
    map: texture, 
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(34, 8.5, 1);
  return sprite;
};

// Helper to create a 3D road ribbon from an array of [lng, lat] coordinates
const createRoadRibbon = (coords, width, centerLat, centerLng, roadColor = 0x334155) => {
  const points = coords.map(([lng, lat]) => gpsToMeters(lat, lng, centerLat, centerLng));
  if (points.length < 2) return null;

  const roadGroup = new THREE.Group();
  const halfW = (width || 12) / 2;

  const ribbonVertices = [];
  const edge1Vertices = [];
  const edge2Vertices = [];
  const centerVertices = [];

  for (let i = 0; i < points.length; i++) {
    const cur = points[i];
    centerVertices.push(cur.x, 0.35, cur.z);

    let dx = 0, dz = 1;
    if (i < points.length - 1) {
      dx = points[i + 1].x - cur.x;
      dz = points[i + 1].z - cur.z;
    } else {
      dx = cur.x - points[i - 1].x;
      dz = cur.z - points[i - 1].z;
    }
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;

    const pLeftX = cur.x + nx * halfW;
    const pLeftZ = cur.z + nz * halfW;
    const pRightX = cur.x - nx * halfW;
    const pRightZ = cur.z - nz * halfW;

    edge1Vertices.push(pLeftX, 0.4, pLeftZ);
    edge2Vertices.push(pRightX, 0.4, pRightZ);

    if (i < points.length - 1) {
      const next = points[i + 1];
      let ndx = 0, ndz = 1;
      if (i + 1 < points.length - 1) {
        ndx = points[i + 2].x - next.x;
        ndz = points[i + 2].z - next.z;
      } else {
        ndx = next.x - cur.x;
        ndz = next.z - cur.z;
      }
      const nlen = Math.hypot(ndx, ndz) || 1;
      const nnx = -ndz / nlen;
      const nnz = ndx / nlen;

      const npLeftX = next.x + nnx * halfW;
      const npLeftZ = next.z + nnz * halfW;
      const npRightX = next.x - nnx * halfW;
      const npRightZ = next.z - nnz * halfW;

      ribbonVertices.push(
        pLeftX, 0.3, pLeftZ,
        npLeftX, 0.3, npLeftZ,
        pRightX, 0.3, pRightZ,
        pRightX, 0.3, pRightZ,
        npLeftX, 0.3, npLeftZ,
        npRightX, 0.3, npRightZ
      );
    }
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVertices, 3));
  const roadMat = new THREE.MeshBasicMaterial({ color: roadColor, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
  roadGroup.add(new THREE.Mesh(roadGeo, roadMat));

  const edgeLineMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.75 });
  roadGroup.add(new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(edge1Vertices, 3)), edgeLineMat));
  roadGroup.add(new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(edge2Vertices, 3)), edgeLineMat));
  roadGroup.add(new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(centerVertices, 3)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })));

  return roadGroup;
};

const TempleDigitalTwin = ({
  temple,
  buildings = [],
  zones = [],
  boundary = null,
  roads = [],
  facilities = [],
  transport = [],
  parking = [],
  cameras = [],
  emergencyRoutes = [],
  emergencyAlerts = [],
  heatmapData = null,
  heatmapMode = 'CURRENT',
  layers = {
    buildings: true,
    boundaries: true,
    roads: true,
    emergency: true,
    transport: true,
    commercial: true,
    amenities: true,
    parking: true,
    crowdZones: true,
    cameras: true,
    heatmap: true
  },
  autoRotate = true,
  cameraPreset = null,
  navLevel = 2, // 1: REGIONAL, 2: CAMPUS, 3: BUILDING, 4: ZONE, 5: FLOOR
  selectedEntity = null,
  selectedFloor = 1,
  renderMode = 'REALISTIC', // 'REALISTIC' | 'TACTICAL'
  festivalSimulationMode = false,
  selectedFestival = null,
  onSelectEntity = () => {},
  onSelectLevel = () => {},
  onUpdateStats = () => {}
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const tacticalGroupRef = useRef(null);
  const realisticGroupRef = useRef(null);
  const ambientLightRef = useRef(null);
  const dirLight1Ref = useRef(null);
  const dirLight2Ref = useRef(null);
  const hemiLightRef = useRef(null);
  const meshesRef = useRef([]);
  const clickableObjectsRef = useRef([]);
  const animFrameIdRef = useRef(null);
  const targetCamPosRef = useRef(null);
  const targetLookAtRef = useRef(null);

  // Setup Three.js WebGL Scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const isInitialRealistic = (renderMode === 'REALISTIC');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isInitialRealistic ? 0xdce7f0 : 0x0f172a);
    scene.fog = new THREE.FogExp2(isInitialRealistic ? 0xdce7f0 : 0x0f172a, isInitialRealistic ? 0.0010 : 0.0020);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 4500);
    camera.position.set(0, 180, 240);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 15;
    controls.maxDistance = 1200;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.8;
    controlsRef.current = controls;

    // Diurnal & Tactical Analytical Lights
    const ambientLight = new THREE.AmbientLight(isInitialRealistic ? 0xfff8ee : 0x1e293b, isInitialRealistic ? 1.4 : 1.6);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const dirLight1 = new THREE.DirectionalLight(isInitialRealistic ? 0xfffaea : 0x94a3b8, isInitialRealistic ? 2.5 : 2.0);
    dirLight1.position.set(120, 240, 120);
    scene.add(dirLight1);
    dirLight1Ref.current = dirLight1;

    const dirLight2 = new THREE.DirectionalLight(isInitialRealistic ? 0xd0e2f5 : 0x475569, isInitialRealistic ? 1.0 : 1.2);
    dirLight2.position.set(-120, 180, -120);
    scene.add(dirLight2);
    dirLight2Ref.current = dirLight2;

    const hemiLight = new THREE.HemisphereLight(0xdce7f0, 0xcab598, isInitialRealistic ? 0.8 : 0.0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Tactical GIS Ground Group (Clean Analytical Reference Grid)
    const tacticalGroup = new THREE.Group();
    const gridHelper = new THREE.GridHelper(800, 80, 0x64748b, 0x334155);
    gridHelper.position.y = -0.2;
    tacticalGroup.add(gridHelper);

    scene.add(tacticalGroup);
    tacticalGroup.visible = !isInitialRealistic;
    tacticalGroupRef.current = tacticalGroup;

    // Realistic Temple Courtyard Ground Group (Natural Stone Masonry Plaza)
    const realisticGroup = new THREE.Group();
    const courtyardTex = createStoneTexture('#d1bc9e', '#967f62');
    const courtyardMat = new THREE.MeshStandardMaterial({
      color: 0xdfceb7,
      roughness: 0.88,
      metalness: 0.04,
      map: courtyardTex,
      side: THREE.DoubleSide
    });
    const courtyardMesh = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), courtyardMat);
    courtyardMesh.rotation.x = -Math.PI / 2;
    courtyardMesh.position.y = -0.05;
    realisticGroup.add(courtyardMesh);

    scene.add(realisticGroup);
    realisticGroup.visible = isInitialRealistic;
    realisticGroupRef.current = realisticGroup;

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 60;
    let scanDirection = 1;

    const animate = (time) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      frameCount++;
      if (time - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (time - lastTime));
        frameCount = 0;
        lastTime = time;
        if (onUpdateStats) onUpdateStats({ fps });
      }



      if (targetCamPosRef.current && camera) {
        camera.position.lerp(targetCamPosRef.current, 0.06);
        if (camera.position.distanceTo(targetCamPosRef.current) < 1.0) {
          targetCamPosRef.current = null;
        }
      }
      if (targetLookAtRef.current && controls) {
        controls.target.lerp(targetLookAtRef.current, 0.06);
        if (controls.target.distanceTo(targetLookAtRef.current) < 0.5) {
          targetLookAtRef.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate(performance.now());

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update Auto-Rotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Handle Preset Views
  useEffect(() => {
    if (!cameraPreset || !cameraRef.current || !controlsRef.current) return;
    if (cameraPreset === 'aerial') {
      targetCamPosRef.current = new THREE.Vector3(0, 360, 20);
      targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
    } else if (cameraPreset === 'ground') {
      targetCamPosRef.current = new THREE.Vector3(0, 25, 140);
      targetLookAtRef.current = new THREE.Vector3(0, 15, 0);
    } else if (cameraPreset === 'reset') {
      targetCamPosRef.current = new THREE.Vector3(0, 180, 240);
      targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
    }
  }, [cameraPreset]);

  // Handle 5 Navigation Levels Camera Transitions
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !temple) return;
    const centerLat = temple.latitude || 20.8880;
    const centerLng = temple.longitude || 70.4012;

    if (navLevel === 1) {
      // LEVEL 1: REGIONAL VIEW (High Altitude Regional Context)
      targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
      targetCamPosRef.current = new THREE.Vector3(0, 480, 440);
    } else if (navLevel === 2) {
      // LEVEL 2: TEMPLE CAMPUS VIEW (Standard Campus Isometric Overview)
      targetLookAtRef.current = new THREE.Vector3(0, 10, 0);
      targetCamPosRef.current = new THREE.Vector3(0, 180, 240);
    } else if (navLevel === 3) {
      // LEVEL 3: BUILDING VIEW (Focused on selected or main building)
      const bld = (selectedEntity && selectedEntity.entityType === 'BUILDING') ? selectedEntity : buildings[0];
      if (bld && bld.latitude && bld.longitude) {
        const { x, z } = gpsToMeters(bld.latitude, bld.longitude, centerLat, centerLng);
        const h = bld.height_meters || 20;
        targetLookAtRef.current = new THREE.Vector3(x, h / 2, z);
        targetCamPosRef.current = new THREE.Vector3(x + 40, h + 25, z + 55);
      }
    } else if (navLevel === 4) {
      // LEVEL 4: OPERATIONAL ZONE VIEW (Close-up telemetry inspection)
      const zone = (selectedEntity && selectedEntity.entityType === 'ZONE') ? selectedEntity : zones[0];
      if (zone && zone.latitude && zone.longitude) {
        const { x, z } = gpsToMeters(zone.latitude, zone.longitude, centerLat, centerLng);
        targetLookAtRef.current = new THREE.Vector3(x, 2, z);
        targetCamPosRef.current = new THREE.Vector3(x + 28, 22, z + 32);
      }
    } else if (navLevel === 5) {
      // LEVEL 5: INTERIOR / FLOOR VIEW (Multi-tier architectural slicing)
      const bld = (selectedEntity && selectedEntity.entityType === 'BUILDING') ? selectedEntity : buildings[0];
      if (bld && bld.floors > 1 && bld.latitude && bld.longitude) {
        const { x, z } = gpsToMeters(bld.latitude, bld.longitude, centerLat, centerLng);
        const totalH = bld.height_meters || 20;
        const floorH = totalH / bld.floors;
        const activeY = (selectedFloor - 0.5) * floorH;
        targetLookAtRef.current = new THREE.Vector3(x, activeY, z);
        targetCamPosRef.current = new THREE.Vector3(x + 28, activeY + 16, z + 36);
      }
    }
  }, [navLevel, selectedEntity, selectedFloor, temple, buildings, zones]);

  // Dynamic Diurnal Lighting & Atmosphere Watcher
  useEffect(() => {
    const isRealistic = (renderMode === 'REALISTIC');
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(isRealistic ? 0xdce7f0 : 0x0f172a);
      sceneRef.current.fog = new THREE.FogExp2(isRealistic ? 0xdce7f0 : 0x0f172a, isRealistic ? 0.0010 : 0.0020);
    }
    if (tacticalGroupRef.current) tacticalGroupRef.current.visible = !isRealistic;
    if (realisticGroupRef.current) realisticGroupRef.current.visible = isRealistic;
    if (ambientLightRef.current) {
      ambientLightRef.current.color.set(isRealistic ? 0xfff8ee : 0x1e293b);
      ambientLightRef.current.intensity = isRealistic ? 1.4 : 1.6;
    }
    if (dirLight1Ref.current) {
      dirLight1Ref.current.color.set(isRealistic ? 0xfffaea : 0x94a3b8);
      dirLight1Ref.current.intensity = isRealistic ? 2.5 : 2.0;
    }
    if (dirLight2Ref.current) {
      dirLight2Ref.current.color.set(isRealistic ? 0xd0e2f5 : 0x475569);
      dirLight2Ref.current.intensity = isRealistic ? 1.0 : 1.2;
    }
    if (hemiLightRef.current) {
      hemiLightRef.current.intensity = isRealistic ? 0.8 : 0.0;
    }
  }, [renderMode]);

  // Construct Complete Spatial 3D Digital Twin Environment with Level 5 Floor Slicing
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !temple) return;

    meshesRef.current.forEach(mesh => {
      scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
        else mesh.material.dispose();
      }
    });
    meshesRef.current = [];
    clickableObjectsRef.current = [];

    const centerLat = temple.latitude || 20.8880;
    const centerLng = temple.longitude || 70.4012;

    const isRealistic = (renderMode === 'REALISTIC');
    const isSouthDravidian = Boolean(
      temple?.state?.toLowerCase().includes('tamil') || 
      temple?.state?.toLowerCase().includes('andhra') || 
      temple?.temple_id === 'TEMPLE-002' || 
      temple?.temple_id === 'TEMPLE-003'
    );

    // Procedural stone masonry textures for realistic architecture
    const stoneBaseHex = isSouthDravidian ? '#5a554e' : '#d8b584';
    const stoneMortarHex = isSouthDravidian ? '#383430' : '#8e6f47';
    const stoneTexture = isRealistic ? createStoneTexture(stoneBaseHex, stoneMortarHex) : null;
    const plinthTexture = isRealistic ? createStoneTexture(isSouthDravidian ? '#44403b' : '#be9767', isSouthDravidian ? '#2a2724' : '#7c5f3b') : null;

    const buildingMat = isRealistic
      ? new THREE.MeshStandardMaterial({
          color: isSouthDravidian ? 0x625d56 : 0xd8b584,
          roughness: 0.82,
          metalness: 0.08,
          map: stoneTexture,
          side: THREE.DoubleSide
        })
      : new THREE.MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.8,
          metalness: 0.1,
          transparent: true,
          opacity: 0.70,
          side: THREE.DoubleSide
        });

    const plinthMat = isRealistic
      ? new THREE.MeshStandardMaterial({
          color: isSouthDravidian ? 0x48443f : 0xbe9767,
          roughness: 0.90,
          metalness: 0.05,
          map: plinthTexture,
          side: THREE.DoubleSide
        })
      : buildingMat;

    const goldKalashMat = new THREE.MeshStandardMaterial({
      color: 0xf5b700,
      roughness: 0.25,
      metalness: 0.85
    });

    const waterMat = isRealistic
      ? new THREE.MeshStandardMaterial({
          color: 0x1a535c,
          roughness: 0.12,
          metalness: 0.22,
          transparent: true,
          opacity: 0.85
        })
      : new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });

    const edgeLineMat = new THREE.LineBasicMaterial({
      color: isRealistic ? 0x8a7050 : 0x94a3b8,
      transparent: true,
      opacity: isRealistic ? 0.35 : 0.8,
      linewidth: 1.5
    });

    const isSelected = (item) => selectedEntity && (
      selectedEntity.id === item.id ||
      (selectedEntity.zone_code && (selectedEntity.zone_code === item.zone_code || selectedEntity.zone_code === item.zone_id)) ||
      (selectedEntity.zone_id && (selectedEntity.zone_id === item.zone_code || selectedEntity.zone_id === item.zone_id))
    );

    let totalPolygons = 0;

    // 1. CAMPUS BUILDINGS LAYER (With Level 5 Architectural Floor Slicing & Authentic Indian Architecture)
    if (layers.buildings && Array.isArray(buildings)) {
      buildings.forEach(bld => {
        const { x, z } = gpsToMeters(bld.latitude, bld.longitude, centerLat, centerLng);
        const height = bld.height_meters || 20;
        const bldType = (bld.building_type || '').toUpperCase();
        const bldSelected = isSelected(bld);
        const isFloorSliceActive = (navLevel === 5 && bldSelected && bld.floors > 1);
        
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Level 5 Floor Slicing Architecture
        if (isFloorSliceActive) {
          const floorCount = bld.floors;
          const tierH = height / floorCount;
          const baseSize = 24;

          for (let f = 1; f <= floorCount; f++) {
            const isCurrentFloor = f === selectedFloor;
            const floorY = (f - 1) * tierH;

            // Floor Slab Plate
            const slabGeo = new THREE.BoxGeometry(baseSize * (1 - (f - 1) * 0.08), 1.0, baseSize * (1 - (f - 1) * 0.08));
            const slabMat = new THREE.MeshBasicMaterial({
              color: isCurrentFloor ? 0xd4af37 : (isRealistic ? 0xb59265 : 0x475569),
              transparent: true,
              opacity: isCurrentFloor ? 0.9 : 0.35
            });
            const slabMesh = new THREE.Mesh(slabGeo, slabMat);
            slabMesh.position.y = floorY + 0.5;
            group.add(slabMesh);

            // Floor Interior Walls & Structural Grid
            const wallGeo = new THREE.BoxGeometry(baseSize * (1 - (f - 1) * 0.08) * 0.95, tierH * 0.9, baseSize * (1 - (f - 1) * 0.08) * 0.95);
            const wallMat = isRealistic
              ? new THREE.MeshStandardMaterial({
                  color: isCurrentFloor ? 0xe5c28f : 0x9e805d,
                  roughness: 0.8,
                  transparent: true,
                  opacity: isCurrentFloor ? 0.75 : 0.25,
                  side: THREE.DoubleSide
                })
              : new THREE.MeshStandardMaterial({
                  color: isCurrentFloor ? 0xd4af37 : 0x334155,
                  roughness: 0.7,
                  transparent: true,
                  opacity: isCurrentFloor ? 0.65 : 0.25,
                  side: THREE.DoubleSide
                });
            const wallMesh = new THREE.Mesh(wallGeo, wallMat);
            wallMesh.position.y = floorY + (tierH * 0.9) / 2 + 1;
            group.add(wallMesh);

            const wallEdges = new THREE.LineSegments(new THREE.EdgesGeometry(wallGeo), new THREE.LineBasicMaterial({
              color: isCurrentFloor ? 0xffcc00 : (isRealistic ? 0x6e5233 : 0x00aaff),
              opacity: isCurrentFloor ? 0.95 : 0.35,
              transparent: true
            }));
            wallEdges.position.y = floorY + (tierH * 0.9) / 2 + 1;
            group.add(wallEdges);

            // Floor Label on active floor
            if (isCurrentFloor) {
              const flLabel = createFloatingLabel(
                `FLOOR L${f}`, 
                `Elev: ${Math.round(floorY)}m • Slice Active`, 
                '#ffcc00',
                isRealistic ? 'rgba(255, 252, 245, 0.95)' : 'rgba(5, 18, 38, 0.88)',
                isRealistic ? '#800000' : null
              );
              flLabel.position.set(0, floorY + tierH + 5, 0);
              group.add(flLabel);
            }
          }
          totalPolygons += floorCount * 240;
        } else {
          // Standard Architectural Typology (Levels 1-4)
          const activeMat = bldSelected 
            ? (isRealistic 
                ? new THREE.MeshStandardMaterial({ color: 0xe6a817, roughness: 0.6, metalness: 0.18, map: stoneTexture })
                : new THREE.MeshPhysicalMaterial({ color: 0xffaa00, emissive: 0x442200, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.65 }))
            : buildingMat;

          if (bldType.includes('SANCTUM') || bldType.includes('SHIKHARA') || bldType.includes('VIMANA')) {
            // Authentic Sanctum Sanctorum (Jagati Plinth, Garbagriha, Shikhara/Vimana Tower, Amalaka, and Gold Kalasha)
            const baseSize = 24;
            const baseH = height * 0.38;
            const spireH = height * 0.62;

            if (isRealistic) {
              // 1. Stepped Jagati Plinth
              const jagatiTier1 = new THREE.Mesh(new THREE.BoxGeometry(baseSize + 8, 2.5, baseSize + 8), plinthMat);
              jagatiTier1.position.y = 1.25;
              group.add(jagatiTier1);

              const jagatiTier2 = new THREE.Mesh(new THREE.BoxGeometry(baseSize + 4, 1.8, baseSize + 4), plinthMat);
              jagatiTier2.position.y = 3.4;
              group.add(jagatiTier2);

              // 2. Mandovara (Sanctum Body Walls with Relief Offsets)
              const sanctumBody = new THREE.Mesh(new THREE.BoxGeometry(baseSize, baseH, baseSize), activeMat);
              sanctumBody.position.y = 4.3 + baseH / 2;
              group.add(sanctumBody);

              // Wall projection offsets (Rathas)
              const rathaX = new THREE.Mesh(new THREE.BoxGeometry(baseSize + 1.6, baseH * 0.94, baseSize * 0.55), activeMat);
              rathaX.position.y = 4.3 + baseH / 2;
              group.add(rathaX);

              const rathaZ = new THREE.Mesh(new THREE.BoxGeometry(baseSize * 0.55, baseH * 0.94, baseSize + 1.6), activeMat);
              rathaZ.position.y = 4.3 + baseH / 2;
              group.add(rathaZ);

              // 3. Shikhara Spire (Tower)
              if (isSouthDravidian) {
                // Tiered Dravidian Vimana
                const vimanaTiers = 5;
                const vTierH = spireH / vimanaTiers;
                for (let vt = 0; vt < vimanaTiers; vt++) {
                  const vScale = 1 - (vt * 0.16);
                  const vBox = new THREE.Mesh(new THREE.BoxGeometry(baseSize * vScale, vTierH * 0.92, baseSize * vScale), activeMat);
                  vBox.position.y = 4.3 + baseH + (vt * vTierH) + (vTierH / 2);
                  group.add(vBox);
                }
                // Domical Griva & Golden Vimana Stupi
                const griva = new THREE.Mesh(new THREE.SphereGeometry(baseSize * 0.18, 16, 16), activeMat);
                griva.position.y = 4.3 + baseH + spireH + 1.5;
                group.add(griva);

                const stupi = new THREE.Mesh(new THREE.ConeGeometry(baseSize * 0.08, 4.0, 12), goldKalashMat);
                stupi.position.y = 4.3 + baseH + spireH + 4.5;
                group.add(stupi);
              } else {
                // Curvilinear Nagara / Solanki Shikhara Spire
                const shikharaGeo = new THREE.ConeGeometry(baseSize * 0.65, spireH, 8);
                const shikharaMesh = new THREE.Mesh(shikharaGeo, activeMat);
                shikharaMesh.position.y = 4.3 + baseH + spireH / 2;
                group.add(shikharaMesh);

                // Corner miniature spires (Urushringas)
                [-baseSize * 0.28, baseSize * 0.28].forEach(ox => {
                  [-baseSize * 0.28, baseSize * 0.28].forEach(oz => {
                    const uru = new THREE.Mesh(new THREE.ConeGeometry(baseSize * 0.22, spireH * 0.5, 4), activeMat);
                    uru.position.set(ox, 4.3 + baseH + (spireH * 0.25), oz);
                    uru.rotation.y = Math.PI / 4;
                    group.add(uru);
                  });
                });

                // Amalaka (Ribbed Stone Disc at the peak)
                const amalakaGeo = new THREE.CylinderGeometry(baseSize * 0.28, baseSize * 0.26, 2.2, 16);
                const amalakaMesh = new THREE.Mesh(amalakaGeo, plinthMat);
                amalakaMesh.position.y = 4.3 + baseH + spireH + 1.1;
                group.add(amalakaMesh);

                // Golden Brass Kalasha Finial
                const kalashBall = new THREE.Mesh(new THREE.SphereGeometry(2.0, 16, 16), goldKalashMat);
                kalashBall.position.y = 4.3 + baseH + spireH + 3.0;
                group.add(kalashBall);

                const kalashSpire = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.8, 12), goldKalashMat);
                kalashSpire.position.y = 4.3 + baseH + spireH + 4.8;
                group.add(kalashSpire);
              }

              // 4. Mukhamandapa Entrance Porch with Carved Stone Pillars
              const porchPlinth = new THREE.Mesh(new THREE.BoxGeometry(14, 2.5, 10), plinthMat);
              porchPlinth.position.set(0, 1.25, baseSize / 2 + 5);
              group.add(porchPlinth);

              [[-5, baseSize / 2 + 8], [5, baseSize / 2 + 8], [-5, baseSize / 2 + 3], [5, baseSize / 2 + 3]].forEach(([px, pz]) => {
                const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, baseH * 0.75, 1.4), plinthMat);
                pillar.position.set(px, 2.5 + (baseH * 0.75) / 2, pz);
                group.add(pillar);
              });

              const porchRoof = new THREE.Mesh(new THREE.ConeGeometry(9, 5, 4), activeMat);
              porchRoof.position.set(0, 2.5 + (baseH * 0.75) + 2.5, baseSize / 2 + 5);
              porchRoof.rotation.y = Math.PI / 4;
              group.add(porchRoof);

              totalPolygons += 850;
            } else {
              // Tactical Wireframe Shikhara
              const baseGeo = new THREE.BoxGeometry(baseSize, baseH, baseSize);
              const baseMesh = new THREE.Mesh(baseGeo, activeMat);
              baseMesh.position.y = baseH / 2;
              group.add(baseMesh);
              const baseEdges = new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), edgeLineMat);
              baseEdges.position.y = baseH / 2;
              group.add(baseEdges);

              const spireGeo = new THREE.ConeGeometry(baseSize * 0.7, spireH, 4);
              const spireMesh = new THREE.Mesh(spireGeo, activeMat);
              spireMesh.position.y = baseH + spireH / 2;
              spireMesh.rotation.y = Math.PI / 4;
              group.add(spireMesh);
              const spireEdges = new THREE.LineSegments(new THREE.EdgesGeometry(spireGeo), edgeLineMat);
              spireEdges.position.y = baseH + spireH / 2;
              spireEdges.rotation.y = Math.PI / 4;
              group.add(spireEdges);

              const kalash = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
              kalash.position.y = baseH + spireH + 2;
              group.add(kalash);
              totalPolygons += 450;
            }
          } else if (bldType.includes('GOPURAM') || bldType.includes('TOWER')) {
            // Authentic Dravidian Gopuram Gateway Tower
            const tiers = Math.min(7, Math.max(4, Math.floor(height / 7)));
            const baseW = 28, baseD = 18;

            if (isRealistic) {
              // 1. Dvarashala Base Portal with Entrance Passage
              const pylonW = (baseW - 8) / 2;
              const leftPylon = new THREE.Mesh(new THREE.BoxGeometry(pylonW, 9, baseD), activeMat);
              leftPylon.position.set(-baseW / 2 + pylonW / 2, 4.5, 0);
              group.add(leftPylon);

              const rightPylon = new THREE.Mesh(new THREE.BoxGeometry(pylonW, 9, baseD), activeMat);
              rightPylon.position.set(baseW / 2 - pylonW / 2, 4.5, 0);
              group.add(rightPylon);

              const archLintel = new THREE.Mesh(new THREE.BoxGeometry(baseW, 3.5, baseD), plinthMat);
              archLintel.position.set(0, 10.75, 0);
              group.add(archLintel);

              // 2. Tapered Horizontal Storeys (Talas)
              const remainingH = height - 12.5;
              const tierH = remainingH / tiers;
              for (let t = 0; t < tiers; t++) {
                const scale = 1 - (t * 0.11);
                const storeyBox = new THREE.Mesh(new THREE.BoxGeometry(baseW * scale, tierH * 0.88, baseD * scale), activeMat);
                storeyBox.position.y = 12.5 + (t * tierH) + (tierH * 0.44);
                group.add(storeyBox);

                // Overhanging cornice moulding (Kapota)
                const cornice = new THREE.Mesh(new THREE.BoxGeometry((baseW * scale) + 1.2, 0.7, (baseD * scale) + 1.2), plinthMat);
                cornice.position.y = 12.5 + (t * tierH) + (tierH * 0.9);
                group.add(cornice);
              }

              // 3. Sala-Shikhara Barrel-Vaulted Crest Roof
              const topScale = 1 - (tiers * 0.11);
              const salaRoof = new THREE.Mesh(
                new THREE.CylinderGeometry(baseD * topScale * 0.48, baseD * topScale * 0.48, baseW * topScale, 16, 1, false, 0, Math.PI),
                plinthMat
              );
              salaRoof.rotation.z = Math.PI / 2;
              salaRoof.position.y = height + 1.0;
              group.add(salaRoof);

              // Row of Golden Stupis / Kalashas along the roof ridge
              const stupiCount = 5;
              const spacing = (baseW * topScale * 0.8) / (stupiCount - 1);
              for (let s = 0; s < stupiCount; s++) {
                const sx = -(baseW * topScale * 0.4) + (s * spacing);
                const kal = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.8, 10), goldKalashMat);
                kal.position.set(sx, height + 4.2, 0);
                group.add(kal);
              }
              totalPolygons += tiers * 220 + 200;
            } else {
              // Tactical Wireframe Gopuram
              for (let t = 0; t < tiers; t++) {
                const scale = 1 - (t * 0.11);
                const tierH = height / tiers;
                const geo = new THREE.BoxGeometry(baseW * scale, tierH * 0.9, baseD * scale);
                const m = new THREE.Mesh(geo, activeMat);
                m.position.y = (t * tierH) + (tierH / 2);
                group.add(m);
                const ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeLineMat);
                ed.position.y = (t * tierH) + (tierH / 2);
                group.add(ed);
              }
              totalPolygons += tiers * 120;
            }
          } else if (bldType.includes('TANK') || bldType.includes('PUSHKARINI')) {
            // Temple Holy Water Tank with Stepped Stone Ghats
            const tankW = 34, tankD = 34;
            const tankDepth = 4;

            // Water Surface Plane
            const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(tankW - 6, tankD - 6), waterMat);
            waterPlane.rotation.x = -Math.PI / 2;
            waterPlane.position.y = 0.2;
            group.add(waterPlane);

            // Stepped Ghat Terraces
            [0, 1, 2, 3].forEach(step => {
              const sw = tankW - step * 2;
              const sd = tankD - step * 2;
              const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.4, sd), plinthMat);
              stepMesh.position.y = 0.4 + step * 0.35;
              group.add(stepMesh);
            });
            totalPolygons += 180;
          } else if (bldType.includes('MANDAPAM') || bldType.includes('HALL') || bldType.includes('QUEUE')) {
            // Colonnaded Hypostyle Hall / Mandapam
            const hallW = 28, hallD = 20;
            const plinthH = 2.2;
            const hallPlinth = new THREE.Mesh(new THREE.BoxGeometry(hallW, plinthH, hallD), plinthMat);
            hallPlinth.position.y = plinthH / 2;
            group.add(hallPlinth);

            if (isRealistic) {
              // Perimeter Colonnade of Square Stone Pillars
              const colsX = [-11, -4, 4, 11];
              const colsZ = [-7, 0, 7];
              colsX.forEach(cx => {
                colsZ.forEach(cz => {
                  const pil = new THREE.Mesh(new THREE.BoxGeometry(1.3, height - plinthH - 3, 1.3), plinthMat);
                  pil.position.set(cx, plinthH + (height - plinthH - 3) / 2, cz);
                  group.add(pil);
                });
              });

              // Mandapam Stone Roof & Cornice
              const roofBox = new THREE.Mesh(new THREE.BoxGeometry(hallW + 2, 2.5, hallD + 2), activeMat);
              roofBox.position.y = height - 1.25;
              group.add(roofBox);

              const pyramidRoof = new THREE.Mesh(new THREE.ConeGeometry(12, 6, 4), activeMat);
              pyramidRoof.position.set(0, height + 2.5, 0);
              pyramidRoof.rotation.y = Math.PI / 4;
              group.add(pyramidRoof);

              totalPolygons += 360;
            } else {
              const geo = new THREE.BoxGeometry(hallW, height, hallD);
              const m = new THREE.Mesh(geo, activeMat);
              m.position.y = height / 2;
              group.add(m);
              const ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeLineMat);
              ed.position.y = height / 2;
              group.add(ed);
              totalPolygons += 120;
            }
          } else {
            // General Stone Structure (Admin Block, Dispensary, Prasadam Counter)
            const geo = new THREE.BoxGeometry(22, height, 18);
            const m = new THREE.Mesh(geo, activeMat);
            m.position.y = height / 2;
            group.add(m);
            if (!isRealistic) {
              const ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeLineMat);
              ed.position.y = height / 2;
              group.add(ed);
            }
            totalPolygons += 120;
          }

          const labelTheme = bldSelected ? '#ffaa00' : (isRealistic ? '#800000' : '#00f0ff');
          const labelBg = isRealistic ? 'rgba(255, 252, 245, 0.94)' : 'rgba(5, 18, 38, 0.88)';
          const labelTextClr = isRealistic ? '#800000' : null;
          const label = createFloatingLabel(bld.name, `${bld.height_meters || ''}m • ${bld.building_type}`, labelTheme, labelBg, labelTextClr);
          label.position.set(0, height + 10, 0);
          group.add(label);
        }

        group.userData = { type: 'BUILDING', entityType: 'BUILDING', data: bld };
        scene.add(group);
        meshesRef.current.push(group);
        clickableObjectsRef.current.push(group);
      });
    }

    // 2. BOUNDARY RIBBON
    if (layers.boundaries && boundary && Array.isArray(boundary.coordinates_geojson)) {
      const bPoints = boundary.coordinates_geojson.map(([lng, lat]) => {
        const { x, z } = gpsToMeters(lat, lng, centerLat, centerLng);
        return new THREE.Vector3(x, 0.5, z);
      });

      if (bPoints.length > 2) {
        bPoints.push(bPoints[0]);
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bPoints), new THREE.LineBasicMaterial({ color: 0xd97706, linewidth: 3 })));

        const rVertices = [];
        for (let i = 0; i < bPoints.length - 1; i++) {
          const p1 = bPoints[i], p2 = bPoints[i + 1];
          rVertices.push(p1.x, 0, p1.z, p1.x, 4, p1.z, p2.x, 4, p2.z, p1.x, 0, p1.z, p2.x, 4, p2.z, p2.x, 0, p2.z);
        }
        const ribbon = new THREE.Mesh(
          new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rVertices, 3)),
          new THREE.MeshBasicMaterial({ color: 0xd97706, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
        );
        scene.add(ribbon);
        meshesRef.current.push(ribbon);
      }
    }

    // 3. ROAD NETWORK RIBBONS
    if (layers.roads && Array.isArray(roads)) {
      roads.forEach(road => {
        if (road.geometry_type === 'LineString' && Array.isArray(road.geometry_geojson)) {
          const roadGroup = createRoadRibbon(road.geometry_geojson, road.width_meters, centerLat, centerLng);
          if (roadGroup) {
            roadGroup.userData = { type: 'ROAD', entityType: 'ROAD', data: road };
            scene.add(roadGroup);
            meshesRef.current.push(roadGroup);
            clickableObjectsRef.current.push(roadGroup);
            totalPolygons += road.geometry_geojson.length * 6;
          }
        }
      });
    }

    // 3b. VERIFIED EMERGENCY EVACUATION CORRIDORS (Phase 6 Integration)
    if (Array.isArray(emergencyRoutes) && emergencyRoutes.length > 0) {
      emergencyRoutes.forEach(route => {
        if (Array.isArray(route.pathway_coordinates) && route.pathway_coordinates.length > 1) {
          const isPrimary = route.route_type === 'PRIMARY_EVACUATION';
          const routeColor = isPrimary ? 0x00ff88 : 0xff7700;
          const roadGroup = createRoadRibbon(route.pathway_coordinates, (route.clearance_width_meters || 8) * 0.8, centerLat, centerLng, routeColor);
          if (roadGroup) {
            roadGroup.userData = { type: 'EMERGENCY_ROUTE', entityType: 'ROUTE', data: route };
            scene.add(roadGroup);
            meshesRef.current.push(roadGroup);
            clickableObjectsRef.current.push(roadGroup);

            // Floating Route Marker at midpoint
            const midCoord = route.pathway_coordinates[Math.floor(route.pathway_coordinates.length / 2)];
            if (midCoord) {
              const { x: rx, z: rz } = gpsToMeters(midCoord[1], midCoord[0], centerLat, centerLng);
              const rLabel = createFloatingLabel(route.name, `EVACUATION: ${route.length_meters}m • ${route.clearance_width_meters}m clear`, isPrimary ? '#00ff88' : '#ff7700');
              rLabel.position.set(rx, 9, rz);
              scene.add(rLabel);
              meshesRef.current.push(rLabel);
            }
          }
        }
      });
    }

    // 4. SURROUNDING PUBLIC FACILITIES
    if (Array.isArray(facilities)) {
      facilities.forEach(fac => {
        const isEmergency = fac.facility_type === 'HOSPITAL' || fac.facility_type === 'CLINIC' || fac.facility_type === 'POLICE_STATION' || fac.facility_type === 'FIRE_STATION';
        const isCommercial = fac.facility_type === 'PILGRIM_ACCOMMODATION';
        const isAmenity = fac.facility_type === 'PUBLIC_AMENITY';

        if ((isEmergency && !layers.emergency) || (isCommercial && !layers.commercial) || (isAmenity && !layers.amenities)) {
          return;
        }

        const { x, z } = gpsToMeters(fac.latitude, fac.longitude, centerLat, centerLng);
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        let color = 0x3b82f6, labelTheme = '#3b82f6', size = 14;
        if (fac.facility_type === 'HOSPITAL' || fac.facility_type === 'CLINIC') {
          color = 0xef4444; labelTheme = '#ef4444'; size = 18;
        } else if (fac.facility_type === 'POLICE_STATION') {
          color = 0x1d4ed8; labelTheme = '#1d4ed8';
        } else if (fac.facility_type === 'FIRE_STATION') {
          color = 0xea580c; labelTheme = '#ea580c';
        } else if (isCommercial) {
          color = 0xd97706; labelTheme = '#d97706'; size = 16;
        } else if (isAmenity) {
          color = 0x0d9488; labelTheme = '#0d9488'; size = 10;
        }

        const geo = new THREE.BoxGeometry(size, size * 0.9, size);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, transparent: true, opacity: 0.75 }));
        mesh.position.y = (size * 0.9) / 2;
        group.add(mesh);

        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color, opacity: 0.95, transparent: true }));
        edges.position.y = (size * 0.9) / 2;
        group.add(edges);

        // Emergency Flashing Beacon for Hospitals & Police Stations
        if (fac.facility_type === 'HOSPITAL' || fac.facility_type === 'POLICE_STATION') {
          const beaconColor = fac.facility_type === 'HOSPITAL' ? 0xff0044 : 0x0088ff;
          const beaconMesh = new THREE.Mesh(
            new THREE.SphereGeometry(2.5, 12, 12),
            new THREE.MeshBasicMaterial({ color: beaconColor, wireframe: true })
          );
          beaconMesh.position.y = size * 0.9 + 3;
          group.add(beaconMesh);

          // Pulsing vertical beam
          const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 40, 8),
            new THREE.MeshBasicMaterial({ color: beaconColor, transparent: true, opacity: 0.45 })
          );
          beam.position.y = size * 0.9 + 20;
          group.add(beam);
        }

        const distStr = fac.distance_meters > 1000 ? `${(fac.distance_meters/1000).toFixed(1)}km` : `${fac.distance_meters}m`;
        const bedStr = fac.bed_capacity ? ` • ${fac.bed_capacity} beds` : '';
        const label = createFloatingLabel(fac.name, `${fac.facility_type} • ${distStr}${bedStr}`, labelTheme);
        label.position.set(0, size + (fac.facility_type === 'HOSPITAL' ? 12 : 8), 0);
        group.add(label);

        group.userData = { type: 'FACILITY', entityType: 'FACILITY', data: fac };
        scene.add(group);
        meshesRef.current.push(group);
        clickableObjectsRef.current.push(group);
        totalPolygons += 150;
      });
    }

    // 5. TRANSIT NODES
    if (layers.transport && Array.isArray(transport)) {
      transport.forEach(tNode => {
        const { x, z } = gpsToMeters(tNode.latitude, tNode.longitude, centerLat, centerLng);
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const pGeo = new THREE.BoxGeometry(22, 12, 16);
        const pMesh = new THREE.Mesh(pGeo, new THREE.MeshPhysicalMaterial({ color: 0x0088ff, emissive: 0x0033aa, emissiveIntensity: 0.3, transparent: true, opacity: 0.45 }));
        pMesh.position.y = 6;
        group.add(pMesh);

        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 60, 8), new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.4 }));
        beam.position.y = 30;
        group.add(beam);

        const distStr = tNode.distance_meters > 1000 ? `${(tNode.distance_meters/1000).toFixed(1)}km` : `${tNode.distance_meters}m`;
        const label = createFloatingLabel(tNode.name, `Transit • ${distStr}`, '#00aaff');
        label.position.set(0, 24, 0);
        group.add(label);

        group.userData = { type: 'TRANSPORT', entityType: 'TRANSPORT', data: tNode };
        scene.add(group);
        meshesRef.current.push(group);
        clickableObjectsRef.current.push(group);
        totalPolygons += 180;
      });
    }

    // 6. PARKING LOTS
    if (layers.parking && Array.isArray(parking)) {
      parking.forEach(pLot => {
        const { x, z } = gpsToMeters(pLot.latitude, pLot.longitude, centerLat, centerLng);
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const lotMesh = new THREE.Mesh(new THREE.PlaneGeometry(36, 26), new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
        lotMesh.rotation.x = -Math.PI / 2;
        lotMesh.position.y = 0.2;
        group.add(lotMesh);

        const borderGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-18, 0.25, -13), new THREE.Vector3(18, 0.25, -13),
          new THREE.Vector3(18, 0.25, 13), new THREE.Vector3(-18, 0.25, 13),
          new THREE.Vector3(-18, 0.25, -13)
        ]);
        group.add(new THREE.Line(borderGeo, new THREE.LineBasicMaterial({ color: 0x00ffaa })));

        // 3D Occupancy Status Gauge
        const cap = pLot.total_capacity || pLot.parking_capacity || 400;
        const occPct = pLot.current_occupancy_percent || 62;
        const freeSpaces = pLot.available_spaces ?? Math.max(0, Math.round(cap * (1 - occPct / 100)));
        const occColor = occPct >= 85 ? 0xff3344 : (occPct >= 65 ? 0xffaa00 : 0x00ffaa);
        const occThemeHex = occPct >= 85 ? '#ff3344' : (occPct >= 65 ? '#ffaa00' : '#00ffaa');

        // Occupancy Fill Bar above parking plane
        const barW = 32;
        const fillW = Math.max(1, (occPct / 100) * barW);
        const bgBar = new THREE.Mesh(
          new THREE.BoxGeometry(barW, 0.8, 1.2),
          new THREE.MeshBasicMaterial({ color: 0x223344, transparent: true, opacity: 0.6 })
        );
        bgBar.position.set(0, 1.5, -12);
        group.add(bgBar);

        const fillBar = new THREE.Mesh(
          new THREE.BoxGeometry(fillW, 0.9, 1.3),
          new THREE.MeshBasicMaterial({ color: occColor })
        );
        fillBar.position.set(-barW / 2 + fillW / 2, 1.5, -12);
        group.add(fillBar);

        const label = createFloatingLabel(pLot.name, `PARKING: ${freeSpaces} free / ${cap} total (${occPct}%)`, occThemeHex);
        label.position.set(0, 11, 0);
        group.add(label);

        group.userData = { type: 'TRANSPORT', entityType: 'TRANSPORT', data: pLot };
        scene.add(group);
        meshesRef.current.push(group);
        clickableObjectsRef.current.push(group);
        totalPolygons += 60;
      });
    }

    // 7. 3D SPATIAL CROWD HEATMAP & DENSITY PILLARS (Phase 9 Implementation)
    const showHeatmapLayer = layers.heatmap !== false && (layers.crowdZones !== false);
    if (showHeatmapLayer && Array.isArray(zones)) {
      const hmMap = {};
      if (heatmapData?.zones) {
        heatmapData.zones.forEach(hz => {
          hmMap[hz.zone_id] = hz;
        });
      }

      zones.forEach(zone => {
        const { x, z } = gpsToMeters(zone.latitude, zone.longitude, centerLat, centerLng);
        const zoneSelected = isSelected(zone);
        const hm = hmMap[zone.zone_code] || {};

        // Extract verified telemetry with Festival Surge Factor applied if in Festival Simulation Mode
        const surgeFactor = festivalSimulationMode ? (selectedFestival?.peak_surge_multiplier || 4.2) : 1.0;
        const count = Math.round((hm.observed_people_count ?? hm.predicted_people_count ?? (zone.current_crowd || 0)) * surgeFactor);
        const density = hm.estimated_crowd_density !== null && hm.estimated_crowd_density !== undefined
          ? Math.round(hm.estimated_crowd_density * surgeFactor * 100) / 100
          : null;
        const util = hm.capacity_utilization_percent !== null && hm.capacity_utilization_percent !== undefined
          ? Math.min(100, Math.round(hm.capacity_utilization_percent * surgeFactor))
          : null;
        const risk = festivalSimulationMode 
          ? (surgeFactor >= 4.0 ? 'CRITICAL' : 'HIGH')
          : (hm.congestion_risk ?? hm.predicted_congestion_risk ?? (zone.risk_level || 'NORMAL'));

        // Color coding per Section 3
        let zoneHex = 0x38ef7d;
        let themeHex = '#38ef7d';
        if (festivalSimulationMode) {
          zoneHex = 0xffaa00; // Festive luminous amber/gold
          themeHex = '#ffaa00';
          if (surgeFactor >= 4.0) {
            zoneHex = 0xff4433; // Critical festival surge crimson
            themeHex = '#ff4433';
          }
        } else {
          if (risk === 'CRITICAL') { zoneHex = 0xef4444; themeHex = '#ef4444'; }
          else if (risk === 'HIGH') { zoneHex = 0xf97316; themeHex = '#f97316'; }
          else if (risk === 'MODERATE') { zoneHex = 0xf59e0b; themeHex = '#f59e0b'; }
          else if (risk === 'NORMAL') { zoneHex = 0x38ef7d; themeHex = '#38ef7d'; }
          else if (risk === 'UNKNOWN') { zoneHex = 0x94a3b8; themeHex = '#94a3b8'; }
        }

        if (zoneSelected) {
          zoneHex = 0xd4af37;
          themeHex = '#d4af37';
        }

        const zoneGroup = new THREE.Group();
        zoneGroup.position.set(x, 0, z);

        // Radius scaled to usable area (12m to 24m)
        const radius = Math.max(12, Math.min(24, Math.sqrt((zone.usable_area_sqm || 400) / Math.PI) * 0.95));

        // 1. Transparent Radial Heat Surface (Ground plane)
        const heatGeo = new THREE.CircleGeometry(radius, 32);
        const heatMat = new THREE.MeshBasicMaterial({
          color: zoneHex,
          transparent: true,
          opacity: zoneSelected ? 0.45 : (festivalSimulationMode ? 0.35 : 0.22),
          side: THREE.DoubleSide
        });
        const heatMesh = new THREE.Mesh(heatGeo, heatMat);
        heatMesh.rotation.x = -Math.PI / 2;
        heatMesh.position.y = 0.22;
        zoneGroup.add(heatMesh);

        // 2. Zone Boundary Ring
        const ringGeo = new THREE.RingGeometry(radius - 0.5, radius + 0.5, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: zoneHex, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.25;
        zoneGroup.add(ringMesh);

        // 3. Elevated Density Indicator Pillar (Volumetric Light Cylinder)
        const maxPillarHeight = festivalSimulationMode ? 45.0 : 24.0;
        const pillarH = density !== null 
          ? Math.max(4.0, Math.min(maxPillarHeight, density * 5.0 * (festivalSimulationMode ? 1.3 : 1.0))) 
          : Math.max(4.0, Math.min(maxPillarHeight, (count / 80.0) * 3.0));

        const pillarGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.82, pillarH, 16, 1, true);
        const pillarMat = new THREE.MeshPhysicalMaterial({
          color: zoneHex,
          emissive: zoneHex,
          emissiveIntensity: zoneSelected ? 0.7 : (festivalSimulationMode ? 0.5 : 0.25),
          transparent: true,
          opacity: zoneSelected ? 0.45 : (festivalSimulationMode ? 0.35 : 0.18),
          side: THREE.DoubleSide
        });
        const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
        pillarMesh.position.y = pillarH / 2;
        zoneGroup.add(pillarMesh);

        // Wireframe edges on the density pillar
        const wireGeo = new THREE.WireframeGeometry(pillarGeo);
        const wireMat = new THREE.LineBasicMaterial({ color: zoneHex, transparent: true, opacity: zoneSelected ? 0.6 : 0.28 });
        const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
        wireMesh.position.y = pillarH / 2;
        zoneGroup.add(wireMesh);

        // 4. Scanning Ring Wave around pillar
        const scanRingGeo = new THREE.RingGeometry(radius * 0.72 - 0.3, radius * 0.72 + 0.3, 24);
        const scanRing = new THREE.Mesh(scanRingGeo, new THREE.MeshBasicMaterial({ color: zoneHex, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
        scanRing.rotation.x = -Math.PI / 2;
        scanRing.position.y = pillarH * 0.75;
        zoneGroup.add(scanRing);

        // 5. Selected-Zone Highlight Beacon
        if (zoneSelected) {
          const selectBeaconGeo = new THREE.CylinderGeometry(0.5, 0.5, 50, 8);
          const selectBeaconMat = new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.65 });
          const beacon = new THREE.Mesh(selectBeaconGeo, selectBeaconMat);
          beacon.position.y = 25;
          zoneGroup.add(beacon);

          const selectRingGeo = new THREE.RingGeometry(radius + 1.5, radius + 2.5, 32);
          const selectRingMat = new THREE.MeshBasicMaterial({ color: 0xd4af37, side: THREE.DoubleSide });
          const selectRing = new THREE.Mesh(selectRingGeo, selectRingMat);
          selectRing.rotation.x = -Math.PI / 2;
          selectRing.position.y = 0.28;
          zoneGroup.add(selectRing);
        }

        // Active Emergency Alert Beacon & Warning Marker
        const activeAlert = Array.isArray(emergencyAlerts) ? emergencyAlerts.find(a => 
          (a.zone_code === zone.zone_code || a.zone_name === zone.name) && 
          a.status !== 'RESOLVED' && a.status !== 'DISMISSED'
        ) : null;

        if (activeAlert) {
          const alertColor = activeAlert.severity === 'RED' ? 0xff0044 : 0xff7700;
          const emBeaconGeo = new THREE.CylinderGeometry(0.8, 1.2, 70, 8);
          const emBeaconMat = new THREE.MeshBasicMaterial({ color: alertColor, transparent: true, opacity: 0.65, wireframe: true });
          const emBeacon = new THREE.Mesh(emBeaconGeo, emBeaconMat);
          emBeacon.position.y = 35;
          zoneGroup.add(emBeacon);

          const alertLabel = createFloatingLabel(`⚠️ ${activeAlert.severity} ALERT: ${activeAlert.event_type}`, activeAlert.title, activeAlert.severity === 'RED' ? '#ff0044' : '#ff7700', 'rgba(40, 5, 10, 0.92)');
          alertLabel.position.set(0, pillarH + 15.0, 0);
          zoneGroup.add(alertLabel);
        }

        // 6. Floating 3D Count & Density Billboard Sprite Label
        let modeTag = '[LIVE]';
        if (heatmapMode === 'HISTORICAL') modeTag = '[HISTORICAL]';
        else if (heatmapMode && heatmapMode.startsWith('PRED_')) modeTag = `[PRED +${heatmapMode.replace('PRED_', '')}m]`;

        const titleText = `${zone.name} ${modeTag}`;
        const densityStr = density !== null ? `${density} p/m²` : 'Area Unverified';
        const utilStr = util !== null ? `${util}% Cap` : '';
        const subtitleText = `${count} devotees • ${densityStr} • ${risk} ${utilStr}`;
        const label = createFloatingLabel(titleText, subtitleText, themeHex);
        label.position.set(0, pillarH + 6.0, 0);
        zoneGroup.add(label);

        // Aggregate complete telemetry for click inspector
        const enrichedZoneData = {
          ...zone,
          heatmap: hm,
          count,
          density,
          utilization: util,
          risk,
          modeTag,
          themeHex
        };

        zoneGroup.userData = { type: 'ZONE', entityType: 'ZONE', data: enrichedZoneData };
        scene.add(zoneGroup);
        meshesRef.current.push(zoneGroup);
        clickableObjectsRef.current.push(zoneGroup);
        totalPolygons += 180;
      });
    }

    // 8. CCTV CAMERAS & CONICAL FOV FRUSTUMS (Phase 8 CV Spatial Calibration)
    if (layers.cameras && Array.isArray(cameras)) {
      cameras.forEach(cam => {
        if (!cam.latitude || !cam.longitude) return;
        const { x, z } = gpsToMeters(cam.latitude, cam.longitude, centerLat, centerLng);
        const camGroup = new THREE.Group();
        camGroup.position.set(x, 0, z);

        const isHighCrowd = cam.risk_level === 'CRITICAL' || cam.risk_level === 'HIGH' || (cam.density_percent || 0) > 65;
        const themeColor = isHighCrowd ? 0xef4444 : 0x2563eb;
        const poleH = 7.0;

        // Metallic Pylon Pole
        const poleGeo = new THREE.CylinderGeometry(0.2, 0.25, poleH, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8, roughness: 0.2 });
        const poleMesh = new THREE.Mesh(poleGeo, poleMat);
        poleMesh.position.y = poleH / 2;
        camGroup.add(poleMesh);

        // Camera Head Unit Box
        const headGeo = new THREE.BoxGeometry(0.8, 0.5, 1.2);
        const headMat = new THREE.MeshStandardMaterial({
          color: themeColor,
          roughness: 0.4,
          metalness: 0.3
        });
        const headMesh = new THREE.Mesh(headGeo, headMat);
        headMesh.position.y = poleH;
        
        // Orientation angle relative to North
        const orientationRad = ((cam.orientation_deg || 0) * Math.PI) / 180;
        headMesh.rotation.y = -orientationRad;
        camGroup.add(headMesh);

        // Blinking Beacon Top Sphere
        const beaconGeo = new THREE.SphereGeometry(0.2, 12, 12);
        const beaconMat = new THREE.MeshBasicMaterial({ color: isHighCrowd ? 0xff0044 : 0x00ff88 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.y = poleH + 0.45;
        camGroup.add(beacon);

        // Conical FOV Ground Projection Frustum
        const fovDeg = cam.fov_deg || 75.0;
        const halfFovRad = ((fovDeg / 2) * Math.PI) / 180;
        const rangeMeters = 16.0;
        const segments = 12;

        const frustumVertices = [];
        const frustumIndices = [];

        // Apex at camera head
        frustumVertices.push(0, poleH, 0); // index 0

        // Ground Arc points
        for (let s = 0; s <= segments; s++) {
          const frac = s / segments;
          const angle = -orientationRad - halfFovRad + (frac * 2 * halfFovRad);
          const gx = Math.sin(angle) * rangeMeters;
          const gz = -Math.cos(angle) * rangeMeters;
          frustumVertices.push(gx, 0.15, gz); // index s + 1
        }

        // Triangles forming the 3D projection cone volume
        for (let s = 1; s <= segments; s++) {
          frustumIndices.push(0, s, s + 1);
        }

        const frustumGeo = new THREE.BufferGeometry();
        frustumGeo.setAttribute('position', new THREE.Float32BufferAttribute(frustumVertices, 3));
        frustumGeo.setIndex(frustumIndices);
        frustumGeo.computeVertexNormals();

        const frustumMat = new THREE.MeshBasicMaterial({
          color: themeColor,
          transparent: true,
          opacity: isHighCrowd ? 0.32 : 0.16,
          side: THREE.DoubleSide
        });
        const frustumMesh = new THREE.Mesh(frustumGeo, frustumMat);
        camGroup.add(frustumMesh);

        // Wireframe edges on the projection volume
        const wireMat = new THREE.LineBasicMaterial({ color: themeColor, transparent: true, opacity: isHighCrowd ? 0.8 : 0.45 });
        const frustumWire = new THREE.LineSegments(new THREE.WireframeGeometry(frustumGeo), wireMat);
        camGroup.add(frustumWire);

        // Visual Alert Illumination ring on ground when congested
        if (isHighCrowd) {
          const alertRingGeo = new THREE.RingGeometry(rangeMeters * 0.85, rangeMeters * 1.05, 24);
          const alertRingMat = new THREE.MeshBasicMaterial({ color: 0xff3344, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
          const alertRing = new THREE.Mesh(alertRingGeo, alertRingMat);
          alertRing.rotation.x = -Math.PI / 2;
          alertRing.position.set(0, 0.18, 0);
          camGroup.add(alertRing);
        }

        // Floating Camera Telemetry Sprite Label
        const labelText = `${cam.camera_id} • ${cam.name}`;
        const labelSubtitle = `Observed: ${cam.person_count || 0} devotees | FOV: ${cam.fov_deg}°`;
        const label = createFloatingLabel(labelText, labelSubtitle, isHighCrowd ? '#ff3344' : '#00f0ff');
        label.position.set(0, poleH + 4.5, 0);
        camGroup.add(label);

        camGroup.userData = { type: 'CAMERA', entityType: 'CAMERA', data: cam };
        scene.add(camGroup);
        meshesRef.current.push(camGroup);
        clickableObjectsRef.current.push(camGroup);
        totalPolygons += 120;
      });
    }

    // 9. DYNAMIC ROUTE HIGHLIGHT LINE (Temple Centroid to Selected Facility / Transit / Parking)
    if (selectedEntity && selectedEntity.latitude && selectedEntity.longitude) {
      const { x: destX, z: destZ } = gpsToMeters(selectedEntity.latitude, selectedEntity.longitude, centerLat, centerLng);
      if (Math.hypot(destX, destZ) > 5) {
        const midX = destX / 2;
        const midZ = destZ / 2;
        const dist = Math.hypot(destX, destZ);
        const arcHeight = Math.min(60, Math.max(15, dist * 0.15));

        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 1.5, 0),
          new THREE.Vector3(midX, arcHeight, midZ),
          new THREE.Vector3(destX, 1.5, destZ)
        );

        const points = curve.getPoints(40);
        const routeGeo = new THREE.BufferGeometry().setFromPoints(points);
        const routeLine = new THREE.Line(
          routeGeo,
          new THREE.LineDashedMaterial({
            color: 0x10b981,
            linewidth: 2,
            scale: 1,
            dashSize: 4,
            gapSize: 2
          })
        );
        routeLine.computeLineDistances();
        scene.add(routeLine);
        meshesRef.current.push(routeLine);
      }
    }

    if (onUpdateStats) {
      onUpdateStats({ polyCount: totalPolygons + 1500 });
    }
  }, [temple, buildings, zones, boundary, roads, facilities, transport, parking, cameras, heatmapData, heatmapMode, layers, navLevel, selectedEntity, selectedFloor, renderMode, festivalSimulationMode, selectedFestival]);

  // Raycaster for Interactive Navigation Transitions
  const handlePointerDown = useCallback((event) => {
    if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(clickableObjectsRef.current, true);
    if (intersects.length > 0) {
      let target = intersects[0].object;
      while (target && !target.userData?.type && target.parent) {
        target = target.parent;
      }

      if (target && target.userData?.data) {
        const ent = target.userData.data;
        onSelectEntity(ent);

        // Auto drill-down navigation levels
        if (target.userData.type === 'BUILDING') {
          onSelectLevel(3); // Level 3: Building View
        } else if (target.userData.type === 'ZONE') {
          onSelectLevel(4); // Level 4: Zone View
        }
      }
    }
  }, [onSelectEntity, onSelectLevel]);

  return (
    <div 
      className="w-100 h-100 position-relative overflow-hidden cursor-grab"
      style={{ touchAction: 'none' }}
    >
      <div 
        ref={mountRef} 
        onPointerDown={handlePointerDown}
        className="w-100 h-100"
      />

      {/* 3D Festival Simulation Watermark & Banner */}
      {festivalSimulationMode && (
        <>
          <div 
            className="position-absolute top-0 start-50 translate-middle-x mt-3 px-4 py-2 rounded-pill d-flex align-items-center gap-2 shadow-lg"
            style={{
              backgroundColor: 'rgba(24, 10, 4, 0.90)',
              border: '1.5px solid #ff7700',
              backdropFilter: 'blur(10px)',
              zIndex: 1000,
              boxShadow: '0 0 25px rgba(255, 119, 0, 0.45)'
            }}
          >
            <span className="badge bg-danger text-uppercase fw-bold px-2 py-1" style={{ letterSpacing: '0.5px' }}>
              [SIMULATED - FESTIVAL PEAK SCENARIO]
            </span>
            <span className="text-warning fw-semibold small">
              {selectedFestival?.name || 'Festival Surge Peak'} 
              <span className="text-white-50 ms-2">
                (Surge Factor: ~{selectedFestival?.peak_surge_multiplier || 4.2}x Baseline)
              </span>
            </span>
          </div>

          <div 
            className="position-absolute bottom-0 end-0 m-3 px-3 py-1 rounded bg-dark border border-warning text-warning fw-bold small opacity-75 shadow"
            style={{ zIndex: 1000, letterSpacing: '1px' }}
          >
            ⚠️ [SIMULATED DATA - FESTIVAL SCENARIO]
          </div>
        </>
      )}
    </div>
  );
};

export default TempleDigitalTwin;
