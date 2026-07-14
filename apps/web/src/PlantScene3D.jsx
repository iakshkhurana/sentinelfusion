import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import gsap from "gsap";

const BASE = {
  critical: 0x4a5560,
  high: 0x3d4650,
  medium: 0x343c46,
  low: 0x2c333c,
};

/** Formal isometric plant twin — readable zones, no room fluff. */
export default function PlantScene3D({ plant, zonesTint, criticalZoneId }) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el || !plant) return;

    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1016);
    scene.fog = new THREE.Fog(0x0c1016, 28, 55);

    const camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 120);
    camera.position.set(22, 18, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x8a9ab0, 0.55));
    const key = new THREE.DirectionalLight(0xf2f6ff, 1.15);
    key.position.set(12, 22, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 60;
    key.shadow.camera.left = -20;
    key.shadow.camera.right = 20;
    key.shadow.camera.top = 20;
    key.shadow.camera.bottom = -20;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6a8898, 0.35);
    fill.position.set(-10, 8, -6);
    scene.add(fill);

    const root = new THREE.Group();
    scene.add(root);

    const sx = 0.018;
    const sz = 0.018;
    const groundW = plant.width * sx + 2.4;
    const groundD = plant.height * sz + 2.4;

    const ground = new THREE.Mesh(
      new RoundedBoxGeometry(groundW, 0.35, groundD, 2, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x161c24, roughness: 0.85, metalness: 0.1 }),
    );
    ground.receiveShadow = true;
    ground.position.y = -0.18;
    root.add(ground);

    // subtle grid
    const grid = new THREE.GridHelper(Math.max(groundW, groundD) * 0.92, 16, 0x2a3440, 0x1c2430);
    grid.position.y = 0.01;
    root.add(grid);

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(groundW, groundD) * 0.52, Math.max(groundW, groundD) * 0.535, 64),
      new THREE.MeshBasicMaterial({ color: 0x3d8f7a, transparent: true, opacity: 0.35 }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.02;
    rim.name = "rim";
    root.add(rim);

    const zoneMeshes = new Map();
    const ox = -(plant.width * sx) / 2;
    const oz = -(plant.height * sz) / 2;

    for (const zone of plant.zones) {
      const xs = zone.polygon.map((p) => p[0]);
      const ys = zone.polygon.map((p) => p[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const bw = Math.max(0.8, (maxX - minX) * sx * 0.92);
      const bd = Math.max(0.8, (maxY - minY) * sz * 0.92);
      const bh =
        { critical: 1.55, high: 1.25, medium: 1.0, low: 0.75 }[zone.hazard_class] || 1.0;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      const mat = new THREE.MeshStandardMaterial({
        color: BASE[zone.hazard_class] || BASE.medium,
        roughness: 0.55,
        metalness: 0.2,
        emissive: new THREE.Color("#000000"),
        emissiveIntensity: 0,
      });
      const body = new THREE.Mesh(new RoundedBoxGeometry(bw, bh, bd, 2, 0.06), mat);
      body.position.set(ox + cx * sx, bh / 2, oz + cy * sz);
      body.castShadow = true;
      body.receiveShadow = true;
      root.add(body);

      // thin top edge accent
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(bw * 0.9, 0.04, bd * 0.9),
        new THREE.MeshStandardMaterial({
          color: 0x5a6a78,
          emissive: 0x3d8f7a,
          emissiveIntensity: 0.25,
          roughness: 0.4,
        }),
      );
      edge.position.set(body.position.x, bh + 0.02, body.position.z);
      root.add(edge);

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xd8e6f0,
          emissive: 0x3d8f7a,
          emissiveIntensity: 0.6,
        }),
      );
      marker.position.set(body.position.x, bh + 0.28, body.position.z);
      root.add(marker);

      zoneMeshes.set(zone.id, {
        body,
        mat,
        edge,
        marker,
        bh,
        baseColor: BASE[zone.hazard_class] || BASE.medium,
      });
    }

    const pulse = new THREE.PointLight(0xff5d4a, 0, 12, 2);
    pulse.position.set(0, 3, 0);
    root.add(pulse);

    const focus = new THREE.Vector3(0, 0.6, 0);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.target.copy(focus);
    controls.minDistance = 18;
    controls.maxDistance = 36;
    controls.minPolarAngle = 0.85;
    controls.maxPolarAngle = 1.15;
    controls.minAzimuthAngle = 0.55;
    controls.maxAzimuthAngle = 1.05;
    controls.update();

    gsap.fromTo(
      camera.position,
      { x: 28, y: 24, z: 28 },
      {
        x: 22,
        y: 18,
        z: 22,
        duration: 1.6,
        ease: "power2.out",
        onUpdate: () => controls.update(),
      },
    );

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      const r = root.getObjectByName("rim");
      if (r) r.rotation.z = t * 0.08;
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const nw = el.clientWidth;
      const nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    apiRef.current = {
      update(tint, critId) {
        for (const [id, z] of zoneMeshes) {
          const level = tint?.[id] ?? 0;
          const critical = id === critId;
          if (critical) {
            z.mat.color.setHex(0x5a3030);
            z.mat.emissive.set("#ff5d4a");
            z.mat.emissiveIntensity = 0.55;
            z.edge.material.emissive.set("#ff5d4a");
            z.edge.material.emissiveIntensity = 1.2;
            z.marker.material.emissive.set("#ff5d4a");
            z.marker.material.emissiveIntensity = 1.8;
            pulse.position.set(z.body.position.x, z.bh + 1, z.body.position.z);
            gsap.to(pulse, { intensity: 2.2, duration: 0.35 });
            gsap.fromTo(z.body.scale, { y: 1 }, { y: 1.12, duration: 0.3, yoyo: true, repeat: 3 });
          } else if (level > 0.12) {
            z.mat.color.setHex(0x4a4030);
            z.mat.emissive.set("#f0b429");
            z.mat.emissiveIntensity = 0.2 + level * 0.45;
            z.edge.material.emissive.set("#f0b429");
            z.edge.material.emissiveIntensity = 0.7;
            z.marker.material.emissiveIntensity = 1.1;
          } else {
            z.mat.color.setHex(z.baseColor);
            z.mat.emissiveIntensity = 0;
            z.edge.material.emissive.set("#3d8f7a");
            z.edge.material.emissiveIntensity = 0.25;
            z.marker.material.emissive.set("#3d8f7a");
            z.marker.material.emissiveIntensity = 0.6;
          }
        }
        if (!critId) gsap.to(pulse, { intensity: 0, duration: 0.35 });
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      apiRef.current = null;
    };
  }, [plant]);

  useEffect(() => {
    apiRef.current?.update(zonesTint || {}, criticalZoneId);
  }, [zonesTint, criticalZoneId]);

  return <div className="scene3d" ref={mountRef} />;
}
