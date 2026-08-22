<?php
get_header();
while ( have_posts() ) : the_post();
?>
<main><section class="bay bay--flush" style="padding-top:clamp(4rem,9vw,7rem)"><div class="shell shell--narrow"><div class="hero__meta o" style="margin-bottom:var(--s-5)"><span class="datum" aria-hidden="true"><i></i><i></i><i></i></span><span class="note note--red">PAGE</span></div><h1 class="o" style="font-size:var(--t-xxl)"><?php the_title(); ?></h1><div class="prose post-content mt-7" data-reveal><?php the_content(); ?></div></div></section></main>
<?php endwhile; get_footer(); ?>
