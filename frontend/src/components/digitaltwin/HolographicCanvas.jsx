import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Convert GPS coordinates to local Cartesian coordinates (meters relative to temple centroid)
const gpsToMeters = (lat, lng, centerLat, centerLng) => {
  const metersPerLat = 111320;
  const metersPerLng = 40075000 * Math.cos((centerLat * Math.PI) / 180) / 360;
  const x = (lng - centerLng) * metersPerLng;
  const z = -(lat - centerLat) * metersPerLat;
  return { x, z };
};

// Procedural dynamic 2D canvas text sprite generator for floating labels
const createFloatingLabel = (text, subtitle = '') => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Background pill
  ctx.fillStyle = 'rgba(5, 18, 38, 0.85)';
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 4;
  
  const r = 24;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, r);
  ctx.fill();
  ctx.stroke();

  // Text Title
  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#00f0ff';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 56);

  // Subtitle
  if (subtitle) {
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#A0C4E2';
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
  sprite.scale.set(32, 8, 1);
  return sprite;
};

const HolographicCanvas = ({
  temple,
  buildings = [],
  zones = [],
  boundary = null,
  facilities = [],
  layers = {
    buildings: true,
    boundaries: true,
    entrances: true,
    pathways: true,
    queueComplexes: true,
    crowdZones: true,
    surroundings: true
  },
  autoRotate = true,
  cameraPreset = null,
  selectedBuilding = null,
  onSelectBuilding = () => {},
  onSelectZone = () => {},
  onUpdateStats = () => {}
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const scanPlaneRef = useRef(null);
  const buildingMeshesRef = useRef([]);
  const clickableObjectsRef = useRef([]);
  const animFrameIdRef = useRef(null);
  const targetCamPosRef = useRef(null);
  const targetLookAtRef = useRef(null);

  // Setup Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040914);
    scene.fog = new THREE.FogExp2(0x040914, 0.0035);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 3000);
    camera.position.set(0, 160, 220);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below ground
    controls.minDistance = 20;
    controls.maxDistance = 600;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.8;
    controlsRef.current = controls;

    // 5. Holographic Lighting
    const ambientLight = new THREE.AmbientLight(0x0a2540, 1.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 2.5);
    dirLight1.position.set(100, 200, 100);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x0055ff, 1.5);
    dirLight2.position.set(-100, 150, -100);
    scene.add(dirLight2);

    // 6. Holographic Ground Grid & Concentric Cybernetic Rings
    const gridHelper = new THREE.GridHelper(500, 50, 0x00f0ff, 0x003366);
    gridHelper.position.y = -0.2;
    scene.add(gridHelper);

    // Range Radar Rings
    [60, 120, 180, 240].forEach(radius => {
      const ringGeo = new THREE.RingGeometry(radius - 0.4, radius + 0.4, 64);
      const ringMat = new THREE.MeshBasicMaterial({ 
        color: 0x00f0ff, 
        transparent: true, 
        opacity: 0.25, 
        side: THREE.DoubleSide 
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.1;
      scene.add(ring);
    });

    // 7. Ambient Particle Cloud (Digital Quantum Motes)
    const particleCount = 600;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 450;
      particlePositions[i + 1] = Math.random() * 120;
      particlePositions[i + 2] = (Math.random() - 0.5) * 450;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 2.2,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const particleCloud = new THREE.Points(particleGeo, particleMat);
    scene.add(particleCloud);

    // 8. Animated Holographic Laser Scan Plane
    const scanGeo = new THREE.PlaneGeometry(350, 350, 16, 16);
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.08,
      wireframe: true,
      side: THREE.DoubleSide
    });
    const scanPlane = new THREE.Mesh(scanGeo, scanMat);
    scanPlane.rotation.x = Math.PI / 2;
    scanPlane.position.y = 5;
    scene.add(scanPlane);
    scanPlaneRef.current = scanPlane;

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Render & Animation Loop
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 60;
    let scanDirection = 1;

    const animate = (time) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      // FPS tracking
      frameCount++;
      if (time - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (time - lastTime));
        frameCount = 0;
        lastTime = time;
        if (onUpdateStats) {
          onUpdateStats({ fps });
        }
      }

      // Vertical Laser Scanner Animation
      if (scanPlaneRef.current) {
        scanPlaneRef.current.position.y += scanDirection * 0.35;
        if (scanPlaneRef.current.position.y > 75) scanDirection = -1;
        if (scanPlaneRef.current.position.y < 2) scanDirection = 1;
      }

      // Ambient particles slow drift
      if (particleCloud) {
        particleCloud.rotation.y += 0.0006;
      }

      // Smooth Camera Interpolation for Presets
      if (targetCamPosRef.current && camera) {
        camera.position.lerp(targetCamPosRef.current, 0.05);
        if (camera.position.distanceTo(targetCamPosRef.current) < 1.0) {
          targetCamPosRef.current = null;
        }
      }
      if (targetLookAtRef.current && controls) {
        controls.target.lerp(targetLookAtRef.current, 0.05);
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

  // Handle Camera Presets
  useEffect(() => {
    if (!cameraPreset || !cameraRef.current || !controlsRef.current) return;

    if (cameraPreset === 'aerial') {
      targetCamPosRef.current = new THREE.Vector3(0, 280, 20);
      targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
    } else if (cameraPreset === 'ground') {
      targetCamPosRef.current = new THREE.Vector3(0, 25, 120);
      targetLookAtRef.current = new THREE.Vector3(0, 15, 0);
    } else if (cameraPreset === 'reset') {
      targetCamPosRef.current = new THREE.Vector3(0, 160, 220);
      targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
    }
  }, [cameraPreset]);

  // Construct Temple 3D Holographic Geometry from Verified GIS Datasets
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !temple) return;

    // Clear previously spawned temple meshes
    buildingMeshesRef.current.forEach(mesh => {
      scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
        else mesh.material.dispose();
      }
    });
    buildingMeshesRef.current = [];
    clickableObjectsRef.current = [];

    const centerLat = temple.latitude || 20.8880;
    const centerLng = temple.longitude || 70.4012;

    // Materials Palette (Hologram Shaders & Translucent Cyan)
    const buildingMat = new THREE.MeshPhysicalMaterial({
      color: 0x00e5ff,
      emissive: 0x002244,
      metalness: 0.85,
      roughness: 0.15,
      transparent: true,
      opacity: 0.42,
      transmission: 0.4,
      reflectivity: 0.9,
      side: THREE.DoubleSide
    });

    const edgeLineMat = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9,
      linewidth: 1.5
    });

    const highlightMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0x552200,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });

    let totalPolygons = 0;

    // 1. BUILDINGS LAYER
    if (layers.buildings && Array.isArray(buildings)) {
      buildings.forEach((bld, idx) => {
        const { x, z } = gpsToMeters(bld.latitude, bld.longitude, centerLat, centerLng);
        const height = bld.height_meters || 20;
        const bldType = (bld.building_type || '').toUpperCase();
        
        let buildingGroup = new THREE.Group();
        buildingGroup.position.set(x, 0, z);

        // Procedural Architectural Typology based on verified Indian Temple Architecture
        if (bldType.includes('SANCTUM') || bldType.includes('SHIKHARA') || bldType.includes('VIMANA')) {
          // Main Sanctum / Shikhara Pyramidal Spire
          const baseSize = 24;
          const baseHeight = height * 0.4;
          const spireHeight = height * 0.6;

          // Square Mandapa Base
          const baseGeo = new THREE.BoxGeometry(baseSize, baseHeight, baseSize);
          const baseMesh = new THREE.Mesh(baseGeo, buildingMat);
          baseMesh.position.y = baseHeight / 2;
          buildingGroup.add(baseMesh);

          const baseEdges = new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), edgeLineMat);
          baseEdges.position.y = baseHeight / 2;
          buildingGroup.add(baseEdges);

          // Stepped Kailash / Shikhara Spire (4-Tiered Pyramidal Tower)
          const spireGeo = new THREE.ConeGeometry(baseSize * 0.7, spireHeight, 4);
          const spireMesh = new THREE.Mesh(spireGeo, buildingMat);
          spireMesh.position.y = baseHeight + spireHeight / 2;
          spireMesh.rotation.y = Math.PI / 4;
          buildingGroup.add(spireMesh);

          const spireEdges = new THREE.LineSegments(new THREE.EdgesGeometry(spireGeo), edgeLineMat);
          spireEdges.position.y = baseHeight + spireHeight / 2;
          spireEdges.rotation.y = Math.PI / 4;
          buildingGroup.add(spireEdges);

          // Golden Kalash Finial
          const kalashGeo = new THREE.SphereGeometry(2.5, 12, 12);
          const kalashMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
          const kalashMesh = new THREE.Mesh(kalashGeo, kalashMat);
          kalashMesh.position.y = baseHeight + spireHeight + 2;
          buildingGroup.add(kalashMesh);

          totalPolygons += 450;
        } else if (bldType.includes('GOPURAM') || bldType.includes('TOWER')) {
          // Monumental Dravidian Multi-Tiered Gopuram Tower (e.g. Madurai 51.9m, Tirupati 50m)
          const gopuramTiers = Math.min(7, Math.max(3, Math.floor(height / 8)));
          const baseW = 28;
          const baseD = 18;

          for (let tier = 0; tier < gopuramTiers; tier++) {
            const scale = 1 - (tier * 0.11);
            const tierH = height / gopuramTiers;
            const tierGeo = new THREE.BoxGeometry(baseW * scale, tierH * 0.9, baseD * scale);
            const tierMesh = new THREE.Mesh(tierGeo, buildingMat);
            tierMesh.position.y = (tier * tierH) + (tierH / 2);
            buildingGroup.add(tierMesh);

            const tierEdges = new THREE.LineSegments(new THREE.EdgesGeometry(tierGeo), edgeLineMat);
            tierEdges.position.y = (tier * tierH) + (tierH / 2);
            buildingGroup.add(tierEdges);

            totalPolygons += 120;
          }

          // Barrel-Vaulted Sala Finial Roof
          const roofGeo = new THREE.CylinderGeometry(baseD * 0.25, baseD * 0.35, baseW * 0.45, 12);
          const roofMesh = new THREE.Mesh(roofGeo, buildingMat);
          roofMesh.rotation.z = Math.PI / 2;
          roofMesh.position.y = height + 2;
          buildingGroup.add(roofMesh);

          const roofEdges = new THREE.LineSegments(new THREE.EdgesGeometry(roofGeo), edgeLineMat);
          roofEdges.rotation.z = Math.PI / 2;
          roofEdges.position.y = height + 2;
          buildingGroup.add(roofEdges);

          totalPolygons += 200;
        } else if (bldType.includes('MANDAP') || bldType.includes('HALL') || bldType.includes('COURT')) {
          // Pillared Mandapam Hall / 1,000-Pillar Pavilion
          const hallW = 34;
          const hallD = 26;
          const hallH = Math.max(10, height);

          // Roof slab
          const roofGeo = new THREE.BoxGeometry(hallW, 2, hallD);
          const roofMesh = new THREE.Mesh(roofGeo, buildingMat);
          roofMesh.position.y = hallH;
          buildingGroup.add(roofMesh);

          const roofEdges = new THREE.LineSegments(new THREE.EdgesGeometry(roofGeo), edgeLineMat);
          roofEdges.position.y = hallH;
          buildingGroup.add(roofEdges);

          // Colonnade Pillars
          const pillarGeo = new THREE.CylinderGeometry(0.8, 0.8, hallH, 8);
          for (let px of [-hallW/2 + 2, hallW/2 - 2]) {
            for (let pz of [-hallD/2 + 2, hallD/2 - 2, 0]) {
              const pillar = new THREE.Mesh(pillarGeo, buildingMat);
              pillar.position.set(px, hallH / 2, pz);
              buildingGroup.add(pillar);
            }
          }
          totalPolygons += 380;
        } else {
          // Standard Campus Building / Corridor
          const w = 20;
          const d = 16;
          const geo = new THREE.BoxGeometry(w, height, d);
          const mesh = new THREE.Mesh(geo, buildingMat);
          mesh.position.y = height / 2;
          buildingGroup.add(mesh);

          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeLineMat);
          edges.position.y = height / 2;
          buildingGroup.add(edges);
          totalPolygons += 120;
        }

        // Floating Holographic 3D Label
        const label = createFloatingLabel(bld.name, `${bld.height_meters ? bld.height_meters + 'm' : ''} • ${bld.building_type}`);
        label.position.set(0, height + 10, 0);
        buildingGroup.add(label);

        // Attach metadata for raycasting interaction
        buildingGroup.userData = {
          type: 'building',
          data: bld
        };

        scene.add(buildingGroup);
        buildingMeshesRef.current.push(buildingGroup);
        clickableObjectsRef.current.push(buildingGroup);
      });
    }

    // 2. CAMPUS BOUNDARY ILLUMINATION
    if (layers.boundaries && boundary && Array.isArray(boundary.coordinates_geojson)) {
      const boundaryPoints = [];
      boundary.coordinates_geojson.forEach(([lng, lat]) => {
        const { x, z } = gpsToMeters(lat, lng, centerLat, centerLng);
        boundaryPoints.push(new THREE.Vector3(x, 0.5, z));
      });

      if (boundaryPoints.length > 2) {
        // Connect closed loop
        boundaryPoints.push(boundaryPoints[0]);

        const lineGeo = new THREE.BufferGeometry().setFromPoints(boundaryPoints);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x00f0ff,
          linewidth: 3,
          transparent: true,
          opacity: 0.95
        });
        const boundaryLine = new THREE.Line(lineGeo, lineMat);
        scene.add(boundaryLine);
        buildingMeshesRef.current.push(boundaryLine);

        // Floating Boundary Fence Ribbon
        const ribbonGeo = new THREE.BufferGeometry();
        const ribbonVertices = [];
        for (let i = 0; i < boundaryPoints.length - 1; i++) {
          const p1 = boundaryPoints[i];
          const p2 = boundaryPoints[i + 1];
          // Quad vertices: (p1_bottom, p1_top, p2_top), (p1_bottom, p2_top, p2_bottom)
          ribbonVertices.push(
            p1.x, 0, p1.z,
            p1.x, 4, p1.z,
            p2.x, 4, p2.z,
            p1.x, 0, p1.z,
            p2.x, 4, p2.z,
            p2.x, 0, p2.z
          );
        }
        ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVertices, 3));
        const ribbonMat = new THREE.MeshBasicMaterial({
          color: 0x00f0ff,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide
        });
        const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
        scene.add(ribbonMesh);
        buildingMeshesRef.current.push(ribbonMesh);
      }
    }

    // 3. CROWD-MONITORING ZONES (Floor Projections)
    if (layers.crowdZones && Array.isArray(zones)) {
      zones.forEach(zone => {
        const { x, z } = gpsToMeters(zone.latitude, zone.longitude, centerLat, centerLng);
        const zoneRadius = 16;

        let zoneColor = 0x38ef7d; // Green
        if (zone.risk_level === 'CRITICAL' || zone.occupancy_percent > 80) zoneColor = 0xff3838;
        else if (zone.risk_level === 'HIGH' || zone.occupancy_percent > 60) zoneColor = 0xffaa00;

        const zoneGeo = new THREE.CircleGeometry(zoneRadius, 32);
        const zoneMat = new THREE.MeshBasicMaterial({
          color: zoneColor,
          transparent: true,
          opacity: 0.28,
          side: THREE.DoubleSide
        });
        const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
        zoneMesh.rotation.x = -Math.PI / 2;
        zoneMesh.position.set(x, 0.2, z);
        
        // Zone ring border
        const ringGeo = new THREE.RingGeometry(zoneRadius - 0.4, zoneRadius + 0.4, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: zoneColor, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.25, z);

        const zoneGroup = new THREE.Group();
        zoneGroup.add(zoneMesh);
        zoneGroup.add(ring);

        // Zone label
        const zoneLabel = createFloatingLabel(zone.name, `Queue: ${zone.queue_length || 0} • ${zone.occupancy_percent || 0}%`);
        zoneLabel.position.set(x, 14, z);
        zoneGroup.add(zoneLabel);

        zoneGroup.userData = {
          type: 'zone',
          data: zone
        };

        scene.add(zoneGroup);
        buildingMeshesRef.current.push(zoneGroup);
        clickableObjectsRef.current.push(zoneGroup);
      });
    }

    if (onUpdateStats) {
      onUpdateStats({ polyCount: totalPolygons + 1200 });
    }
  }, [temple, buildings, zones, boundary, layers]);

  // Raycasting for Building & Zone Click Selection
  const handlePointerDown = useCallback((event) => {
    if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(clickableObjectsRef.current, true);
    if (intersects.length > 0) {
      // Find parent group with userData
      let target = intersects[0].object;
      while (target && !target.userData?.type && target.parent) {
        target = target.parent;
      }

      if (target && target.userData?.type === 'building') {
        onSelectBuilding(target.userData.data);
      } else if (target && target.userData?.type === 'zone') {
        onSelectZone(target.userData.data);
      }
    }
  }, [onSelectBuilding, onSelectZone]);

  // Camera focus on selected building
  useEffect(() => {
    if (!selectedBuilding || !cameraRef.current || !controlsRef.current || !temple) return;
    const centerLat = temple.latitude || 20.8880;
    const centerLng = temple.longitude || 70.4012;
    const { x, z } = gpsToMeters(selectedBuilding.latitude, selectedBuilding.longitude, centerLat, centerLng);

    targetLookAtRef.current = new THREE.Vector3(x, 15, z);
    targetCamPosRef.current = new THREE.Vector3(x + 45, 55, z + 65);
  }, [selectedBuilding, temple]);

  return (
    <div 
      ref={mountRef} 
      onPointerDown={handlePointerDown}
      className="w-100 h-100 position-relative overflow-hidden cursor-grab"
      style={{ touchAction: 'none' }}
    />
  );
};

export default HolographicCanvas;
