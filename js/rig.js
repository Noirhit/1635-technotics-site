/* ==========================================================================
   RIG — renders the team's actual 2026 KitBot.

   models/kitbot.glb is built by tools/build_kitbot.py from the Onshape export
   (621 per-part glTF, 941 MB → 3.6 MB, 157k tris, 12 named sub-assemblies).
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
    launcher: [0, 1.15, 0.25],
    frame:    [0, 0.50, -0.55]   /* hopper brace churros ride with the hopper */
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

    /* Neutral CAD-studio lighting, like an Onshape viewport. The old red rim
       light (1.9 intensity) tinted the whole model pink — greys read rose,
       gold read salmon. Brand colour belongs to the page, not the render. */
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));

    var key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(4, 8, 6);
    scene.add(key);

    var fill = new THREE.DirectionalLight(0xdfe4e8, 0.55);
    fill.position.set(-5, 3, 4);
    scene.add(fill);

    var back = new THREE.DirectionalLight(0xb9c2c9, 0.45);
    back.position.set(-3, 4, -6);
    scene.add(back);

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
          // matte, like a CAD viewport — high metalness under a dark page
          // background is what made surfaces go muddy and dark
          m.metalness = 0.12;
          m.roughness = 0.68;
          m.vertexColors = true;
          m.needsUpdate = true;
        }
        // hairline edges keep the "drawing" read
        if (o.geometry && o.geometry.attributes.position.count < 2600) {
          var eg = new THREE.EdgesGeometry(o.geometry, 48);
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

    /* The robot is parked at a fixed FRACTION of the viewport width (centre
       ~80%), not a fixed world offset — a world offset drifts with aspect
       ratio and slides off-screen on narrower desktops. The horizontal
       placement is derived from the camera's half-fov each resize.
       Belt-and-braces: CSS masks the canvas out under the copy, so even the
       robot's widest diagonal sweep can never visually touch the text. */
    // transform order matters: shift (position) wraps spinner (rotation),
    // otherwise the offset robot orbits the origin instead of turning in place.
    var shift = new THREE.Group();      // where on screen
    var spinner = new THREE.Group();    // rotation only
    shift.add(spinner);
    H.pivot.add(shift);

    var CAM_D = 7.4, FOV_HALF = 16 * Math.PI / 180;

    function frameHero() {
      var wide = window.innerWidth > 900;
      H.camera.position.set(0, 1.35, wide ? CAM_D : 7.8);
      H.camera.lookAt(0, 0.05, 0);
      if (wide) {
        var r = heroCanvas.getBoundingClientRect();
        var aspect = (r.width || 1) / (r.height || 1);
        var halfX = Math.atan(Math.tan(FOV_HALF) * aspect);
        var angC = (0.80 - 0.5) * 2 * halfX;      // centre at 80% of width
        shift.position.x = Math.tan(angC) * CAM_D;
        shift.scale.setScalar(0.8);
      } else {
        shift.position.x = 0;
        shift.scale.setScalar(0.78);
      }
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
      spinner.add(root);
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
        spinner.rotation.y = spin + px * 0.5;
        spinner.rotation.x = -py * 0.13;
        spinner.position.y = Math.sin(spin * 2.2) * 0.05;
      } else {
        spinner.rotation.y = 0.7;
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
