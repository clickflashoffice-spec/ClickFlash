export const vertexShader = `
uniform float uTime;
uniform float uScrollVelocity;
uniform vec2 uMouse;
uniform float uHoverState;

varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  
  // Subtle curve based on scroll velocity
  pos.y -= sin(uv.x * 3.14159) * uScrollVelocity * 0.05;
  pos.z += sin(uv.x * 3.14159) * uScrollVelocity * 0.1;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const fragmentShader = `
uniform float uTime;
uniform sampler2D uTexture;
uniform vec2 uMouse;
uniform float uHoverState;
uniform float uScrollVelocity;

varying vec2 vUv;

// Simple 2D noise
float random (in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    // Smooth Interpolation
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = vUv;
  
  // Continuous fluid distortion
  float noiseValue = noise(uv * 4.0 + uTime * 0.5) * 0.02;
  uv.x += noiseValue;
  uv.y += noiseValue;
  
  // Interactive Mouse Ripple
  float dist = distance(uv, uMouse);
  float ripple = 0.0;
  if(dist < 0.4) {
      // Create a wave spreading out from the mouse
      ripple = sin(dist * 20.0 - uTime * 5.0) * (0.4 - dist) * 0.05 * uHoverState;
      uv += normalize(uv - uMouse) * ripple;
  }
  
  // Scroll distortion (stretch vertically based on velocity)
  uv.y -= uScrollVelocity * 0.005 * (uv.y - 0.5);

  vec4 color = texture2D(uTexture, uv);
  
  // Add a slight highlight on the ripple
  color.rgb += ripple * 2.0;

  gl_FragColor = color;
}
`;
