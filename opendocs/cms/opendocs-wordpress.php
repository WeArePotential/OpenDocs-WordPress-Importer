<?php

require_once WP_PLUGIN_DIR . '/opendocs/opendocs/opendocs-crud-interface.php';
require_once WP_PLUGIN_DIR . '/opendocs/opendocs/provider/opendocs-xml-wrapper.php';
require_once WP_PLUGIN_DIR . '/opendocs/includes/class-utils.php';

/**
 * The CMS Wrapper Class (Wordpress based)
 *
 * @link       https://opendocs.ids.ac.uk
 * @since      1.0.0
 *
 * @package    XML_IDocs_Query
 */
class Wordpress_IDocs implements IDocs_CRUD {

	/**
	 * Update Rejected Items
	 *
	 * Fires when an Wordpress post is trashed associated with a OpenDoc item (saves itemID in wp_options table)
	 *
	 * @since 1.0.0
	 *
	 * @param array $rejectedItemIDs List of item IDs to add to reject option
	 *
	 */
	public function updateRejectedItems( $rejectedItemIDs = array() ) {
		$isUpdated     = 0;
		$existingItems = [];
		if ( ( get_option( 'opendocs_rejected', '' ) === false ) ) :
			add_option( 'opendocs_rejected', $rejectedItemIDs );
			$isUpdated = 2;
		else :
			$existingItems = get_option( 'opendocs_rejected' );
			if ( $existingItems == null ) :
				$existingItems = array();
			endif;
			if ( ! is_array( $rejectedItemIDs ) ) :
				$rejectedItemIDs = array();
			endif;
			$existingItems = array_merge( $existingItems, $rejectedItemIDs );
			$existingItems = array_unique( $existingItems );
			update_option( 'opendocs_rejected', $existingItems );
			$isUpdated = get_option( 'opendocs_rejected' );
		endif;
		return $isUpdated;
	}

	/**
	 * Get Reject Item List
	 *
	 * Retrieves rejected items list
	 *
	 * @since 1.0.0
	 *
	 * @return array List of rejected item IDs
	 */
	public function getRejectedItems() {
		return get_option( 'opendocs_rejected' );
	}

	/**
	 * Removes item ID from Reject list
	 *
	 * Removes an item ID from reject list
	 *
	 * @since 1.0.0
	 *
	 * @param int $itemID Item ID to remove from reject list
	 *
	 * @return int 1 if success or 0
	 */
	public function deleteRejectedItem( $itemID ) {
		$items = get_option( 'opendocs_rejected' );
		if ( ( $key = array_search( $itemID, $items ) ) !== false ) :
			unset( $items[ $key ] );
			update_option( 'opendocs_rejected', $items );

			return 1;
		endif;

		return 0;
	}

	/**
	 * Clear Reject list
	 *
	 * Removes all item IDs from reject list
	 *
	 * @since 1.0.0
	 *
	 * @return int returns 1 if success
	 */
	public function deleteAllRejectedItems() {
		$items = get_option( 'opendocs_rejected' );
		update_option( 'opendocs_rejected', array() );

		return 1;
	}

	/**
	 * Delete CRON job
	 *
	 * Removes a CRON job from database
	 *
	 * @since 1.0.0
	 *
	 * @param int $cronID CRON ID to remove
	 *
	 * @return int 1 if deleted or 0
	 */
	public function deleteCRONJob( $cronID ) {
		global $wpdb;
		$tableName = $wpdb->prefix . 'odocs';
		$isDeleted = $wpdb->delete( $tableName,
			array(
				'id' => $cronID,
			),
			array(
				'%d',
			)
		);
		if ( $isDeleted == 1 ) :
			return 1;
		endif;

		return 0;
	}

	/**
	 * Is item In reject list
	 *
	 * Checks if a itemID is in reject list
	 *
	 * @since 1.0.0
	 *
	 * @param int $itemID item ID to check if in reject list
	 *
	 * @return int 1 if item in reject list or 0
	 */
	public function isItemInRejectedList( $itemID ) {
		$items = get_option( 'opendocs_rejected' );
		if ( ( $key = array_search( $itemID, $items ) ) !== false ) :
			return 1;
		endif;

		return 0;
	}

	/**
	 * Get All Cron Jobs
	 *
	 * Returns all CRON jobs from database.
	 *
	 * @since 1.0.0
	 *
	 * @return array List of CRON jobs
	 */
	public function getCRONImports() {
		global $wpdb;
		$tableName   = $wpdb->prefix . 'odocs';
		$importsList = $wpdb->get_results( "SELECT * FROM $tableName" );

		return $importsList;
	}

