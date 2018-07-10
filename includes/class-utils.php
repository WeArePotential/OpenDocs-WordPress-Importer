<?php 
/**
 * Utility Class
 *
 * Gets and displays post types (including custom) list for instance
 *
 * @link       https://opendocs.ids.ac.uk
 * @since      1.0.0
 *
 * @package    OpenDocs_Importer
 * @subpackage OpenDocs_Importer/includes
 */

class OpenDocs_Utils {
    public static function getPostTypes() {
    	$output = '';
    	$excludedCPTs = array( 'attachment', );
    	$public_post_types = get_post_types( array( 	'public' => true,
    					), 'objects' );
	//if( $public_post_types ) : 
		$output .= '<select class="post_types" name="post_types">';
		$output .= '<option value="sel">Select Post Type</option>';
		foreach( $public_post_types as $custom_post_type ) : 
		$postObj = get_post_type_object( $custom_post_type->name );
			if( ! in_array( $custom_post_type->name, $excludedCPTs ) ) : 
				$output .= '<option value="' . esc_attr( $custom_post_type->name ) . '">' . ucfirst( $postObj->labels->name ) . '</option>';
			endif;
		endforeach;
		$output .= '</select>';
	//endif;
	return $output;
    }
	public static function getPostTypesList() {
    	$postTypeList = [];
    	$excludedCPTs = array( 'attachment', );
    	$public_post_types = get_post_types( array( 	'public' => true,
    					), 'objects' );
		foreach( $public_post_types as $custom_post_type ) : 
		$postObj = get_post_type_object( $custom_post_type->name );
			if( ! in_array( $custom_post_type->name, $excludedCPTs ) ) : 
				$postTypeList[] = $custom_post_type->name;
			endif;
		endforeach;
	return $postTypeList;
    }
}