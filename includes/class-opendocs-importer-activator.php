<?php

/**
 * Fired during plugin activation
 *
 * @link       https://opendocs.ids.ac.uk
 * @since      1.0.0
 *
 * @package    OpenDocs_Importer
 * @subpackage OpenDocs_Importer/includes
 */

class OpenDocs_Importer_Activator {

	/**
	 * Fired during plugin activation.
	 * Registers the CRON 
	 * Creates Database table
	 * 
	 * @since    1.0.0
	 */ 
	public static function activate() {
		if( ! wp_next_scheduled( 'odocsCronImport' ) ) : 
			wp_schedule_event( time(), 'thirty', 'odocsCronImport' );
		endif;
		global $wpdb;
		$tableName = $wpdb->prefix . 'odocs3';
		$tableName_iteminfo = $wpdb->prefix . 'odocs_iteminfo';
		$tableName_field_names = $wpdb->prefix . 'odocs3_field_names';
		$charset_collate = $wpdb->get_charset_collate();
		$sql = "CREATE TABLE $tableName ( 
				id mediumint(8) NOT NULL AUTO_INCREMENT,
				collectionID int NOT NULL,
				jobName varchar(255) NOT NULL,
				collectionName varchar(255) NOT NULL,
				collectionHandle varchar(255) NOT NULL,
				fieldMappings longtext NOT NULL,
				options longtext NOT NULL,
				errorItems longtext,
				lastImport datetime DEFAULT CURRENT_TIMESTAMP, 
				lastImportedItems longtext NULL,
				hasFileUrl int NOT NULL 
				PRIMARY KEY  (id)
				) $charset_collate;";
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
		$sql_1 = "CREATE TABLE $tableName_iteminfo ( 
				id mediumint(8) NOT NULL AUTO_INCREMENT,
				cronID int NOT NULL,
				itemID int NOT NULL,
				title text NOT NULL,
				PRIMARY KEY  (id)
				) $charset_collate;";
		dbDelta( $sql_1 );

		$sql_field_names = "CREATE TABLE $tableName_field_names ( 
				id mediumint(8) NOT NULL AUTO_INCREMENT,
				fieldName varchar(255),
				fieldDesc text,
				fieldLabel varchar(255),
				PRIMARY KEY  (id)
				) $charset_collate;";
		dbDelta( $sql_field_names );
	}
	
	public static function addDefaultFieldNames() {
		if( get_option('odocsActivated') === false ) :
			global $wpdb;
			$tableName = $wpdb->prefix . 'odocs3_field_names';
			$defaultMappings = array('dc.identifier.uri' => array( 'name' => 'OpenDocs webpage url', 'desc' => 'Link to webpage for item in Opendocs (not the publication url). Landing page.'), 'dc.contributor.author' => array( 'name' => 'Authors', 'desc' => ''), 'dc.title' => array( 'name' => 'Title', 'desc' => ''), 'dc.title.alternative' => array( 'name' => 'Alternative titles', 'desc' => ''), 'dc.date.issued' => array( 'name' => 'Publication Date', 'desc' => ''), 'dc.publisher' => array( 'name' => 'Publisher', 'desc' => '' ), 'dc.identifier.citation' => array( 'name' => 'Citation', 'desc' => 'In Harvard format' ), 'dc.relation.ispartofseries' => array( 'name' => 'Series:report no', 'desc' => 'Test description of series grouping of publications' ), 'dc.type' => array( 'name' => 'Type', 'desc' => 'Controlled list of OpenDocs document types' ), 'dc.language.iso' => array( 'name' => 'Language', 'desc' => 'ISO code of language of publication' ), 'dc.coverage.spatial' => array( 'name' => 'Geographic coverage', 'desc' => 'Geographic focus of publication. Usually country names' ), 'dc.date.accessioned' => array( 'name' => 'Date added', 'desc' => 'Date added to OpenDocs' ), 'dc.identifier.doi' => array( 'name' => 'DOI', 'desc' => 'Published repository version' ), 'dc.identifier.isbn' => array( 'name' => 'ISBN', 'desc' => '' ), 'dc.subject' => array( 'name' => 'Theme', 'desc' => 'Thematic focus. Single-level taxonomy terms, should be mapped to a taxonomy.' ), 'dc.description.abstract' => array( 'name' => 'Abstract', 'desc' => 'Descriptive summary of the publication. Unformatted text, although may contain carriage returns' ), 'dc.identifier.externaluri' =>  array( 'name' => 'External URL', 'desc' => 'Remote location of the publication if not hosted by OpenDocs' ), 'dc.rights.holder' => array( 'name' => 'Copyright holder', 'desc' => 'Name of the individual or organisation copyright holder' ), 'dc.rights' => array( 'name' => 'Terms of use', 'desc' => 'Description of how the publication may be (re)used' ), 'dc.rights.uri' => array( 'name' => 'Licence', 'desc' => 'Url to (usually creative commons) licence' ), 'dc.description.sponsorship' => array( 'name' => 'Funder or sponsor', 'desc' => '' ), 'dc.identifier.ag' => array( 'name' => 'IDS Identifier', 'desc' => 'Identifier for cross-reference with client system which produced item record' ) );
			foreach($defaultMappings as $key => $mapping) : 
				$wpdb->insert( $tableName, 
						array( 
							'fieldName' => $key, 
							'fieldLabel' => $mapping['name'],
							'fieldDesc' => $mapping['desc']
						), 
					  array(
					  		'%s',
						    '%s',
						  	'%s'
					  )
				);
			endforeach;
			add_option('odocsActivated', 1);
		endif;
	}

}