	/**
	 * Start import process
	 *
	 * Starts the entire import process with parameters from front end
	 *
	 * @since 1.0.0
	 *
	 * @param class $items Class containing items info -> postMapping, existingItemIDs, itemIDs to retrieve, post type info
	 * @param class $itemIDs stdClass containing list of item IDs to import
	 * @param bool $isCRON is current job CRON?
	 *
	 * @return array List of inserted Wordpress IDs
	 */
	public function insertItem( $items, $itemIDs, $isCRON = false ) {
		$fieldMappings   = $items->postMapping;
		$existingItems   = $items->existingItemIDs;
		$itemCount       = count( $items->itemID );
		$mappingArray    = [];
		$collID          = $items->postType[0]->collectionID;
		$itemList        = [];
		$postTypeInfo    = $items->postType[0];
		$toInsertMapping = [];
		$hasFileURL      = 0;
		$inscronID       = 0;

		foreach ( $itemIDs as $item ) :
			$itemList[] = $item->id;
		endforeach;

		$rejectedItems = $this->getRejectedItems();
		$allitemIDs    = explode( ',', $items->allItems );
		$rejectedItems = array_intersect( $rejectedItems, $allitemIDs );

		if ( $isCRON == true ) :
			$cronID = $items->cronID;
		else:
			$cronID = -1;
		endif;

		if ( $isCRON == false ) :
			foreach ( $fieldMappings as $fieldMapping ) :
				if ( property_exists( $fieldMapping, 'type' ) ) :
					if ( $fieldMapping->type == 'repeater' ) :
						$mappingArray[] = array(
							$fieldMapping->field_id,
							$fieldMapping->value,
							$fieldMapping->collectionID,
							'sub_fields' => $fieldMapping->sub_fields,
							'field_type' => $fieldMapping->type,
							$fieldMapping->acf_name,
							$fieldMapping->sub_field_names
						);
					else :
						$mappingArray[] = array(
							$fieldMapping->field_id,
							$fieldMapping->value,
							$fieldMapping->collectionID,
							'field_type' => $fieldMapping->type
						);
					endif;
				else :
					$mappingArray[] = array(
						$fieldMapping->field_id,
						$fieldMapping->value,
						$fieldMapping->collectionID,
						$fieldMapping->acf_name
					);
				endif;
			endforeach;

		else :
			$mappingArray = $fieldMappings;
		endif;
		update_option( 'odoc_cronID', - 1 );

		$itemObj        = new XML_IDocs_Query( 'https://opendocs.ids.ac.uk/rest' );
		$itemHandleList = $itemObj->getItemHandle( $itemList );

		if ( $isCRON == false ) :
			foreach ( $mappingArray as $fieldMapping ) :
				if ( array_key_exists( 'field_type', $fieldMapping ) ) :
					if ( $fieldMapping['field_type'] == 'repeater' ) :
						$toInsertMapping[] = array(
							'field_id'        => $fieldMapping[0],
							'field_name'      => $fieldMapping[1],
							'collectionID'    => $fieldMapping[2],
							'sub_fields'      => $fieldMapping['sub_fields'],
							'field_type'      => $fieldMapping['field_type'],
							'acf_name'        => $fieldMapping[3],
							'sub_field_names' => $fieldMapping[4]
						);
					else :
						$toInsertMapping[] = array(
							'field_id'     => $fieldMapping[0],
							'field_name'   => $fieldMapping[1],
							'collectionID' => $fieldMapping[2],
							'field_type'   => $fieldMapping['field_type']
						);
					endif;
				else :
					$toInsertMapping[] = array(
						'field_id'     => $fieldMapping[0],
						'field_name'   => $fieldMapping[1],
						'collectionID' => $fieldMapping[2],
						'acf_name'     => $fieldMapping[3]
					);
				endif;
				if ( $fieldMapping[1] == 'full_text_url' || $fieldMapping[1] == 'full_text_type' || $fieldMapping[1] == 'full_text_size' ) :
					$hasFileURL = 1;
				endif;
			endforeach;
			$inscronID = $this->insertCollectionInDB( $postTypeInfo, $toInsertMapping, $rejectedItems, $hasFileURL );
		endif;

		$itemInfo    = array(
			'itemsList'     => $itemList,
			'itemHandles'   => $itemHandleList,
			'existingItems' => $existingItems
		);
		$mappingInfo = array( 'postTypeInfo' => $postTypeInfo, 'collID' => $collID, 'mappingArray' => $mappingArray );
		$isCRON      = array( 'isCRON' => $isCRON, 'cronID' => $cronID, 'insertedcronID' => $inscronID );

		$insertedPostIDs = $itemObj->getItems( (object) $itemInfo, (object) $mappingInfo, (object) $isCRON );
		if ( $isCRON['isCRON'] == true ) :
			return $insertedPostIDs;
		endif;

		return 1;

	}

