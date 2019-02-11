<?php 

interface IDocs_Query_Interface {

    public function __construct();

    public function getTopCommunities();
    public function getSubCommunities($communityID);
    public function getCollectionsByCommunity($communityID);
    public function getItemsInCollection($collectionID);
    public function getItems($itemInfo, $mappingInfo, $isScheduled);
    
}