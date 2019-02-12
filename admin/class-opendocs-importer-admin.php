<?php

/**
 * The dashboard-specific functionality of the plugin.
 *
 * @link       https://opendocs.ids.ac.uk
 * @since      1.0.0
 *
 * @package    OpenDocs_Importer
 * @subpackage OpenDocs_Importer/includes
 */

/**
 * The dashboard-specific functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the dashboard-specific stylesheet and JavaScript.
 *
 * @package    OpenDocs_Importer
 * @subpackage OpenDocs_Importer/admin
 * @author     Simon <email@example.com>
 */

require_once( WP_PLUGIN_DIR . '/opendocs/opendocs/provider/opendocs-xml-wrapper.php' );
require_once( WP_PLUGIN_DIR . '/opendocs/includes/class-utils.php' );
require_once( WP_PLUGIN_DIR . '/opendocs/opendocs/cms/opendocs-wordpress.php' );

class OpenDocs_Importer_Admin {

	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $name The ID of this plugin.
	 */
	private $name;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $version The current version of this plugin.
	 */
	private $version;

	/**
	 * The menu suffix.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $menu_suffix The menu suffix.
	 */
	private $menu_suffix;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 * @var      string $name The name of this plugin.
	 * @var      string $version The version of this plugin.
	 */
	public function __construct( $name, $version ) {

		$this->name    = $name;
		$this->version = $version;

	}

	/**
	 * Register the stylesheets for the Dashboard.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_styles() {

		$wp_scripts = wp_scripts();
		wp_enqueue_style( $this->name . 'admin-ui-css',
			'http://ajax.googleapis.com/ajax/libs/jqueryui/' . $wp_scripts->registered['jquery-ui-core']->ver . '/themes/smoothness/jquery-ui.css',
			false,
			$this->version,
			false );

		wp_enqueue_style( $this->name, plugin_dir_url( __FILE__ ) . 'css/opendocs-importer-admin.css', array(), $this->version, 'all' );
		wp_enqueue_style( 'font-awesome', 'https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css', array(), $this->version, 'all' );

	}

	/**
	 * Register the JavaScript for the dashboard.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts() {

		$screen = get_current_screen();
		if ( $screen->id == $this->menu_suffix || $screen->id == $this->cron_menu_suffix ) {
			wp_enqueue_script( $this->name, plugin_dir_url( __FILE__ ) . 'js/opendocs-importer-admin.js', array(
				'jquery',
				'jquery-ui-tabs',
				'jquery-ui-dialog'
			), filemtime( __FILE__ ), false );
		}

	}

	/**
	 * Register Wordpress admin menu
	 *
	 * @since 1.0.0
	 */
	public function admin_menu() {
		$this->menu_suffix          = add_menu_page( 'OpenDocs', 'OpenDocs', 'manage_options', 'opendocs_import', array(
			$this,
			'admin_menu_callback'
		), 'dashicons-media-document' );
		$this->cron_menu_suffix     = add_submenu_page( 'opendocs_import', 'Field Names', 'Field Names', 'manage_options', 'odocs3_field_names', array(
			$this,
			'admin_odocs_field_names_callback'
		) );
	}

	/**
	 * AJAX Callback function (retrieves subcommunities)
	 *
	 * @since 1.0.0
	 */
	public function getSubCommunity() {
		$communityID = $_POST['data'];
		if ( false === ( $subCommunities = get_transient( 'odocs_communities_' . $communityID ) ) ) :
			$xmlAPIQuery = new XML_IDocs_Query();
			$xmlAPIQuery->setTimeout( 300 );
			$subCommunities = $xmlAPIQuery->getSubCommunities( $communityID );
			set_transient( 'odocs_communities_' . $communityID, $subCommunities, 12 * HOUR_IN_SECONDS );
		endif;
		echo json_encode( $subCommunities );
		wp_die();
	}

	/**
	 * AJAX Callback function (retrieves collections)
	 *
	 * @since 1.0.0
	 */
	public function getCollections() {
		$communityID = $_POST['data'];
		if ( false === ( $collections = get_transient( 'odocs_collections_' . $communityID ) ) ) :
			$xmlAPIQuery = new XML_IDocs_Query();
			$collections = $xmlAPIQuery->getCollectionsByCommunity( $communityID );
			set_transient( 'odocs_collections_' . $communityID, $collections, 12 * HOUR_IN_SECONDS );
		endif;
		echo json_encode( $collections );
		wp_die();
	}

