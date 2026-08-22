<?php
/**
 * 1635 Technotics theme functions.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function technotics_setup() {
	load_theme_textdomain( 'technotics', get_template_directory() . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'custom-logo', array(
		'height'      => 120,
		'width'       => 120,
		'flex-height' => true,
		'flex-width'  => true,
	) );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ) );

	register_nav_menus( array(
		'primary' => __( 'Primary navigation', 'technotics' ),
	) );
}
add_action( 'after_setup_theme', 'technotics_setup' );

function technotics_asset_url( $path ) {
	return trailingslashit( get_theme_file_uri() ) . ltrim( $path, '/' );
}

function technotics_page_url( $slug ) {
	$page = get_page_by_path( $slug );
	return $page ? get_permalink( $page ) : home_url( '/' . trim( $slug, '/' ) . '/' );
}

function technotics_fallback_menu( $args = array() ) {
	$items = array(
		'Home'       => home_url( '/' ),
		'The Team'   => technotics_page_url( 'about' ),
		'The Robot'  => technotics_page_url( 'robot' ),
		'Logbook'    => technotics_page_url( 'blog' ),
		'Backers'    => technotics_page_url( 'sponsors' ),
		'Contact us' => technotics_page_url( 'contact' ),
	);
	foreach ( $items as $label => $url ) {
		$cta = 'Contact us' === $label ? ' class="nav__cta"' : '';
		echo '<a href="' . esc_url( $url ) . '"' . $cta . '>' . esc_html( $label ) . '</a>';
	}
}

function technotics_image_url( $setting, $fallback = '', $post_id = 0 ) {
	$attachment_id = absint( get_theme_mod( $setting ) );
	if ( $attachment_id ) {
		$url = wp_get_attachment_image_url( $attachment_id, 'full' );
		if ( $url ) {
			return $url;
		}
	}

	$post_id = $post_id ? $post_id : get_the_ID();
	if ( $post_id && has_post_thumbnail( $post_id ) ) {
		$url = get_the_post_thumbnail_url( $post_id, 'full' );
		if ( $url ) {
			return $url;
		}
	}

	if ( $fallback && file_exists( get_theme_file_path( $fallback ) ) ) {
		return technotics_asset_url( $fallback );
	}

	return '';
}

function technotics_image_or_placeholder( $setting, $fallback = '', $alt = '', $class = '' ) {
	$url = technotics_image_url( $setting, $fallback );
	if ( $url ) {
		return '<img class="' . esc_attr( $class ) . '" src="' . esc_url( $url ) . '" alt="' . esc_attr( $alt ) . '" loading="lazy">';
	}

	return '<div class="tech-placeholder ' . esc_attr( $class ) . '"><span class="note">ADD PHOTO IN APPEARANCE → CUSTOMIZE</span></div>';
}

function technotics_customize_register( $wp_customize ) {
	$wp_customize->add_section( 'technotics_images', array(
		'title'       => __( 'Technotics images', 'technotics' ),
		'description' => __( 'Choose the main photos used throughout the site. You can also use a page Featured Image.', 'technotics' ),
		'priority'    => 30,
	) );

	$images = array(
		'tech_team_image'   => 'Team / roster photo',
		'tech_about_image'  => 'About / shop photo',
		'tech_robot_image'  => 'Current robot photo',
		'tech_armory_image' => 'Competition / Armory photo',
		'tech_sponsor_image'=> 'Sponsor photo',
	);

	foreach ( $images as $setting => $label ) {
		$wp_customize->add_setting( $setting, array(
			'sanitize_callback' => 'absint',
		) );
		$wp_customize->add_control( new WP_Customize_Media_Control( $wp_customize, $setting, array(
			'label'       => __( $label, 'technotics' ),
			'section'     => 'technotics_images',
			'settings'    => $setting,
			'mime_type'   => 'image',
		) ) );
	}
}
add_action( 'customize_register', 'technotics_customize_register' );

function technotics_enqueue_assets() {
	$version = wp_get_theme()->get( 'Version' );

	wp_enqueue_style( 'technotics-fontshare', 'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&f[]=satoshi@400,500,700&display=swap', array(), null );
	wp_enqueue_style( 'technotics-mono-font', 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap', array(), null );
	wp_enqueue_style( 'technotics-theme', get_stylesheet_uri(), array(), $version );
	wp_enqueue_style( 'technotics-site', technotics_asset_url( 'assets/site.css' ), array( 'technotics-theme' ), $version );

	wp_enqueue_script( 'three', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', array(), 'r128', true );
	wp_enqueue_script( 'three-gltf-loader', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', array( 'three' ), 'r128', true );
	wp_enqueue_script( 'gsap', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js', array(), '3.12.5', true );
	wp_enqueue_script( 'gsap-scrolltrigger', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js', array( 'gsap' ), '3.12.5', true );
	wp_enqueue_script( 'technotics-rig', technotics_asset_url( 'assets/rig.js' ), array( 'three', 'three-gltf-loader' ), $version, true );
	wp_add_inline_script( 'technotics-rig', 'window.TECHNOTICS_MODEL_URL = ' . wp_json_encode( technotics_asset_url( 'models/kitbot.glb' ) ) . ';', 'before' );
	wp_enqueue_script( 'technotics-motion', technotics_asset_url( 'assets/motion.js' ), array( 'gsap', 'gsap-scrolltrigger' ), $version, true );
	wp_enqueue_script( 'technotics-site', technotics_asset_url( 'assets/wp-site.js' ), array(), $version, true );
}
add_action( 'wp_enqueue_scripts', 'technotics_enqueue_assets' );

function technotics_body_classes( $classes ) {
	if ( is_front_page() ) {
		$classes[] = 'technotics-front-page';
	}
	return $classes;
}
add_filter( 'body_class', 'technotics_body_classes' );

function technotics_excerpt_length() {
	return 24;
}
add_filter( 'excerpt_length', 'technotics_excerpt_length' );
