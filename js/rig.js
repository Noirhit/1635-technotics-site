/* ==========================================================================
   RIG — procedural FRC robot assembly in WebGL
   Two mounts:
     #rig       hero      · slow orbit + pointer parallax
     #exploded  robot pg  · scroll-scrubbed exploded schematic
   Rules: DPR capped at 2 · paused off-screen · static under reduced-motion
   ========================================================================== */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var C = {
    red:   0xE4002B,
    chalk: 0xF1EFEA,
    alum:  0x838A8F,
    edge:  0x454E53,
    dark:  0x16191B
  };

  /* ---------- part factory --------------------------------------------- */

  // solid body + drawn edges = "machined part in a drawing"
  function part(geo, color, edgeColor, opacity) {
    var g = new THREE.Group();
    var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.65,
      roughness: 0.45,
      transparent: opacity !== undefined,
      opacity: opacity === undefined ? 1 : opacity
    }));
    var wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 22),
      new THREE.LineBasicMaterial({
        color: edgeColor === undefined ? C.edge : edgeColor,
        transparent: true,
        opacity: 0.85
      })
    );
    g.add(mesh, wire);
    return g;
  }

  function place(obj, x, y, z) { obj.position.set(x, y, z); return obj; }

  // every sub-assembly carries the vector it flies out along when exploded
  function tag(obj, vx, vy, vz) {
    obj.userData.blow = new THREE.Vector3(vx, vy, vz);
    obj.userData.home = obj.position.clone();
    return obj;
  }

  /* ---------- the robot ------------------------------------------------- */

  function buildRobot() {
    var bot = new THREE.Group();

    /* --- CHASSIS: welded box frame ----------------------------------- */
    var chassis = new THREE.Group();
    var railX = new THREE.BoxGeometry(4.4, 0.22, 0.22);
    var railZ = new THREE.BoxGeometry(0.22, 0.22, 3.0);
    [[0, 0, 1.4], [0, 0, -1.4]].forEach(function (p) {
      chassis.add(place(part(railX, C.dark, C.alum), p[0], p[1], p[2]));
    });
    [[2.1, 0, 0], [-2.1, 0, 0]].forEach(function (p) {
      chassis.add(place(part(railZ, C.dark, C.alum), p[0], p[1], p[2]));
    });
    // belly pan
    chassis.add(place(part(new THREE.BoxGeometry(4.0, 0.08, 2.6), C.dark, C.edge, 0.55), 0, -0.1, 0));
    // bumper bars — the only red on the chassis
    chassis.add(place(part(new THREE.BoxGeometry(4.7, 0.42, 0.18), C.red, C.red), 0, 0.32, 1.58));
    chassis.add(place(part(new THREE.BoxGeometry(4.7, 0.42, 0.18), C.red, C.red), 0, 0.32, -1.58));
    tag(chassis, 0, -1.6, 0);
    bot.add(chassis);

    /* --- DRIVE: six wheels + gearboxes -------------------------------- */
    var drive = new THREE.Group();
    var wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.30, 16);
    var hubGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.34, 10);
    [-1.75, 0, 1.75].forEach(function (x) {
      [1.55, -1.55].forEach(function (z) {
        var w = part(wheelGeo, 0x101314, C.chalk);
        w.rotation.x = Math.PI / 2;
        w.rotation.z = Math.PI / 2;
        place(w, x, -0.1, z);
        var h = part(hubGeo, C.alum, C.chalk);
        h.rotation.x = Math.PI / 2;
        h.rotation.z = Math.PI / 2;
        place(h, x, -0.1, z);
        drive.add(w, h);
      });
    });
    tag(drive, 0, -0.6, 2.4);
    drive.userData.spin = true;
    bot.add(drive);

    /* --- MOTORS: NEO cans on the gearbox plate ------------------------ */
    var motors = new THREE.Group();
    var canGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.62, 12);
    [[-0.95, 1.15], [-0.95, -1.15], [0.95, 1.15], [0.95, -1.15]].forEach(function (p) {
      var m = part(canGeo, C.alum, C.chalk);
      m.rotation.z = Math.PI / 2;
      place(m, p[0], 0.18, p[1]);
      motors.add(m);
    });
    tag(motors, 0, 0, -2.6);
    bot.add(motors);

    /* --- ELEVATOR: two-stage rails ------------------------------------ */
    var elevator = new THREE.Group();
    var stageGeo = new THREE.BoxGeometry(0.16, 3.6, 0.16);
    [[0.72, -0.9], [-0.72, -0.9]].forEach(function (p) {
      elevator.add(place(part(stageGeo, C.dark, C.alum), p[0], 1.9, p[1]));
    });
    // inner stage — brighter, reads as the moving part
    var inner = new THREE.BoxGeometry(0.11, 2.6, 0.11);
    [[0.52, -0.9], [-0.52, -0.9]].forEach(function (p) {
      elevator.add(place(part(inner, C.alum, C.chalk), p[0], 2.6, p[1]));
    });
    // carriage
    elevator.add(place(part(new THREE.BoxGeometry(1.7, 0.3, 0.42), C.dark, C.red), 0, 2.2, -0.9));
    tag(elevator, -2.8, 1.2, 0);
    elevator.userData.lift = true;
    bot.add(elevator);

    /* --- ARM: shoulder + boom ----------------------------------------- */
    var arm = new THREE.Group();
    var pivot = new THREE.Group();
    pivot.add(place(part(new THREE.CylinderGeometry(0.26, 0.26, 0.5, 14), C.red, C.chalk), 0, 0, 0));
    var boom = part(new THREE.BoxGeometry(2.5, 0.22, 0.3), C.dark, C.alum);
    place(boom, 1.25, 0, 0);
    var gripper = part(new THREE.BoxGeometry(0.34, 0.6, 0.5), C.alum, C.chalk);
    place(gripper, 2.5, 0, 0);
    pivot.add(boom, gripper);
    pivot.rotation.z = -0.42;
    pivot.position.set(0, 2.35, -0.55);
    arm.add(pivot);
    arm.userData.pivot = pivot;
    tag(arm, 2.9, 1.0, 0);
    arm.userData.swing = true;
    bot.add(arm);

    /* --- TURRET + LAUNCHER: yaw ring, flywheels, barrel ---------------- */
    var turret = new THREE.Group();
    var yaw = new THREE.Group();
    // yaw bearing ring
    yaw.add(place(part(new THREE.TorusGeometry(0.62, 0.075, 8, 28), C.alum, C.chalk), 0, 0, 0));
    // hood
    yaw.add(place(part(new THREE.BoxGeometry(1.05, 0.5, 1.35), C.dark, C.alum), 0, 0.42, 0.2));
    // barrel
    var barrel = part(new THREE.CylinderGeometry(0.2, 0.28, 1.25, 12), C.dark, C.red);
    barrel.rotation.x = Math.PI / 2.6;
    place(barrel, 0, 0.72, 0.95);
    yaw.add(barrel);
    // flywheels — the fast-spinning bit
    var fly = new THREE.Group();
    [0.42, -0.42].forEach(function (x) {
      var f = part(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 20), C.red, C.chalk);
      f.rotation.z = Math.PI / 2;
      place(f, x, 0.42, 0.32);
      fly.add(f);
    });
    yaw.add(fly);
    yaw.rotation.x = Math.PI / 2;
    yaw.position.set(0, 1.25, 0.55);
    turret.add(yaw);
    turret.userData.yaw = yaw;
    turret.userData.fly = fly;
    tag(turret, 0, 3.0, 0);
    bot.add(turret);

    /* --- INTAKE: roller stack out front ------------------------------- */
    var intake = new THREE.Group();
    var rollerGeo = new THREE.CylinderGeometry(0.26, 0.26, 2.4, 12);
    [0.15, 0.62].forEach(function (y, i) {
      var r = part(rollerGeo, i ? C.alum : C.red, C.chalk);
      r.rotation.z = Math.PI / 2;
      place(r, 0, y, 2.15 + i * 0.1);
      intake.add(r);
    });
    // side plates
    [1.35, -1.35].forEach(function (x) {
      intake.add(place(part(new THREE.BoxGeometry(0.09, 1.0, 0.85), C.dark, C.alum), x, 0.4, 2.2));
    });
    tag(intake, 0, 0, 3.0);
    intake.userData.roll = true;
    bot.add(intake);

    bot.userData.groups = { chassis: chassis, drive: drive, motors: motors,
                            elevator: elevator, arm: arm, turret: turret, intake: intake };
    return bot;
  }

  /* ---------- scene plumbing -------------------------------------------- */

  function makeScene(canvas, opts) {
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(opts.cam[0], opts.cam[1], opts.cam[2]);
    camera.lookAt(0, opts.look || 1.1, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    var key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(5, 8, 6);
    scene.add(key);

    var rim = new THREE.DirectionalLight(C.red, 2.2);
    rim.position.set(-6, 2, -5);
    scene.add(rim);

    var fill = new THREE.PointLight(0x9fb4c4, 1.2, 26);
    fill.position.set(-3, 4, 7);
    scene.add(fill);

    var bot = buildRobot();
    bot.scale.setScalar(opts.scale || 1);
    scene.add(bot);

    function size() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    }
    size();
    window.addEventListener('resize', size, { passive: true });
    // layout settles late (fonts, sticky, images) — re-measure when it does
    if (window.ResizeObserver) new ResizeObserver(size).observe(canvas);

    return { renderer: renderer, scene: scene, camera: camera, bot: bot, size: size };
  }

  function explode(bot, t) {
    // t 0 → assembled, 1 → fully apart
    var e = t * t * (3 - 2 * t); // smoothstep
    Object.keys(bot.userData.groups).forEach(function (k) {
      var g = bot.userData.groups[k];
      var home = g.userData.home, blow = g.userData.blow;
      if (!home || !blow) return;
      g.position.set(
        home.x + blow.x * e,
        home.y + blow.y * e,
        home.z + blow.z * e
      );
    });
  }

  /* ---------- MOUNT 1: hero rig ----------------------------------------- */

  var heroCanvas = document.getElementById('rig');
  if (heroCanvas) {
    var H = makeScene(heroCanvas, { cam: [7.5, 4.4, 9.5], look: 1.2, scale: 1 });
    var px = 0, py = 0, tx = 0, ty = 0, running = true, spin = 0;

    if (!REDUCED) {
      window.addEventListener('pointermove', function (e) {
        tx = (e.clientX / window.innerWidth - 0.5);
        ty = (e.clientY / window.innerHeight - 0.5);
      }, { passive: true });
    }

    var io = new IntersectionObserver(function (es) {
      running = es[0].isIntersecting;
    }, { threshold: 0.01 });
    io.observe(heroCanvas);

    (function loop() {
      requestAnimationFrame(loop);
      if (!running) return;

      px += (tx - px) * 0.045;
      py += (ty - py) * 0.045;

      if (!REDUCED) {
        spin += 0.0022;
        H.bot.rotation.y = spin + px * 0.55;
        H.bot.rotation.x = -py * 0.16;
        H.bot.position.y = Math.sin(spin * 2.4) * 0.09;

        var G = H.bot.userData.groups;
        G.drive.children.forEach(function (w, i) { w.rotation.y += 0.03 * (i % 2 ? 1 : 1); });
        G.turret.userData.fly.children.forEach(function (f) { f.rotation.y += 0.34; });
        G.turret.userData.yaw.rotation.z = Math.sin(spin * 1.6) * 0.5;
        G.intake.children.forEach(function (r, i) { if (i < 2) r.rotation.y += 0.11; });
        G.arm.userData.pivot.rotation.z = -0.42 + Math.sin(spin * 1.9) * 0.30;
        G.elevator.position.y = Math.sin(spin * 2.1) * 0.22;
      } else {
        H.bot.rotation.y = 0.5;
      }

      H.renderer.render(H.scene, H.camera);
    })();

    function wake() { H.size(); heroCanvas.classList.add('is-live'); }
    requestAnimationFrame(wake);
    setTimeout(wake, 1200);
  }

  /* ---------- MOUNT 2: exploded schematic (scroll-scrubbed) ------------- */

  var exCanvas = document.getElementById('exploded');
  if (exCanvas) {
    var X = makeScene(exCanvas, { cam: [8.5, 4.0, 10.5], look: 1.3, scale: 1 });
    var live = true, prog = 0, target = 0, tick = 0;

    var xio = new IntersectionObserver(function (es) {
      live = es[0].isIntersecting;
    }, { threshold: 0.01 });
    xio.observe(exCanvas);

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
    onScroll();

    (function loop() {
      requestAnimationFrame(loop);
      if (!live) return;

      prog += (target - prog) * 0.08;
      explode(X.bot, prog);

      tick += 0.004;
      X.bot.rotation.y = -0.5 + prog * 1.5 + (REDUCED ? 0 : Math.sin(tick) * 0.08);
      X.bot.rotation.x = prog * 0.18;

      if (!REDUCED) {
        X.bot.userData.groups.turret.userData.fly.children.forEach(function (f) { f.rotation.y += 0.2; });
      }

      X.renderer.render(X.scene, X.camera);
    })();

    requestAnimationFrame(function () { X.size(); });
  }
})();