	/**
	 * AJAX Callback function (retrieves items in a collection)
	 *
	 * @since 1.0.0
	 */
	public function getItemsInCollection() {
		$collectionID = $_POST['data'];
		$xmlAPIQuery  = new XML_IDocs_Query();
		$xmlAPIQuery->setTimeout( 300 );
		//error_log( 'PETER: Get items from collection id: ' . print_r( $collectionID, true ) );
		$items = $xmlAPIQuery->getItemsInCollection( $collectionID );
		echo json_encode( $items );
		wp_die();
	}

	/**
	 * AJAX Callback function (retrieves ACF fields for a post type)
	 *
	 * @since 1.0.0
	 */
	public function getACFields() {
		$cptName    = $_POST['cptName'];
		$acf_groups = acf_get_field_groups( array( 'post_type' => $cptName ) );
		$acf_fields = array();
		foreach ( $acf_groups as $acf_group ) :
			$acf_fields_in_group = acf_get_fields( $acf_group );
			foreach ( $acf_fields_in_group as $acf_field ) :
				$sub_fields       = [];
				$sub_fields_names = [];
				if ( $acf_field['type'] == 'repeater' ) :
					$sub_fields_list = $acf_field['sub_fields'];
					foreach ( $sub_fields_list as $sub_field ) :
						$sub_fields[]       = $sub_field['key'];
						$sub_fields_names[] = $sub_field['name'];
					endforeach;
					$acf_fields[] = array(
						'id'              => $acf_field['key'],
						'label'           => $acf_field['label'],
						'sub_fields'      => $sub_fields,
						'type'            => $acf_field['type'],
						'name'            => $acf_field['name'],
						'sub_fields_name' => $sub_fields_names
					);
				else :
					$acf_fields[] = array(
						'id'    => $acf_field['key'],
						'label' => $acf_field['label'],
						'type'  => $acf_field['type'],
						'name'  => $acf_field['name']
					);
				endif;
			endforeach;
		endforeach;
		echo json_encode( $acf_fields );
		wp_die();
	}

	/**
	 * AJAX Callback function (retrieves taxonomy list for a post type)
	 *
	 * @since 1.0.0
	 */
	public function getTaxonomies() {
		$cptName    = $_POST['cptName'];
		$results    = array();
		$taxonomies = get_object_taxonomies( $cptName, 'objects' );
		$exclude    = array( 'post_format' );
		foreach ( $taxonomies as $taxonomy ) :
			if ( in_array( $taxonomy->name, $exclude ) ) :
				continue;
			endif;
			$results[] = array( 'tax_id' => $taxonomy->name, 'label' => $taxonomy->label, 'type' => 'taxonomy' );
		endforeach;
		echo json_encode( $results );
		wp_die();
	}

	/**
	 * AJAX Callback function (retrieves collection's meta data entries)
	 *
	 * @since 1.0.0
	 */
	public function getCollectionMetaData() {

		$collectionID = $_POST['data'];
		$reload = false;
		if ( false === ( $collectionMetaData = get_transient( 'odocs_metadata_' . $collectionID ) ) ) :
            $reload = true;
		else:
            if (!is_array($collectionMetaData)) :
                $reload = true;
            endif;
		endif;

		if ($reload) :
			$wp_class     = new Wordpress_IDocs();
			$xmlAPIQuery        = new XML_IDocs_Query();
			$xmlAPIQuery->setTimeout(300);
			$collectionMetaData = $xmlAPIQuery->getCollectionMetaData( $collectionID );
			set_transient( 'odocs_metadata_' . $collectionID, $collectionMetaData, 12 * HOUR_IN_SECONDS );
		endif;
		echo json_encode( $collectionMetaData );
		wp_die();
	}

	/**
	 * AJAX Callback function (updates imported items)
	 *
	 * @since 1.0.0
	 */
	public function updateImportedItems() {
		$itemIDs  = $_POST['data'];
		$wp_class = new Wordpress_IDocs();
		$result   = $wp_class->updateImportedItems( $itemIDs );
		echo $result;
		wp_die();
	}

	/**
	 * AJAX Callback function (inserted collection item in Db)
	 *
	 * @since 1.0.0
	 */
	public function insertCollectionInDB() {
		$data      = $_POST['data'];
		$data      = str_replace( "\\", "", $data );
		$cleandata = json_decode( $data );
		$wp_class  = new Wordpress_IDocs();
		$result    = $wp_class->insertCollectionInDB( $cleandata );
		echo print_r( $result );
		wp_die();
	}

	/**
	 * AJAX Callback function (update import job in Db)
	 *
	 * @since 1.0.0
	 */
	public function updateImportJob() {
		$data      = $_POST['data'];
		$data      = str_replace( "\\", "", $data );
		$cleandata = json_decode( $data );
		$wp_class  = new Wordpress_IDocs();
		$result    = $wp_class->updateImportJob( $cleandata );
		echo $result;
		wp_die();
	}

