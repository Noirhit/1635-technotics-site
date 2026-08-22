<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="icon" type="image/png" href="<?php echo esc_url( technotics_asset_url( 'assets/images/favicon.png' ) ); ?>">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<header class="nav">
	<a class="mark" href="<?php echo esc_url( home_url( '/' ) ); ?>">
		<?php if ( has_custom_logo() ) : ?>
			<?php echo wp_get_attachment_image( get_theme_mod( 'custom_logo' ), 'full', false, array( 'class' => 'custom-logo' ) ); ?>
		<?php else : ?>
			<img src="<?php echo esc_url( technotics_asset_url( 'assets/images/logo.png' ) ); ?>" alt="">
		<?php endif; ?>
		<span><span class="mark__num">1635</span><span class="mark__sub">Newtown Technotics</span></span>
	</a>
	<button class="nav__burger" aria-label="Menu" aria-expanded="false"><span></span><span></span></button>
	<nav class="nav__links" aria-label="Primary navigation">
		<?php
		wp_nav_menu( array(
			'theme_location' => 'primary',
			'container'      => false,
			'fallback_cb'    => 'technotics_fallback_menu',
			'items_wrap'     => '%3$s',
		) );
		?>
	</nav>
	<i class="nav__progress"></i>
</header>
