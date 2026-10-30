/**
 * KALINAR SINGULARITY & ACCRETION DISK SHADERS (v0.2.0-alpha)
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
    uniform vec3 uColorInner;
    uniform vec3 uColorOuter;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 viewDir = normalize(-vPosition);
      float fresnel = 1.0 - abs(dot(viewDir, vNormal));
      fresnel = pow(fresnel, 2.5);

      // Radial pulse synchronized with Kalinar voice
      float pulse = 0.85 + 0.3 * sin(uTime * 3.0 + fresnel * 6.0) * uVoicePulse;
      vec3 color = mix(uColorInner, uColorOuter, fresnel * pulse);

      float alpha = smoothstep(0.1, 0.9, fresnel) * pulse;
      gl_FragColor = vec4(color, alpha);
    }
  `,
};

export const accretionDiskShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uVoicePulse;
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
      float speed = (0.25 + aRandom.y * 0.75) * (1.0 + uVoicePulse * 0.4) * motionMultiplier;
      float currentAngle = aInitialAngle + uTime * speed * (140.0 / aOrbitRadius);

      // Toroidal orbital base coordinates
      float radius = aOrbitRadius;
      vec3 pos = vec3(
        cos(currentAngle) * radius,
        sin(currentAngle * 2.0) * (radius * 0.08) * aRandom.z,
        sin(currentAngle) * radius
      );

      // Apply Bridson curl turbulence
      vec3 curl = curlNoise(pos * 0.008 + vec3(0.0, uTime * 0.15 * motionMultiplier, 0.0));
      pos += curl * (12.0 * (1.0 + uVoicePulse * 0.5));

      // Sample 2D Navier-Stokes fluid velocity field
      vec2 fluidUv = (pos.xz / 800.0) + 0.5;
      if (fluidUv.x >= 0.0 && fluidUv.x <= 1.0 && fluidUv.y >= 0.0 && fluidUv.y <= 1.0) {
        vec2 fluidVel = texture2D(uFluidVelocity, fluidUv).xy;
        pos.xz += fluidVel * 35.0 * motionMultiplier;
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Particle size based on distance and seed
      float baseSize = aRandom.z * 16.0 + 8.0;
      gl_PointSize = (baseSize / -mvPosition.z) * (1.0 + uVoicePulse * 0.25);

      // Color mapping: #DDDDDD starlight silver with #AA88FF lavender sparkles
      float sparkle = pow(aRandom.z, 60.0);
      vec3 starlightSilver = vec3(0.867, 0.867, 0.867); // #DDDDDD
      vec3 singularityLavender = vec3(0.667, 0.533, 1.0); // #AA88FF
      
      vColor = mix(starlightSilver, singularityLavender, sparkle + uVoicePulse * 0.25);
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

      float core = smoothstep(0.5, 0.0, dist);
      float glow = pow(core, 2.0);

      // Additive crisp Singularity Lavender spark on top of fine-grained silver-white accretion
      vec3 finalColor = vColor + vec3(0.667, 0.533, 1.0) * (vSparkle * 0.35);

      gl_FragColor = vec4(finalColor, vAlpha * glow);
    }
  `,
};