	/**
	 * AJAX Callback function )
	 *
	 * @since 1.0.0
	 */
	public function addIgnoredItemIds() {
		$data      = $_POST['data'];
		$data      = str_replace( "\\", "", $data );
		$cleandata = json_decode( $data );
		$wp_class  = new Wordpress_IDocs();
		$result    = $wp_class->addIgnoredItemIds( $cleandata );
		echo json_encode($result);
		wp_die();
	}

	/**
	 * AJAX Callback function (insert new items)
	 *
	 * @since 1.0.0
	 */
	public function insertItems() {
		$data      = $_POST['data'];
		$data      = str_replace( "\\", "", $data );
		$cleandata = json_decode( $data );
		$randArg = rand();
		wp_schedule_single_event( time(), 'odocsCRONImportPosts', array( $cleandata, $cleandata->itemID, $randArg ) );
		echo 1;
		wp_die();
	}

	/**
	 * AJAX Callback function (check if import task done)
	 *
	 * @since 1.0.0
	 */
	public function checkIfImportComplete() {
		$data      = $_POST['data'];
		$data      = str_replace( "\\", "", $data );
		//$cleandata = json_decode( $data );
		//error_log(print_r($data,true));
		$wp_class  = new Wordpress_IDocs();
		$result    = $wp_class->checkIfImportComplete( $data );
		echo $result;
		wp_die();
	}

	/**
	 * AJAX Callback function (check if post creation job is done)
	 *
	 * @since 1.0.0
	 */
	public function checkIfImportPostOnlyComplete() {
		$data      = $_POST['data'];
		$data      = str_replace( "\\", "", $data );
		$cleandata = json_decode( $data );
		$wp_class  = new Wordpress_IDocs();
		$result    = $wp_class->checkIfImportPostOnlyComplete( $cleandata );
		echo $result;
		wp_die();
	}

	/**
	 * AJAX Callback function (check if post creation has failed)
	 *
	 * @since 1.0.0
	 */
	public function checkForErrorImports() {
		$data      = $_POST['data'];
		$data      = str_replace( "\\", "", $data );
		$cleandata = json_decode( $data );
		$wp_class  = new Wordpress_IDocs();
		$result    = $wp_class->checkForErrorImports( $cleandata );
		echo $result;
		wp_die();
	}

	/**
	 * AJAX Callback function (insert new items)
	 *
	 * @since 1.0.0
	 */
	public function showImportList() {
		$data      = $_POST['data'];
		$data      = str_replace( "\\", "", $data );
		$cleandata = json_decode( $data );
		$wp_class  = new Wordpress_IDocs();
		//error_log('PETER1 '.print_r($cleandata,true));
		$result = $wp_class->getImportedPosts( $cleandata );
		//error_log('PETER2 '.print_r($result,true));
		echo json_encode( $result );
		wp_die();
	}

	/**
	 * AJAX Callback function (checks for newly imported items)
	 *
	 * @since 1.0.0
	 */
	public function cronImportPostsCallback( $data, $itemID ) {
		error_log('PETER: cronImportPostsCallback', print_r($itemID,true));
	    $wp_class = new Wordpress_IDocs();
		$result   = $wp_class->insertItem( $data, $itemID, false );
	}

	/**
	 * AJAX Callback function (saves field labels)
	 *
	 * @since 1.0.0
	 */
	public function saveFieldLabels() {
		$data      = $_POST['data'];
		$data      = str_replace( "\\", "", $data );
		$cleandata = json_decode( $data );
		$wp_class  = new Wordpress_IDocs();
		$result    = $wp_class->saveFieldLabels( $cleandata );
		echo json_encode( $result );
		wp_die();
	}

	/**
	 * AJAX Callback function (saves field labels)
	 *
	 * @since 1.0.0
	 */
	public function deleteFieldLabel() {
		$data     = $_POST['data'];
		$wp_class = new Wordpress_IDocs();
		$result   = $wp_class->deleteFieldLabel( $data );
		echo $result;
		wp_die();
	}

