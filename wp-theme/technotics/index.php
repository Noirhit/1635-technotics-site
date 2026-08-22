<?php
get_header();
if ( have_posts() ) :
	while ( have_posts() ) :
		the_post();
		get_template_part( 'content', get_post_type() );
	endwhile;
else :
	?><main><section class="bay bay--flush"><div class="shell"><h1>Nothing here yet.</h1></div></section></main><?php
endif;
get_footer();
