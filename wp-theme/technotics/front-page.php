<?php
get_header();
$robot_url    = technotics_page_url( 'robot' );
$about_url    = technotics_page_url( 'about' );
$blog_url     = technotics_page_url( 'blog' );
$sponsor_url  = technotics_page_url( 'sponsors' );
?>

<main>
<section class="hero">
  <canvas id="rig" aria-hidden="true"></canvas>
  <div class="hero__grid" aria-hidden="true"></div>
  <div class="hero__inner">
    <div class="hero__meta o">
      <span class="datum" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="note">FRC 1635 · EST. 2005</span>
      <span class="note">NEWTOWN HS · ELMHURST, QUEENS</span>
      <span class="note note--red">SEASON 2026 — REBUILT</span>
    </div>
    <h1 class="hero__title" data-hero-lines>
      <span class="line"><span>Six weeks.</span></span>
      <span class="line"><span>One crate.</span></span>
      <span class="line"><span><em>One robot.</em></span></span>
    </h1>
    <p class="hero__lede o">Every January FIRST hands us a rulebook and a box of parts. Six weeks later a 120-pound machine rolls off the shop floor at Newtown High School. This is the twenty-first winter we have done it.</p>
    <div class="hero__actions o">
      <a href="<?php echo esc_url( $robot_url ); ?>" class="btn" data-magnetic>Open the 2026 build <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6"/></svg></a>
      <a href="<?php echo esc_url( $about_url ); ?>" class="btn btn--line" data-magnetic>Meet the crew</a>
    </div>
    <div class="stats o">
      <div class="stat"><span class="stat__n" data-count="2005">0</span><span class="note">Rookie season</span></div>
      <div class="stat"><span class="stat__n" data-count="21">0</span><span class="note">Seasons run</span></div>
      <div class="stat"><span class="stat__n" data-count="25">0</span><span class="note">On the roster</span></div>
      <div class="stat"><span class="stat__n">6<span class="stat__u">wk</span></span><span class="note">Build window</span></div>
    </div>
  </div>
</section>

<div class="ticker" aria-hidden="true"><div class="ticker__track">
  <span>Rookie year 2005</span><span>◆</span><span>FRC Team 1635</span><span>◆</span><span>Newtown Technotics</span><span>◆</span><span>Elmhurst, Queens NY</span><span>◆</span><span>NYC FIRST · The Armory</span><span>◆</span><span>Season 2026 — Rebuilt</span><span>◆</span>
  <span>Rookie year 2005</span><span>◆</span><span>FRC Team 1635</span><span>◆</span><span>Newtown Technotics</span><span>◆</span><span>Elmhurst, Queens NY</span><span>◆</span><span>NYC FIRST · The Armory</span><span>◆</span><span>Season 2026 — Rebuilt</span><span>◆</span>
</div></div>

<section class="band"><div class="band__inner"><span class="note">[ Mission ]</span>Build robots. Build engineers. Teach a public high school in Queens to weld, wire, code and lead — against a deadline that does not move.</div></section>

<section class="bay bay--flush"><div class="shell">
  <div class="titleblock" data-reveal><span class="note note--red titleblock__tag">§ 01 — Who we are</span><h2>A robotics team that happens to be a public high school.</h2></div>
  <div class="split split--wide">
    <div class="prose" data-reveal>
      <p class="lede">Newtown High School sits in Elmhurst, a neighbourhood where the students collectively speak dozens of languages. Every winter a chunk of them spend their nights over a CAD model, a soldering iron and a half-built drivetrain.</p>
      <p>There is no tryout. Freshmen who have never held a drill end the season running a mill, flashing a RoboRIO, or standing at the field wall as drive team. The robot is the excuse; the engineers are the point.</p>
      <a href="<?php echo esc_url( $about_url ); ?>" class="btn btn--line mt-6" data-magnetic>The full roster <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6"/></svg></a>
    </div>
    <aside class="ticked" style="background:var(--graphite);border:1px solid var(--edge);padding:var(--s-5)" data-reveal data-fx="left"><span class="note note--red" style="display:block;margin-bottom:var(--s-4)">// Team card</span><dl class="sheet"><dt>Number</dt><dd>1635</dd><dt>Name</dt><dd>Newtown Technotics</dd><dt>Program</dt><dd>FIRST Robotics Comp.</dd><dt>School</dt><dd>Newtown High School</dd><dt>City</dt><dd>Elmhurst, Queens</dd><dt>Founded</dt><dd>2005 · Rookie</dd><dt>Home event</dt><dd>NYC Regional</dd><dt>Season</dt><dd>2026 — Rebuilt</dd></dl><span class="note" style="display:block;margin-top:var(--s-4)">FRC.TEAM.1635 ▮ NHS</span></aside>
  </div>
  <div class="photoband mt-7" data-wave>
    <figure class="frame"><div class="tech-placeholder"><span class="note">SET SHOP PHOTOS IN APPEARANCE → CUSTOMIZE</span></div><figcaption class="note">IN THE SHOP</figcaption></figure>
    <figure class="frame"><div class="tech-placeholder"><span class="note">SET BUILD PHOTOS IN APPEARANCE → CUSTOMIZE</span></div><figcaption class="note">BUILD SEASON</figcaption></figure>
    <figure class="frame"><?php echo wp_kses_post( technotics_image_or_placeholder( 'tech_about_image', '', 'Team photo' ) ); ?><figcaption class="note">THE CREW</figcaption></figure>
  </div>
</div></section>