	/**
	 * AJAX Callback function (load post mapping selector)
	 *
	 * @since 1.0.0
	 */
	public function loadPostSelector() {
		$data         = $_POST['data'];
		$data         = str_replace( "\\", "", $data );
		$cleandata    = json_decode( $data );
		$collectionID = $cleandata->collID;
		$cronID       = $cleandata->cronID;
		$formTitle    = '';
		$jobField     = '';
		$xmlAPIQuery  = new XML_IDocs_Query();
		$wp_class     = new Wordpress_IDocs();
		$fieldLabels  = $wp_class->getFieldLabelsList();

		$reload = false;
		if ( false === ( $collectionMetaData = get_transient( 'odocs_metadata_' . $collectionID ) ) ) :
			$reload = true;
		else:
			if (!is_array($collectionMetaData)) :
				$reload = true;
			endif;
		endif;
		if ($reload) :
			$collectionMetaData = $xmlAPIQuery->getCollectionMetaData( $collectionID );
			set_transient( 'odocs_metadata_' . $collectionID, $collectionMetaData, 12 * HOUR_IN_SECONDS );
		endif;

		$metaSelect = '<option value="not-selected">Select Open Docs field</option>';
		$metaSelect .= '<option value="full_text_url">Full text url</option>';
		$metaSelect .= '<option value="full_text_type">Full text type</option>';
		$metaSelect .= '<option value="full_text_size">Full text size</option>';
		foreach ( $collectionMetaData as $metaData ) :
			if ( array_key_exists( $metaData, $fieldLabels ) ) :
				$metaSelect .= '<option value="' . $metaData . '">' . $fieldLabels[ $metaData ] . '</option>';
			else :
				$metaSelect .= '<option value="' . $metaData . '">' . $metaData . '</option>';
			endif;
		endforeach;
		if ( $cronID == 0 ) :
			$formTitle = 'Select Post Type to import';
			$collectionField  = '';
		else :
			$formTitle = 'Selected Post Type';
			$jobField  = '<p class="job-field"><label for="job-name">Job Name</label><input type="text" name="job-name" /></p>';
			$collectionField  = '<p class="collection-field"><label for="collection_name" style="display: inline;">Collection: </label><span id="collection_name" ></span></p>';
		endif;
		$result = '<div class="field-mapping" data-collectionID="' . $collectionID . '">
			<form class="post_sel">' .
		          $jobField . $collectionField
		          . '<div class="post_sel_wrap"><h3 class="field-mapping-title">' . $formTitle . '</h3>' . OpenDocs_Utils::getPostTypes() . '</form></div>
			<form class="acf-mapping" data-page="3">
				<h3>
					Custom Field Mapping
				</h3>
				<div class="mapping-table">
					<div class="table-header">
						<div class="table-left">
							<p class="mapping-title">
								Post Field
							</p>	
						</div>
						<div class="table-right">
							<p class="mapping-title">
								Mapping Field
							</p>
						</div>
					</div>
					<div class="table-row default">
						<div class="table-left">
							<select class="wp-field-sel" name="wp-field-sel">
								<option>Title</option>
								<option>Date</option>
								<option>Content</option>
							</select>
						</div>
						<div class="table-right">
							<select class="odocs-metadata" name="odocs-metadata">' . $metaSelect . '</select>
						</div>
					</div>
				</div>
				<div class="new-mapping">
					<a href="#"><i class="fa fa-plus" aria-hidden="true"></i> Add New Mapping</a>
				</div>
				<div class="notify-email"><label for="odocs-email">Notification emails (seperate multiple emails by comma)</label>
				<input type="text" name="odocs-email" id="odocs-email" size="40" /></div>
			</form>
			<div class="ajax-loader">
			<div class="loader-wrap">
				<i class="fa fa-spinner fa-spin fa-3x fa-fw"></i>
			</div>
		</div>' . $this->getImportSchedule() . '
		</div>';
		echo $result;
		wp_die();
	}

	private function getImportSchedule() {
		$output = '<div class="form-wrap" data-page="3">
			<form class="import-when">
				<h3>
					Import Frequency
				</h3>
				<label>
					<input type="radio" name="radio-when" class="radio-when" value="immediately" checked />
					<span>Immediately (no periodicity)</span>
				</label>
				<label>
					<input type="radio" name="radio-when" class="radio-when" value="daily" />
					<span>Daily</span>
				</label>
				<div class="schedule-at" data-schedule="daily">
					<label for="schedule-hour">At: Hours:</label>' . $this->getHours() . '
				</div>
				<label>
					<input type="radio" name="radio-when" class="radio-when" value="weekly" />
					<span>Weekly</span>
				</label>
				<div class="schedule-at" data-schedule="weekly">
					<label for="schedule-day">On: </label> ' . $this->getWeekDays() . '
					<label for="schedule-hour">At: Hours:</label> ' . $this->getHours() . '
				</div>
			</form>
		</div>
		<div class="form-wrap" data-page="3">
			<form class="publish-status">
				<h3>
					Publish Status
				</h3>
				<label>
					<input type="radio" name="pub-status" value="publish" checked />
					<span>Publish</span>
				</label>
				<label>
					<input type="radio" name="pub-status" value="draft" />
					<span>Draft</span>
				</label>
			</form>
		</div>';

		return $output;
	}

