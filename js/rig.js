/* ==========================================================================
   RIG — renders the team's actual 2026 KitBot.

   models/kitbot.glb is built by tools/build_kitbot.py from the Onshape export
   (621 per-part glTF, 941 MB → 0.5 MB, 23k tris, 8 named sub-assemblies).
   The CAD is Z-up; we rotate to Y-up on load.

   Mounts
     #rig       hero      · slow orbit, pointer parallax, offset right of the type
     #exploded  robot pg  · scroll scrubs the sub-assemblies apart

   Rules: DPR capped at 2 · paused off-screen · static under reduced-motion
   ========================================================================== */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MODEL = 'models/kitbot.glb';

  /* Direction each sub-assembly flies when the view explodes.
     Y is up after the Z-up→Y-up correction. */
  var BLOW = {
    bumpers:  [0, -0.55, 0],
    chassis:  [0, -0.30, 0],
    deck:     [0, -0.85, 0],
    drive:    [0, -1.15, 0],
    power:    [-1.25, 0.10, 0],
    hopper:   [0, 0.45, -0.95],
    intake:   [0, 0.05, 1.30],
    launcher: [0, 1.15, 0.25]
  };

  /* ---------- scene plumbing -------------------------------------------- */
  function makeScene(canvas, opts) {
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(opts.fov || 34, 1, 0.05, 100);

    scene.add(new THREE.AmbientLight(0xffffff, 0.62));

    var key = new THREE.DirectionalLight(0xfff6ee, 1.45);
    key.position.set(4, 7, 5);
    scene.add(key);

    var rim = new THREE.DirectionalLight(0xC8102E, 1.9);
    rim.position.set(-5, 1.5, -4);
    scene.add(rim);

    var fill = new THREE.DirectionalLight(0x9fb4c4, 0.75);
    fill.position.set(-2, 3, 6);
    scene.add(fill);

    // pivot carries the model so we can spin it without touching part offsets
    var pivot = new THREE.Group();
    scene.add(pivot);

    function size() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    }
    size();
    window.addEventListener('resize', size, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(size).observe(canvas);

    return { renderer: renderer, scene: scene, camera: camera, pivot: pivot, size: size };
  }

  /* ---------- load + normalise the model -------------------------------- */
  function loadRobot(onReady, onFail) {
    if (!THREE.GLTFLoader) { onFail && onFail(); return; }
    new THREE.GLTFLoader().load(MODEL, function (gltf) {
      var root = new THREE.Group();
      var src = gltf.scene;

      // CAD is Z-up → make Y-up
      src.rotation.x = -Math.PI / 2;
      src.updateMatrixWorld(true);

      // centre on the footprint, sit the wheels on y = 0
      var box = new THREE.Box3().setFromObject(src);
      var ctr = box.getCenter(new THREE.Vector3());
      var sz = box.getSize(new THREE.Vector3());
      var scale = 2.6 / Math.max(sz.x, sz.y, sz.z);

      src.position.set(-ctr.x, -box.min.y, -ctr.z);

      var holder = new THREE.Group();
      holder.add(src);
      holder.scale.setScalar(scale);
      holder.position.y = -(sz.y * scale) / 2;
      root.add(holder);

      // collect sub-assemblies and remember their home position
      var groups = {};
      src.traverse(function (o) {
        if (!o.isMesh) return;
        var name = (o.name || (o.parent && o.parent.name) || '').toLowerCase();
        var key = Object.keys(BLOW).filter(function (k) { return name.indexOf(k) === 0; })[0];
        if (!key) key = 'chassis';
        o.userData.group = key;
        o.userData.home = o.position.clone();
        (groups[key] || (groups[key] = [])).push(o);

        var m = o.material;
        if (m) {
          m.metalness = 0.55;
          m.roughness = 0.48;
          m.vertexColors = true;
          m.needsUpdate = true;
        }
        // hairline edges keep the "drawing" read
        if (o.geometry && o.geometry.attributes.position.count < 9000) {
          var eg = new THREE.EdgesGeometry(o.geometry, 34);
          if (eg.attributes.position.count) {
            var lines = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({
              color: 0x8a9199, transparent: true, opacity: 0.30
            }));
            lines.position.copy(o.position);
            lines.rotation.copy(o.rotation);
            lines.scale.copy(o.scale);
            o.parent.add(lines);
            lines.userData.group = key;
            lines.userData.home = lines.position.clone();
            groups[key].push(lines);
          }
        }
      });

      onReady(root, groups);
    }, undefined, function () { onFail && onFail(); });
  }

  function explode(groups, t) {
    var e = t * t * (3 - 2 * t);
    Object.keys(groups).forEach(function (k) {
      var v = BLOW[k] || [0, 0, 0];
      groups[k].forEach(function (o) {
        var h = o.userData.home;
        if (!h) return;
        o.position.set(h.x + v[0] * e, h.y + v[1] * e, h.z + v[2] * e);
      });
    });
  }

  /* ---------- MOUNT 1: hero --------------------------------------------- */
  var heroCanvas = document.getElementById('rig');
  if (heroCanvas) {
    var H = makeScene(heroCanvas, { fov: 32 });
    // Sit the robot in the right-hand third so it never collides with the type.
    // On narrow screens it recentres and drops behind the copy.
    function frameHero() {
      var wide = window.innerWidth > 900;
      H.camera.position.set(wide ? -2.9 : 0, 1.5, 6.4);
      H.camera.lookAt(wide ? 0.55 : 0, 0.05, 0);
    }
    frameHero();
    window.addEventListener('resize', frameHero, { passive: true });

    var px = 0, py = 0, tx = 0, ty = 0, live = true, spin = 0, G = null;

    if (!REDUCED) {
      window.addEventListener('pointermove', function (e) {
        tx = e.clientX / window.innerWidth - 0.5;
        ty = e.clientY / window.innerHeight - 0.5;
      }, { passive: true });
    }
    new IntersectionObserver(function (es) { live = es[0].isIntersecting; },
      { threshold: 0.01 }).observe(heroCanvas);

    loadRobot(function (root, groups) {
      G = groups;
      H.pivot.add(root);
      H.size();
      heroCanvas.classList.add('is-live');
    }, function () {
      heroCanvas.classList.add('is-dead');   // CSS falls back to the grid alone
    });

    (function loop() {
      requestAnimationFrame(loop);
      if (!live) return;
      px += (tx - px) * 0.04;
      py += (ty - py) * 0.04;
      if (!REDUCED) {
        spin += 0.0026;
        H.pivot.rotation.y = spin + px * 0.5;
        H.pivot.rotation.x = -py * 0.13;
        H.pivot.position.y = Math.sin(spin * 2.2) * 0.05;
      } else {
        H.pivot.rotation.y = 0.7;
      }
      H.renderer.render(H.scene, H.camera);
    })();
  }

  /* ---------- MOUNT 2: exploded schematic -------------------------------- */
  var exCanvas = document.getElementById('exploded');
  if (exCanvas) {
    var X = makeScene(exCanvas, { fov: 36 });
    X.camera.position.set(-3.4, 2.0, 6.6);
    X.camera.lookAt(0, 0.1, 0);

    var xLive = true, prog = 0, target = 0, tick = 0, XG = null;
    new IntersectionObserver(function (es) { xLive = es[0].isIntersecting; },
      { threshold: 0.01 }).observe(exCanvas);

    var stage = exCanvas.closest('.stage') || exCanvas.parentElement;
    var readouts = document.querySelectorAll('[data-stage-step]');
    var pips = document.querySelectorAll('.stage__scrub i');

    function onScroll() {
      var r = stage.getBoundingClientRect();
      var span = r.height - window.innerHeight;
      if (span <= 0) { target = 0; return; }
      target = Math.min(1, Math.max(0, -r.top / span));
      if (readouts.length) {
        var idx = Math.min(readouts.length - 1, Math.floor(target * readouts.length * 0.999));
        readouts.forEach(function (el, i) { el.classList.toggle('is-in', i === idx); });
        pips.forEach(function (el, i) { el.classList.toggle('is-on', i <= idx); });
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    loadRobot(function (root, groups) {
      XG = groups;
      X.pivot.add(root);
      X.size();
      onScroll();
      exCanvas.classList.add('is-live');
    }, function () { exCanvas.classList.add('is-dead'); });

    (function loop() {
      requestAnimationFrame(loop);
      if (!xLive) return;
      prog += (target - prog) * 0.08;
      if (XG) explode(XG, prog);
      tick += 0.004;
      X.pivot.rotation.y = -0.55 + prog * 1.35 + (REDUCED ? 0 : Math.sin(tick) * 0.06);
      X.pivot.rotation.x = prog * 0.16;
      X.renderer.render(X.scene, X.camera);
    })();
  }
})();
