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

// Procedural dynamic 2D canvas text sprite generator for floating 3D labels
const createFloatingLabel = (text, subtitle = '', themeColor = '#00f0ff', bgColor = 'rgba(5, 18, 38, 0.88)') => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Background pill
  ctx.fillStyle = bgColor;
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 4;
  
  const r = 24;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, r);
  ctx.fill();
  ctx.stroke();

  // Text Title
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = themeColor;
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 54);

  // Subtitle
  if (subtitle) {
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#D0E4F5';
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
const createRoadRibbon = (coords, width, centerLat, centerLng, roadColor = 0x00e5ff) => {
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

    // Compute normal tangent vector
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

      // Two triangles per segment
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

  // Road surface plane
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVertices, 3));
  const roadMat = new THREE.MeshBasicMaterial({
    color: roadColor,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadGroup.add(roadMesh);

  // Road curbs / boundary edges
  const edgeLineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 });
  const edge1Geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(edge1Vertices, 3));
  const edge2Geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(edge2Vertices, 3));
  roadGroup.add(new THREE.Line(edge1Geo, edgeLineMat));
  roadGroup.add(new THREE.Line(edge2Geo, edgeLineMat));

  // Glowing center line
  const centerGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(centerVertices, 3));
  const centerMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
  roadGroup.add(new THREE.Line(centerGeo, centerMat));

  return roadGroup;
};

