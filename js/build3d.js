// ===== 3D build (index-build.html only) =====
// Every correct answer drops a Minecraft-style block onto a voxel picture that grows as the
// test goes on. The game logic is untouched: this file only listens to renderScore() and
// renderProgress() (which the game already calls on every answer and on every reset) and
// draws with three.js (js/vendor/three.min.js, r159: the last release that ships a classic,
// non-module build, so the page still works from file:// without a build step), or with a
// Canvas 2D isometric fallback when WebGL is unavailable (force it with ?2d).

const BUILD_KEY = 'gangetabellen.build';
const BLOCK_FALL_HEIGHT = 7;   // blocks start this far above their place
const BLOCK_GRAVITY = 30;      // units per second squared
const BLOCK_STAGGER_MS = 70;   // delay between blocks when one answer adds several
const CELEBRATE_MS = 2200;

// Pictures: '.' is empty, every other letter is a palette colour. Row 0 is the top. Each picture
// is `depth` blocks thick and must have at least 100 blocks, so a 100-problem test never
// has an answer that adds nothing.
const BUILD_PICTURES = [
    { name: 'en Creeper', depth: 2,
      palette: { G: '#5fb33a', g: '#3f8a27', k: '#111111' },
      rows: ['GgGGGgGG',
             'GGGgGGGg',
             'GkkGGkkG',
             'GkkGGkkG',
             'GGGkkGGG',
             'GGkkkkGG',
             'GGkkkkGG',
             'GgkGGkgG'] },
    { name: 'Steve', depth: 2,
      palette: { H: '#4a2f1b', S: '#c58c68', W: '#ffffff', B: '#3b4cc0', m: '#8a5a3c' },
      rows: ['HHHHHHHH',
             'HHHHHHHH',
             'HSSSSSSH',
             'SSSSSSSS',
             'SWBSSBWS',
             'SSSmmSSS',
             'SSmHHmSS',
             'SSHHHHSS'] },
    { name: 'en Gris', depth: 2,
      palette: { P: '#f0a0a8', N: '#e8827f', W: '#ffffff', k: '#2a2a2a' },
      rows: ['PPPPPPPP',
             'PPPPPPPP',
             'PWkPPkWP',
             'PPPPPPPP',
             'PPNNNNPP',
             'PPNkNkPP',
             'PPNNNNPP',
             'PPPPPPPP'] },
    { name: 'et Hjerte', depth: 3,
      palette: { R: '#e03131', p: '#ff8fa3' },
      rows: ['.RRR.RRR.',
             'RpRRRRRRR',
             'RpRRRRRRR',
             'RRRRRRRRR',
             '.RRRRRRR.',
             '..RRRRR..',
             '...RRR...',
             '....R....'] },
    { name: 'et Hus', depth: 2,
      palette: { T: '#a8322d', P: '#b78a4e', B: '#9fd8ff', D: '#5a3a1d' },
      rows: ['.....T.....',
             '....TTT....',
             '...TTTTT...',
             '..TTTTTTT..',
             '.TTTTTTTTT.',
             'PPPPPPPPPPP',
             'PBBPPPPPBBP',
             'PBBPPDDPBBP',
             'PPPPPDDPPPP'] },
    { name: 'et Tre', depth: 2,
      palette: { L: '#3f9a2e', l: '#2f7a22', T: '#6b4a2b' },
      rows: ['..LLLLL..',
             '.LLLlLLL.',
             'LLLLLLLLL',
             'LLlLLLLlL',
             'LLLLLLLLL',
             '.LLLLLLL.',
             '...LLL...',
             '....T....',
             '....T....',
             '....T....',
             '...TTT...'] }
];

