<?php
get_header();
?>
<main>
<section class="bay bay--flush" style="padding-top:clamp(4rem,9vw,7rem)"><div class="shell"><div class="hero__meta o" style="margin-bottom:var(--s-5)"><span class="datum" aria-hidden="true"><i></i><i></i><i></i></span><span class="note">Sheet 04 of 05</span><span class="note note--red">The logbook</span></div><h1 class="o" style="font-size:var(--t-xxl);max-width:16ch">Shop notes.<br>Field notes.<br><em style="font-style:normal;color:var(--red)">The real season.</em></h1><p class="o" style="max-width:56ch;margin-top:var(--s-5);font-size:var(--t-md);color:var(--chalk-2)">Updates from build season, competitions, outreach and the people who keep Team 1635 moving.</p></div></section>
<section class="bay"><div class="shell"><div class="titleblock" data-reveal><span class="note note--red titleblock__tag">§ 01 — All entries</span><h2>Latest from the shop and the field.</h2></div><div class="cards" id="feed">
<?php if ( have_posts() ) : while ( have_posts() ) : the_post(); $image = get_the_post_thumbnail_url( get_the_ID(), 'medium_large' ); ?>
<article class="card" data-reveal data-fx="scale"><a href="<?php the_permalink(); ?>"><div class="card__img"><?php if ( $image ) : ?><img src="<?php echo esc_url( $image ); ?>" alt="" loading="lazy"><?php else : ?><div class="tech-placeholder"><span class="note">ADD FEATURED IMAGE</span></div><?php endif; ?></div><div class="card__body"><span class="note note--red"><?php echo esc_html( get_the_date( 'M j, Y' ) ); ?> · <?php echo esc_html( get_the_author() ); ?></span><h3><?php the_title(); ?></h3><p><?php echo esc_html( wp_trim_words( get_the_excerpt(), 28 ) ); ?></p><span class="card__more">Read the entry</span></div></a></article>
<?php endwhile; else : ?><div class="coming ticked"><span class="note note--red">// Logbook empty</span><h3>No entries yet.</h3><p>Publish the first update from WordPress → Posts → Add New.</p></div><?php endif; ?>
</div><?php the_posts_pagination( array( 'mid_size' => 1, 'prev_text' => '← Newer', 'next_text' => 'Older →' ) ); ?></div></section>
</main>
<?php get_footer(); ?>
