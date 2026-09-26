// Shared 3D background: a fly-through. Scrolling moves the camera forward
// through a field of stars (which streak when you scroll fast) past a series
// of glowing sphere clusters shaped like the NovaCrafters logo.
// Plain WebGL, no libraries. If WebGL is unavailable the canvas stays hidden
// and the CSS background shows instead.
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
        uniform float uCam;      // distance travelled forward by scrolling
        uniform float uVel;      // scroll speed; stretches stars into streaks
        uniform vec3 uCluster;   // cluster centre relative to the camera
        uniform float uGlow;     // cluster strength: fades in far away, out as it passes
        uniform vec3 uTintA;     // cluster colours
        uniform vec3 uTintB;

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

        // Distance to the cluster: a core sphere with five satellites, like the logo
        float map(vec3 p) {
            p -= uCluster;
            p.xz *= rot(uTime * 0.12 + uMouse.x * 0.5);
            p.yz *= rot(uMouse.y * 0.35 + uCam * 0.04);
            float t = uTime * 0.45;
            float d = length(p - vec3(0.1 * sin(t), 0.08 * cos(t * 0.8), 0.0)) - 0.58;
            d = smin(d, length(p - vec3(1.05 * cos(t * 0.7), 0.7 * sin(t * 0.9), 0.4 * sin(t * 0.6))) - 0.42, 0.3);
            d = smin(d, length(p - vec3(-1.0 * sin(t * 0.6 + 1.0), -0.8 * cos(t * 0.7), 0.45 * cos(t * 0.5))) - 0.46, 0.3);
            d = smin(d, length(p - vec3(0.6 * sin(t * 1.1 + 2.0), -1.15 * sin(t * 0.5 + 1.0), -0.5 * cos(t * 0.8))) - 0.34, 0.26);
            d = smin(d, length(p - vec3(-1.2 * cos(t * 0.9 + 3.0), 1.0 * sin(t * 0.65 + 2.0), 0.3)) - 0.3, 0.24);
            d = smin(d, length(p - vec3(1.35 * sin(t * 0.55 + 4.0), 1.1 * cos(t * 0.75 + 1.5), -0.35)) - 0.24, 0.22);
            return d;
        }

        vec3 normalAt(vec3 p) {
            const vec2 e = vec2(0.002, -0.002);
            return normalize(
                e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) +
                e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
        }

        // One layer of the star tunnel. depth runs 0 (far) to 1 (passing the camera);
        // as it grows the layer zooms, so its stars fly outward past the viewer.
        vec3 starLayer(vec2 uv, float depth, float seed) {
            float scale = mix(26.0, 1.4, depth);
            vec2 p = uv * scale + seed * 13.1;
            vec2 id = floor(p);
            float h = hash(id + seed * 7.0);
            if (h < 0.9) return vec3(0.0);
            vec2 off = (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.6;
            vec2 d = fract(p) - 0.5 - off;
            // Stretch along the direction away from the centre when moving fast
            vec2 n = normalize(uv + 0.0001);
            float stretch = 1.0 + uVel * 7.0 * depth;
            float r = length(vec2(dot(d, n) / stretch, dot(d, vec2(-n.y, n.x))));
            float pixel = scale / uRes.y;
            float size = max(mix(0.035, 0.06, depth), 1.3 * pixel);
            float star = smoothstep(size, 0.0, r);
            float fade = smoothstep(0.0, 0.3, depth) * smoothstep(0.95, 0.7, depth);
            float twinkle = 0.65 + 0.35 * sin(uTime * (1.0 + h * 3.0) + h * 60.0);
            vec3 tint = mix(vec3(0.85, 0.82, 1.0), vec3(0.62, 0.95, 1.0), hash(id + 9.0));
            return tint * star * fade * twinkle;
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

            // Deep space with a slow nebula haze that drifts as you travel
            vec3 col = mix(vec3(0.016, 0.010, 0.040), vec3(0.050, 0.024, 0.100), smoothstep(-0.7, 0.8, uv.y));
            float neb = sin(uv.x * 2.6 + uTime * 0.05 + uCam * 0.02) * sin(uv.y * 3.1 - uTime * 0.04 + uv.x - uCam * 0.015);
            col += vec3(0.10, 0.03, 0.16) * smoothstep(0.2, 1.0, neb) * 0.35;
            col += vec3(0.02, 0.07, 0.10) * smoothstep(0.4, 1.0, -neb) * 0.25;

            // Star tunnel: four layers at staggered depths
            for (int i = 0; i < 4; i++) {
                float fi = float(i);
                float depth = fract(fi * 0.25 + uCam * 0.035 + uTime * 0.004);
                col += starLayer(uv, depth, fi);
            }

            vec3 cyan = vec3(0.40, 0.91, 0.98);
            vec3 ro = vec3(uMouse.x * 0.3, uMouse.y * 0.2, 0.0);
            vec3 rd = normalize(vec3(uv, -1.7));

            // Soft halo around the cluster
            vec3 toC = uCluster - ro;
            float along = max(dot(toC, rd), 0.0);
            col += uTintA * 0.14 * uGlow * exp(-length(toC - rd * along) * 0.8);

            // Raymarch the cluster only inside its bounding sphere
            float R = 2.9;
            vec3 oc = ro - uCluster;
            float b = dot(oc, rd);
            float disc = b * b - (dot(oc, oc) - R * R);
            if (uGlow > 0.001 && disc > 0.0) {
                float tEnd = -b + sqrt(disc);
                if (tEnd > 0.0) {
                    float t = max(-b - sqrt(disc), 0.0);
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

                    // Smooth the silhouette: near misses get partial coverage
                    float pixel = 2.0 * tMin / (uRes.y * 1.7);
                    float cover = hit ? 1.0 : 1.0 - smoothstep(0.0, pixel, minD);

                    if (cover > 0.0) {
                        vec3 p = ro + rd * (hit ? t : tMin);
                        vec3 n = normalAt(p);
                        vec3 l = normalize(vec3(0.6, 0.8, 0.6));
                        float diff = max(dot(n, l), 0.0);
                        float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
                        float spec = pow(max(dot(reflect(rd, n), l), 0.0), 48.0);
                        vec3 base = mix(uTintA, uTintB, 0.5 + 0.5 * n.y);
                        base = mix(base, vec3(0.20, 0.08, 0.45), 0.5 - 0.5 * n.x);
                        vec3 surf = base * (0.18 + 0.82 * diff) + cyan * fres * 0.85 + vec3(spec * 0.7);
                        surf += 0.18 * fres * vec3(0.5 + 0.5 * sin(6.0 * n.y + uTime), 0.5 + 0.5 * sin(6.0 * n.x + 2.0), 1.0);
                        col = mix(col, surf, cover * uGlow);
                    }
                    if (!hit) {
                        col += uTintA * exp(-minD * 4.0) * 0.45 * uGlow;
                    }
                }
            }

            col *= 1.0 - 0.35 * dot(uv * 0.9, uv * 0.9);
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
    ['uRes', 'uTime', 'uMouse', 'uCam', 'uVel', 'uCluster', 'uGlow', 'uTintA', 'uTintB'].forEach(function (name) {
        uniforms[name] = gl.getUniformLocation(program, name);
    });

    // ---- The flight path ----
    // World units travelled per screen-height of scrolling
    const SPEED = 10;
    // Distance between clusters along the path
    const SPACING = 24;

    // Where the first cluster sits on each page, as [x, y, z] (z is ahead of the camera)
    const FIRST = {
        home: { desktop: [2.6, 0.1, -9], mobile: [0.55, 1.2, -10] },
        about: { desktop: [2.9, 0.2, -11], mobile: [0.6, 1.3, -12] },
        contact: { desktop: [3.0, 0.3, -12], mobile: [0.65, 1.35, -13] }
    };
    const first = FIRST[document.body.dataset.scene] || FIRST.home;

    const VIOLET = [0.49, 0.23, 0.93];
    const MAGENTA = [0.86, 0.28, 0.94];
    const CYAN = [0.40, 0.91, 0.98];
    const TINTS = [[VIOLET, MAGENTA], [VIOLET, CYAN], [MAGENTA, VIOLET]];

    function isMobile() {
        return canvas.clientWidth < 768;
    }

    // Cluster i on the path: the first is page-specific, the rest alternate sides
    function clusterAt(i) {
        const start = isMobile() ? first.mobile : first.desktop;
        if (i === 0) return start;
        // Later clusters fly past near the screen edges, clear of the text
        const side = i % 2 ? -1 : 1;
        const x = side * (isMobile() ? 0.8 : 3.3 + 0.3 * Math.sin(i * 1.7));
        const y = (isMobile() ? 1.3 : 0.6) * Math.sin(i * 2.3);
        return [x, y, start[2] - i * SPACING];
    }

    const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

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
    let travel = 0;     // smoothed scroll position, in screen heights
    let speed = 0;      // smoothed scroll speed, in screen heights per second

    function draw(time) {
        const cam = travel * SPEED;

        // Nearest cluster that the camera hasn't flown past yet
        let i = 0, c = clusterAt(0);
        while (c[2] + cam > -0.8 && i < 1000) c = clusterAt(++i);
        const rel = [c[0], c[1], c[2] + cam];
        const dist = -rel[2];
        // Fade in from far away; the intro cluster fades as it flies past, later
        // ones fade earlier and stay dimmer so they never loom behind text
        const near = i === 0 ? smoothstep(0.8, 4.5, dist) : smoothstep(2.5, 8, dist);
        const glow = (1 - smoothstep(18, 30, dist)) * near * (i === 0 ? 1 : 0.65);
        const tint = TINTS[i % TINTS.length];

        gl.uniform2f(uniforms.uRes, canvas.width, canvas.height);
        gl.uniform1f(uniforms.uTime, time);
        gl.uniform2f(uniforms.uMouse, mouse.x, mouse.y);
        gl.uniform1f(uniforms.uCam, cam);
        gl.uniform1f(uniforms.uVel, Math.min(speed, 2.5));
        gl.uniform3f(uniforms.uCluster, rel[0], rel[1], rel[2]);
        gl.uniform1f(uniforms.uGlow, glow);
        gl.uniform3f(uniforms.uTintA, tint[0][0], tint[0][1], tint[0][2]);
        gl.uniform3f(uniforms.uTintB, tint[1][0], tint[1][1], tint[1][2]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function reveal() {
        document.documentElement.classList.add('has-scene');
    }

    resize();

    // Reduced motion: one still frame at the start of the path
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
    travel = window.scrollY / window.innerHeight;

    function frame(now) {
        raf = requestAnimationFrame(frame);
        const dt = Math.max(1, now - last);

        // Lower the resolution if frames are consistently slow
        elapsed += dt;
        last = now;
        if (++frames === 45) {
            if (elapsed / frames > 24 && quality > 0.45) {
                quality *= 0.8;
                resize();
            }
            frames = 0;
            elapsed = 0;
        }

        // Glide toward the scroll position, so the flight keeps a little momentum
        const before = travel;
        travel += (window.scrollY / window.innerHeight - travel) * 0.08;
        const instant = Math.abs(travel - before) / (dt / 1000);
        speed += (instant - speed) * 0.12;

        mouse.x += (mouse.tx - mouse.x) * 0.05;
        mouse.y += (mouse.ty - mouse.y) * 0.05;

        // Half frame rate while idle below the intro, to save power
        if (speed < 0.02 && travel > 1.2) {
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
