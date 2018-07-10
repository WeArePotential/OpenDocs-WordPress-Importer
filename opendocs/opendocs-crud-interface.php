<?php 

interface IDocs_CRUD {

    public function insertItem($items, $itemIDs, $isCRON = false);
	public function deleteItemPost($postID);
    public function updateRejectedItems($itemIDs);
    public function getRejectedItems();
    public function deleteRejectedItem($itemID);
	public function deleteAllRejectedItems();
	public function deleteCRONJob($cronID);
	public function getImportedItems();
}