	/**
	 * Import individual item into Wordpress
	 *
	 * Creates a Wordpress post with supplied data
	 *
	 * @since 1.0.0
	 *
	 * @param int $itemID Item ID to import
	 * @param int $itemHandle Item Handle of item to import
	 * @param array $fieldValues Array containing field values
	 * @param array $toInsertMapping Array containing fieldmapping to save
	 * @param class $postTypeInfo Class containing import post type and status
	 * @param int $itemCount import item count
	 * @param array $importedItems List of imported Wordpress Post IDs
	 * @param array $errorItems List of failed Item IDs to import
	 * @param array $itemIDs List of item IDs to import
	 * @param array $itemHandles List of item Handles of item IDs
	 * @param array $existingItems List of existing item IDs
	 * @param bool $isCRON is the current function running as CRON?
	 * @param int $cronID cronID
	 *
	 * @return int inserted Wordpress Post ID
	 */
	public function insertPost( $itemID, $itemHandle, $fieldValues, $postTypeInfo, $itemCount, $importedItems, $errorItems, $itemIDs, $itemHandles, $existingItems, $isCRON, $cronID ) {
		if ( ! empty( $fieldValues ) ) :

			$mergedArray   = [];
			$hasFileURL    = 0;
			$title         = '';
			$date          = '';
			$content       = '';
			$hasFileURL    = 0;
			$importedCount = count( $importedItems );
			$existingCount = count( $existingItems );
			$downloadFile  = '';


			foreach ( $fieldValues as $postMapping ) :
				if ( ! array_key_exists( $postMapping['field_id'], $mergedArray ) ) :
					$mergedArray[ $postMapping['field_id'] ] = $postMapping;
				else :
					$mergedArray[ $postMapping['field_id'] ]['field_value'] .= '{{<>}}' . $postMapping['field_value'];
					$mergedArray[ $postMapping['field_id'] ]['lang']        .= '{{<>}}' . $postMapping['lang'];
				endif;
				if ( $postMapping['field_name'] == 'full_text_url' || $postMapping['field_name'] == 'full_text_type' || $postMapping['field_name'] == 'full_text_size' ) :
					$hasFileURL = 1;
				endif;
			endforeach;

			foreach ( $mergedArray as $key => $value ) :
				if ( strpos( $mergedArray[ $key ]['field_value'], '{{<>}}' ) !== false ) :
					$splitted = array_filter( explode( '{{<>}}', $mergedArray[ $key ]['field_value'] ) );
					if ( ! empty( $splitted ) ) :
						$mergedArray[ $key ]['field_value'] = $splitted;
					endif;
				endif;
				if (isset($mergedArray[ $key ]['lang'])) :
					if ( strpos( $mergedArray[ $key ]['lang'], '{{<>}}' ) !== false ) :
						$splitted = array_filter( explode( '{{<>}}', $mergedArray[ $key ]['lang'] ) );
						if ( ! empty( $splitted ) ) :
							$mergedArray[ $key ]['lang'] = $splitted;
						endif;
					endif;
				endif;
			endforeach;

			foreach ( $mergedArray as $key => $postMapping ) :
				switch ( $key ) :
					case 'Title' :
						$langIndex = 0;
						if ( is_array( $postMapping['lang'] ) ) :
							$langIndex = 0;
							if ( array_search( 'en', $postMapping['lang'] ) !== false ) :
								$langIndex = array_search( 'en', $postMapping['lang'] );
							elseif ( array_search( 'en_GB', $postMapping['lang'] ) !== false ) :
								$langIndex = array_search( 'en_GB', $postMapping['lang'] );
							elseif ( array_search( 'N/A', $postMapping['lang'] ) !== false ) :
								$langIndex = array_search( 'N/A', $postMapping['lang'] );
							endif;
							$title = $postMapping['field_value'][ $langIndex ];
						else :
							$title = $postMapping['field_value'];
						endif;
						break;
					case 'Date' :
						if ( ! empty( $postMapping['field_value'] ) ) :
							$date = $postMapping['field_value'];
						else :
							$date = gmdate( "Y-m-dTH:i:sZ" );
						endif;
						$date = strtotime( $date );
						break;
					case 'Content' :

						if ( is_array( $postMapping['lang'] ) ) :
							$langIndex = 0;
							if ( array_search( 'en', $postMapping['lang'] ) !== false ) :
								$langIndex = array_search( 'en', $postMapping['lang'] );
							elseif ( array_search( 'en_GB', $postMapping['lang'] ) !== false ) :
								$langIndex = array_search( 'en_GB', $postMapping['lang'] );
							elseif ( array_search( 'N/A', $postMapping['lang'] ) !== false ) :
								$langIndex = array_search( 'N/A', $postMapping['lang'] );
							endif;
							$content .= '<br />' . $postMapping['field_value'][ $langIndex ];
						else :
							$content .= '<br />' . $postMapping['field_value'];
						endif;

						break;
				endswitch;
			endforeach;

			$postArgs       = array(
				'post_title'   => $title,
				'post_type'    => $postTypeInfo->postType,
				'post_content' => $content,
				'post_date'    => date( 'Y-m-d  H:i:s', $date ),
				'post_status'  => $postTypeInfo->postStatus
			);
			$insertedPostID = wp_insert_post( $postArgs );

			if ( $isCRON == false ) :
				if ( $importedCount == ( $itemCount - $existingCount ) - 1 ) :
					$importedItems[ $itemID ] = $insertedPostID;
					$importedCount ++;
				endif;
			else :
				if ( $importedCount == ( $itemCount - 1 ) ) :
					$importedItems[ $itemID ] = $insertedPostID;
					$importedCount ++;
				endif;
			endif;

			add_post_meta( $insertedPostID, 'odocs_item_date', $date );
			add_post_meta( $insertedPostID, 'odocs_item_id', $itemID );
			if ( $hasFileURL == 1 ) :
				add_post_meta( $insertedPostID, 'odocs_has_file', 1 );
			endif;

			$this->insertItemInfoInDB( $itemID, $cronID );

			$postMetaUpdate = $this->updatePostFields( $insertedPostID, $itemHandle, $mergedArray, $hasFileURL );

			if ( ! empty( $errorItems ) ) :
				$itemCount = $itemCount - count( $errorItems );
			endif;

			if ( $isCRON == false ) :
				if ( $itemCount - $existingCount == $importedCount ) :
					//$cronID = $this->insertCollectionInDB($postTypeInfo, $toInsertMapping, $importedItems, $existingItems, $errorItems, $hasFileURL);
					update_option( 'odoc_cronID', $cronID );
					if ( $hasFileURL === 1 ) :
						$itemObj      = new XML_IDocs_Query( 'https://opendocs.ids.ac.uk/rest' );
						$downloadFile = $itemObj->getItemFiles( $importedItems, $fieldValues, $itemIDs, $itemHandles );
					endif;
				endif;

				return $insertedPostID;
			else :
				if ( $itemCount == $importedCount ) :
					if ( $hasFileURL === 1 ) :
						$itemObj      = new XML_IDocs_Query( 'https://opendocs.ids.ac.uk/rest' );
						$downloadFile = $itemObj->getItemFiles( $importedItems, $fieldValues, $itemIDs, $itemHandles );
					endif;
				endif;

				return $insertedPostID;
			endif;
		endif;
	}

