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

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 4;
  
  const r = 24;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, r);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = themeColor;
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 54);

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

  const edgeLineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 });
  roadGroup.add(new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(edge1Vertices, 3)), edgeLineMat));
  roadGroup.add(new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(edge2Vertices, 3)), edgeLineMat));
  roadGroup.add(new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(centerVertices, 3)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })));

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
  cameras = [],
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
    cameras: true
  },
  autoRotate = true,
  cameraPreset = null,
  navLevel = 2, // 1: REGIONAL, 2: CAMPUS, 3: BUILDING, 4: ZONE, 5: FLOOR
  selectedEntity = null,
  selectedFloor = 1,
  onSelectEntity = () => {},
  onSelectLevel = () => {},
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

    // Lights
    scene.add(new THREE.AmbientLight(0x0a2540, 2.0));
    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 2.8);
    dirLight1.position.set(120, 240, 120);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0x0055ff, 1.8);
    dirLight2.position.set(-120, 180, -120);
    scene.add(dirLight2);

    // Ground Grid & Concentric Radar Rings
    const gridHelper = new THREE.GridHelper(800, 80, 0x00f0ff, 0x003366);
    gridHelper.position.y = -0.2;
    scene.add(gridHelper);

    [80, 160, 260, 400].forEach(radius => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius - 0.5, radius + 0.5, 64),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.1;
      scene.add(ring);
    });

    // Particle Cloud
    const particleCount = 700;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 600;
      particlePositions[i + 1] = Math.random() * 140;
      particlePositions[i + 2] = (Math.random() - 0.5) * 600;
    }
    const particleGeo = new THREE.BufferGeometry();
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

      if (scanPlaneRef.current) {
        scanPlaneRef.current.position.y += scanDirection * 0.35;
        if (scanPlaneRef.current.position.y > 85) scanDirection = -1;
        if (scanPlaneRef.current.position.y < 2) scanDirection = 1;
      }

      if (particleCloud) {
        particleCloud.rotation.y += 0.0005;
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

    const buildingMat = new THREE.MeshPhysicalMaterial({
      color: 0x00e5ff,
      emissive: 0x002244,
      metalness: 0.85,
      roughness: 0.15,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide
    });

    const edgeLineMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9, linewidth: 1.5 });
    const isSelected = (item) => selectedEntity && selectedEntity.id === item.id;

    let totalPolygons = 0;

    // 1. CAMPUS BUILDINGS LAYER (With Level 5 Architectural Floor Slicing)
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
              color: isCurrentFloor ? 0x00f0ff : 0x0055aa,
              transparent: true,
              opacity: isCurrentFloor ? 0.9 : 0.2
            });
            const slabMesh = new THREE.Mesh(slabGeo, slabMat);
            slabMesh.position.y = floorY + 0.5;
            group.add(slabMesh);

            // Floor Interior Walls & Structural Grid
            const wallGeo = new THREE.BoxGeometry(baseSize * (1 - (f - 1) * 0.08) * 0.95, tierH * 0.9, baseSize * (1 - (f - 1) * 0.08) * 0.95);
            const wallMat = new THREE.MeshPhysicalMaterial({
              color: isCurrentFloor ? 0x00f0ff : 0x003366,
              emissive: isCurrentFloor ? 0x004466 : 0x001122,
              transparent: true,
              opacity: isCurrentFloor ? 0.55 : 0.12,
              side: THREE.DoubleSide
            });
            const wallMesh = new THREE.Mesh(wallGeo, wallMat);
            wallMesh.position.y = floorY + (tierH * 0.9) / 2 + 1;
            group.add(wallMesh);

            const wallEdges = new THREE.LineSegments(new THREE.EdgesGeometry(wallGeo), new THREE.LineBasicMaterial({
              color: isCurrentFloor ? 0xffcc00 : 0x00aaff,
              opacity: isCurrentFloor ? 0.95 : 0.25,
              transparent: true
            }));
            wallEdges.position.y = floorY + (tierH * 0.9) / 2 + 1;
            group.add(wallEdges);

            // Floor Label on active floor
            if (isCurrentFloor) {
              const flLabel = createFloatingLabel(`FLOOR L${f}`, `Elev: ${Math.round(floorY)}m • Slice Active`, '#ffcc00');
              flLabel.position.set(0, floorY + tierH + 5, 0);
              group.add(flLabel);
            }
          }
          totalPolygons += floorCount * 240;
        } else {
          // Standard Architectural Typology (Levels 1-4)
          const activeMat = bldSelected 
            ? new THREE.MeshPhysicalMaterial({ color: 0xffaa00, emissive: 0x442200, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.65 })
            : buildingMat;

          if (bldType.includes('SANCTUM') || bldType.includes('SHIKHARA') || bldType.includes('VIMANA')) {
            const baseSize = 24;
            const baseH = height * 0.4;
            const spireH = height * 0.6;

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
          } else if (bldType.includes('GOPURAM') || bldType.includes('TOWER')) {
            const tiers = Math.min(7, Math.max(3, Math.floor(height / 8)));
            const baseW = 28, baseD = 18;
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
          } else {
            const geo = new THREE.BoxGeometry(22, height, 18);
            const m = new THREE.Mesh(geo, activeMat);
            m.position.y = height / 2;
            group.add(m);
            const ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeLineMat);
            ed.position.y = height / 2;
            group.add(ed);
            totalPolygons += 120;
          }

          const labelTheme = bldSelected ? '#ffaa00' : '#00f0ff';
          const label = createFloatingLabel(bld.name, `${bld.height_meters || ''}m • ${bld.building_type}`, labelTheme);
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
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bPoints), new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 3 })));

        const rVertices = [];
        for (let i = 0; i < bPoints.length - 1; i++) {
          const p1 = bPoints[i], p2 = bPoints[i + 1];
          rVertices.push(p1.x, 0, p1.z, p1.x, 4, p1.z, p2.x, 4, p2.z, p1.x, 0, p1.z, p2.x, 4, p2.z, p2.x, 0, p2.z);
        }
        const ribbon = new THREE.Mesh(
          new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rVertices, 3)),
          new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
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

        let color = 0x00e5ff, labelTheme = '#00f0ff', size = 14;
        if (fac.facility_type === 'HOSPITAL' || fac.facility_type === 'CLINIC') {
          color = 0xff0055; labelTheme = '#ff3366'; size = 18;
        } else if (fac.facility_type === 'POLICE_STATION') {
          color = 0x0088ff; labelTheme = '#3399ff';
        } else if (fac.facility_type === 'FIRE_STATION') {
          color = 0xff6600; labelTheme = '#ff8800';
        } else if (isCommercial) {
          color = 0xffbb00; labelTheme = '#ffbb00'; size = 16;
        } else if (isAmenity) {
          color = 0x00ffff; labelTheme = '#00f0ff'; size = 10;
        }

        const geo = new THREE.BoxGeometry(size, size * 0.9, size);
        const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.25, transparent: true, opacity: 0.55 }));
        mesh.position.y = (size * 0.9) / 2;
        group.add(mesh);

        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color, opacity: 0.95, transparent: true }));
        edges.position.y = (size * 0.9) / 2;
        group.add(edges);

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

        const label = createFloatingLabel(pLot.name, `PARKING • ${pLot.parking_capacity || 400} cars`, '#00ffaa');
        label.position.set(0, 10, 0);
        group.add(label);

        group.userData = { type: 'TRANSPORT', entityType: 'TRANSPORT', data: pLot };
        scene.add(group);
        meshesRef.current.push(group);
        clickableObjectsRef.current.push(group);
        totalPolygons += 60;
      });
    }

    // 7. CROWD MONITORING ZONES (With Level 4 Zone Focus Highlight)
    if (layers.crowdZones && Array.isArray(zones)) {
      zones.forEach(zone => {
        const { x, z } = gpsToMeters(zone.latitude, zone.longitude, centerLat, centerLng);
        const zoneSelected = isSelected(zone);

        let zoneColor = 0x38ef7d;
        if (zone.risk_level === 'CRITICAL' || zone.occupancy_percent > 80) zoneColor = 0xff3838;
        else if (zone.risk_level === 'HIGH' || zone.occupancy_percent > 60) zoneColor = 0xffaa00;
        if (zoneSelected) zoneColor = 0x00f0ff;

        const zoneGroup = new THREE.Group();
        const zoneMesh = new THREE.Mesh(
          new THREE.CircleGeometry(16, 32), 
          new THREE.MeshBasicMaterial({ color: zoneColor, transparent: true, opacity: zoneSelected ? 0.5 : 0.28, side: THREE.DoubleSide })
        );
        zoneMesh.rotation.x = -Math.PI / 2;
        zoneMesh.position.set(x, 0.2, z);
        zoneGroup.add(zoneMesh);

        const ring = new THREE.Mesh(new THREE.RingGeometry(15.6, 16.4, 32), new THREE.MeshBasicMaterial({ color: zoneColor, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.25, z);
        zoneGroup.add(ring);

        const label = createFloatingLabel(zone.name, `Queue: ${zone.queue_length || 0} • ${zone.occupancy_percent || 0}%`, zoneSelected ? '#00f0ff' : '#38ef7d');
        label.position.set(x, 14, z);
        zoneGroup.add(label);

        zoneGroup.userData = { type: 'ZONE', entityType: 'ZONE', data: zone };
        scene.add(zoneGroup);
        meshesRef.current.push(zoneGroup);
        clickableObjectsRef.current.push(zoneGroup);
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
        const themeColor = isHighCrowd ? 0xff3344 : 0x00f0ff;
        const poleH = 7.0;

        // Metallic Pylon Pole
        const poleGeo = new THREE.CylinderGeometry(0.2, 0.25, poleH, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8, roughness: 0.2 });
        const poleMesh = new THREE.Mesh(poleGeo, poleMat);
        poleMesh.position.y = poleH / 2;
        camGroup.add(poleMesh);

        // Camera Head Unit Box
        const headGeo = new THREE.BoxGeometry(0.8, 0.5, 1.2);
        const headMat = new THREE.MeshPhysicalMaterial({
          color: themeColor,
          emissive: themeColor,
          emissiveIntensity: isHighCrowd ? 0.7 : 0.35,
          transparent: true,
          opacity: 0.9
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

    if (onUpdateStats) {
      onUpdateStats({ polyCount: totalPolygons + 1500 });
    }
  }, [temple, buildings, zones, boundary, roads, facilities, transport, parking, cameras, layers, navLevel, selectedEntity, selectedFloor]);

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
      ref={mountRef} 
      onPointerDown={handlePointerDown}
      className="w-100 h-100 position-relative overflow-hidden cursor-grab"
      style={{ touchAction: 'none' }}
    />
  );
};

export default HolographicCanvas;
