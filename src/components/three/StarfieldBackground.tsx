"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useReducedMotion } from "motion/react";
import {
  isMobileViewport,
  useWebGLSupport,
} from "@/lib/utils/webgl";
import type { StarDensityPreset } from "@/types/community";

interface StarfieldBackgroundProps {
  density?: StarDensityPreset;
  size?: number;
  opacity?: number;
  speed?: number;
}

const DENSITY_COUNTS: Record<StarDensityPreset, number> = {
  minimal: 700,
  balanced: 1500,
  dense: 2500,
};

function createStarSpriteTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.22, "rgba(224, 242, 254, 0.88)");
  gradient.addColorStop(0.55, "rgba(56, 189, 248, 0.22)");
  gradient.addColorStop(1, "rgba(2, 5, 14, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Layer 1 (Base deep-space backdrop) + Layer 2 (Persistent Three.js Starfield).
 * Remains visible across the entire scroll journey—including after the Earth fades out
 * and behind the footer. Supports configurable density, size, opacity, and speed,
 * mobile GPU throttling, tab-visibility pause, reduced-motion, and CSS fallback.
 */
export function StarfieldBackground({
  density = "balanced",
  size = 3.1,
  opacity = 0.88,
  speed = 1,
}: StarfieldBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const webglSupported = useWebGLSupport();
  const [rendererFailed, setRendererFailed] = useState(false);

  const showWebGL = webglSupported && !rendererFailed;

  useEffect(() => {
    if (!showWebGL || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    let renderer: THREE.WebGLRenderer | null = null;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      });
    } catch {
      const raf = window.requestAnimationFrame(() => setRendererFailed(true));
      return () => window.cancelAnimationFrame(raf);
    }

    const mobile = isMobileViewport();
    renderer.setPixelRatio(
      mobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.75)
    );
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / Math.max(window.innerHeight, 1),
      1,
      1600
    );
    camera.position.z = 500;

    const baseCount = DENSITY_COUNTS[density] ?? DENSITY_COUNTS.balanced;
    const starCount = mobile ? Math.round(baseCount * 0.55) : baseCount;

    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color("#f8fafc"),
      new THREE.Color("#e0f2fe"),
      new THREE.Color("#bae6fd"),
      new THREE.Color("#7dd3fc"),
      new THREE.Color("#cbd5e1"),
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 1800;
      positions[i3 + 1] = (Math.random() - 0.5) * 1400;
      positions[i3 + 2] = (Math.random() - 0.5) * 1200;

      const color = palette[i % palette.length];
      const brightness = 0.55 + Math.random() * 0.45;
      colors[i3] = color.r * brightness;
      colors[i3 + 1] = color.g * brightness;
      colors[i3 + 2] = color.b * brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const spriteTexture = createStarSpriteTexture();
    const material = new THREE.PointsMaterial({
      size: mobile ? Math.max(2.1, size * 0.84) : size,
      map: spriteTexture ?? undefined,
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const starPoints = new THREE.Points(geometry, material);
    scene.add(starPoints);

    // Secondary distant faint dust layer for subtle depth & gentle twinkling
    const distantCount = Math.round(starCount * 0.4);
    const distantPositions = new Float32Array(distantCount * 3);
    for (let i = 0; i < distantCount; i++) {
      const i3 = i * 3;
      distantPositions[i3] = (Math.random() - 0.5) * 2200;
      distantPositions[i3 + 1] = (Math.random() - 0.5) * 1800;
      distantPositions[i3 + 2] = -300 - Math.random() * 700;
    }
    const distantGeometry = new THREE.BufferGeometry();
    distantGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(distantPositions, 3)
    );
    const baseDistantOpacity = Math.max(0.15, opacity * 0.5);
    const distantMaterial = new THREE.PointsMaterial({
      size: Math.max(1.2, size * 0.52),
      color: new THREE.Color("#94a3b8"),
      transparent: true,
      opacity: baseDistantOpacity,
      depthWrite: false,
    });
    const distantStars = new THREE.Points(distantGeometry, distantMaterial);
    scene.add(distantStars);

    let frameId: number | null = null;
    let isPageHidden = document.visibilityState === "hidden";
    let elapsed = 0;

    const renderSingleFrame = () => {
      if (renderer) {
        renderer.render(scene, camera);
      }
    };

    const animate = () => {
      if (isPageHidden || prefersReducedMotion) {
        frameId = null;
        return;
      }
      elapsed += 0.016 * speed;
      starPoints.rotation.y += 0.00014 * speed;
      starPoints.rotation.x += 0.00004 * speed;
      distantStars.rotation.y += 0.00006 * speed;
      // Restrained gentle twinkle on distant star dust
      distantMaterial.opacity =
        baseDistantOpacity * (0.85 + 0.15 * Math.sin(elapsed * 1.4));

      if (renderer) {
        renderer.render(scene, camera);
      }
      frameId = window.requestAnimationFrame(animate);
    };

    renderSingleFrame();
    if (!prefersReducedMotion && !isPageHidden) {
      frameId = window.requestAnimationFrame(animate);
    }

    const handleVisibilityChange = () => {
      isPageHidden = document.visibilityState === "hidden";
      if (!isPageHidden && !prefersReducedMotion && frameId === null) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    const handleResize = () => {
      if (!renderer) return;
      const w = window.innerWidth;
      const h = Math.max(window.innerHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderSingleFrame();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleResize);

      geometry.dispose();
      material.dispose();
      distantGeometry.dispose();
      distantMaterial.dispose();
      spriteTexture?.dispose();
      renderer?.dispose();

      if (renderer?.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [showWebGL, density, size, opacity, speed, prefersReducedMotion]);

  return (
    <div
      aria-hidden="true"
      data-testid="persistent-starfield"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
      style={{
        background:
          "radial-gradient(ellipse 85% 60% at 50% 20%, rgba(12, 27, 58, 0.52) 0%, rgba(5, 11, 26, 0.88) 52%, #02050e 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 75% 15%, rgba(56, 189, 248, 0.07), transparent 45%), radial-gradient(circle at 20% 80%, rgba(37, 99, 235, 0.06), transparent 50%)",
        }}
      />

      {showWebGL ? (
        <div ref={containerRef} className="absolute inset-0" />
      ) : (
        <div
          data-testid="starfield-fallback"
          className="absolute inset-0 opacity-75"
          style={{
            backgroundImage:
              "radial-gradient(1.5px 1.5px at 18% 24%, rgba(255,255,255,0.85), transparent), radial-gradient(1px 1px at 42% 68%, rgba(186,230,253,0.8), transparent), radial-gradient(1.5px 1.5px at 76% 32%, rgba(255,255,255,0.9), transparent), radial-gradient(1px 1px at 88% 77%, rgba(125,211,252,0.75), transparent), radial-gradient(1.2px 1.2px at 61% 14%, rgba(241,245,249,0.8), transparent), radial-gradient(1px 1px at 29% 85%, rgba(186,230,253,0.7), transparent), radial-gradient(1.4px 1.4px at 11% 58%, rgba(255,255,255,0.75), transparent)",
            backgroundSize: "340px 340px",
          }}
        />
      )}
    </div>
  );
}
