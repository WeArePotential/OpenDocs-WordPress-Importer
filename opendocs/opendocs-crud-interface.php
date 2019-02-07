<?php 

interface IDocs_CRUD {

    public function insertItem($items, $itemIDs);
	public function deleteItemPost($postID);
    public function addIgnoredItemIds($ignoredItemIDs);
    public function getIgnoredItemIds();
    public function deleteIgnoredItemId($itemID);
	public function deleteAllIgnoredItemIds();
	public function deleteCRONJob($cronID);
	public function getExistingItems();
	public function getExistingItemIds();
}