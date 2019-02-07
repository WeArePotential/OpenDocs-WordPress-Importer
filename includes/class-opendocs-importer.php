<?php

/**
 * The file that defines the core plugin class
 *
 * A class definition that includes attributes and functions used across both the
 * public-facing side of the site and the dashboard.
 *
 * @link       https://opendocs.ids.ac.uk
 * @since      1.0.0
 *
 * @package    OpenDocs_Importer
 * @subpackage OpenDocs_Importer/includes
 */

class OpenDocs_Importer {

	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      OpenDocs_Importer_Loader    $loader    Maintains and registers all hooks for the plugin.
	 */
	protected $loader;

	/**
	 * The unique identifier of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $plugin_name    The string used to uniquely identify this plugin.
	 */
	protected $plugin_name;

	/**
	 * The current version of the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $version    The current version of the plugin.
	 */
	protected $version;

	/**
	 * Define the core functionality of the plugin.
	 *
	 * Set the plugin name and the plugin version that can be used throughout the plugin.
	 * Load the dependencies, define the locale, and set the hooks for the Dashboard and
	 * the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function __construct() {

		$this->plugin_name = 'opendocs_importer';
		$this->version = '1.0.0';

		$this->load_dependencies();
		$this->set_locale();
		$this->define_admin_hooks();
		$this->define_public_hooks();

	}

	/**
	 * Load the required dependencies for this plugin.
	 *
	 * Include the following files that make up the plugin:
	 *
	 * - OpenDocs_Importer_Loader. Orchestrates the hooks of the plugin.
	 * - OpenDocs_Importer_i18n. Defines internationalization functionality.
	 * - OpenDocs_Importer_Admin. Defines all hooks for the dashboard.
	 * - OpenDocs_Importer_Public. Defines all hooks for the public side of the site.
	 *
	 * Create an instance of the loader which will be used to register the hooks
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function load_dependencies() {

		/**
		 * The class responsible for orchestrating the actions and filters of the
		 * core plugin.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-opendocs-importer-loader.php';

		/**
		 * The class responsible for defining internationalization functionality
		 * of the plugin.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-opendocs-importer-i18n.php';

		/**
		 * The class responsible for defining all actions that occur in the Dashboard.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'admin/class-opendocs-importer-admin.php';

		/**
		 * The class responsible for defining all actions that occur in the public-facing
		 * side of the site.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'public/class-opendocs-importer-public.php';

		$this->loader = new OpenDocs_Importer_Loader();

	}

	/**
	 * Define the locale for this plugin for internationalization.
	 *
	 * Uses the OpenDocs_Importer_i18n class in order to set the domain and to register the hook
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function set_locale() {

		$plugin_i18n = new OpenDocs_Importer_i18n();
		$plugin_i18n->set_domain( $this->get_plugin_name() );

		$this->loader->add_action( 'plugins_loaded', $plugin_i18n, 'load_plugin_textdomain' );

	}

	/**
	 * Register all of the hooks related to the dashboard functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_admin_hooks() {

		$plugin_admin = new OpenDocs_Importer_Admin( $this->get_plugin_name(), $this->get_version() );

		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_styles' );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts' );
		$this->loader->add_action( 'admin_menu', $plugin_admin, 'admin_menu' );
		$this->loader->add_action( 'trashed_post', $plugin_admin, 'deleteItemIDOnPostDelete' );
		$this->loader->add_action( 'odocsCronImport', $plugin_admin, 'cronImportCallback' );
		$this->loader->add_action( 'odocsCRONImportPosts', $plugin_admin, 'cronImportPostsCallback', 10, 3 );
		$this->loader->add_action( 'transition_post_status', $plugin_admin, 'updatePostPubDate', 10, 3 );
		
		$this->loader->add_action( 'wp_ajax_getSubCommunity', $plugin_admin, 'getSubCommunity' );
		$this->loader->add_action( 'wp_ajax_getCollections', $plugin_admin, 'getCollections' );
		$this->loader->add_action( 'wp_ajax_getACFields', $plugin_admin, 'getACFields' );
		$this->loader->add_action( 'wp_ajax_getItemsInCollection', $plugin_admin, 'getItemsInCollection' );
		$this->loader->add_action( 'wp_ajax_insertItems', $plugin_admin, 'insertItems' );
		$this->loader->add_action( 'wp_ajax_getImportedPostIDs', $plugin_admin, 'getImportedPostIDs' );
		$this->loader->add_action( 'wp_ajax_insertCollectionInDB', $plugin_admin, 'insertCollectionInDB' );
		$this->loader->add_action( 'wp_ajax_updateImportJob', $plugin_admin, 'updateImportJob' );
		$this->loader->add_action( 'wp_ajax_updateImportedItems', $plugin_admin, 'updateImportedItems' );
		$this->loader->add_action( 'wp_ajax_getTaxonomies', $plugin_admin, 'getTaxonomies' );
		$this->loader->add_action( 'wp_ajax_getCollectionMetaDate', $plugin_admin, 'getCollectionMetaDate' );
		$this->loader->add_action( 'wp_ajax_deleteRejectedItem', $plugin_admin, 'deleteRejectedItem' );
		$this->loader->add_action( 'wp_ajax_viewImportedItemsInCollection', $plugin_admin, 'viewImportedItemsInCollection' );
		$this->loader->add_action( 'wp_ajax_deleteCRONJob', $plugin_admin, 'deleteCRONJob' );

		$this->loader->add_action( 'wp_ajax_addIgnoredItemIds', $plugin_admin, 'addIgnoredItemIds' );

		$this->loader->add_action( 'wp_ajax_isCollectionInCRON', $plugin_admin, 'isCollectionInCRON' );
		$this->loader->add_action( 'wp_ajax_loadPostSelector', $plugin_admin, 'loadPostSelector' );
		$this->loader->add_action( 'wp_ajax_getExistingItemIDs', $plugin_admin, 'getExistingItemIDs' );
		$this->loader->add_action( 'wp_ajax_checkIfImportPostOnlyComplete', $plugin_admin, 'checkIfImportPostOnlyComplete' );
		$this->loader->add_action( 'wp_ajax_checkForErrorImports', $plugin_admin, 'checkForErrorImports' );
		$this->loader->add_action( 'wp_ajax_checkIfImportComplete', $plugin_admin, 'checkIfImportComplete' );
		$this->loader->add_action( 'wp_ajax_showImportList', $plugin_admin, 'showImportList' );
		$this->loader->add_action( 'wp_ajax_saveFieldLabels', $plugin_admin, 'saveFieldLabels' );
		$this->loader->add_action( 'wp_ajax_deleteFieldLabel', $plugin_admin, 'deleteFieldLabel' );
	}

	/**
	 * Register all of the hooks related to the public-facing functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_public_hooks() {

		$plugin_public = new OpenDocs_Importer_Public( $this->get_plugin_name(), $this->get_version() );

		$this->loader->add_action( 'wp_enqueue_scripts', $plugin_public, 'enqueue_styles' );
		$this->loader->add_action( 'wp_enqueue_scripts', $plugin_public, 'enqueue_scripts' );

	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 *
	 * @since    1.0.0
	 */
	public function run() {
		$this->loader->run();
	}

	/**
	 * The name of the plugin used to uniquely identify it within the context of
	 * WordPress and to define internationalization functionality.
	 *
	 * @since     1.0.0
	 * @return    string    The name of the plugin.
	 */
	public function get_plugin_name() {
		return $this->plugin_name;
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 *
	 * @since     1.0.0
	 * @return    OpenDocs_Importer_Loader    Orchestrates the hooks of the plugin.
	 */
	public function get_loader() {
		return $this->loader;
	}

	/**
	 * Retrieve the version number of the plugin.
	 *
	 * @since     1.0.0
	 * @return    string    The version number of the plugin.
	 */
	public function get_version() {
		return $this->version;
	}

}
