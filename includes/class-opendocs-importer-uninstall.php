<?php

/**
 * Fired during plugin uninstall (deleting the plugin)
 *
 * @link       https://opendocs.ids.ac.uk
 * @since      1.0.0
 *
 * @package    OpenDocs_Importer
 * @subpackage OpenDocs_Importer/includes
 */

class OpenDocs_Importer_Uninstall {

	/**
     * Fired during plugin uninstall (deleting the plugin).
	 *
	 * @since    1.0.0
	 */
	public static function uninstall() {
		global $wpdb;
		$tableName = $wpdb->prefix . 'odocs';
		$sql = "DROP TABLE IF EXISTS $tableName;";
		$wpdb->query($sql);
		$tableName1 = $wpdb->prefix . 'odocs_iteminfo';
		$sql1 = "DROP TABLE IF EXISTS $tableName1;";
		$wpdb->query($sql1);
		$tableName2 = $wpdb->prefix . 'odocs_field_names';
		$sql2 = "DROP TABLE IF EXISTS $tableName2;";
		$wpdb->query($sql2);
		
		delete_option('opendocs_rejected');
		delete_option('odocsActivated');
	}

}