// ----- Pure data: a picture becomes an ordered list of blocks -----
function mulberry32(seed) {
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** All blocks of a picture in building order: bottom row first, shuffled within a row. */
function buildBlockList(picture, seed) {
    const rand = mulberry32(seed);
    const height = picture.rows.length;
    const width = picture.rows[0].length;
    const blocks = [];
    for (let row = height - 1; row >= 0; row--) {
        const layer = [];
        for (let col = 0; col < width; col++) {
            const ch = picture.rows[row][col];
            if (ch === '.') continue;
            for (let z = 0; z < picture.depth; z++) {
                layer.push({ x: col - (width - 1) / 2, y: height - 1 - row + 0.5, z: z - (picture.depth - 1) / 2, color: picture.palette[ch] });
            }
        }
        for (let i = layer.length - 1; i > 0; i--) { // seeded Fisher-Yates
            const j = Math.floor(rand() * (i + 1));
            [layer[i], layer[j]] = [layer[j], layer[i]];
        }
        blocks.push(...layer);
    }
    return blocks;
}

/** How many blocks of `total` should stand after `solved` of `problems` correct answers. */
function blocksForProgress(total, solved, problems) {
    if (problems <= 0) return 0;
    return Math.floor(total * Math.min(solved, problems) / problems);
}

// ----- three.js scene -----
function createWebglStage(canvas, caption, renderer) {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 2, 0.1, 200);
    const world = new THREE.Group();
    scene.add(world);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(4, 10, 7);
    scene.add(sun);

    const cube = new THREE.BoxGeometry(1, 1, 1);
    const confettiCube = new THREE.BoxGeometry(0.22, 0.22, 0.22);

    // A 16x16 noisy greyscale tile with a light and a dark edge; tinted per block by the material colour.
    const texture = (function () {
        const c = document.createElement('canvas');
        c.width = c.height = 16;
        const ctx = c.getContext('2d');
        const rand = mulberry32(7);
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                let v = 205 + Math.floor(rand() * 50);
                if (x === 0 || y === 0) v = 255;
                if (x === 15 || y === 15) v = 150;
                ctx.fillStyle = `rgb(${v},${v},${v})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }
        const t = new THREE.CanvasTexture(c);
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    })();

    const material = (hex, jitter) => new THREE.MeshLambertMaterial({
        map: texture,
        color: new THREE.Color(hex).offsetHSL(0, 0, jitter)
    });

    let picture = null, blocks = [], meshes = [], ground = null;
    let fitW = 8, fitH = 8, fitD = 2;
    const falling = [];   // meshes still dropping in
    const confetti = [];
    let celebrateStart = -1;
    let az = 0, dragAz = 0, dragging = false, lastDrag = 0, lastX = 0;

    function disposeMesh(mesh) { world.remove(mesh); mesh.material.dispose(); }

    function setPicture(pic, seed) {
        meshes.forEach(disposeMesh);
        meshes = [];
        falling.length = 0;
        confetti.splice(0).forEach(c => { world.remove(c.mesh); c.mesh.material.dispose(); });
        celebrateStart = -1;
        if (ground) {
            ground.children.forEach(m => { m.material.forEach(x => x.dispose()); m.geometry.dispose(); });
            world.remove(ground);
        }
        picture = pic;
        blocks = buildBlockList(pic, seed);
        fitW = pic.rows[0].length;
        fitH = pic.rows.length;
        fitD = pic.depth;

        // Grass slab with a dirt edge under the picture
        ground = new THREE.Group();
        const slab = new THREE.Mesh(
            new THREE.BoxGeometry(fitW + 4, 1, fitD + 4),
            [material('#7a5530', 0), material('#7a5530', 0), material('#78c043', 0), material('#6b4a2b', 0), material('#7a5530', 0), material('#7a5530', 0)]
        );
        slab.position.y = -0.5;
        ground.add(slab);
        world.add(ground);
        resize();
    }

    function resize() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    function placeCamera() {
        const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const dist = Math.max((fitH / 2 + 1.3) / tan, ((fitW + 2) / 2) / (tan * camera.aspect)) + fitD;
        const elev = 0.32;
        camera.position.set(Math.sin(az) * Math.cos(elev) * dist, fitH / 2 + Math.sin(elev) * dist, Math.cos(az) * Math.cos(elev) * dist);
        camera.lookAt(0, fitH / 2 - 0.3, 0);
    }

    /** Drop blocks[from..to) onto the picture (or place them straight away). */
    function addBlocks(from, to, animate) {
        const count = to - from;
        const gap = Math.min(BLOCK_STAGGER_MS, 800 / Math.max(count, 1));
        for (let i = from; i < to; i++) {
            const b = blocks[i];
            const rand = mulberry32(i * 31 + 5);
            const mesh = new THREE.Mesh(cube, material(b.color, (rand() - 0.5) * 0.08));
            mesh.position.set(b.x, b.y, b.z);
            mesh.userData = { baseY: b.y, vy: 0, delay: 0, bounces: 1, squash: 0 };
            if (animate && !reduceMotion) {
                mesh.position.y = b.y + BLOCK_FALL_HEIGHT + rand() * 2;
                mesh.userData.delay = (i - from) * gap;
                mesh.visible = false;
                falling.push(mesh);
            }
            world.add(mesh);
            meshes.push(mesh);
        }
    }

    function celebrate() {
        const now = performance.now();
        celebrateStart = now;
        if (reduceMotion) return;
        const colors = ['#ffaa00', '#55ffff', '#55ff55', '#ff5555', '#ffffff', '#ff77ff'];
        for (let i = 0; i < 60; i++) {
            const mesh = new THREE.Mesh(confettiCube, new THREE.MeshBasicMaterial({ color: colors[i % colors.length] }));
            mesh.position.set((Math.random() - 0.5) * fitW, fitH + 1 + Math.random() * 2, (Math.random() - 0.5) * (fitD + 3));
            world.add(mesh);
            confetti.push({ mesh, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, vz: (Math.random() - 0.5) * 3, born: now });
        }
    }

    let last = performance.now();
    function frame(now) {
        requestAnimationFrame(frame);
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (!canvas.clientWidth || !canvas.clientHeight) return;

        // Camera: a slow sway, plus whatever the player dragged (which eases back when let go)
        if (!dragging && now - lastDrag > 2500) dragAz *= 0.97;
        az = dragAz + (reduceMotion ? 0 : Math.sin(now / 2600) * 0.5);

        for (let i = falling.length - 1; i >= 0; i--) {
            const m = falling[i], d = m.userData;
            if (d.delay > 0) { d.delay -= dt * 1000; if (d.delay > 0) continue; m.visible = true; }
            d.vy -= BLOCK_GRAVITY * dt;
            m.position.y += d.vy * dt;
            if (m.position.y <= d.baseY) {
                m.position.y = d.baseY;
                if (d.bounces > 0 && d.vy < -5) { d.vy = -d.vy * 0.28; d.bounces--; }
                else { falling.splice(i, 1); d.vy = 0; d.squash = 1; }
            }
        }
        const celebrating = celebrateStart >= 0 && now - celebrateStart < CELEBRATE_MS;
        for (const m of meshes) {
            const d = m.userData;
            if (d.squash > 0) { // landing squash, eased back to 1
                d.squash = Math.max(0, d.squash - dt * 6);
                m.scale.set(1 + d.squash * 0.12, 1 - d.squash * 0.2, 1 + d.squash * 0.12);
            }
            if (d.vy !== 0 || m.userData.delay > 0) continue; // still falling
            if (celebrating) {
                const phase = (now - celebrateStart) / 160 - m.position.x * 0.6 - d.baseY * 0.3;
                m.position.y = d.baseY + Math.max(0, Math.sin(phase)) * 0.45;
            } else if (m.position.y !== d.baseY && !falling.includes(m)) {
                m.position.y = d.baseY;
            }
        }
        for (let i = confetti.length - 1; i >= 0; i--) {
            const c = confetti[i];
            c.vy -= 9 * dt;
            c.mesh.position.x += c.vx * dt; c.mesh.position.y += c.vy * dt; c.mesh.position.z += c.vz * dt;
            c.mesh.rotation.x += dt * 5; c.mesh.rotation.y += dt * 4;
            if (now - c.born > CELEBRATE_MS + 400 || c.mesh.position.y < -2) {
                world.remove(c.mesh); c.mesh.material.dispose(); confetti.splice(i, 1);
            }
        }

        placeCamera();
        renderer.render(scene, camera);
    }

    // Drag sideways to look around the build; vertical swipes still scroll the page (touch-action: pan-y)
    canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
        if (!dragging) return;
        dragAz = Math.max(-1.6, Math.min(1.6, dragAz + (e.clientX - lastX) * 0.01));
        lastX = e.clientX;
    });
    const endDrag = () => { dragging = false; lastDrag = performance.now(); };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);

    return {
        kind: 'webgl',
        setPicture, addBlocks, celebrate,
        get blockCount() { return blocks.length; },
        setCaption(text) { caption.textContent = text; }
    };
}

// ----- Canvas 2D fallback: the same build in an isometric view, for devices without WebGL -----
function shadeColor(hex, factor) {
    const n = parseInt(hex.slice(1), 16);
    const ch = shift => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * factor)));
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function createIsometricStage(canvas, caption) {
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ELEVATION = 0.55;        // camera tilt (radians)
    const BASE_TURN = 0.55;        // turn of the build: 0 = straight on, PI/4 = classic isometric
    const GROUND_PAD = 2;          // grass border around the picture

    let picture = null, blocks = [], fitW = 8, fitH = 8, fitD = 2, groundColors = null;
    let order = [];                // block indices sorted back to front
    let cells = [];                // one entry per placed block
    const confetti = [];
    let celebrateStart = -1;
    let turn = BASE_TURN, dragTurn = 0, dragging = false, lastDrag = 0, lastX = 0;
    let scale = 20, offX = 0, offY = 0, cosT = 1, sinT = 0;

    // World (x right, y up, z towards the viewer) -> screen, before scale/offset.
    const project = (x, y, z) => {
        const depth = x * sinT + z * cosT;
        return [x * cosT - z * sinT, depth * Math.sin(ELEVATION) - y * Math.cos(ELEVATION)];
    };

    function setPicture(pic, seed) {
        picture = pic;
        blocks = buildBlockList(pic, seed);
        fitW = pic.rows[0].length;
        fitH = pic.rows.length;
        fitD = pic.depth;
        cells = [];
        confetti.length = 0;
        celebrateStart = -1;
    }

    function addBlocks(from, to, animate) {
        const count = to - from;
        const gap = Math.min(BLOCK_STAGGER_MS, 800 / Math.max(count, 1));
        for (let i = from; i < to; i++) {
            const b = blocks[i];
            const rand = mulberry32(i * 31 + 5);
            const jitter = 0.94 + rand() * 0.12;
            const cell = {
                x: b.x, z: b.z, baseY: b.y - 0.5, y: b.y - 0.5, vy: 0, delay: 0, bounces: 1, squash: 0, falling: false,
                top: shadeColor(b.color, 1.18 * jitter), left: shadeColor(b.color, jitter), right: shadeColor(b.color, 0.72 * jitter)
            };
            if (animate && !reduceMotion) {
                cell.y = cell.baseY + BLOCK_FALL_HEIGHT + rand() * 2;
                cell.delay = (i - from) * gap;
                cell.falling = true;
            }
            cells.push(cell);
        }
    }

    function celebrate() {
        const now = performance.now();
        celebrateStart = now;
        if (reduceMotion) return;
        const colors = ['#ffaa00', '#55ffff', '#55ff55', '#ff5555', '#ffffff', '#ff77ff'];
        for (let i = 0; i < 60; i++) {
            confetti.push({
                color: colors[i % colors.length], born: now,
                x: (Math.random() - 0.5) * fitW, y: fitH + 1 + Math.random() * 2, z: (Math.random() - 0.5) * (fitD + 3),
                vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, vz: (Math.random() - 0.5) * 3
            });
        }
    }

    /** Draw an axis-aligned box whose bottom-centre is (cx, y0, cz). Three faces are visible. */
    function drawBox(cx, y0, cz, sx, sy, sz, top, left, right) {
        const x0 = cx - sx / 2, x1 = cx + sx / 2, z0 = cz - sz / 2, z1 = cz + sz / 2, y1 = y0 + sy;
        const pt = (x, y, z) => { const [px, py] = project(x, y, z); return [offX + px * scale, offY + py * scale]; };
        const face = (color, pts) => {
            ctx.beginPath();
            pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            ctx.stroke();
        };
        face(top,   [pt(x0, y1, z0), pt(x1, y1, z0), pt(x1, y1, z1), pt(x0, y1, z1)]);
        face(left,  [pt(x0, y1, z1), pt(x1, y1, z1), pt(x1, y0, z1), pt(x0, y0, z1)]);  // faces the viewer (+z)
        face(right, [pt(x1, y1, z1), pt(x1, y1, z0), pt(x1, y0, z0), pt(x1, y0, z1)]);  // faces right (+x)
    }

    function fitToCanvas(w, h) {
        // Scale and centre so the finished picture and its ground always fit, whatever the turn
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const gx = fitW / 2 + GROUND_PAD, gz = fitD / 2 + GROUND_PAD;
        for (const [x, y, z] of [[-gx, -1, -gz], [gx, -1, -gz], [gx, -1, gz], [-gx, -1, gz],
                                 [-fitW / 2, fitH, -fitD / 2], [fitW / 2, fitH, -fitD / 2], [fitW / 2, fitH, fitD / 2], [-fitW / 2, fitH, fitD / 2]]) {
            const [px, py] = project(x, y, z);
            minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
        }
        scale = Math.min((w * 0.94) / (maxX - minX), (h * 0.92) / (maxY - minY));
        offX = w / 2 - ((minX + maxX) / 2) * scale;
        offY = h / 2 - ((minY + maxY) / 2) * scale;
    }

    let last = performance.now();
    function frame(now) {
        requestAnimationFrame(frame);
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        if (!dragging && now - lastDrag > 2500) dragTurn *= 0.97;
        turn = Math.max(0.12, Math.min(1.45, BASE_TURN + dragTurn + (reduceMotion ? 0 : Math.sin(now / 2600) * 0.3)));
        cosT = Math.cos(turn); sinT = Math.sin(turn);
        fitToCanvas(w, h);

        for (const c of cells) { // physics: the same drop, bounce and squash as the 3D version
            if (c.falling) {
                if (c.delay > 0) { c.delay -= dt * 1000; continue; }
                c.vy -= BLOCK_GRAVITY * dt;
                c.y += c.vy * dt;
                if (c.y <= c.baseY) {
                    c.y = c.baseY;
                    if (c.bounces > 0 && c.vy < -5) { c.vy = -c.vy * 0.28; c.bounces--; }
                    else { c.falling = false; c.vy = 0; c.squash = 1; }
                }
            }
            if (c.squash > 0) c.squash = Math.max(0, c.squash - dt * 6);
        }
        const celebrating = celebrateStart >= 0 && now - celebrateStart < CELEBRATE_MS;

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineJoin = 'round';
        // Grass slab with a dirt edge
        drawBox(0, -1, 0, fitW + GROUND_PAD * 2, 1, fitD + GROUND_PAD * 2, '#78c043', '#7a5530', '#5f4224');

        // Back to front: x ascending, then z, then y (right for a viewer at +x, +z, above)
        const standing = cells.filter(c => !c.falling).sort((a, b) => (a.x - b.x) || (a.z - b.z) || (a.baseY - b.baseY));
        const dropping = cells.filter(c => c.falling && c.delay <= 0);
        for (const c of standing.concat(dropping)) {
            let y = c.y;
            if (celebrating && !c.falling) y += Math.max(0, Math.sin((now - celebrateStart) / 160 - c.x * 0.6 - c.baseY * 0.3)) * 0.45;
            const squash = 1 - c.squash * 0.2;
            drawBox(c.x, y, c.z, 1 + c.squash * 0.12, squash, 1 + c.squash * 0.12, c.top, c.left, c.right);
        }

        for (let i = confetti.length - 1; i >= 0; i--) {
            const c = confetti[i];
            c.vy -= 9 * dt;
            c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
            if (now - c.born > CELEBRATE_MS + 400 || c.y < -2) { confetti.splice(i, 1); continue; }
            const [px, py] = project(c.x, c.y, c.z);
            const size = Math.max(3, scale * 0.22);
            ctx.fillStyle = c.color;
            ctx.fillRect(offX + px * scale - size / 2, offY + py * scale - size / 2, size, size);
        }
    }

    // Drag sideways to turn the build (vertical swipes still scroll the page)
    canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
        if (!dragging) return;
        dragTurn = Math.max(-1, Math.min(1, dragTurn + (e.clientX - lastX) * 0.01));
        lastX = e.clientX;
    });
    const endDrag = () => { dragging = false; lastDrag = performance.now(); };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    requestAnimationFrame(frame);

    return {
        kind: '2d',
        setPicture, addBlocks, celebrate,
        get blockCount() { return blocks.length; },
        setCaption(text) { caption.textContent = text; }
    };
}

/** three.js (WebGL) when it works; otherwise the Canvas 2D isometric view. Add ?2d to the address to force the fallback. */
const buildStage = (function createBuildStage() {
    const canvas = document.getElementById('build-canvas');
    const caption = document.getElementById('build-caption');
    if (!canvas) return null;
    if (typeof THREE !== 'undefined' && !/[?&]2d\b/.test(location.search)) {
        let renderer = null;
        try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { /* no WebGL: use the 2D view */ }
        if (renderer) return createWebglStage(canvas, caption, renderer);
    }
    if (!canvas.getContext('2d')) {
        document.getElementById('build-stage').hidden = true; // no canvas at all: the game still works without the view
        return null;
    }
    return createIsometricStage(canvas, caption);
})();

// ----- Wiring to the game -----
const buildProgress = { shown: 0, ready: false, problems: null, complete: false, picture: 0, seed: 0 };

function readSavedPicture() {
    try {
        const saved = JSON.parse(localStorage.getItem(BUILD_KEY));
        if (saved && saved.picture >= 0 && saved.picture < BUILD_PICTURES.length) return saved;
    } catch (e) { /* no saved picture */ }
    return null;
}

/** Pick a (different) random picture for a fresh test and remember it. */
function startNewPicture(previous) {
    let index;
    do { index = Math.floor(Math.random() * BUILD_PICTURES.length); }
    while (BUILD_PICTURES.length > 1 && index === previous);
    const seed = Math.floor(Math.random() * 1e9);
    const pick = { picture: index, seed, shown: 0 };
    saveBuild(pick);
    return pick;
}

function saveBuild(pick) {
    try { localStorage.setItem(BUILD_KEY, JSON.stringify(pick)); } catch (e) { /* not remembered */ }
}

function updateBuild(animate = true) {
    if (!buildStage) return;
    const solved = document.querySelectorAll('.answer-input[data-solved="1"]').length;
    const fresh = state.answeredIndices.size === 0 && solved === 0;
    const b = buildProgress;

    if (!b.ready) {
        const saved = readSavedPicture();
        const pick = saved && !fresh ? saved : startNewPicture(saved ? saved.picture : -1);
        buildStage.setPicture(BUILD_PICTURES[pick.picture], pick.seed);
        b.picture = pick.picture;
        b.seed = pick.seed;
        b.shown = saved && !fresh ? Math.min(pick.shown || 0, buildStage.blockCount) : 0; // what stood before the reload
        if (b.shown > 0) buildStage.addBlocks(0, b.shown, false);
        b.ready = true;
        animate = false; // restoring: place the blocks straight away
    } else if (fresh && (b.shown > 0 || b.problems !== state.problems)) {
        const pick = startNewPicture(b.picture); // new test (or retry): new picture
        buildStage.setPicture(BUILD_PICTURES[pick.picture], pick.seed);
        b.picture = pick.picture;
        b.seed = pick.seed;
        b.shown = 0;
        b.complete = false;
    }
    b.problems = state.problems;

    // Blocks only ever get added during a test; a wrong re-answer never takes one away
    const total = buildStage.blockCount;
    const want = Math.max(b.shown, fresh ? 0 : blocksForProgress(total, solved, state.totalProblems));
    if (want > b.shown) {
        buildStage.addBlocks(b.shown, want, animate);
        b.shown = want;
        saveBuild({ picture: b.picture, seed: b.seed, shown: b.shown });
    }

    const done = total > 0 && b.shown === total;
    if (done && !b.complete && animate) setTimeout(buildStage.celebrate, 1000); // after the last block has landed
    b.complete = done;

    const name = BUILD_PICTURES[b.picture].name;
    buildStage.setCaption(done ? `Ferdig! Du bygde ${name}! 🎉` : `🧱 ${b.shown} av ${total} blokker – hva bygger du?`);
    const summary = document.getElementById('summary-build');
    if (summary) summary.textContent = done ? `Du bygde ${name}! 🎉` : '';
}

/** For the test scenarios and debugging. */
function getBuildInfo() {
    return buildStage
        ? { renderer: buildStage.kind, ready: buildProgress.ready, shown: buildProgress.shown, total: buildStage.blockCount, complete: buildProgress.complete, picture: BUILD_PICTURES[buildProgress.picture].name }
        : null;
}

(function hookIntoGame() {
    const baseRenderProgress = renderProgress;
    renderProgress = function () { baseRenderProgress(); updateBuild(); };
    const baseRenderScore = renderScore;
    renderScore = function () { baseRenderScore(); updateBuild(); };
})();