const HolographicCanvas = ({
  temple,
  buildings = [],
  zones = [],
  boundary = null,
  roads = [],
  facilities = [],
  transport = [],
  parking = [],
  layers = {
    buildings: true,
    boundaries: true,
    roads: true,
    emergency: true,
    transport: true,
    commercial: true,
    amenities: true,
    parking: true,
    crowdZones: true
  },
  autoRotate = true,
  cameraPreset = null,
  selectedEntity = null,
  onSelectEntity = () => {},
  onUpdateStats = () => {}
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const scanPlaneRef = useRef(null);
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040914);
    scene.fog = new THREE.FogExp2(0x040914, 0.0028);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 4000);
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
    controls.minDistance = 20;
    controls.maxDistance = 1000;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.8;
    controlsRef.current = controls;

    // Lights
    scene.add(new THREE.AmbientLight(0x0a2540, 2.0));
    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 2.8);
    dirLight1.position.set(120, 240, 120);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x0055ff, 1.8);
    dirLight2.position.set(-120, 180, -120);
    scene.add(dirLight2);

    // Cybernetic Ground Grid & Concentric Radar Rings
    const gridHelper = new THREE.GridHelper(800, 80, 0x00f0ff, 0x003366);
    gridHelper.position.y = -0.2;
    scene.add(gridHelper);

    [80, 160, 260, 400].forEach(radius => {
      const ringGeo = new THREE.RingGeometry(radius - 0.5, radius + 0.5, 64);
      const ringMat = new THREE.MeshBasicMaterial({ 
        color: 0x00f0ff, 
        transparent: true, 
        opacity: 0.22, 
        side: THREE.DoubleSide 
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.1;
      scene.add(ring);
    });

    // Particle Cloud
    const particleCount = 700;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 600;
      particlePositions[i + 1] = Math.random() * 140;
      particlePositions[i + 2] = (Math.random() - 0.5) * 600;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleCloud = new THREE.Points(
      particleGeo, 
      new THREE.PointsMaterial({ color: 0x00f0ff, size: 2.2, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
    );
    scene.add(particleCloud);

    // Laser Scan Plane
    const scanPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.08, wireframe: true, side: THREE.DoubleSide })
    );
    scanPlane.rotation.x = Math.PI / 2;
    scanPlane.position.y = 5;
    scene.add(scanPlane);
    scanPlaneRef.current = scanPlane;

    // Resize
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
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

      if (scanPlaneRef.current) {
        scanPlaneRef.current.position.y += scanDirection * 0.35;
        if (scanPlaneRef.current.position.y > 85) scanDirection = -1;
        if (scanPlaneRef.current.position.y < 2) scanDirection = 1;
      }

      if (particleCloud) {
        particleCloud.rotation.y += 0.0005;
      }

      // Smooth camera interpolation
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

  // Construct Complete Spatial 3D Digital Twin Environment (Campus + Surroundings)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !temple) return;

    // Clean previous meshes
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

    const buildingMat = new THREE.MeshPhysicalMaterial({
      color: 0x00e5ff,
      emissive: 0x002244,
      metalness: 0.85,
      roughness: 0.15,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide
    });

    const edgeLineMat = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9,
      linewidth: 1.5
    });

    let totalPolygons = 0;

    // 1. CAMPUS BUILDINGS LAYER
    if (layers.buildings && Array.isArray(buildings)) {
      buildings.forEach(bld => {
        const { x, z } = gpsToMeters(bld.latitude, bld.longitude, centerLat, centerLng);
        const height = bld.height_meters || 20;
        const bldType = (bld.building_type || '').toUpperCase();
        
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        if (bldType.includes('SANCTUM') || bldType.includes('SHIKHARA') || bldType.includes('VIMANA')) {
          const baseSize = 24;
          const baseH = height * 0.4;
          const spireH = height * 0.6;

          const baseGeo = new THREE.BoxGeometry(baseSize, baseH, baseSize);
          const baseMesh = new THREE.Mesh(baseGeo, buildingMat);
          baseMesh.position.y = baseH / 2;
          group.add(baseMesh);
          const baseEdges = new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), edgeLineMat);
          baseEdges.position.y = baseH / 2;
          group.add(baseEdges);

          const spireGeo = new THREE.ConeGeometry(baseSize * 0.7, spireH, 4);
          const spireMesh = new THREE.Mesh(spireGeo, buildingMat);
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
        } else if (bldType.includes('GOPURAM') || bldType.includes('TOWER')) {
          const tiers = Math.min(7, Math.max(3, Math.floor(height / 8)));
          const baseW = 28, baseD = 18;
          for (let t = 0; t < tiers; t++) {
            const scale = 1 - (t * 0.11);
            const tierH = height / tiers;
            const geo = new THREE.BoxGeometry(baseW * scale, tierH * 0.9, baseD * scale);
            const m = new THREE.Mesh(geo, buildingMat);
            m.position.y = (t * tierH) + (tierH / 2);
            group.add(m);
            const ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeLineMat);
            ed.position.y = (t * tierH) + (tierH / 2);
            group.add(ed);
          }
          totalPolygons += tiers * 120;
        } else {
          const geo = new THREE.BoxGeometry(22, height, 18);
          const m = new THREE.Mesh(geo, buildingMat);
          m.position.y = height / 2;
          group.add(m);
          const ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeLineMat);
          ed.position.y = height / 2;
          group.add(ed);
          totalPolygons += 120;
        }

        const label = createFloatingLabel(bld.name, `${bld.height_meters || ''}m • ${bld.building_type}`);
        label.position.set(0, height + 10, 0);
        group.add(label);

        group.userData = { type: 'BUILDING', entityType: 'BUILDING', data: bld };
        scene.add(group);
        meshesRef.current.push(group);
        clickableObjectsRef.current.push(group);
      });
    }

    // 2. CAMPUS BOUNDARY LAYER
    if (layers.boundaries && boundary && Array.isArray(boundary.coordinates_geojson)) {
      const bPoints = boundary.coordinates_geojson.map(([lng, lat]) => {
        const { x, z } = gpsToMeters(lat, lng, centerLat, centerLng);
        return new THREE.Vector3(x, 0.5, z);
      });

      if (bPoints.length > 2) {
        bPoints.push(bPoints[0]);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(bPoints);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 3 }));
        scene.add(line);
        meshesRef.current.push(line);

        // Holographic ribbon fence
        const rVertices = [];
        for (let i = 0; i < bPoints.length - 1; i++) {
          const p1 = bPoints[i], p2 = bPoints[i + 1];
          rVertices.push(p1.x, 0, p1.z, p1.x, 4, p1.z, p2.x, 4, p2.z, p1.x, 0, p1.z, p2.x, 4, p2.z, p2.x, 0, p2.z);
        }
        const rGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rVertices, 3));
        const ribbon = new THREE.Mesh(rGeo, new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide }));
        scene.add(ribbon);
        meshesRef.current.push(ribbon);
      }
    }

    // 3. SURROUNDING ROADS NETWORK (Phase 4 Transport Corridors)
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

    // 4. SURROUNDING PUBLIC & EMERGENCY FACILITIES (Phase 4 Public Amenities)
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

        let color = 0x00e5ff;
        let labelTheme = '#00f0ff';
        let size = 14;

        if (fac.facility_type === 'HOSPITAL' || fac.facility_type === 'CLINIC') {
          color = 0xff0055; // Crimson/Magenta
          labelTheme = '#ff3366';
          size = 18;
        } else if (fac.facility_type === 'POLICE_STATION') {
          color = 0x0088ff; // Deep Blue
          labelTheme = '#3399ff';
        } else if (fac.facility_type === 'FIRE_STATION') {
          color = 0xff6600; // Orange
          labelTheme = '#ff8800';
        } else if (isCommercial) {
          color = 0xffbb00; // Amber/Gold
          labelTheme = '#ffbb00';
          size = 16;
        } else if (isAmenity) {
          color = 0x00ffff; // Cyan Water
          labelTheme = '#00f0ff';
          size = 10;
        }

        // 3D Volumetric Facility Block
        const geo = new THREE.BoxGeometry(size, size * 0.9, size);
        const mat = new THREE.MeshPhysicalMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = (size * 0.9) / 2;
        group.add(mesh);

        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color, opacity: 0.95, transparent: true }));
        edges.position.y = (size * 0.9) / 2;
        group.add(edges);

        // Floating Label with Distance Badge
        const distStr = fac.distance_meters > 1000 ? `${(fac.distance_meters/1000).toFixed(1)}km` : `${fac.distance_meters}m`;
        const label = createFloatingLabel(fac.name, `${fac.facility_type} • ${distStr}`, labelTheme);
        label.position.set(0, size + 8, 0);
        group.add(label);

        group.userData = { type: 'FACILITY', entityType: 'FACILITY', data: fac };
        scene.add(group);
        meshesRef.current.push(group);
        clickableObjectsRef.current.push(group);
        totalPolygons += 150;
      });
    }

    // 5. TRANSIT NODES (Railway, Bus, Airport)
    if (layers.transport && Array.isArray(transport)) {
      transport.forEach(tNode => {
        const { x, z } = gpsToMeters(tNode.latitude, tNode.longitude, centerLat, centerLng);
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Transit Portal Frame
        const pGeo = new THREE.BoxGeometry(22, 12, 16);
        const pMat = new THREE.MeshPhysicalMaterial({ color: 0x0088ff, emissive: 0x0033aa, emissiveIntensity: 0.3, transparent: true, opacity: 0.45 });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.y = 6;
        group.add(pMesh);

        const pEdges = new THREE.LineSegments(new THREE.EdgesGeometry(pGeo), new THREE.LineBasicMaterial({ color: 0x00aaff }));
        pEdges.position.y = 6;
        group.add(pEdges);

        // Floating vertical beacon beam
        const beamGeo = new THREE.CylinderGeometry(0.8, 0.8, 60, 8);
        const beamMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.4 });
        const beam = new THREE.Mesh(beamGeo, beamMat);
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

    // 6. PARKING COMPLEXES
    if (layers.parking && Array.isArray(parking)) {
      parking.forEach(pLot => {
        const { x, z } = gpsToMeters(pLot.latitude, pLot.longitude, centerLat, centerLng);
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Planar Parking Lot Grid
        const lotGeo = new THREE.PlaneGeometry(36, 26);
        const lotMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
        const lotMesh = new THREE.Mesh(lotGeo, lotMat);
        lotMesh.rotation.x = -Math.PI / 2;
        lotMesh.position.y = 0.2;
        group.add(lotMesh);

        // Parking border
        const borderGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-18, 0.25, -13), new THREE.Vector3(18, 0.25, -13),
          new THREE.Vector3(18, 0.25, 13), new THREE.Vector3(-18, 0.25, 13),
          new THREE.Vector3(-18, 0.25, -13)
        ]);
        group.add(new THREE.Line(borderGeo, new THREE.LineBasicMaterial({ color: 0x00ffaa })));

        const label = createFloatingLabel(pLot.name, `PARKING • ${pLot.parking_capacity || 400} vehicles`, '#00ffaa');
        label.position.set(0, 10, 0);
        group.add(label);

        group.userData = { type: 'TRANSPORT', entityType: 'TRANSPORT', data: pLot };
        scene.add(group);
        meshesRef.current.push(group);
        clickableObjectsRef.current.push(group);
        totalPolygons += 60;
      });
    }

    // 7. CROWD MONITORING ZONES
    if (layers.crowdZones && Array.isArray(zones)) {
      zones.forEach(zone => {
        const { x, z } = gpsToMeters(zone.latitude, zone.longitude, centerLat, centerLng);
        let zoneColor = 0x38ef7d;
        if (zone.risk_level === 'CRITICAL' || zone.occupancy_percent > 80) zoneColor = 0xff3838;
        else if (zone.risk_level === 'HIGH' || zone.occupancy_percent > 60) zoneColor = 0xffaa00;

        const zoneGroup = new THREE.Group();
        const zoneMesh = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshBasicMaterial({ color: zoneColor, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
        zoneMesh.rotation.x = -Math.PI / 2;
        zoneMesh.position.set(x, 0.2, z);
        zoneGroup.add(zoneMesh);

        const ring = new THREE.Mesh(new THREE.RingGeometry(15.6, 16.4, 32), new THREE.MeshBasicMaterial({ color: zoneColor, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.25, z);
        zoneGroup.add(ring);

        const label = createFloatingLabel(zone.name, `Queue: ${zone.queue_length || 0} • ${zone.occupancy_percent || 0}%`, '#38ef7d');
        label.position.set(x, 14, z);
        zoneGroup.add(label);

        zoneGroup.userData = { type: 'ZONE', entityType: 'ZONE', data: zone };
        scene.add(zoneGroup);
        meshesRef.current.push(zoneGroup);
        clickableObjectsRef.current.push(zoneGroup);
      });
    }

    if (onUpdateStats) {
      onUpdateStats({ polyCount: totalPolygons + 1500 });
    }
  }, [temple, buildings, zones, boundary, roads, facilities, transport, parking, layers]);

  // Raycaster for Click Interaction on Any 3D Spatial Entity
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
        onSelectEntity(target.userData.data);
      }
    }
  }, [onSelectEntity]);

  // Camera focus on selected entity
  useEffect(() => {
    if (!selectedEntity || !cameraRef.current || !controlsRef.current || !temple) return;
    const centerLat = temple.latitude || 20.8880;
    const centerLng = temple.longitude || 70.4012;
    if (selectedEntity.latitude && selectedEntity.longitude) {
      const { x, z } = gpsToMeters(selectedEntity.latitude, selectedEntity.longitude, centerLat, centerLng);
      targetLookAtRef.current = new THREE.Vector3(x, 15, z);
      targetCamPosRef.current = new THREE.Vector3(x + 50, 50, z + 70);
    }
  }, [selectedEntity, temple]);

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