	private function getHours() {
		$output = '';
		$output .= '<select id="schedule-hour">';
		for ( $i = 0; $i < 24; $i ++ ) :
			$output .= '<option value="' . date( 'h:i A', strtotime( $i . ':00' ) ) . '">' . date( 'h:i A', strtotime( $i . ':00' ) ) . '</option>';
		endfor;
		$output .= '</select>';

		return $output;

	}

	private function getWeekDays() {
		$output = '';
		$days   = array(
			'Sunday',
			'Monday',
			'Tuesday',
			'Wednesday',
			'Thursday',
			'Friday',
			'Saturday',
		);
		$output .= '<select id="schedule-day">';
		for ( $i = 0; $i < 7; $i ++ ) :
			$output .= '<option value="' . $i . '">' . $days[ $i ] . '</option>';
		endfor;
		$output .= '</select>';

		return $output;

	}

	private function getACFieldsByCPT( $cptName ) {
		$acf_groups = acf_get_field_groups( array( 'post_type' => $cptName ) );
		$acf_fields = array();
		foreach ( $acf_groups as $acf_group ) :
			$acf_fields_in_group = acf_get_fields( $acf_group );
			foreach ( $acf_fields_in_group as $acf_field ) :
				$sub_fields       = [];
				$sub_fields_names = [];
				if ( $acf_field['type'] == 'repeater' ) :
					$sub_fields_list = $acf_field['sub_fields'];
					foreach ( $sub_fields_list as $sub_field ) :
						$sub_fields[]       = $sub_field['key'];
						$sub_fields_names[] = $sub_field['name'];
					endforeach;
					$acf_fields[] = array(
						'id'              => $acf_field['key'],
						'label'           => $acf_field['label'],
						'sub_fields'      => $sub_fields,
						'type'            => $acf_field['type'],
						'name'            => $acf_field['name'],
						'sub_fields_name' => $sub_fields_names
					);
				else :
					$acf_fields[] = array(
						'id'    => $acf_field['key'],
						'label' => $acf_field['label'],
						'type'  => $acf_field['type'],
						'name'  => $acf_field['name']
					);
				endif;
			endforeach;
		endforeach;

		return $acf_fields;
	}

	private function getTaxonomyByCPT( $cptName ) {
		$results    = array();
		$taxonomies = get_object_taxonomies( $cptName, 'objects' );
		$exclude    = array( 'post_format' );
		foreach ( $taxonomies as $taxonomy ) :
			if ( in_array( $taxonomy->name, $exclude ) ) :
				continue;
			endif;
			$results[] = array( 'tax_id' => $taxonomy->name, 'label' => $taxonomy->label, 'type' => 'taxonomy' );
		endforeach;

		return $results;
	}

	/**
	 * AJAX Callback function (removed deleted item IDs from settings)
	 *
	 * @since 1.0.0
	 */
	public function deleteItemIDOnPostDelete( $postID ) {
		$wp_class = new Wordpress_IDocs();
		$wp_class->deleteItemPost( $postID );
	}

	/**
	 * AJAX Callback function (delete Cron Job)
	 *
	 * @since 1.0.0
	 */
	public function deleteCRONJob() {
		$cronID   = $_POST['data'];
		$wp_class = new Wordpress_IDocs();
		$result   = $wp_class->deleteCRONJob( $cronID );
		echo $result;
		wp_die();
	}

	/**
	 * AJAX Callback function (check if collection added as CRON Job)
	 *
	 * @since 1.0.0
	 */
	public function isCollectionInCRON() {
		$collectionID = $_POST['data'];
		$wp_class     = new Wordpress_IDocs();
		$result       = $wp_class->isCollectionInCRON( $collectionID );
		echo $result;
		wp_die();
	}

	/**
	 * AJAX Callback function (retrieve items imported in a collection)
	 *
	 * @since 1.0.0
	 */
	public function viewImportedItemsInCollection() {
		$collectionID = $_POST['data'];
		$wp_class     = new Wordpress_IDocs();
		$result       = $wp_class->viewImportedItemsInCollection( $collectionID );
		echo $result;
		wp_die();
	}

	public function updatePostPubDate( $new_status, $old_status, $post ) {
		if ( 'publish' === $new_status && 'draft' === $old_status ) :
			$post_saved_date = get_post_meta( $post->ID, 'odocs_item_date', true );
			if ( $post_saved_date !== '' ) :
				$item_date = date( 'Y-m-d H:i:s', $post_saved_date );
				wp_update_post( array(
					'ID'            => $post->ID,
					'post_date'     => $item_date,
					'post_date_gmt' => get_gmt_from_date( $item_date )
				) );
			endif;
		endif;
	}

