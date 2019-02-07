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

	/**
	 * The handle of the community.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $handle    The community handle
	 */
		private $handle;

    	public function __construct( $id, $name, $count, $type, $handle ) {
    	    $this->id = $id;
    	    $this->name = $name;
    	    $this->count = $count;
    	    $this->type = $type;
    	    $this->handle = $handle;
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

		public function getHandle() {
			return $this->handle;
		}
}