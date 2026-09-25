// Shared 3D background: a cluster of glowing, merging spheres (after the
// NovaCrafters logo) floating in a starfield. It follows the pointer, and drifts
// aside and dims as you scroll into the content. Plain WebGL, no libraries.
// If WebGL is unavailable the canvas stays hidden and the CSS background shows.
(function () {
    const canvas = document.querySelector('.scene');
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance'
    });
    if (!gl) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const VERTEX = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

    const FRAGMENT = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif

        uniform vec2 uRes;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform vec3 uLayout;   // cluster centre (x, y) in screen units, and size
        uniform float uDim;     // 1 in the intro, lower once content is on screen

        mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

        float smin(float a, float b, float k) {
            float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
            return mix(b, a, h) - k * h * (1.0 - h);
        }

        float hash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }

        // Distance to the blob cluster
        float map(vec3 p) {
            p.xz *= rot(uTime * 0.12 + uMouse.x * 0.5);
            p.yz *= rot(uMouse.y * 0.35 + uScroll * 0.9);
            float t = uTime * 0.45;
            float s = 1.0 + clamp(uScroll, 0.0, 1.0) * 0.35;
            // A core sphere with five satellites joined by soft necks, like the logo
            float d = length(p - vec3(0.1 * sin(t), 0.08 * cos(t * 0.8), 0.0)) - 0.58;
            d = smin(d, length(p - s * vec3(1.05 * cos(t * 0.7), 0.7 * sin(t * 0.9), 0.4 * sin(t * 0.6))) - 0.42, 0.3);
            d = smin(d, length(p - s * vec3(-1.0 * sin(t * 0.6 + 1.0), -0.8 * cos(t * 0.7), 0.45 * cos(t * 0.5))) - 0.46, 0.3);
            d = smin(d, length(p - s * vec3(0.6 * sin(t * 1.1 + 2.0), -1.15 * sin(t * 0.5 + 1.0), -0.5 * cos(t * 0.8))) - 0.34, 0.26);
            d = smin(d, length(p - s * vec3(-1.2 * cos(t * 0.9 + 3.0), 1.0 * sin(t * 0.65 + 2.0), 0.3)) - 0.3, 0.24);
            d = smin(d, length(p - s * vec3(1.35 * sin(t * 0.55 + 4.0), 1.1 * cos(t * 0.75 + 1.5), -0.35)) - 0.24, 0.22);
            return d;
        }

        vec3 normalAt(vec3 p) {
            const vec2 e = vec2(0.002, -0.002);
            return normalize(
                e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) +
                e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
        }

        void main() {
            vec2 uv0 = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

            // Deep space background with a slow nebula haze
            vec3 col = mix(vec3(0.016, 0.010, 0.040), vec3(0.050, 0.024, 0.100), smoothstep(-0.7, 0.8, uv0.y));
            float neb = sin(uv0.x * 2.6 + uTime * 0.05) * sin(uv0.y * 3.1 - uTime * 0.04 + uv0.x);
            col += vec3(0.10, 0.03, 0.16) * smoothstep(0.2, 1.0, neb) * 0.35;
            col += vec3(0.02, 0.07, 0.10) * smoothstep(0.4, 1.0, -neb) * 0.25;

            // Two layers of twinkling stars, with parallax on pointer and scroll
            for (int i = 0; i < 2; i++) {
                float fi = float(i);
                vec2 sp = uv0 * (70.0 + fi * 55.0) + uMouse * (2.0 + fi * 3.0) + vec2(0.0, uScroll * (5.0 + fi * 9.0));
                vec2 id = floor(sp);
                float h = hash(id + fi * 17.0);
                if (h > 0.965) {
                    vec2 off = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
                    float r = length(fract(sp) - 0.5 - off * 0.5);
                    float tw = 0.55 + 0.45 * sin(uTime * (1.0 + h * 3.0) + h * 60.0);
                    col += vec3(0.85, 0.82, 1.0) * smoothstep(0.2, 0.0, r) * tw * (0.55 + fi * 0.3);
                }
            }

            // Blob cluster, raymarched only inside its bounding sphere
            vec2 uv = (uv0 - uLayout.xy) / uLayout.z;
            vec3 violet = vec3(0.49, 0.23, 0.93);
            vec3 magenta = vec3(0.86, 0.28, 0.94);
            vec3 cyan = vec3(0.40, 0.91, 0.98);
            col += violet * 0.16 * uDim * exp(-length(uv) * 1.6);

            vec3 ro = vec3(0.0, 0.0, 5.2);
            vec3 rd = normalize(vec3(uv, -1.7));
            float R = 2.9;
            float b = dot(ro, rd);
            float disc = b * b - (dot(ro, ro) - R * R);
            if (disc > 0.0) {
                float t = max(-b - sqrt(disc), 0.0);
                float tEnd = -b + sqrt(disc);
                float minD = 10.0;
                float tMin = t;
                bool hit = false;
                for (int i = 0; i < 72; i++) {
                    float d = map(ro + rd * t);
                    if (d < minD) { minD = d; tMin = t; }
                    if (d < 0.0015) { hit = true; break; }
                    t += d * 0.9;
                    if (t > tEnd) break;
                }

                // Smooth the silhouette: rays that pass within about a pixel of
                // the surface get partial coverage instead of a hard edge
                float pixel = 2.0 * tMin / (uRes.y * 1.7 * uLayout.z);
                float cover = hit ? 1.0 : 1.0 - smoothstep(0.0, pixel, minD);

                if (cover > 0.0) {
                    vec3 p = ro + rd * (hit ? t : tMin);
                    vec3 n = normalAt(p);
                    vec3 l = normalize(vec3(0.6, 0.8, 0.6));
                    float diff = max(dot(n, l), 0.0);
                    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
                    float spec = pow(max(dot(reflect(rd, n), l), 0.0), 48.0);
                    vec3 base = mix(violet, magenta, 0.5 + 0.5 * n.y);
                    base = mix(base, vec3(0.20, 0.08, 0.45), 0.5 - 0.5 * n.x);
                    vec3 surf = base * (0.18 + 0.82 * diff) + cyan * fres * 0.85 + vec3(spec * 0.7);
                    surf += 0.18 * fres * vec3(0.5 + 0.5 * sin(6.0 * n.y + uTime), 0.5 + 0.5 * sin(6.0 * n.x + 2.0), 1.0);
                    col = mix(col, surf, cover * (0.35 + 0.65 * uDim));
                }
                if (!hit) {
                    col += vec3(0.45, 0.20, 0.85) * exp(-minD * 4.0) * 0.35 * uDim;
                }
            }

            col *= 1.0 - 0.35 * dot(uv0 * 0.9, uv0 * 0.9);
            gl_FragColor = vec4(col, 1.0);
        }
    `;

    function compile(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    let program;
    try {
        program = gl.createProgram();
        gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    } catch (err) {
        // Leave the CSS background in place
        return;
    }

    gl.useProgram(program);

    // One triangle that covers the whole screen
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {};
    ['uRes', 'uTime', 'uMouse', 'uScroll', 'uLayout', 'uDim'].forEach(function (name) {
        uniforms[name] = gl.getUniformLocation(program, name);
    });

    // Where the cluster sits in the intro of each page: [x, y, size]
    const PRESETS = {
        home: { desktop: [0.5, 0.03, 0.62], mobile: [0.02, 0.29, 0.4] },
        about: { desktop: [0.56, 0.04, 0.5], mobile: [0.08, 0.31, 0.34] },
        contact: { desktop: [0.58, 0.06, 0.46], mobile: [0.1, 0.32, 0.3] }
    };
    const preset = PRESETS[document.body.dataset.scene] || PRESETS.home;

    const lerp = (a, b, t) => a + (b - a) * t;

    // Blend from the intro position to a smaller, dimmer spot at the side
    function layoutAt(progress) {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        const mobile = w < 768;
        const half = (w / h) / 2;
        const intro = mobile ? preset.mobile : preset.desktop;
        const aside = mobile ? [half * 0.75, 0.36, 0.22] : [half * 0.88, -0.1, 0.34];
        const e = progress * progress * (3 - 2 * progress);
        return [lerp(intro[0], aside[0], e), lerp(intro[1], aside[1], e), lerp(intro[2], aside[2], e), lerp(1, 0.5, e)];
    }

    let quality = 1;

    function resize() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let scale = dpr * (w < 768 ? 0.7 : 0.75) * quality;
        const maxPixels = 1.1e6;
        if (w * h * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (w * h));
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let scroll = 0;

    function draw(time) {
        const layout = layoutAt(Math.min(1, Math.max(0, scroll / 0.85)));
        gl.uniform2f(uniforms.uRes, canvas.width, canvas.height);
        gl.uniform1f(uniforms.uTime, time);
        gl.uniform2f(uniforms.uMouse, mouse.x, mouse.y);
        gl.uniform1f(uniforms.uScroll, scroll);
        gl.uniform3f(uniforms.uLayout, layout[0], layout[1], layout[2]);
        gl.uniform1f(uniforms.uDim, layout[3]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function reveal() {
        document.documentElement.classList.add('has-scene');
    }

    resize();

    // Reduced motion: one still frame, redrawn only when the window size changes
    if (reduceMotion) {
        draw(20);
        reveal();
        window.addEventListener('resize', function () { resize(); draw(20); });
        return;
    }

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', function (e) {
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });

    const start = performance.now();
    let last = start, frames = 0, elapsed = 0, skip = false, raf = 0;

    function frame(now) {
        raf = requestAnimationFrame(frame);

        // Lower the resolution if frames are consistently slow
        elapsed += now - last;
        last = now;
        if (++frames === 45) {
            if (elapsed / frames > 24 && quality > 0.45) {
                quality *= 0.8;
                resize();
            }
            frames = 0;
            elapsed = 0;
        }

        scroll += (window.scrollY / window.innerHeight - scroll) * 0.08;
        mouse.x += (mouse.tx - mouse.x) * 0.05;
        mouse.y += (mouse.ty - mouse.y) * 0.05;

        // Half frame rate once the intro has scrolled away, to save power
        if (scroll > 1.2) {
            skip = !skip;
            if (skip) return;
        }

        draw((now - start) / 1000 + 20);
    }

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            cancelAnimationFrame(raf);
        } else {
            last = performance.now();
            raf = requestAnimationFrame(frame);
        }
    });

    canvas.addEventListener('webglcontextlost', function (e) {
        e.preventDefault();
        cancelAnimationFrame(raf);
        document.documentElement.classList.remove('has-scene');
    });

    draw(20);
    reveal();
    raf = requestAnimationFrame(frame);
})();