	/*
	 * We are going to import -
	 *  All items in lookup
	 *  But not existing items
	 *  And skip all items set to ignored items
	 *
	 */
	public function cronImportCallback() {
		error_log( "PETER: cronImportCallback: ");
		$wp_class       = new Wordpress_IDocs();
		$cron_schedules = $wp_class->getCRONSchedule();
		$xmlAPIQuery    = new XML_IDocs_Query();
		$cronCondition  = 0;
		foreach ( $cron_schedules as $cron_schedule ) :
			$canExcute = 0;
			$cron_hour = date( 'g A', strtotime( $cron_schedule['when'] ) );
			$hour_now  = date( 'g A' );
			// TODO: Remove this for production
            if ( $cron_schedule['frequency'] == 'daily' || $cron_schedule['frequency'] == 'weekly') {
				$cronCondition = 1;
            }
			if ( $cron_schedule['frequency'] == 'daily' && $cron_hour == $hour_now ) :
				$cronCondition = 1;
			endif;
			if ( $cron_schedule['frequency'] == 'weekly' && $cron_schedule['day'] == date( 'w' ) && $cron_hour == $hour_now ) :
				$cronCondition = 1;
			endif;
			if ( $cronCondition === 1 ) :
				error_log( "PETER: cronImportCallback: ". print_r($cron_schedule, true));
				$collectionID      = $cron_schedule['collectionID'];
                $existingItems     = $wp_class->getExistingItemIds();
                $existingItemCount = count( $existingItems );
                $itemCount         = $xmlAPIQuery->getItemCountInCollection( $collectionID );
                $collectionIDs     = array( array( $itemCount, $collectionID ) );
                $allItems          = $xmlAPIQuery->getItemIDsInCollection( $collectionIDs );
                $itemCount         = count( $allItems );
                $ignoredItems      = $wp_class->getIgnoredItemIds();

                $itemsIDs          = [];
                $emailOpts         = '';
                $postIDs           = [];
                $itemObj           = [];

                // New Items = allItems - (existingItems + rejectedItems)
                // Check that there are some ignored items...
                if (!is_array($ignoredItems)) {
	                $skipItems = $existingItems;
                } else {
                    $skipItems = array_merge( $existingItems, $ignoredItems);
                }
                $newItems = array_diff($allItems, $skipItems);

			    error_log( "PETER: cronImportCallback: ".count($newItems)." new Items: " . print_r( $newItems, true ) );
				if ( count( $newItems ) >= 1 ) :
					$postTypeObj = (object) array(
                        'collectionID'   => $collectionID,
                        'collectionName' => $cron_schedule['name'],
                        'collectionHandle' => $cron_schedule['handle'],
                        'postType'       => $cron_schedule['postType'],
                        'postStatus'     => $cron_schedule['postStatus']
                    );
                    foreach ( $newItems as $item ) :
                        $itemID     = array( 'id' => $item, 'collectionID' => $collectionID );
                        $itemID     = (object) $itemID;
                        $itemObj[]  = $itemID;
                        $itemsIDs[] = $item;
                    endforeach;
                    $itemToInsert  = array(
                        'postType'        => array( $postTypeObj ),
                        'postMapping'     => $cron_schedule['mapping'],
                        'itemID'          => $itemObj,
                        'existingItemIDs' => $existingItems,
                        'cronID'          => $cron_schedule['ID']
                    );
                    $insertedPosts = $wp_class->insertItem( (object) $itemToInsert, $itemObj );
                    $emailOpts     = array(
                        'collectionName' => $cron_schedule['name'],
                        'email'          => $cron_schedule['email'],
                        'postIDs'        => $insertedPosts
                    );
                    // Don't need to do this as we're not using the iteminfo table any more
                    // $wp_class->updateCollectionInDB( $cron_schedule['ID'], $itemsIDs );
                    $wp_class->sendNotificationEmail( (object) $emailOpts );
				endif;
			endif;
		endforeach;
	}

	/**
	 * Function displays admin page
	 *
	 * @since    1.0.0
	 */
	public function admin_menu_callback() {
		require_once( plugin_dir_path( __FILE__ ) . 'partials/opendocs-importer-admin-display.php' );
	}

