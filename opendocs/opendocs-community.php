<?php 

class OpenDocs_Community {

	/**
	 * The ID of the community.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      int    $id    The ID of this community.
	 */
    	private $id;
    	
    	/**
	 * The name of the community.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $name    The name of this community.
	 */
    	private $name;
    	
    	/**
	 * The item count of the community.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      int    $count    The item count of this community.
	 */
    	private $count;
    	
    	/**
	 * The type of the community.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $type    The community type
	 */
    	private $type;
    	
    	public function __construct( $id, $name, $count, $type ) {
    	    $this->id = $id;
    	    $this->name = $name;
    	    $this->count = $count;
    	    $this->type = $type;
    	}
    	
    	public function getID() {
    	    return $this->id;
    	}
    	
    	public function getName() {
    	    return $this->name;
    	}
    	
    	public function getCount() {
    	    return $this->count;
    	}
    	
    	public function getType() {
    	    return $this->type;
    	}
    	
}