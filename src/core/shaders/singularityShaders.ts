/**
 * KALINAR SINGULARITY & ACCRETION DISK SHADERS (v1.1.0)
 * Twisted Toroidal SDF + Analytic Curl Noise + Navier-Stokes Fluid Coupling
 * Strictly Zero Emojis
 */

export const photonRingShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uVoicePulse;
    uniform float uSubBass;
    uniform float uCompositePulse;
    uniform vec3 uColorInner;
    uniform vec3 uColorOuter;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 viewDir = normalize(-vPosition);
      float fresnel = 1.0 - abs(dot(viewDir, vNormal));
      fresnel = pow(fresnel, 2.2);

      // Radial relativistic pulse synchronized with Tauz voice sub-bass and composite pulse at 60 FPS
      float acousticDrive = 1.0 + uVoicePulse * 0.75 + uSubBass * 0.85 + uCompositePulse * 0.65;
      float pulse = 0.85 + 0.3 * sin(uTime * 3.0 + fresnel * 6.0) * acousticDrive;

      // Event Horizon Lavender (#AA88FF) to Starlight White (#FFFFFF) relativistic rim glow
      vec3 color = mix(uColorInner, uColorOuter, clamp(pow(fresnel, 1.6) * pulse, 0.0, 1.0));

      float alpha = smoothstep(0.08, 0.88, fresnel) * pulse;
      gl_FragColor = vec4(color * (1.0 + fresnel * 0.5), alpha);
    }
  `,
};

export const accretionDiskShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uVoicePulse;
    uniform float uSubBass;
    uniform float uCompositePulse;
    uniform sampler2D uFluidVelocity;
    uniform float uReducedMotion;

    attribute vec3 aRandom; // [seed, speed, size]
    attribute float aOrbitRadius;
    attribute float aInitialAngle;

    varying vec3 vColor;
    varying float vAlpha;
    varying float vSparkle;

    // Simplex / Curl Noise Helper
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    vec3 curlNoise(vec3 p) {
      const float e = 0.05;
      float n1 = snoise(p + vec3(e, 0.0, 0.0));
      float n2 = snoise(p - vec3(e, 0.0, 0.0));
      float n3 = snoise(p + vec3(0.0, e, 0.0));
      float n4 = snoise(p - vec3(0.0, e, 0.0));
      float n5 = snoise(p + vec3(0.0, 0.0, e));
      float n6 = snoise(p - vec3(0.0, 0.0, e));
      float x = (n4 - n3) - (n6 - n5);
      float y = (n6 - n5) - (n1 - n2);
      float z = (n1 - n2) - (n4 - n3);
      return normalize(vec3(x, y, z));
    }

    void main() {
      float motionMultiplier = uReducedMotion > 0.5 ? 0.0 : 1.0;
      float radialSpiralBoost = 1.0 + uVoicePulse * 0.4 + uSubBass * 0.85 + uCompositePulse * 0.55;
      float speed = (0.25 + aRandom.y * 0.75) * radialSpiralBoost * motionMultiplier;
      
      // Differential Keplerian orbital velocity (inner particles orbit significantly faster than outer disk)
      float keplerianOmega = pow(140.0 / max(aOrbitRadius, 1.0), 1.5);
      float currentAngle = aInitialAngle + uTime * speed * keplerianOmega;

      // Toroidal orbital base coordinates
      float radius = aOrbitRadius;
      vec3 pos = vec3(
        cos(currentAngle) * radius,
        sin(currentAngle * 2.0) * (radius * 0.08) * aRandom.z,
        sin(currentAngle) * radius
      );

      // Tilted relativistic accretion vortex (~20 degrees relativistic tilt around X/Z axis)
      float cosTilt = 0.9396926; // cos(20 deg)
      float sinTilt = 0.3420201; // sin(20 deg)
      pos = vec3(
        pos.x,
        pos.y * cosTilt - pos.z * sinTilt,
        pos.y * sinTilt + pos.z * cosTilt
      );

      // Sample 2D Navier-Stokes fluid velocity field
      vec2 fluidUv = (pos.xz / 800.0) + 0.5;
      vec2 fluidVel = vec2(0.0);
      if (fluidUv.x >= 0.0 && fluidUv.x <= 1.0 && fluidUv.y >= 0.0 && fluidUv.y <= 1.0) {
        fluidVel = texture2D(uFluidVelocity, fluidUv).xy;
      }

      // Organic curl-noise turbulence stirred by cursor fluid perturbation and modulated by Tauz audio
      float fluidSpeed = length(fluidVel);
      vec3 curlSamplePos = pos * 0.008 + vec3(fluidVel.x * 0.02, uTime * 0.15 * motionMultiplier, fluidVel.y * 0.02);
      vec3 curl = curlNoise(curlSamplePos);
      float curlAmp = (12.0 + fluidSpeed * 24.0) * (1.0 + uVoicePulse * 0.5 + uSubBass * 0.9 + uCompositePulse * 0.6);
      pos += curl * curlAmp;
      pos.xz += fluidVel * 35.0 * motionMultiplier;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Particle size based on distance and seed
      float baseSize = aRandom.z * 16.0 + 8.0;
      gl_PointSize = (baseSize / -mvPosition.z) * (1.0 + uVoicePulse * 0.25 + uSubBass * 0.35);

      // Color mapping: #DDDDDD starlight silver with #AA88FF lavender sparkles
      float sparkle = pow(aRandom.z, 60.0);
      vec3 starlightSilver = vec3(0.867, 0.867, 0.867); // #DDDDDD
      vec3 singularityLavender = vec3(0.667, 0.533, 1.0); // #AA88FF
      
      vColor = mix(starlightSilver, singularityLavender, clamp(sparkle + uVoicePulse * 0.25 + uCompositePulse * 0.3, 0.0, 1.0));
      vSparkle = sparkle;
      vAlpha = smoothstep(54.0, 120.0, radius) * (0.55 + sparkle * 0.45);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;
    varying float vSparkle;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;

      // Soft circular particle falloff (eliminates square boxy pixels)
      float core = smoothstep(0.5, 0.0, dist);
      float glow = pow(core, 2.0);

      // Additive crisp Singularity Lavender spark on top of fine-grained silver-white accretion
      vec3 finalColor = vColor + vec3(0.667, 0.533, 1.0) * (vSparkle * 0.35);

      gl_FragColor = vec4(finalColor, vAlpha * glow);
    }
  `,
};