	/**
	 * Function displays admin page (list of CRON imports)
	 *
	 * @since    1.0.0
	 */
	public function admin_odocs_cron_callback() {
		$wp_class    = new Wordpress_IDocs();
		$xmlAPIQuery = new XML_IDocs_Query();
		?>
		<?php $cronImportList = $wp_class->getCRONImports(); ?>
        <form class="form-wrap" data-page="1">
            <h3>Existing Import Jobs</h3>
            <div class="imports-list items-list edit-list">
				<?php if ( $cronImportList ) : ?>
                    <div class="list-header">
                        <div class="header-title">
                            <a href="#">Name</a>
                        </div>
                        <div class="header-col">
                            <a href="#">Items</a>
                        </div>
                        <div class="header-col header-col-notify">
                            <a href="#">Notification</a>
                        </div>
                        <div class="header-col">
                            <a href="#">Import To</a>
                        </div>
                        <div class="header-col">
                            <a href="#">Type</a>
                        </div>
                        <div class="header-col header-frequency">
                            <a href="#">Frequency</a>
                        </div>
                        <div class="header-col select-all">
                            Delete
                        </div>

                    </div>



                    <?php foreach ( $cronImportList as $import ) :
						$importOptions = json_decode( $import->options );
						$frequency = '';
						$wpCoreSelect = '<select style="display: none;">';
						$jobName = empty( $import->jobName ) ? 'N/A' : $import->jobName;
						$notifyEmail = empty( $importOptions->notifyEmail ) ? 'N/A' : $importOptions->notifyEmail;
						$postType = empty( $importOptions->postTypeName ) ? 'N/A' : $importOptions->postTypeName;
						$importedItems = $wp_class->viewImportedItemsInCollection( $import->id );
						$acfFields = $this->getACFieldsByCPT( $importOptions->postType );
						$taxonomies = $this->getTaxonomyByCPT( $importOptions->postType );
						//$itemIDsInCollection = $xmlAPIQuery->getItemIDsInCollectionShort( $import->collectionID );
						$itemsInCollection = $xmlAPIQuery->getItemCountInCollection( $import->collectionID );
						$defaultFields = array( 'Title', 'Date', 'Content', 'IDS Identifier' );
						foreach ( $defaultFields as $defaultField ) :
							$wpCoreSelect .= '<option value="' . $defaultField . '">' . $defaultField . '</option>';
						endforeach;
						foreach ( $acfFields as $acfField ) :
							if ( $acfField['type'] == 'repeater' ) :
								$wpCoreSelect .= '<option value="' . $acfField['id'] . '" data-sub-fields="' . implode( ',', $acfField['sub_fields'] ) . '" data-field-name="' . $acfField['name'] . '" data-sub-fieldnames="' . implode( ',', $acfField['sub_fields_name'] ) . '" data-field-type="repeater">' . $acfField['label'] . ' (' . $acfField['type'] . ')</option>';
							else :
								$wpCoreSelect .= '<option value="' . $acfField['id'] . '" data-field-name="' . $acfField['name'] . '">' . $acfField['label'] . ' (' . $acfField['type'] . ')</option>';
							endif;
						endforeach;
						foreach ( $taxonomies as $CTPtaxonomy ) :
							$wpCoreSelect .= '<option value="' . $CTPtaxonomy['tax_id'] . '" data-field-type="taxonomy">' . $CTPtaxonomy['label'] . '</option>';
						endforeach;
						$wpCoreSelect .= '</select>';
						$weekDays     = array(
							'Sunday',
							'Monday',
							'Tuesday',
							'Wednesday',
							'Thursday',
							'Friday',
							'Saturday',
						);
						if ( $importOptions->frequency == 'immediately' ) :
							$frequency = 'N/A';
                        elseif ( $importOptions->frequency == 'daily' ) :
							$frequency = 'Daily at ' . $importOptions->when[0];
						else :
							$frequency = 'Every ' . $weekDays[ $importOptions->when[1] ] . ' at ' . $importOptions->when[0];
						endif; ?>
                        <div class="item-row">
                            <div class="row coll-name"><a href="#" class="edit-job"
                                                          data-cronid="<?php echo $import->id; ?>"
                                                          data-collectionid="<?php echo $import->collectionID; ?>"
                                                          data-coll-name="<?php echo $import->collectionName; ?>"
                                                          data-coll-handle="<?php echo $import->collectionHandle; ?>"
                                                          title="<?php echo trim(array_values(array_slice(explode('->', $import->collectionName), -1))[0]); ?>"
                                                          data-count="<?php echo $itemsInCollection; ?>"
                                                          data-post-type="<?php echo $importOptions->postType; ?>"><?php echo $jobName; ?></a><br/><?php echo trim(array_values(array_slice(explode('->', $import->collectionName), -1))[0]); ?>

                            </div>
                            <div class="row coll-info"><span href="#" class="imported-items"
                                                          data-cronid="<?php echo $import->id; ?>"><?php echo $itemsInCollection; ?> items</span></div>
                            <div class="row coll-info coll-notify"><?php echo $notifyEmail; ?></div>
                            <div class="row coll-info import-post"
                                 data-status="<?php echo $importOptions->postStatus; ?>"><?php
	                             $pt = get_post_type_object( $importOptions->postType );
	                            echo $pt->labels->singular_name; ?></div>
                            <div class="row coll-info"><?php echo ucfirst( $importOptions->frequency ); ?></div>
                            <div class="row coll-info col-frequency"
                                 data-frequency="<?php echo $importOptions->frequency; ?>"
                                 data-import-at="<?php echo $importOptions->when[0]; ?>"
                                 data-import-day="<?php echo $importOptions->when[1]; ?>"><?php echo $frequency; ?></div>
                            <div class="row item-delete"><a href="#" data-cronid="<?php echo $import->id; ?>"
                                                        data-collid="<?php echo $import->collectionID; ?>"
                                                        data-action=""><i class="fa fa-times" aria-hidden="true"></i><span style="visibility:hidden">Delete</span></a></div>
                            <div class="job-post-mapping"><?php echo $import->fieldMappings; ?></div>
                            <div class="job-wp-fields"><?php echo $wpCoreSelect; ?></div>
                        </div>


						<?php
						$wp_class          = new Wordpress_IDocs();
						$importedItemCount = count( $wp_class->viewImportedItemsInCollection( $import->id ) );
						?>
                        <div id="imported-items-dialog-<?php echo $import->id; ?>" class="imported-items-dialog"
                             title="<?php print( $importedItemCount ); ?> Imported Items for <?php echo $import->jobName; ?>">
                            <ul>
								<?php foreach ( $importedItems as $importedItem ) : ?>
                                    <li><?php echo $wp_class->getItemTitle( $importedItem ); ?></li>
								<?php endforeach; ?>
                            </ul>
                        </div>


                        <div id="dialogAction" class="dialog-hide" title="Confirmation Required">
                            <p>
                                Remove job?<br />This will stop imports, but retain all items which have already been imported as content.
                            </p>
                        </div>
					<?php endforeach; ?>
				<?php else : ?>
                    <h4>
                        No import jobs Found!
                    </h4>
				<?php endif; ?>
            </div>
        </form>
	<?php }