<section class="bay bay--steel"><div class="shell">
  <div class="titleblock" data-reveal><span class="note note--red titleblock__tag">§ 02 — The machine</span><h2>Meet AJ.</h2><p>Custom six-wheel base, compliant-roller intake, two-stage elevator and a flywheel launcher. Drawn in CAD, cut on our own mill, tuned until the last hour before load-in.</p></div>
  <div class="split split--flip">
    <div class="prose" data-reveal><p class="lede">Every subsystem starts as plywood and zip-ties.</p><p>Week two of build season the shop fills with prototypes that mostly do not work. The two or three that survive get toleranced, machined and bolted to a frame.</p><a href="<?php echo esc_url( $robot_url ); ?>" class="btn mt-6" data-magnetic>Specs, CAD and the exploded view <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6"/></svg></a></div>
    <figure class="frame" style="aspect-ratio:4/3" data-reveal data-fx="scale"><?php echo wp_kses_post( technotics_image_or_placeholder( 'tech_robot_image', '', 'Team 1635 current robot' ) ); ?><figcaption class="note">FIG.01 — 2026 COMP BOT “AJ”</figcaption></figure>
  </div>
  <div class="specs mt-7" data-wave><div class="spec"><span class="note note--red">Drive</span><b>Tank · 6WD</b><small>Belt-in-tube, centre drop</small></div><div class="spec"><span class="note note--red">Motors</span><b>NEO brushless</b><small>Paired per side</small></div><div class="spec"><span class="note note--red">Launcher</span><b>Flywheel</b><small>Twin wheel, tuned hood</small></div><div class="spec"><span class="note note--red">Code</span><b>Java · WPILib</b><small>Auto routines + vision</small></div></div>
</div></section>

<section class="bay"><div class="shell"><div class="titleblock" data-reveal><span class="note note--red titleblock__tag">§ 03 — Logbook</span><h2>What the season actually looked like.</h2><p>Written from the shop floor during build season, and from the stands during competition.</p></div>
<div class="cards" id="latest">
<?php
$latest = new WP_Query( array( 'post_type' => 'post', 'posts_per_page' => 3, 'post_status' => 'publish' ) );
if ( $latest->have_posts() ) :
	while ( $latest->have_posts() ) : $latest->the_post();
		$image = get_the_post_thumbnail_url( get_the_ID(), 'medium_large' );
		?>
		<a class="card" href="<?php the_permalink(); ?>" data-reveal data-fx="scale"><div class="card__img"><?php if ( $image ) : ?><img src="<?php echo esc_url( $image ); ?>" alt="" loading="lazy"><?php else : ?><div class="tech-placeholder"><span class="note">ADD FEATURED IMAGE</span></div><?php endif; ?></div><div class="card__body"><span class="note note--red"><?php echo esc_html( get_the_date( 'M j, Y' ) ); ?></span><h3><?php the_title(); ?></h3><p><?php echo esc_html( wp_trim_words( get_the_excerpt(), 24 ) ); ?></p><span class="card__more">Read the entry</span></div></a>
		<?php
	endwhile;
	wp_reset_postdata();
else :
	?><div class="coming ticked"><span class="note note--red">// Logbook empty</span><h3>Coming soon.</h3><p>Create the first post from WordPress → Posts → Add New.</p></div><?php
endif;
?>
</div><div class="mt-7" style="text-align:center" data-reveal><a href="<?php echo esc_url( $blog_url ); ?>" class="btn btn--line" data-magnetic>Every entry <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6"/></svg></a></div>
</div></section>

<section class="bay bay--flush" style="padding-block:clamp(1.5rem,3vw,2.5rem)"><div class="shell"><figure class="frame" style="aspect-ratio:16/7" data-reveal data-fx="clip"><?php echo wp_kses_post( technotics_image_or_placeholder( 'tech_armory_image', '', 'Team at the NYC Regional' ) ); ?><figcaption class="note">NYC REGIONAL · THE ARMORY</figcaption></figure></div></section>

<section class="bay bay--steel"><div class="shell"><div class="titleblock" data-reveal><span class="note note--red titleblock__tag">§ 04 — Who pays for it</span><h2>A season costs more than a school budget covers.</h2><p>Registration, raw stock, machining, replacement motors and a bus to the Armory. These partners close the gap.</p></div><div class="split"><figure class="frame" style="aspect-ratio:16/10" data-reveal data-fx="scale"><img src="<?php echo esc_url( technotics_asset_url( 'assets/images/arsenal-sponsor.jpg' ) ); ?>" alt="Arsenal New York, title sponsor"><figcaption class="note">TITLE SPONSOR — ARSENAL · NEW YORK</figcaption></figure><div class="prose" data-reveal><p class="lede">Their logo goes on the bumper. Their name goes in every match.</p><p>Sponsorship at any level goes straight into parts, registration and travel. We will send the packet the same day you ask for it.</p><a href="<?php echo esc_url( $sponsor_url ); ?>" class="btn btn--line mt-6" data-magnetic>See the partners</a></div></div></div></section>

<section class="bay"><div class="shell"><div class="titleblock" data-reveal><span class="note note--red titleblock__tag">§ 05 — On the record</span><h2>Twenty-one winters, one Queens public school.</h2></div><div class="units" data-wave><article class="unit"><span class="note note--red">2005</span><h3>Rookie season</h3><p>Team 1635 fields its first robot — the start of an unbroken run out of Newtown High School.</p></article><article class="unit"><span class="note note--red">'05 → '26</span><h3>21 straight seasons</h3><p>Twenty-one consecutive years of designing, building and competing every single winter.</p></article><article class="unit"><span class="note note--red">Home</span><h3>NYC Regional</h3><p>Our home event runs at the Fort Washington Avenue Armory under the NYC FIRST banner.</p></article><article class="unit"><span class="note note--red">Roster</span><h3>25 students</h3><p>Mechanical, electrical, programming, design and business — plus faculty and engineer mentors.</p></article></div></div></section>
</main>
<?php get_footer(); ?>
