<?php

/**
 * Provide a dashboard view for the plugin
 *
 * This file is used to markup the public-facing aspects of the plugin.
 *
 * @link       https://opendocs.ids.ac.uk
 * @since      1.0.0
 *
 * @package    OpenDocs_Importer
 * @subpackage OpenDocs_Importer/admin/partials
 */
?>

<?php $xmlAPIQuery = new XML_IDocs_Query(); ?>
<?php $wordpress_conn = new Wordpress_IDocs(); ?>
<?php 
	if( false === ( $topCommunities = get_transient( 'odocs_top_communities'  ) ) ) :
	  $topCommunities = $xmlAPIQuery->getTopCommunities(); 
	  if( ! empty( $topCommunities ) ) : 
	  	set_transient( 'odocs_top_communities', $topCommunities, 24 * HOUR_IN_SECONDS );
	  endif;
	endif;
?>
<div class="wrap">

    <h1>OpenDocs Importer</h1>

	<div class="community-wrap">

		<form action="#" class="opendocs-form form-wrap" data-page="1">
			<h3>
				Add New Job
			</h3>
			<input type="text" class="job-title" size="40" />
			<div class="add-import-job">
				<a href="#" class="add-new"><i class="fa fa-plus" aria-hidden="true"></i> Add New Job</a>
			</div>
		</form>

		<?php echo $this->admin_odocs_cron_callback(); ?>	
		
		<form action="#" class="opendocs-form form-wrap" data-page="2">

            <div class="opendocs-communities">
                <h3>
                    OpenDocs communities and collections
                </h3>
                <?php if( $topCommunities ) : ?>
                    <h2>Pick an opendocs community for <span class="job-name"></span></h2>
                    <?php foreach( $topCommunities as $community ) : ?>
                        <a href="#" data-comm-id="<?php echo $community->getID(); ?>" class="community toplevel" data-type="community" data-comm-name="<?php echo $community->getName(); ?>" data-comm-handle="<?php echo $community->getHandle(); ?>"><span class="toggle-icon"><i class="fa fa-plus" aria-hidden="true"></i></span><?php echo $community->getName(); ?> (<?php echo $community->getCount(); ?>)</a>
                    <?php endforeach; ?>
			    <?php else : ?>
				    <h2>Error retrieving communities, reload</h2>
			    <?php endif; ?>
			</div>

            <div class="sel-collections">
				<h2>Selected Collections</h2>
				<select size="10">
				
				</select>
				<div class="action-links">
					<a href="#" class="remove">Remove Selected</a>
					<a href="#" class="clear-all">Clear All</a>	
				</div>
			</div>
		</form>
		
		<div id="tabs" class="form-wrap" data-page="3">
			
		</div>
		
		<div class="form-wrap" data-page="4">
			<form class="publish-status">
				<h3>
					Items to import
				</h3>
				<div class="items-to-import items-list">
					<div class="list-header">
						<div class="select-all">
							<label for="import-all">Import</label>
							<!--input type="checkbox" id="import-all" name="check-all" data-type="import" checked class="check-all" /-->
						</div>
						<div class="select-all">
							<label id="ignore-all" for="ignore-all">Ignore</label>
							<!--input type="checkbox" id="ignore-all" name="check-all" data-type="ignore" class="check-all" /-->
						</div>
						<div class="header-title">
							<a href="#">Title</a>
						</div>
						<div class="header-date">
							<a href="#">View</a>
						</div>
					</div>
				</div>
			</form>
		</div>
		
		<div class="form-wrap complete">
			<form class="publish-status">
				<h3>
					Imported Items
				</h3>
				<div class="imported-list items-list">
					<div class="list-header">
						<div class="header-title">
							<a href="#">Title</a>
						</div>
						<div class="header-links">
							OpenDocs Item
						</div>
						<div class="header-date">
							<a href="#">Date</a>
						</div>
					</div>
				</div>
			</form>
		</div>
		
		<div class="form-wrap existing-items-list">
			<form class="publish-status">
				<h3>
					Existing Items
				</h3>
				<div class="imported-list existing-list">
					<div class="list-header">
						<div class="header-title">
							<a href="#">Title</a>
						</div>
						<div class="header-links">
							OpenDocs Item
						</div>
						<div class="header-date">
							<a href="#">Date</a>
						</div>
					</div>
				</div>
			</form>
		</div>
		
		<div id="progress-wrap">
			<form class="publish-status">
				<h3>
					Import Progress
				</h3>
				<div class="progress-bar">
					<div class="progress">
						0%
					</div>
				</div>
				<p class="imported-progress">
					Starting import...
				</p>
				<p class="imported-progress-info">
					
				</p>
                    <p class="abort-job">
					<a href="#"><i class="fa fa-times" aria-hidden="true"></i> Abort</a>
				</p>
			</form>
		</div>
		
		<div class="btn_post_mapping btn_wrap">
			<button class="button-primary view_items_opendoc_btn opendoc_btn" type="button" name="btn_post_mapping">
				<?php esc_attr_e( 'Proceed to post mapping' ); ?>
			</button>
		</div>
		<div class="btn_view_items btn_wrap">
			<button class="button-primary opendoc_view_items_btn opendoc_btn" type="button" name="btn_view_items">
				<?php esc_attr_e( 'View items to import' ); ?>
			</button>
		</div>
		<div class="btn_import btn_wrap">
			<button class="button-primary opendoc_btn" type="button" id="opendocs_import" name="opendocs_import">
				<?php esc_attr_e( 'Save and import' ); ?>
			</button>
		</div>
		<div class="btn_prev btn_wrap">
			<button class="button-primary opendoc_btn" type="button" name="opendocs_next">
				<?php esc_attr_e( 'Back' ); ?>
			</button>
		</div>
		<div class="btn_save btn_wrap">
			<button class="button-primary opendoc_btn opendoc_save_btn" type="button" name="btn_save">
				<?php esc_attr_e( 'Save Job' ); ?>
			</button>
		</div>
		<div class="btn_run_job btn_wrap">
			<button class="button-primary opendoc_btn opendoc_run_job_btn" type="button" name="btn_run_job">
				<?php esc_attr_e( 'Run Import' ); ?>
			</button>
		</div>
		<div class="btn_cancel btn_wrap">
			<button class="button-primary opendoc_btn opendoc_cancel_btn" type="button" name="btn_cancel">
				<?php esc_attr_e( 'Cancel' ); ?>
			</button>
		</div>

		<div class="ajax-loader">
			<div class="loader-wrap">
				<i class="fa fa-spinner fa-spin fa-3x fa-fw"></i>
			</div>
		</div>


		<div id="data-form" class="form-wrap">
            <h3>Data</h3>
            <form >
                job_id:    <input type="text" id="job_id" value="" /><br/>
                job_name:    <input type="text" id="job_name" value="" /><br/>
                edit_coll_id:       <input type="text" id="edit_coll_id" value="" /><br/>
                coll_item_count:    <input type="text" id="coll_item_count" value="" /><br/>
                sel_coll_name:      <input type="text" id="sel_coll_name" value="" /><br/>
                sel_coll_handle:    <input type="text" id="sel_coll_handle" value="" /><br/>

                toImportItemIDs: <input type="text" id="toImportItemIDs"/><br/>
                existingItemIDs: <input type="text" id="existingItemIDs" value="<?php echo implode(',', $wordpress_conn->getExistingItemIds()); ?>"/><br/>
                ignoredItemIDs:  <input type="text" id="ignoredItemIDs" value="<?php echo implode(',', $wordpress_conn->getIgnoredItemIds()); ?>"/><br/>
                allitemIDs:      <input type="text" id="allitemIDs"/><br/>
            </form>
        </div>

	</div>

	<div id="dialog" title="Info">
  		<p>Collection already added as CRON job. To re-add, delete existing.</p>
	</div>
	
	<div id="validation-dialog" class="dialog-hide" title="Info">
  		<p>Please Enter a job name</p>
	</div>

</div>