	public function updateImportedItems( $importedItemID = array() ) {
		$isUpdated     = 0;
		$existingItems = [];
		if ( ( get_option( 'opendocs_imported', '' ) === false ) ) :
			add_option( 'opendocs_imported', $importedItemID );
			$isUpdated = 1;
		else :
			$existingItems = get_option( 'opendocs_imported' );
			if ( $existingItems == null ) :
				$existingItems = array();
			endif;
			$existingItems = array_merge( $existingItems, $importedItemID );
			$existingItems = array_unique( $existingItems );
			update_option( 'opendocs_imported', $existingItems );
			$isUpdated = get_option( 'opendocs_imported' );
		endif;

		return $importedItemID;

	}

	/**
	 * Save Metadata
	 *
	 * Save retrieved field values into imported Wordpress post
	 *
	 * @since 1.0.0
	 *
	 * @param int $insertedPostID Inserted post ID
	 * @param int $itemHandle item Handle
	 * @param array $fieldsArray List of Field mapping values
	 * @param int $hasFileURL is current job has a file mapping
	 *
	 * @return int return 1 if success
	 */
	private function updatePostFields( $insertedPostID, $itemHandle, $fieldsArray, $hasFileURL ) {
		global $wpdb;
		$isUpdated            = 0;
		$insertedItemPosts    = [];
		$itemObj              = new XML_IDocs_Query( 'https://opendocs.ids.ac.uk/rest' );
		$postMetaArray        = [];
		$postMetaFormatString = [];
		$repeaterCounter      = 0;

		foreach ( $fieldsArray as $postMapping ) :
			$fieldValue = $postMapping['field_value'];
			if ( $postMapping['field_id'] !== 'Title' && $postMapping['field_id'] !== 'Date' && $postMapping['field_id'] !== 'Content' && $postMapping['field_name'] !== 'full_text_url' && $postMapping['field_name'] !== 'full_text_type' && $postMapping['field_name'] !== 'full_text_size' ) :

				if ( array_key_exists( 'field_type', $postMapping ) ) :
					// if taxonomy field type, insert comma separated list of terms
					if ( $postMapping['field_type'] == 'taxonomy' ) :
						if ( $postMapping['lang'] == 'N/A' || $postMapping['lang'] == 'en' || $postMapping['lang'] == 'en_GB' ) :
							// Pass taxonomy names to filter, to allow pluggable
							$fieldValue  = apply_filters( 'odocs_taxonomy', $fieldValue, $postMapping['field_id'] );
							$term_ids    = $this->getTermIDsByName( $fieldValue, $postMapping['field_id'] );
							$categorySet = wp_set_object_terms( $insertedPostID, $term_ids, $postMapping['field_id'], true );
							if ( ! is_wp_error( $categorySet ) ) :
								$isUpdated = 1;
							endif;
						endif;
					// if repeater type, make array of sub_field_id => value
					elseif ( $postMapping['field_type'] == 'repeater' ) :
						$sub_fields      = $postMapping['sub_fields'];
						$sub_field_names = $postMapping['sub_field_names'];
						$repeaterValues  = [];
						if ( ! is_array( $fieldValue ) ) :
							$fieldValue = array( $fieldValue );
						endif;
						$fieldValue = apply_filters( 'odocs_field_value', $fieldValue, $postMapping['field_id'] );

						if ( is_array( $postMapping['lang'] ) ) :
							foreach ( $postMapping['lang'] as $key => $lang ) :
								if ( $lang === 'N/A' || $lang === 'en' || $lang === 'en_GB' ) :
								else :
									unset( $fieldValue[ $key ] );
								endif;
							endforeach;
						else :
							if ( $postMapping['lang'] !== 'N/A' || $postMapping['lang'] !== 'en' || $postMapping['lang'] !== 'en_GB' ) :
								$fieldValue = array();
							endif;
						endif;


						foreach ( $fieldValue as $repeaterValue ) :
							$repeaterValues[] = array( $sub_fields => $repeaterValue );
						endforeach;
						update_field( $postMapping['field_id'], $repeaterValues, $insertedPostID );
					endif;
				// Genereal ACF field (text/textarea/url etc.,)
				else :
					$fieldValue = apply_filters( 'odocs_field_value', $fieldValue, $postMapping['field_id'], $postMapping['lang'], $itemHandle );
					if ( is_array( $fieldValue ) ) :
						$fieldValue = json_encode( $fieldValue );
					endif;
					if ( $postMapping['lang'] == 'N/A' || $postMapping['lang'] == 'en' || $postMapping['lang'] == 'en_GB' ) :
						update_field( $postMapping['field_id'], $fieldValue, $insertedPostID );
					endif;
				endif;
			endif;
		endforeach;
		// Add meta (hidden from ACF)
		add_post_meta( $insertedPostID, 'odocs_item_handle', $itemHandle );

		return $isUpdated;
	}