	public function admin_odocs_field_names_callback() {
		$wp_class    = new Wordpress_IDocs();
		$fieldLabels = $wp_class->getFieldLabels();
		?>
        <div class="wrap">
            <h1>Field Name Mapper</h1>
            <div class="community-wrap">
                <form action="#" class="form-wrap field-names-wrap">
                    <div class="mapping-table">
                        <div class="table-header">
                            <div class="table-left">
                                <p class="mapping-title">
                                    Field Name
                                </p>
                            </div>
                            <div class="table-left">
                                <p class="mapping-title">
                                    Description
                                </p>
                            </div>
                            <div class="table-right">
                                <p class="mapping-title">
                                    Label
                                </p>
                            </div>
                        </div>
                        <div class="field-labels">
							<?php
							if ( count( $fieldLabels ) > 0 ) :
								foreach ( $fieldLabels as $fieldLabel ) :
									?>
                                    <div class="table-row" data-saved="1"
                                         data-label-id="<?php echo $fieldLabel['id']; ?>">
                                        <div class="table-left">
                                            <input type="text" class="mapping-field"
                                                   value="<?php echo $fieldLabel['fieldName']; ?>" disabled/>
                                        </div>
                                        <div class="table-middle">
                                            <input type="text" class="mapping-desc"
                                                   value="<?php echo $fieldLabel['fieldDesc']; ?>" disabled/>
                                        </div>
                                        <div class="table-right">
                                            <input type="text" class="mapping-label"
                                                   value="<?php echo $fieldLabel['fieldLabel']; ?>" disabled/>
                                        </div>
                                        <a href="#" class="del-fieldLabel"><i class="fa fa-times"
                                                                              aria-hidden="true"></i></a>
                                    </div>
								<?php
								endforeach;
							else :
								?>
                                <h4 class="no-field-labels">
                                    No field labels added!
                                </h4>
							<?php
							endif;
							?>
                        </div>
                        <div class="add-fieldMapping">
                            <a href="#" class="add-new"><i class="fa fa-plus" aria-hidden="true"></i> Add New Field
                                Label</a>
                            <a href="#" class="save"><i class="fa fa-save" aria-hidden="true"></i> Save</a>
                        </div>
                        <div id="deleteFieldLabel" class="hide-dialog" title="Confirmation Required">
                            <p>
                                Remove Field Label?
                            </p>
                        </div>
                        <div class="ajax-loader">
                            <div class="loader-wrap">
                                <i class="fa fa-spinner fa-spin fa-3x fa-fw"></i>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
		<?php
	}
}
