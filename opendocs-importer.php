<?php

/**
 *
 * @link              https://opendocs.ids.ac.uk
 * @since             1.0.0
 * @package           OpenDocs_Importer
 *
 * Plugin Name:       OpenDocs Importer
 * Plugin URI:        https://opendocs.ids.ac.uk/
 * Description:       Plugin imports content from the IDS Repository OpenDocs
 * Version:           3.0.4
 * Author:            We Are Potential
 * Author URI:        http://wearepotential.org/
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       opendocs
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

add_filter( 'cron_schedules', 'my_add_weekly' );
function my_add_weekly( $schedules ) {
	// add a 'weekly' schedule to the existing set
	$schedules['thirty'] = array(
		'interval' => 60, //1800,
		'display' => __('30 Minutes')
	);
	return $schedules;
}

add_filter( 'parse_query', 'odocs_parse_filter' );
function odocs_parse_filter( $query ) {
    global $pagenow;
    $current_page = isset( $_GET['post_type'] ) ? $_GET['post_type'] : '';

    if ( is_admin() &&
        //'competition' == $current_page &&
        'edit.php' == $pagenow &&
        isset( $_GET['odocs_item_id'] ) &&
        $_GET['odocs_item_id'] != '' ) {
        $itemids    = explode( ',', urldecode( $_GET['odocs_item_id'] ) );
        $meta_query = array(
            'key'     => 'odocs_item_id',
            'value'   => $itemids,
            'compare' => 'IN'
        );
        foreach ( $meta_query as $k => $v ) {
            $query->set( 'meta_' . $k, $v );
        }
    }
}

/**
 * The code that runs during plugin activation.
 */
require_once plugin_dir_path( __FILE__ ) . 'includes/class-opendocs-importer-activator.php';

/**
 * The code that runs during plugin deactivation.
 */
require_once plugin_dir_path( __FILE__ ) . 'includes/class-opendocs-importer-deactivator.php';

/**
 * The code that runs during plugin uninstall.
 */
require_once plugin_dir_path( __FILE__ ) . 'includes/class-opendocs-importer-uninstall.php';

/** This action is documented in includes/class-opendocs-importer-activator.php */
register_activation_hook( __FILE__, array( 'OpenDocs_Importer_Activator', 'activate' ) );
register_activation_hook( __FILE__, array( 'OpenDocs_Importer_Activator', 'addDefaultFieldNames' ) );

/** This action is documented in includes/class-opendocs-importer-deactivator.php */
register_deactivation_hook( __FILE__, array( 'OpenDocs_Importer_Deactivator', 'deactivate' ) );

/** This action is documented in includes/class-opendocs-importer-uninstall.php */
register_uninstall_hook( __FILE__, array( 'OpenDocs_Importer_Uninstall', 'uninstall' ) );

/**
 * The core plugin class that is used to define internationalization,
 * dashboard-specific hooks, and public-facing site hooks.
 */
require_once plugin_dir_path( __FILE__ ) . 'includes/class-opendocs-importer.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
function run_opendocs_importer() {

	$plugin = new OpenDocs_Importer();
	$plugin->run();

}
run_opendocs_importer();