	/**
	 * Save File Metadata
	 *
	 * Save retrieved field values into imported Wordpress post
	 *
	 * @since 1.0.0
	 *
	 * @param int $insertedPostID Inserted post ID
	 * @param array $fieldMapping List of Field mapping values
	 * @param array $fileDownload File download array (file URL, file type, file length, file language)
	 *
	 * @return int 1 if success
	 */
	public function updatePostDownloads( $insertedPostID, $fieldMapping, $fileDownload ) {
		global $wpdb;
		$isUpdated       = 0;
		$repeaterCounter = 0;
		foreach ( $fieldMapping as $postMapping ) :
			if ( $postMapping['field_name'] === 'full_text_url' || $postMapping['field_name'] === 'full_text_type' || $postMapping['field_name'] === 'full_text_size' ) :
				$fileLanguage = strtolower( $fileDownload[5] );
				if ( $postMapping['field_name'] === 'full_text_url' ) :
					$postMapping['field_value'] = $fileDownload[1];
					$fieldValue                 = $fileDownload[1];
				elseif ( $postMapping['field_name'] === 'full_text_type' ) :
					$postMapping['field_value'] = $fileDownload[3];
					$fieldValue                 = $fileDownload[3];
				else :
					$postMapping['field_value'] = $fileDownload[4];
					$fieldValue                 = $fileDownload[4];
				endif;
				if ( array_key_exists( 'field_type', $postMapping ) ) :
					if ( $postMapping['field_type'] == 'repeater' ) :
						$sub_fields      = $postMapping['sub_fields'];
						$sub_field_names = $postMapping['sub_field_names'];
						$repeaterValues  = [];
						if ( ! is_array( $fieldValue ) ) :
							$fieldValue = array( $fieldValue );
						endif;
						foreach ( $fieldValue as $repeaterValue ) :
							$repeaterValues[] = array( $sub_fields => $repeaterValue );
						endforeach;
						if ( strpos( 'en', $fileLanguage ) === true ) :
							update_field( $postMapping['field_id'], $repeaterValues, $insertedPostID );
						endif;
					endif;
				// General ACF field (text/textarea/url etc.,)
				else :
					if ( strpos( $fileLanguage, 'en' ) !== false ) :
						update_field( $postMapping['field_id'], $fieldValue, $insertedPostID );
					endif;
				endif;
			endif;

		endforeach;
		add_post_meta( $insertedPostID, 'odocs_import_done', 1 );

		return $isUpdated;
	}

	/**
	 * Save Collection in DB
	 *
	 * Save collection into Database to run CRON jobs
	 *
	 * @since 1.0.0
	 *
	 * @param class $postTypeInfo Class containing post type info
	 * @param array $fieldMappings item Handle
	 * @param array $insertedPostIDs List of inserted Wordpress post IDs
	 * @param array $existingItems List of existing items
	 * @param array $errorRetrievingItems List of error item IDs
	 * @param int $hasFileURL is current job has a file mapping
	 *
	 * @return int return inserted CRON ID
	 */
	public function insertCollectionInDB( $postTypeInfo, $fieldMappings, $rejectedItems, $hasFileURL ) {
		global $wpdb;
		$tableName    = $wpdb->prefix . 'odocs';
		$notifyEmail  = $postTypeInfo->notifyEmail;
		$cronID       = 0;
		$options      = array(
			'postType'     => $postTypeInfo->postType,
			'postTypeName' => $postTypeInfo->postTypeName,
			'notifyEmail'  => $notifyEmail,
			'postStatus'   => $postTypeInfo->postStatus,
			'frequency'    => $postTypeInfo->frequency,
			'when'         => $postTypeInfo->when,
			'hasFileURL'   => $hasFileURL
		);
		$mappingArray = json_encode( $fieldMappings );
		$options      = json_encode( $options );
		//$errorItems = json_encode($errorRetrievingItems);
		$rejectedItems = json_encode( $rejectedItems );
		$wpdb->insert( $tableName,
			array(
				'collectionID'   => $postTypeInfo->collectionID,
				'jobName'        => $postTypeInfo->jobName,
				'collectionName' => $postTypeInfo->collectionName,
				'fieldMappings'  => $mappingArray,
				'options'        => $options,
				'rejectedItems'  => $rejectedItems,
				'errorItems'     => ''
			),
			array(
				'%d',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s'
			)
		);
		$cronID = $wpdb->insert_id;

		//$this->insertItemInfoInDB( $insertedPostIDs, $cronID );
		return $cronID;
	}

	/**
	 * Save imported items into db
	 *
	 * After import completion, save imported item IDs into db.
	 *
	 * @since 1.0.0
	 *
	 * @param array $insertedItemPosts List of imported items
	 * @param int $cronID Job ID which is associated with import
	 *
	 */
	private function insertItemInfoInDB( $insertedPostItemID, $cronID ) {
		global $wpdb;
		$tableName = $wpdb->prefix . 'odocs_iteminfo';
		$wpdb->insert( $tableName,
			array(
				'cronID' => $cronID,
				'itemID' => $insertedPostItemID
			),
			array(
				'%d',
				'%d'
			)
		);
	}

