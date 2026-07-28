/* ============================================
   HERO WEBGL — wireframe shooter assembly
   A flywheel meshed with a drive gear, drawn
   as CAD-style edges. Scroll throttles the
   spin; pointer tilts the assembly. Ambient —
   it stays behind the type.
   ============================================ */
(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !window.THREE) return;

    function init() {

    var mount = document.getElementById('hero-canvas');
    if (!mount) return;

    var W = mount.clientWidth, H = mount.clientHeight;
    if (!W || !H) return; // hero not laid out yet — ResizeObserver below will retry
    var renderer;
    try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) { return; } // no WebGL → hero grid alone carries the background

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
    camera.position.set(0, 0, 11);

    /* --- palette (matches CSS tokens) --- */
    var RED = 0xe01f26, STEEL = 0x2e394c, DIM = 0x3c4658;

    function edges(geom, color, opacity) {
        return new THREE.LineSegments(
            new THREE.EdgesGeometry(geom, 12),
            new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity })
        );
    }

    var assembly = new THREE.Group();

    /* --- flywheel: rim + spokes + hub --- */
    var flywheel = new THREE.Group();
    flywheel.add(edges(new THREE.TorusGeometry(2.1, 0.34, 8, 44), RED, 0.75));
    for (var i = 0; i < 6; i++) {
        var spoke = edges(new THREE.BoxGeometry(0.16, 3.6, 0.16), DIM, 0.55);
        spoke.rotation.z = (i / 6) * Math.PI;
        flywheel.add(spoke);
    }
    flywheel.add(edges(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 10)
        .applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2)), RED, 0.8));
    assembly.add(flywheel);

    /* --- drive gear, meshed at 2 o'clock --- */
    var gear = new THREE.Group();
    gear.add(edges(new THREE.TorusGeometry(0.85, 0.22, 6, 24), STEEL, 0.7));
    for (var t = 0; t < 10; t++) {
        var tooth = edges(new THREE.BoxGeometry(0.2, 0.34, 0.22), STEEL, 0.7);
        var a = (t / 10) * Math.PI * 2;
        tooth.position.set(Math.cos(a) * 1.12, Math.sin(a) * 1.12, 0);
        tooth.rotation.z = a;
        gear.add(tooth);
    }
    gear.position.set(2.95, 1.55, -0.4);
    assembly.add(gear);

    /* --- static scope ring behind everything --- */
    var ringPts = [];
    for (var s = 0; s <= 96; s++) {
        var ra = (s / 96) * Math.PI * 2;
        ringPts.push(new THREE.Vector3(Math.cos(ra) * 3.4, Math.sin(ra) * 3.4, 0));
    }
    var ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ringPts),
        new THREE.LineBasicMaterial({ color: DIM, transparent: true, opacity: 0.3 })
    );
    ring.position.z = -1.2;
    assembly.add(ring);

    scene.add(assembly);

    /* --- placement: right of the type on desktop, centered + faded on mobile --- */
    function place() {
        var mobile = window.innerWidth < 760;
        assembly.position.x = mobile ? 0 : 2.6;
        assembly.position.y = mobile ? 0.4 : -0.2;
        mount.style.opacity = mobile ? 0.3 : 0.85;
    }
    place();

    /* --- motion state --- */
    var spin = 0, spinVel = 0.006;         // idle rpm
    var lastScroll = window.scrollY;
    var tiltX = 0, tiltY = 0, curX = 0, curY = 0;

    window.addEventListener('mousemove', function (e) {
        tiltY = (e.clientX / window.innerWidth - 0.5) * 0.22;
        tiltX = (e.clientY / window.innerHeight - 0.5) * 0.16;
    }, { passive: true });

    function resize() {
        W = mount.clientWidth; H = mount.clientHeight;
        if (!W || !H) return;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        place();
    }
    window.addEventListener('resize', resize);

    /* The hero grows as fonts and the band image load. A ResizeObserver keeps
       the drawing buffer matched to the box instead of trusting first paint. */
    if (window.ResizeObserver) new ResizeObserver(resize).observe(mount);
    window.addEventListener('load', resize);

    /* --- pause the loop when the hero is off-screen --- */
    var running = true;
    new IntersectionObserver(function (entries) {
        running = entries[0].isIntersecting;
        if (running) requestAnimationFrame(loop);
    }, { threshold: 0 }).observe(mount);

    function loop() {
        if (!running) return;

        // scroll throttles the flywheel — like feathering a trigger
        var dy = window.scrollY - lastScroll;
        lastScroll = window.scrollY;
        spinVel += dy * 0.00012;
        spinVel = Math.max(0.003, Math.min(0.05, spinVel));
        spinVel += (0.006 - spinVel) * 0.02;   // decay back to idle
        spin += spinVel;

        flywheel.rotation.z = -spin;
        gear.rotation.z = spin * (2.1 / 0.85); // gear ratio — meshed, counter-rotating

        // lazy pointer tilt
        curX += (tiltX - curX) * 0.06;
        curY += (tiltY - curY) * 0.06;
        assembly.rotation.x = curX;
        assembly.rotation.y = curY;

        renderer.render(scene, camera);
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    } // end init

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
