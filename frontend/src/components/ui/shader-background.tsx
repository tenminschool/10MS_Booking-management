import { useEffect, useRef, useState } from 'react';

const ShaderBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  // Simple vertex shader
  const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Fragment shader with red waves - simplified and more reliable
  const fragmentShaderSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      
      // Create red wave effect
      float wave1 = sin(uv.x * 10.0 + u_time * 2.0) * 0.5;
      float wave2 = sin(uv.x * 15.0 + u_time * 1.5) * 0.3;
      float wave3 = sin(uv.x * 20.0 + u_time * 3.0) * 0.2;
      
      float combinedWave = wave1 + wave2 + wave3;
      
      // Create flowing lines
      float lines = 0.0;
      for(int i = 0; i < 5; i++) {
        float linePos = sin(uv.x * 8.0 + float(i) * 1.0 + u_time * 1.5) * 0.4 + 0.5;
        float lineWidth = 0.02;
        lines += smoothstep(lineWidth, 0.0, abs(uv.y - linePos));
      }
      
      // Background gradient
      vec3 bgColor = mix(
        vec3(0.1, 0.05, 0.2), 
        vec3(0.05, 0.05, 0.15), 
        uv.x
      );
      
      // Red wave color
      vec3 waveColor = vec3(0.9, 0.2, 0.2);
      
      // Combine everything
      vec3 finalColor = bgColor + waveColor * lines * 0.6;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas ref is null');
      return;
    }

    console.log('Initializing WebGL...');
    console.log('Canvas element:', canvas);

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported, falling back to CSS animation');
      setWebglSupported(false);
      return;
    }

    console.log('WebGL context created successfully');
    console.log('WebGL context:', gl);

    // Create shader function
    function createShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type);
      if (!shader) {
        console.error('Failed to create shader');
        return null;
      }

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    }

    // Create program function
    function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
      const program = gl.createProgram();
      if (!program) {
        console.error('Failed to create program');
        return null;
      }

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }

      return program;
    }

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      console.error('Failed to create shaders');
      return;
    }

    console.log('Shaders created successfully');

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      console.error('Failed to create program');
      return;
    }

    console.log('Program created successfully');

    // Get attribute and uniform locations
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeUniformLocation = gl.getUniformLocation(program, 'u_time');

    // Create buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Set up rectangle
    const positions = [
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Resize function
    function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }
    }

    // Render function
    let animationId: number;
    let startTime = Date.now();

    function render() {
      if (!canvas || !gl) return;
      
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Clear canvas
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Use program
      gl.useProgram(program);

      // Set uniforms
      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
      gl.uniform1f(timeUniformLocation, (Date.now() - startTime) / 1000);

      // Set up attributes
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationId = requestAnimationFrame(render);
    }

    // Start rendering
    render();

    // Cleanup
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (positionBuffer) {
        gl.deleteBuffer(positionBuffer);
      }
    };
  }, []);

  // Fallback CSS animation background
  if (!webglSupported) {
    return (
      <>
        <style>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .fallback-bg {
            background: linear-gradient(45deg, #1a0a2e, #16213e, #0f3460);
            background-size: 400% 400%;
            animation: gradientShift 8s ease infinite;
          }
        `}</style>
        <div className="fixed top-0 left-0 w-full h-full -z-10 fallback-bg" />
      </>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10"
      style={{ 
        display: 'block',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -10
      }}
    />
  );
};

export default ShaderBackground;