	/**
	 * Get imported item IDs for a Cron Job
	 *
	 * Get list of imported item IDs in a Cron job.
	 *
	 * @since 1.0.0
	 *
	 * @param int $cronID Job ID
	 *
	 * @return array list of item IDs
	 */
	public function viewImportedItemsInCollection( $cronID ) {
		global $wpdb;
		$tableName  = $wpdb->prefix . 'odocs_iteminfo';
		$itemIDs    = [];
		$importList = $wpdb->get_results( "SELECT itemID FROM $tableName WHERE cronID = $cronID" );
		foreach ( $importList as $importedID ) :
			if ( $importedID !== 0 ) :
				$itemIDs[] = $importedID->itemID;
			endif;
		endforeach;

		return $itemIDs;

	}

	/**
	 * Update Cron job
	 *
	 * Save changes to existing CRON job
	 *
	 * @since 1.0.0
	 *
	 * @param class $items class containing job info
	 *
	 * @return int CRON job ID
	 */
	public function updateImportJob( $items ) {
		global $wpdb;
		$tableName         = $wpdb->prefix . 'odocs';
		$selectedPostTypes = $items->postType;
		$fieldMappings     = $items->postMapping;
		$cronID            = $items->cronID;
		$jobName           = $items->jobName;
		$mappingList       = array();
		foreach ( $selectedPostTypes as $postType ) :
			$notifyEmail  = $postType->notifyEmail;
			$mappingArray = array();
			$existingList = [];
			$postIDs      = [];
			$options      = array(
				'postType'    => $postType->postType,
				'notifyEmail' => $notifyEmail,
				'postStatus'  => $postType->postStatus,
				'frequency'   => $postType->frequency,
				'when'        => $postType->when,
				'hasFileURL'  => $postType->hasFileURL
			);
			foreach ( $fieldMappings as $mapping ) :
				if ( $mapping->collectionID === $postType->collectionID ) :
					$mappingArray[] = $mapping;
				endif;
			endforeach;
			$mappingArray     = json_encode( $mappingArray );
			$options          = json_encode( $options );
			$mappingList[]    = $mappingArray;
			$isCollectionInDB = $wpdb->get_row( "SELECT id FROM $tableName WHERE id = $cronID" );
			if ( $isCollectionInDB ) :
				$isUpdated = $wpdb->update( $tableName,
					array(
						'jobName'       => $jobName,
						'fieldMappings' => $mappingArray,
						'options'       => $options
					),
					array(
						'id' => $isCollectionInDB->id,
					),
					array(
						'%s',
						'%s',
						'%s'
					),
					array(
						'%d'
					)
				);
				$cronID    = $isCollectionInDB->id;
			endif;
		endforeach;

		return $cronID;
	}

	public function updateCollectionInDB( $ID, $itemIDs ) {
		global $wpdb;
		$tableName = $wpdb->prefix . 'odocs_iteminfo';
		foreach ( $itemIDs as $itemID ) :
			$wpdb->insert( $tableName,
				array(
					'cronID' => $ID,
					'itemID' => $itemID
				),
				array(
					'%d',
					'%d'
				)
			);
		endforeach;

		return 1;
	}

	public function deleteItemPost( $postID ) {
		$itemID = get_post_meta( $postID, 'odocs_item_id', true );
		global $wpdb;
		$tableName = $wpdb->prefix . 'odocs_iteminfo';
		$wpdb->delete( $tableName,
			array(
				'itemID' => $itemID
			),
			array(
				'%d'
			)
		);
		$this->updateRejectedItems( array( $itemID ) );
	}

	public function sendNotificationEmail( $emailOpts ) {
		$message = "<h4>Hi,</h4>
				<h4>New items found in collection $emailOpts->collectionName: </h4>
				<h4>Imported below items and saved as drafts. Please check them and publish!</h4>";
		$message .= '<ul>';
		$headers = array( 'Content-Type: text/html; charset=UTF-8' );
		foreach ( $emailOpts->postIDs as $postID ) :
			$message .= '<li><a href="' . $this->getPostEditLink( $postID ) . '">' . get_the_title( $postID ) . '</a></li>';
		endforeach;
		$message .= '</ul>';
		wp_mail( $emailOpts->email, 'New Content Found in ' . $emailOpts->collectionName, $message, $headers );
	}

	public function getCRONSchedule() {
		global $wpdb;
		$tableName      = $wpdb->prefix . 'odocs';
		$importList     = $wpdb->get_results( "SELECT * FROM $tableName" );
		$importSchedule = [];
		$weekDays       = array(
			'Sunday',
			'Monday',
			'Tuesday',
			'Wednesday',
			'Thursday',
			'Friday',
			'Saturday',
		);
		foreach ( $importList as $import ) :
			$importOptions = json_decode( $import->options );
			if ( $importOptions->frequency !== 'immediately' ) :
				$dayIndex         = $importOptions->when[1];
				$fieldMappings    = $import->fieldMappings;
				$fieldMappings    = json_decode( $fieldMappings, true );
				$importSchedule[] = array(
					'type'         => $importOptions->frequency,
					'ID'           => $import->id,
					'name'         => $import->collectionName,
					'postType'     => $importOptions->postType,
					'postStatus'   => $importOptions->postStatus,
					'email'        => $importOptions->notifyEmail,
					'collectionID' => $import->collectionID,
					'mapping'      => $fieldMappings,
					'frequency'    => $importOptions->frequency,
					'when'         => $importOptions->when[0],
					'day'          => $weekDays[ $dayIndex ]
				);
			endif;
		endforeach;

		return $importSchedule;
	}

