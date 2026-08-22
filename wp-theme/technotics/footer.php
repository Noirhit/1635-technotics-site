<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>

<footer class="foot">
	<div class="foot__grid">
		<div>
			<div class="foot__num">1635</div>
			<div class="note note--chalk mt-6" style="letter-spacing:.1em">NEWTOWN TECHNOTICS</div>
			<p class="note" style="margin-top:6px">FRC · EST. 2005 · ELMHURST, QUEENS, NY</p>
		</div>
		<div class="foot__cols">
			<div><h4>Site</h4><ul>
				<li><a href="<?php echo esc_url( technotics_page_url( 'about' ) ); ?>">The team</a></li>
				<li><a href="<?php echo esc_url( technotics_page_url( 'robot' ) ); ?>">The robot</a></li>
				<li><a href="<?php echo esc_url( technotics_page_url( 'blog' ) ); ?>">Logbook</a></li>
				<li><a href="<?php echo esc_url( technotics_page_url( 'sponsors' ) ); ?>">Backers</a></li>
			</ul></div>
			<div><h4>Program</h4><ul>
				<li><a href="https://www.firstinspires.org/" target="_blank" rel="noopener">What is FRC ↗</a></li>
				<li><a href="https://www.thebluealliance.com/team/1635" target="_blank" rel="noopener">Blue Alliance ↗</a></li>
				<li><a href="https://frc-events.firstinspires.org/team/1635" target="_blank" rel="noopener">FIRST · 1635 ↗</a></li>
			</ul></div>
			<div><h4>Reach us</h4><ul>
				<li><a href="<?php echo esc_url( technotics_page_url( 'contact' ) ); ?>">Contact us</a></li>
				<li><a href="<?php echo esc_url( technotics_page_url( 'sponsors' ) ); ?>">Sponsor a season</a></li>
				<li><a href="#">Instagram ↗</a></li>
				<li><a href="#">YouTube ↗</a></li>
			</ul></div>
		</div>
	</div>
	<div class="foot__bottom">
		<span class="note">© <?php echo esc_html( date_i18n( 'Y' ) ); ?> Newtown Technotics · FRC 1635</span>
		<span class="note">Newtown High School · Elmhurst, Queens</span>
		<span class="note live">Season 2026 — Rebuilt</span>
	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
