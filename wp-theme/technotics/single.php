<?php
get_header();
while ( have_posts() ) : the_post();
	$image = get_the_post_thumbnail_url( get_the_ID(), 'full' );
?>
<main>
<article class="bay bay--flush" style="padding-top:clamp(4rem,9vw,7rem)"><div class="shell shell--narrow">
  <div class="hero__meta o" style="margin-bottom:var(--s-5)"><span class="datum" aria-hidden="true"><i></i><i></i><i></i></span><span class="note note--red">LOGBOOK ENTRY</span><span class="note"><?php echo esc_html( get_the_date( 'M j, Y' ) ); ?></span></div>
  <h1 class="o" style="font-size:var(--t-xxl)"><?php the_title(); ?></h1>
  <p class="note o" style="margin-top:var(--s-4)">By <?php echo esc_html( get_the_author() ); ?></p>
  <?php if ( $image ) : ?><figure class="frame mt-7" data-reveal data-fx="scale"><img src="<?php echo esc_url( $image ); ?>" alt="" loading="eager"></figure><?php endif; ?>
  <div class="prose post-content mt-7" data-reveal><?php the_content(); ?></div>
  <div class="mt-7"><a class="btn btn--line" href="<?php echo esc_url( technotics_page_url( 'blog' ) ); ?>">← Back to the logbook</a></div>
</div></article>
</main>
<?php endwhile; get_footer(); ?>