	public function isCollectionInCRON( $collectionID ) {
		global $wpdb;
		$inCron     = - 1;
		$tableName  = $wpdb->prefix . 'odocs';
		$importList = $wpdb->get_results( "SELECT * FROM $tableName WHERE collectionID = $collectionID" );
		foreach ( $importList as $import ) :
			$collectionOption = json_decode( $import->options );
			$schedule         = $collectionOption->frequency;
			if ( $collectionOption->frequency !== 'immediately' ) :
				$inCron = 1;
			endif;
		endforeach;

		return $inCron;
	}

	public function getItemTitle( $itemID ) {
		$titleLink    = '';
		$postTypeList = OpenDocs_Utils::getPostTypesList();
		$itemLoop     = new WP_Query( array(
			'post_type'  => $postTypeList,
			'meta_key'   => 'odocs_item_id',
			'meta_value' => $itemID
		) );
		while ( $itemLoop->have_posts() ) : $itemLoop->the_post();
			$titleLink = '<a href="' . get_the_permalink() . '" target="_blank">' . get_the_title() . '</a>';
		endwhile;
		wp_reset_postdata();
		wp_reset_query();

		return $titleLink;
	}

	private function getPostObjByItemID( $itemID, $postType, $isGetID = false ) {
		$postTypeList = OpenDocs_Utils::getPostTypesList();
		$itemLoop     = new WP_Query( array(
			'post_type'  => $postTypeList,
			'meta_key'   => 'odocs_item_id',
			'meta_value' => $itemID
		) );
		$postObj      = [];
		while ( $itemLoop->have_posts() ) : $itemLoop->the_post();
			if ( ! $isGetID ) :
				$postObj = array(
					'id'     => get_the_ID(),
					'source' => get_post_meta( get_the_ID(), 'odocs_item_handle', true ),
					'title'  => get_the_title(),
					'date'   => get_the_date( 'Y-m-d H:i:s' ),
					'edit'   => get_edit_post_link( get_the_ID() )
				);
			else :
				$postObj = get_the_ID();
			endif;
		endwhile;
		wp_reset_postdata();
		wp_reset_query();

		return $postObj;
	}

	public function getPostIDsByItemIDs( $items ) {
		$postObj      = [];
		$postTypeList = OpenDocs_Utils::getPostTypesList();
		foreach ( $items as $item ) :
			$existingItemIDs = $item->existingItems;
			if ( ! is_array( $existingItemIDs ) ) :
				$existingItemIDs = array();
			endif;
			$toImportItemIDs    = $item->itemIDs;
			$notImportedItemIDs = array_diff( $toImportItemIDs, $existingItemIDs );
			if ( ! empty( $notImportedItemIDs ) ) :
				$importedItemLoop = new WP_Query( array(
					'post_type'      => $item->postType,
					'posts_per_page' => - 1,
					'meta_query'     => array(
						array(
							'key'     => 'odocs_item_id',
							'value'   => $notImportedItemIDs,
							'compare' => 'IN',
							'type'    => 'NUMERIC'
						)
					)
				) );
				while ( $importedItemLoop->have_posts() ) : $importedItemLoop->the_post();
					$postObj[] = array(
						'itemID'       => (int) get_post_meta( get_the_ID(), 'odocs_item_id', true ),
						'existing'     => 0,
						'insertedPost' => array(
							'id'     => get_the_ID(),
							'source' => get_post_meta( get_the_ID(), 'odocs_item_handle', true ),
							'title'  => get_the_title(),
							'date'   => get_the_date( 'Y-m-d H:i:s' ),
							'edit'   => get_edit_post_link( get_the_ID() )
						)
					);
				endwhile;
				wp_reset_postdata();
				wp_reset_query();
			endif;
			$existingItemLoop = new WP_Query( array(
				'post_type'      => $postTypeList,
				'posts_per_page' => - 1,
				'meta_query'     => array(
					array(
						'key'     => 'odocs_item_id',
						'value'   => $existingItemIDs,
						'compare' => 'IN',
						'type'    => 'NUMERIC'
					)
				)
			) );
			while ( $existingItemLoop->have_posts() ) : $existingItemLoop->the_post();
				$postObj[] = array(
					'itemID'       => (int) get_post_meta( get_the_ID(), 'odocs_item_id', true ),
					'existing'     => 1,
					'existingPost' => array(
						'id'     => get_the_ID(),
						'source' => get_post_meta( get_the_ID(), 'odocs_item_handle', true ),
						'title'  => get_the_title(),
						'date'   => get_the_date( 'Y-m-d H:i:s' ),
						'edit'   => get_edit_post_link( get_the_ID() )
					)
				);
			endwhile;
			wp_reset_postdata();
			wp_reset_query();
		endforeach;

		return $postObj;
	}

	public function checkIfImportComplete( $items ) {
		$importCount = 0;
		foreach ( $items as $item ) :
			$toImportItemIDs = $item->itemIDs;

			$itemLoop = new WP_Query( array( 'post_type' => $item->postType, 'posts_per_page' => - 1 ) );
			while ( $itemLoop->have_posts() ) : $itemLoop->the_post();
				if ( in_array( get_post_meta( get_the_ID(), 'odocs_item_id', true ), $toImportItemIDs ) && get_post_meta( get_the_ID(), 'odocs_has_file', true ) == 0 ) :
					$importCount ++;
				elseif ( in_array( get_post_meta( get_the_ID(), 'odocs_item_id', true ), $toImportItemIDs ) && get_post_meta( get_the_ID(), 'odocs_import_done', true ) == 1 ) :
					$importCount ++;
				endif;
			endwhile;
			wp_reset_postdata();
			wp_reset_query();
		endforeach;

		return $importCount;
	}

	public function checkIfImportPostOnlyComplete( $items ) {
		$importCount   = 0;
		$toImportCount = 0;
		foreach ( $items as $item ) :
			$toImportItemIDs = $item->itemIDs;
			$toImportCount   = count( $toImportItemIDs );

			$itemLoop = new WP_Query( array( 'post_type' => $item->postType, 'posts_per_page' => - 1 ) );
			while ( $itemLoop->have_posts() ) : $itemLoop->the_post();
				if ( in_array( get_post_meta( get_the_ID(), 'odocs_item_id', true ), $toImportItemIDs ) ) :
					$importCount ++;
				endif;
			endwhile;
			wp_reset_postdata();
			wp_reset_query();
		endforeach;
		if ( $importCount == $toImportCount ) :
			return 1;
		endif;

		return 0;
	}

	private function getTermIDsByName( $categoryNames, $taxonomy ) {
		$termIDs = [];
		if ( ! is_array( $categoryNames ) ) :
			$categoryNames = array( $categoryNames );
		endif;
		foreach ( $categoryNames as $catName ) :
			if ( false === ( $termID = get_term_by( 'name', $catName, $taxonomy ) ) ) :
				$termAdded = wp_insert_term( $catName, $taxonomy );
				if ( ! is_wp_error( $termAdded ) ) :
					$termIDs[] = $termAdded['term_id'];
				endif;
			else :
				$termIDs[] = $termID->term_id;
			endif;
		endforeach;

		return $termIDs;
	}

	public function getImportedItems() {
		$importedItems = [];
		global $wpdb;
		$tableName  = $wpdb->prefix . 'odocs_iteminfo';
		$importList = $wpdb->get_results( "SELECT itemID FROM $tableName" );
		foreach ( $importList as $imported ) :
			$importedItems[] = $imported->itemID;
		endforeach;

		return $importedItems;
	}

	private function getPostTypeByCollectionID( $collectionID, $postTypeArray ) {
		foreach ( $postTypeArray as $postType ) :
			if ( $postType->collectionID == $collectionID ) :
				return $postType->postType;
			endif;
		endforeach;

		return '';
	}

	private function getPostStatusByCollectionID( $collectionID, $postTypeArray ) {
		foreach ( $postTypeArray as $postType ) :
			if ( $postType->collectionID == $collectionID ) :
				return $postType->postStatus;
			endif;
		endforeach;

		return '';
	}

	private function getPostEditLink( $id = 0, $context = 'display' ) {
		if ( ! $post = get_post( $id ) ) :
			return;
		endif;

		if ( 'revision' === $post->post_type ) :
			$action = '';
		elseif ( 'display' == $context ) :
			$action = '&action=edit';
		else :
			$action = '&action=edit';
		endif;

		$post_type_object = get_post_type_object( $post->post_type );
		if ( ! $post_type_object ) :
			return;
		endif;

		return apply_filters( 'get_edit_post_link', admin_url( sprintf( $post_type_object->_edit_link . $action, $post->ID ) ), $post->ID, $context );
	}

	public function getFieldLabels( $onlyIDs = false ) {
		global $wpdb;
		$fieldLabels    = [];
		$tableName      = $wpdb->prefix . 'odocs_field_names';
		$fieldLabelRows = $wpdb->get_results( "SELECT * FROM $tableName" );
		foreach ( $fieldLabelRows as $fieldLabelRow ) :
			$fieldLabels[] = array(
				'id'         => $fieldLabelRow->id,
				'fieldName'  => $fieldLabelRow->fieldName,
				'fieldLabel' => $fieldLabelRow->fieldLabel,
				'fieldDesc'  => $fieldLabelRow->fieldDesc
			);
		endforeach;

		return $fieldLabels;
	}

	public function getFieldLabelsList() {
		global $wpdb;
		$fieldLabels    = [];
		$tableName      = $wpdb->prefix . 'odocs_field_names';
		$fieldLabelRows = $wpdb->get_results( "SELECT * FROM $tableName" );
		foreach ( $fieldLabelRows as $fieldLabelRow ) :
			$fieldLabels[ $fieldLabelRow->fieldName ] = $fieldLabelRow->fieldLabel;
		endforeach;

		return $fieldLabels;
	}

	public function saveFieldLabels( $labels ) {
		global $wpdb;
		$insertedFieldLabels = [];
		$tableName           = $wpdb->prefix . 'odocs_field_names';
		foreach ( $labels as $label ) :
			$wpdb->insert( $tableName,
				array(
					'fieldName'  => $label->name,
					'fieldLabel' => $label->label,
					'fieldDesc'  => $label->desc
				),
				array(
					'%s',
					'%s',
					'%s'
				)
			);
			$insertedFieldLabels[] = array( 'id' => $wpdb->insert_id, 'name' => $label->name );
		endforeach;

		return $insertedFieldLabels;
	}

	public function deleteFieldLabel( $fieldLabel ) {
		global $wpdb;
		$tableName  = $wpdb->prefix . 'odocs_field_names';
		$deletedRow = $wpdb->delete( $tableName,
			array( 'id' => $fieldLabel ),
			array( '%d' )
		);

		return $deletedRow;
	}

}