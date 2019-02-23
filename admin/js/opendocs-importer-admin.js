(function ($) {

    //Declare global variables
    'use strict';
    var apiurl = 'https://opendocs.ids.ac.uk/opendocs/handle/';
    var currentPage = 1; // Holds Current page number
    var cfields = ['Title', 'Date', 'Content']; // Default fields
    var taxFields = [];
    var collId = '';
    var skippedImports = 0;
    var existingItems = [];
    var chunkSize = 80;
    var callbackTimer = '';
    var postOnlyImportTimer = '';
    var checkForErrorsTimer = '';
    var errorImportTimer = '';
    var toImportCount = 0;
    var successfullImports = 0;
    var failedToImport = 0;
    var existingItemCount = 0;
    var totalRecords = 0;
    var coreFieldsLength = 0;
    var coreFieldsTempLength = 0;
    var initFormData = '';
    var cronID = 0;

    $(function () {
        // Show initial page
        $(".form-wrap[data-page='1']").show();

        // Set up Jquery UI dialogs
        $("#dialog").dialog({
            autoOpen: false,
            modal: true,
            show: "blind",
            hide: "blind",
            'buttons': {
                "Ok": function () {
                    $(this).dialog('close');
                }
            }
        });

        $(".imported-items-dialog, .existing-items-dialog").dialog({
            autoOpen: false,
            modal: true,
            show: "blind",
            hide: "blind",
            buttons: {
                "Close": function () {
                    $(this).dialog("close");
                }
            },
            open: function () {
                $(this).css('padding', '20px');
            },
            width: "60%",
            maxWidth: "768px",
            maxHeight: 500
        });

        // Loads items in selected collections
        $(".btn_view_items, .btn_run_job .opendoc_btn").on('click', function (e) {
            $("[data-page='3']").hide();
            currentPage = currentPage + 1;
            $("[data-page='4']").show();
            $(".btn_import").show();
            if ($(this).hasClass('opendoc_run_job_btn')) {
                $('.btn_prev').show().find('.opendoc_btn').attr('isSavedJob', 1);
                $(".btn_cancel, .btn_save, .btn_run_job").hide();
            }

            var collectionIDs = [];
            var itemsCount = 0;
            var paginationHTML = '';
            var allItemsInColl = [];

            if ($(".publish-status").data('loaded') !== 'yes') {
                if ($(".opendocs-communities a.community").hasClass("selected-collection")) {
                    itemsCount = $(".opendocs-communities a.community.selected-collection").data("count");
                    collectionIDs.push(new Array(itemsCount, $(".opendocs-communities a.community.selected-collection").data('collid'), $("#existingItemIDs").val().split(',')));
                } else {
                    itemsCount = $("#coll_item_count").val();
                    collectionIDs.push(new Array(itemsCount, $("#edit_coll_id").val(), $("#existingItemIDs").val().split(',')));
                }

                // Save the current job info.
                var cronid = $('#tab-0').data('cron-id');
                var dataToImport = buildSaveData(cronid);

                var ajaxdata = {
                    'action': 'updateImportJob',
                    'data': JSON.stringify(dataToImport),
                };

                var promise = $.ajax({
                    url: ajaxurl,
                    type: "POST",
                    data: ajaxdata,
                    dataType: 'json',
                    timeout: 0,
                    beforeSend: function () {
                        $(".community-wrap .ajax-loader").show();
                        //console.log('PETER: About to send...');
                    },
                    success: function (response) {
                        //$(".community-wrap .ajax-loader").hide();
                        console.log('PETER: Updated job with cron_id: ' + response);
                        $('#tab-0').data('cron-id', response);
                    }
                });

                promise.then(function() {
                    //console.log("PETER: Now get the list of items for: " + $("#tab-0").data("cron-id"));
                });

                // Retrieves items in selected collection
                var data = {
                    'action': 'getItemsInCollection',
                    'data': collectionIDs
                };
                $(".community-wrap .ajax-loader").show();
                $.ajax({
                    url: ajaxurl,
                    type: "POST",
                    data: data,
                    dataType: 'json',
                    success: function (response) {
                        var itemsList = '';
                        var itemsArray = [];
                        $(".btn_view_items,.btn_save,.btn_run_job,.btn_cancel").hide();
                        $(".btn_prev").show();
                        $.each(response, function (index, element) {
                            itemsArray.push([element.id, element.name, element.date, element.existing, element.post_id, element.post_link, element.handle]);
                            allItemsInColl.push(element.id);
                        });
                        $("#allitemIDs").val(allItemsInColl.toString());
                        var perPage = chunkSize;
                        itemsCount = parseInt(itemsArray.length);
                        var totalPages = Math.ceil(parseInt(itemsArray.length) / perPage); // Get total pages for pagination
                        $(".check-all").attr('curr-page', 'items-0');
                        // Divides the retrieved items list for pagination
                        for (var i = 0; i <= itemsArray.length; i += perPage) {
                            var tempArray = itemsArray.slice(i, i + perPage);
                            $(".items-list:not(.imported-list) #items-" + i).remove();
                            if (i === 0) {
                                $(".items-list:not(.imported-list)").append("<div class='items' id='items-" + i + "'></div>");
                            } else {
                                $(".items-list:not(.imported-list)").append("<div class='items' id='items-" + i + "' style='display: none;'></div>");
                            }

                            // Append data of item chunked items.
                            for (var j = 0; j < tempArray.length; j++) {
                                // Check if the row is for import or ignore and set checkbox accordingly.
                                // console.log('PETER: Row: ', tempArray[j]);
                                var bExisting = (tempArray[j][3] == true ? true : false);
                                var status = "import";
                                // Ignore if existing
                                if (bExisting) {
                                    status = "ignore";
                                }
                                // Ignore if previously set to ignore

                                if ($('#ignoredItemIDs').val().split(',').includes(tempArray[j][0])) {
                                    status = "ignore"
                                }
                                var $row = '<div class="item-row' + (bExisting ? ' existing ' : '') + '" data-handle="' + tempArray[j][6] + '" data-existing="' + bExisting + '">';
                                var $checkboxes = '<div class="item-select"><input type="checkbox" name="item-' + tempArray[j][0] + '" value="' + tempArray[j][0] + '" id="import' + tempArray[j][0] + '"' + ((status == "import") ? ' checked ' : '') + (bExisting ? ' disabled readonly="readonly" ' : '') + ' /></div>';
                                $checkboxes = $checkboxes + '<div class="item-select"><input type="checkbox" name="item-' + tempArray[j][0] + '" value="' + tempArray[j][0] + '" id="ignore' + tempArray[j][0]  + '"' + ((status == "ignore") ? ' checked ' : '') + (bExisting ? ' disabled readonly="readonly" ' : '') +  '/></div>';
                                $row = $row + $checkboxes + '<div class="item-title" for="' + tempArray[j][0] + '">' + tempArray[j][1] + '</div>';
                                $row = $row + '<div class="item-date">';
                                $row = $row + '<a href="' + apiurl + tempArray[j][6] + '?show=full" title="View on OpenDocs" target="opendocs">Item</a>';
                                if (bExisting) {
                                    $row = $row + '&nbsp;|&nbsp;<a href="' + tempArray[j][5] + '" target="_blank">Post</a>';
                                }
                                $row = $row + '</div>';
                                $row = $row + '</div>';
                                $(".items-list:not(.imported-list) #items-" + i).append($row);
                            }
                        }
                        paginationHTML = addPagination(totalPages, perPage);
                        $(".items-list:not(.imported-list)").append(paginationHTML);
                        $(".items-list:not(.imported-list)").prepend(paginationHTML);
                        $(".ajax-loader").hide();
                        $(".publish-status").data('loaded', 'yes');
                    }
                });
            }
        });
        // Display previous page.
        $(".btn_prev .opendoc_btn, .btn_cancel .opendoc_btn").on('click', function (e) {
            $("[data-page='" + currentPage + "']").hide();
            currentPage = currentPage - 1;

            if ($(this).hasClass('opendoc_cancel_btn')) {
                currentPage = 1;
            }

            //console.log("PETER: Current Page: " + currentPage);

            $("[data-page='" + currentPage + "']").show();

            if (currentPage == 2) {
                $(".btn_wrap").hide();
                $(".btn_post_mapping").show();
            }
            if (currentPage == 4) {
                $(".btn_wrap").hide();
                $(".btn_import").show();
            }
            if (currentPage == 1) {
                $(".btn_wrap").hide();
                $(".imports-list.edit-list .items").remove();
            } else {
                $(".btn_prev").show();
            }
            if (currentPage == 3) {
                $(".btn_wrap").hide();
                if ($(this).attr('isSavedJob') == "1") {
                    $(".btn_cancel, .btn_save, .btn_run_job").show();
                } else {
                    $(".btn_view_items").show();
                }
            }
        });
        // Show selected page on page number click.
        $(".items-list, .existing-list").on('click', '.paginated a', function (e) {
            $(".paginated a").removeClass('active');
            $(this).addClass('active');
            var pageHref = $(this).attr('href');
            var perPage = $(this).data('perpage');
            pageHref = parseInt(pageHref.replace('#page', ''));
            pageHref = (pageHref - 1) * perPage;
            $(".items-list .items, .existing-list .items").hide();
            $(".items-list #items-" + pageHref).show();
            $(".existing-list #items-" + pageHref).show();
            $(".check-all").attr('curr-page', 'items-' + pageHref).attr('checked', false).first().attr('checked', true);
            e.preventDefault();
            return false;
        });
        $(".items-list:not('.imports-list')").on('click', 'input:checkbox', function (e) {
            var sameGroupCheckboxes = $(".items-list input:checkbox[name='" + $(this).attr('name') + "']");
            $(sameGroupCheckboxes).prop("checked", false);
            $(this).prop("checked", true);
        });

        // Start import of items on click.
        $("#opendocs_import").on('click', function (e) {
            var checkedItemIDs = [];
            var ignoreItemIDs = [];
            var collectionNames = [];
            var collectionHandles = [];
            var postMapping = [];
            var selectedPostType = [];
            var toImportIDs = [];
            var toImportItemIDs = [];
            var toImportPostItemIDs = [];
            var existingItemIDs = [];
            var existingItemList = [];
            var allItemIDs = [];
            var allItemsImported = [];
            var currentChunkPage = 0;
            var responseArray = [];

            var newIgnoredItemIds = [];
            var newIgnoredItemCount = 0;

            $(".items-list:not(.imported-list) .item-row").each(function (index) {
                if ($(this).find(".item-select").eq(1).find("input:checkbox").is(':checked')) {
                    ignoreItemIDs.push($(this).find(".item-select").eq(0).find("input:checkbox").val());
                }
            });

            $("#progress-wrap").show();

            var jobID = $("#job_id").val();
            var jobName = $(".job-title").val();
            var notifyEmail = $(".field-mapping").find(".notify-email input").val();
            var schedule_hour_day = [$(".field-mapping").find(".schedule-at #schedule-hour").val(), $(".field-mapping").find(".schedule-at #schedule-day").val()];
            var postStatus = $(".field-mapping").find("input[name='pub-status']:checked").val();
            selectedPostType.push({
                'collectionID': $('.field-mapping').data('collectionid'),
                'jobName': jobName,
                'collectionName': $("#sel_coll_name").val(),
                'collectionHandle': $("#sel_coll_handle").val(),
                'notifyEmail': notifyEmail,
                'postStatus': postStatus,
                'postType': $(".field-mapping .post_types").val(),
                'postTypeName': $(".field-mapping .post_types option:selected").text(),
                'frequency': $(".field-mapping").find('.radio-when:checked').val(),
                'when': schedule_hour_day
            });
            $(".mapping-table .table-row").each(function (index) {
                var dataType = $(this).find(".table-left select option:selected").data('field-type');
                if ($(this).find(".table-left select").val() !== 'not-selected' || $(this).find(".odocs-metadata").val() !== 'not-selected') {
                    if (dataType) {
                        switch (dataType) {
                            case 'taxonomy':
                                postMapping.push({
                                    'field_id': $(this).find(".table-left select").val(),
                                    'collectionID': $(this).parents('.field-mapping').data('collectionid'),
                                    'value': $(this).find(".odocs-metadata").val(),
                                    'type': $(this).find(".table-left select option:selected").data('field-type')
                                });
                                break;
                            case 'repeater':
                                postMapping.push({
                                    'field_id': $(this).find(".table-left select").val(),
                                    'collectionID': $(this).parents('.field-mapping').data('collectionid'),
                                    'value': $(this).find(".odocs-metadata").val(),
                                    'sub_fields': $(this).find(".table-left select option:selected").data('sub-fields'),
                                    'type': $(this).find(".table-left select option:selected").data('field-type'),
                                    'acf_name': $(this).find(".table-left select option:selected").data('field-name'),
                                    'sub_field_names': $(this).find(".table-left select option:selected").data('subfield-names')
                                });
                                break;
                        }
                    } else {
                        postMapping.push({
                            'field_id': $(this).find(".table-left select").val(),
                            'collectionID': $(this).parents('.field-mapping').data('collectionid'),
                            'value': $(this).find(".odocs-metadata").val(),
                            'acf_name': $(this).find(".table-left select option:selected").data('field-name')
                        });
                    }
                }
            });

            $(".items-to-import.items-list:not(.imported-list) .item-row").each(function (index) {
                totalRecords++;
                if ($(this).data('data-existing') == 'true' ) { // Can't import existing
                    existingItemCount++;
                } else {
                    if ($(this).find(".item-select").eq(1).find("input:checkbox").is(':checked')) {
                        //console.log('Ignored item', $(this).find(".item-select").eq(1).find("input:checkbox").val());
                        newIgnoredItemIds.push($(this).find(".item-select").eq(1).find("input:checkbox").val());
                    } else {
                        toImportIDs.push({
                            'id': $(this).find(".item-select").eq(0).find("input:checkbox").val(),
                            'collectionID': $(this).data('collectionid')
                        });
                        toImportItemIDs.push($(this).find(".item-select").eq(0).find("input:checkbox").val());
                        toImportCount++;
                    }
                }
            });

            addIgnoredItems(newIgnoredItemIds);
            newIgnoredItemCount = newIgnoredItemIds.length;
            var postType = $(".field-mapping .post_types").val();

            toImportPostItemIDs.push({
                'postType': postType,
                'collectionID': $('.field-mapping').data('collectionid'),
                'itemIDs': toImportItemIDs,
                'newIgnoredItems': newIgnoredItemIds
            });
            $("#toImportItemIDs").val(toImportItemIDs);

            console.log("To import " + toImportCount + " of: " + totalRecords + ", into " + postType + ", skipping ignored: " + newIgnoredItemCount);

            if (toImportCount > 0) {

                var finishMsg = '';
                var dataToImport = {
                    'postType': selectedPostType,
                    'postMapping': postMapping,
                    'itemID': toImportIDs,
                    'newIgnoredItemIDs': newIgnoredItemIds,
                    'allItems': $("#allitemIDs").val()
                };
                var newItemCount = toImportCount;
                var datatoSend = {
                    'action': 'insertItems',
                    'data': JSON.stringify(dataToImport)
                };
                $.ajax({
                    url: ajaxurl,
                    type: "POST",
                    data: datatoSend,
                    dataType: 'json',
                    postType: postType,
                    jobID: jobID,
                    timeout: 0,
                    beforeSend: function () {
                        //console.log('PETER: Prepare to store to imported items');
                        $(".form-wrap").hide();
                        $(".community-wrap .btn_wrap").hide();
                    },
                    success: function (response) {
                        callbackTimer = setTimeout(function () {
                            checkForImportedPosts(toImportCount, newItemCount, postType, jobID);
                        }, 2000);
                        postOnlyImportTimer = setTimeout(function () {
                            checkIfPostOnlyImportDone();
                        }, 1000);
                    },
                    error: function (jqXHR, exception) {
                        if (jqXHR.status !== 500) {
                            callbackTimer = setTimeout(function () {
                                checkForImportedPosts(toImportCount, newItemCount, postType, jobID);
                            }, 2000);
                            postOnlyImportTimer = setTimeout(function () {
                                checkIfPostOnlyImportDone();
                            }, 1000);
                        }
                    }
                });
                var bEmpty = false;
            } else {
                var bEmpty = true;
            }

            if (bEmpty) {
                $('<div id="finish-job" title="Info"><p>Empty import job<br />No items to import.</p></div>').dialog({
                    modal: true,
                    buttons: [{
                        text: "OK", click: function () {
                            $(this).dialog("close");
                            window.location.reload();
                        }
                    }]
                });
            }

            $(".form-wrap").hide();
            $(".community-wrap .btn_wrap").hide();
            allItemsImported.push({
                'postType': postType,
                'itemIDs': toImportIDs,
                'existingItems': $("#existingItemIDs").val().split(','),
                'jobID': jobID
            });
            // console.log('PETER: allItemsImported: ', allItemsImported);
            if (allItemsImported) {
                // Update the job with the recently updated items
                updateJobImportList(JSON.stringify(allItemsImported[0]));
                //showImportList(JSON.stringify(allItemsImported));
                console.log('All items imported');
            }
        });

        function addIgnoredItems(newIgnoredItems) {
            /* Update the database with the new Ignored items
            * Then update the on-screen field.
            */
            //console.log('PETER: addIgnoredItemIds', JSON.stringify(newIgnoredItems));
            var ajaxdata = {
                'action': 'addIgnoredItemIds',
                'data': JSON.stringify(newIgnoredItems)
            };

            $.ajax({
                url: ajaxurl,
                type: "POST",
                data: ajaxdata,
                dataType: 'json',
                timeout: 0,
                beforeSend: function () {
                    //console.log('PETER: About to update newIgnoredItems');
                },
                success: function (response) {
                    var IgnoredItemIds = [];
                    $.each(response, function (index, element) {
                        IgnoredItemIds.push(element);
                    });
                    $('#ignoredItemIDs').val(IgnoredItemIds.join(','));
                }
            });
        }

        function checkForImportedPosts(totalRecords, newItemCount, postType, jobID) {
            var itemIDs = $("#toImportItemIDs").val();
            var skippedMSG = '';
            $.ajax({
                url: ajaxurl,
                type: "POST",
                itemIDs: itemIDs,
                postType: postType,
                jobID: jobID,
                data: {
                    'action': 'checkIfImportComplete',
                    'data': itemIDs,
                },
                timeout: 0,
                success: function (response) {
                    var progress = parseInt(response) / newItemCount;
                    progress = Math.round(progress * 100);
                    successfullImports = response;
                    $(".progress-bar .progress").css("width", progress + "%").html(progress + "%");
                    console.log("PETER: Item Count: " + newItemCount + ", Imported: " + response + " into type " + postType + " for job " + jobID);

                    $('.imported-progress').html('Imported ' + response + ' items of ' + newItemCount + skippedMSG);
                    if (response == newItemCount) {
                        clearTimeout(callbackTimer);
                        updateJobImportList(JSON.stringify({'postType': postType,
                            'itemIDs': itemIDs,
                            'existingItems': '',
                            'jobID': jobID}));
                        //showImportList(itemIDs);
                        $('<div id="finish-job" title="Info"><p>Import job complete<br />' + newItemCount + ' items imported.</p><p><a target="_blank" href="/wp-admin/edit.php?post_type=' + postType + '&odocs_item_id='+ encodeURI(itemIDs) +'">View imported posts</a></p></div>').dialog({
                            modal: true,
                            buttons: [{
                                text: "OK", click: function () {
                                    $(this).dialog("close");
                                    window.location.reload();
                                }
                            }],
                        });
                    } else {
                        callbackTimer = setTimeout(function () {
                            checkForImportedPosts(totalRecords, newItemCount, postType, jobID);
                        }, 5000);
                    }
                },
                error: function (jqXHR, exception) {
                    callbackTimer = setTimeout(function () {
                        checkForImportedPosts(totalRecords, newItemCount, postType, jobID);
                    }, 5000);
                }
            });
        }

        function checkIfPostOnlyImportDone() {
            var itemIDs = $("#toImportItemIDs").val();
            var processed;
            //console.log('checkIfPostOnlyImportDone: ItemIDs', itemIDs);
            //console.log('checkIfPostOnlyImportDone: ItemIDs length', itemIDs.split(',').length);
            $.ajax({
                countItemIds: itemIDs.split(',').length,
                url: ajaxurl,
                type: "POST",
                data: {
                    'action': 'checkIfImportComplete',
                    'data': itemIDs,
                },
                timeout: 600000, // Wait 10 mins
                processed: 0,
                success: function (response) {
                    //console.log('PETER: checkifdone: Got ' + response + ' of '+ this.countItemIds);
                    if (response == this.countItemIds) {
                        // $('.imported-progress-info').html('Creation of posts done, now getting additional fields');
                        clearTimeout(postOnlyImportTimer);
                    } else {
                        $('.imported-progress-info').html('Creating posts');
                        processed = processed + 1;
                        postOnlyImportTimer = setTimeout(function () {
                            checkIfPostOnlyImportDone();
                        }, 3000);
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (textStatus == "timeout") {
                        $('.imported-progress-info').html('Creation of posts timed out after ' + processed + 'items imported.');
                    }
                }
            });
        }

        function checkforErrorImports() {
            var itemIDs = $("#toImportItemIDs").val();
            console.log(itemIDs);
            $.ajax({
                url: ajaxurl,
                type: "POST",
                data: {
                    'action': 'checkForErrorImports',
                    'data': itemIDs,
                },
                timeout: 0,
                success: function (response) {
                    errorImportTimer = setTimeout(function () {
                        checkforErrorImports();
                    }, 10000);
                }
            });
        }

        function showImportList(items) {
            $.ajax({
                url: ajaxurl,
                type: "POST",
                dataType: 'json',
                data: {
                    'action': 'showImportList',
                    'data': items,
                },
                timeout: 0,
                success: function (response) {
                    if (toImportCount <= 0) {
                        toImportCount = existingItemCount;
                    }
                    if (response) {
                        $(".progress-wrap").hide();
                        //showImportedPosts(response);
                    }
                }
            });
        }

        function ImportItem(data) {
            var isImported = 0;

            return isImported;
        }

        function updateJobImportList(items) {
            $.ajax({
                url: ajaxurl,
                type: "POST",
                dataType: 'json',
                data: {
                    'action': 'updateJobImportList',
                    'data': items,
                },
                timeout: 0,
                success: function (response) {
                    if (response) {
                        console.log('updateJobImportList: response', response);
                    }
                }
            });
        }
        function groupArrayByCollectionID(itemIDs, postTypes) {
            var groupedArray = [];
            for (var i = 0; i < postTypes.length; i++) {
                var tempArray = [];
                var collectionID = postTypes[i].collectionID;
                for (var j = 0; j < itemIDs.length; j++) {
                    if (itemIDs[j].collectionID == collectionID) {
                        tempArray.push(itemIDs[j].itemID);
                    }
                }
                groupedArray[collectionID] = tempArray;
            }
            return groupedArray;
        }

        function showImportedPosts(insertedPosts) {
            var collectionNames = [];
            var frequency = '';
            var paginationHTML = '';
            var schedules = [];
            var frequencies = '';
            var perPage = 20;
            var skippedMessage = '';
            var failedImportsMessage = '';
            var newImports = 0;
            var errorImports = 0;
            var newImportedItems = [];
            var days = [
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
            ];
            schedules.push({
                'time': $('.field-mapping').find('.schedule-at #schedule-hour').val(),
                'day': $('.field-mapping').find('.schedule-at #schedule-day').val(),
                'frequency': $('.field-mapping').find('.radio-when:checked').val(),
                'collName': $(".job-title").val()
            });

            for (var i = 0; i < insertedPosts.length; i++) {
                var tempArray = insertedPosts[i];
                if (tempArray.existing == 1) {
                    skippedImports++;
                    existingItems.push({
                        'id': tempArray.existingPost.id,
                        'handle': tempArray.existingPost.source,
                        'title': tempArray.existingPost.title,
                        'edit': tempArray.existingPost.edit,
                        'date': tempArray.existingPost.date,
                        'collectionID': tempArray.collectionID
                    });
                } else if (tempArray.error == 1) {
                    errorImports++;
                } else {
                    newImports++;
                    newImportedItems.push({
                        'id': tempArray.insertedPost.id,
                        'handle': tempArray.insertedPost.source,
                        'title': tempArray.insertedPost.title,
                        'edit': tempArray.insertedPost.edit,
                        'date': tempArray.insertedPost.date,
                        'collectionID': tempArray.collectionID
                    });
                }
            }

            collectionNames.push($(".job-title").val());

            console.log("Schedule: " + $('field-mapping').find('.radio-when:checked').val());

            for (var i = 0; i < schedules.length; i++) {
                if (schedules[i].frequency == 'immediately') {
                    frequency = 'Immediately';
                } else if (schedules[i].frequency == 'daily') {
                    frequency = 'Daily at ' + schedules[i].time;
                } else {
                    frequency = 'Every ' + days[schedules[i].day] + ' at ' + schedules[i].time;
                }
                frequencies = schedules[i].collName + " - " + frequency + "<br />" + frequencies;
            }
            if (skippedImports >= 1) {
                skippedMessage = ", skipped " + skippedImports + " items, as these are already imported";
            }

            if (failedToImport >= 1) {
                failedImportsMessage = ", failed to import " + failedToImport + " items, please re-run to import these again";
            }

            if (errorImports >= 1) {
                failedImportsMessage = ", error importing " + errorImports + " items, please re-run to import these";
            }

            if (newImports !== 0 && skippedImports >= 1) {
                $(".community-wrap").prepend("<h3><a href='#' class='view-skipped'>View Skipped Items</a></h3>");
            }

            $(".community-wrap").prepend("<h3 class='import-report'>" + frequencies + "</h3>");
            $(".community-wrap").prepend("<h3 class='import-report'>Imported " + newImports + " items" + skippedMessage + failedImportsMessage + " from " + collectionNames.join(', '));

            if (newImports >= 1) {
                generateList(newImportedItems, '.imported-list.items-list', 20, newImports);
            }
            if (newImports == 0 && skippedImports >= 1) {
                generateList(existingItems, '.imported-list.existing-list', 20, skippedImports);
            }
            $(".btn_wrap").hide();
        }

        $(".check-all").on('change', function () {
            var checkedboxID = $(this).data('type');
            var currentPage = $(this).attr('curr-page');
            $(".items[id='" + currentPage + "']").find('input[type="checkbox"]').removeAttr('checked');
            $(".items[id='" + currentPage + "']").find('input[id*="' + checkedboxID + '"]').attr('checked', 'checked');
        });

        $(".community-wrap").on('click', 'a.view-skipped', function (e) {
            generateList(existingItems, '.imported-list.existing-list', 20, skippedImports);
            $('html, body').animate({
                scrollTop: $('.imported-list.existing-list').offset().top
            }, 500);
            e.preventDefault();
            return false;
        });

        $(".edit-list .item-delete a").on('click', function (e) {
            var clickedId = $(this).data('cronid');
            var dataAction = $(this).data('action');
            var action = 'deleteCRONJob';
            $("#dialogAction").dialog({
                modal: true,
                buttons: {
                    "Ok": function () {
                        var data = {'action': action, 'data': clickedId};
                        var dialog = this;
                            $.ajax({
                            url: ajaxurl,
                            type: "POST",
                            data: data,
                            success: function (response) {
                                if (response == 1) {
                                    $('.edit-list .item-delete a[data-cronid="' + clickedId + '"]').parents('.item-row').remove();
                                }
                            }
                        });
                    },
                    "Cancel": function () {
                        $(this).dialog("close");
                    }
                },
                close: function(event, ui) {
                    //location.reload();
                }
            }).dialog("open");

            e.preventDefault();
            return false;
        });

        /*$(".imported-items").on('click', function (e) {
            $("#imported-items-dialog-" + $(this).data('cronid')).dialog("open");
            e.preventDefault();
            return false;
        });*/

        $(".existing-items").on('click', function (e) {
            $("#existing-items-dialog-" + $(this).data('cronid')).dialog("open");
            e.preventDefault();
            return false;
        });

        $("#delete-all").on('click', function (e) {
            $("#deleteAll").dialog('open');
            e.preventDefault();
            return false;
        });

        function generateList(itemList, divClass, perPage, itemCount) {
            var totalPages = Math.ceil(parseInt(itemCount) / perPage);
            for (var i = 0; i < itemList.length; i += perPage) {
                var tempArray = itemList.slice(i, i + perPage);
                if (i == 0) {
                    $(divClass).append("<div class='items' id='items-" + i + "'></div>");
                } else {
                    $(divClass).append("<div class='items' id='items-" + i + "' style='display: none;'></div>");
                }
                for (var j = 0; j < tempArray.length; j++) {
                    $(divClass + " #items-" + i).append("<div class='item-row' data-postID='" + tempArray[j].id + "'><div class='row coll-name'><a href='" + tempArray[j].edit + "' target='_blank'>" + tempArray[j].title + "</a></div><div class='coll-info'><p class='action-links'><a href='" + apiurl + tempArray[j].handle + "' target='_blank'>OpenDocs Link</a></p></div><div class='coll-date'>" + tempArray[j].date + "</div></div>");
                }
            }
            var paginationHTML = addPagination(totalPages, perPage);
            $(divClass).append(paginationHTML);
            $(divClass).prepend(paginationHTML);
            $(divClass).parent().parent().show();

        }

        function addPagination(totalPages, perPage) {
            paginationHTML = '';
            if (totalPages > 1) {
                var paginationHTML = '<div class="paginated">';
                for (var i = 1; i <= totalPages; i++) {
                    if (i == 1) {
                        paginationHTML = paginationHTML + '<a href="#page' + i + '" class="active" data-perpage="' + perPage + '">' + i + '</a>';
                    } else {
                        paginationHTML = paginationHTML + '<a href="#page' + i + '" data-perpage="' + perPage + '">' + i + '</a>';
                    }
                }
                paginationHTML = paginationHTML + '</div>';
            }
            return paginationHTML;
        }

        // Disable submission of form on Enter key
        $(".opendocs-form.form-wrap").on('keyup keypress', function (e) {
            var keyCode = e.keyCode || e.which;
            if (keyCode === 13) {
                e.preventDefault();
                return false;
            }
        });

        $(".abort-job a").on('click', function (e) {
            $('<div id="abortJob" title="Info"><p>Stop import job?</p></div>').dialog({
                modal: true,
                buttons: [{
                    text: "Ok", click: function () {
                        $(this).dialog("close");
                        window.location.reload();
                    }
                }, {
                    text: "Cancel", click: function () {
                        $(this).dialog("close");
                    }
                }]
            });
            e.preventDefault();
            return false;
        });

        $(".add-import-job .add-new").on('click', function (e) {
            if ($(".job-title").val() == '') {
                $("#validation-dialog").dialog({
                    modal: true,
                    buttons: {
                        "Ok": function () {
                            $(this).dialog("close");
                        }
                    }
                }).dialog("open");
            } else {
                $("#job_id").val(0);
                $("#job_name").val($(".job-title").val());
                $("#edit_coll_id").val(0);
                $(".form-wrap[data-page='1']").hide();
                $(".form-wrap[data-page='2']").show();
                $(".btn_prev").show();
                currentPage++;
            }
            e.preventDefault();
            return false;
        });

        $(".btn_save .opendoc_btn").on('click', function (e) {
            // Save the current job info.
            var jobName = $(".field-mapping input[name='job-name']").val();
            console.log('PETER: Jobname = '+jobName);
            var cronid = $('#tab-0').data('cron-id');
            var dataToImport = buildSaveData(cronid);
            var ajaxdata = {
                'action': 'updateImportJob',
                'data': JSON.stringify(dataToImport)
            };

            var promise = $.ajax({
                    url: ajaxurl,
                    type: "POST",
                    data: ajaxdata,
                    dataType: 'json',
                    timeout: 0,
                    beforeSend: function () {
                        $(".community-wrap .ajax-loader").show();
                    },
                    success: function (response) {
                        console.log("PETER: Updated job with cron_id: " + response);
                    }
                });

            promise.then(function() {
                $("#tabs .ui-tabs-active a").text(jobName);
                $('<div id="saveSuccess" title="Info"><p>Changes Saved</p></div>').dialog({
                    modal: true,
                    buttons: [{
                        text: "Ok", click: function () {
                            $(this).dialog("close");
                        }
                    }],
                    close: function (event, ui) {
                        location.reload();
                    }
                });
            });
        });

        $(".edit-job").on('click', function (e) {
            $(".form-wrap[data-page='1']").hide();
            $(".form-wrap[data-page='3']").show();
            // TODO: Work out why this is using the cron id from the delete button!
            cronID = $(this).parents(".item-row").find(".item-delete a").data("cronid");
            $('#job_id').val(cronID);
            $('#job_name').val(this.text);

            var $thisJobLink = $(this);
            $("#edit_coll_id").val($(this).data("collectionid"));
            $("#sel_coll_name").val($(this).data("coll-name"));
            $("#sel_coll_handle").val($(this).data("coll-handle"));
            $("#coll_item_count").val($(this).data("count"));
            $(".btn_cancel").show();
            currentPage++;
            var dataToSend = {'collID': $(this).data("collectionid"), 'cronID': cronID};
            var data = {
                'action': 'loadPostSelector',
                'data': JSON.stringify(dataToSend)
            };
            $.ajax({
                url: ajaxurl,
                type: "POST",
                data: data,
                beforeSend: function () {
                    $(".community-wrap .ajax-loader").show();
                },
                success: function (response1) {
                    currentPage = currentPage + 1;
                    $(".btn_save, .btn_run_job").show();
                    addTab(response1, $thisJobLink.html(), $thisJobLink.data("cronid"), $thisJobLink.data("collectionid"));
                    $(".field-mapping .post_types").val($thisJobLink.data("post-type"));
                    $(".post_sel input[type='text']").val($thisJobLink.text());
                    $("#collection_name").html('<a target="_opendocs" href="' + apiurl + $('#sel_coll_handle').val() + '">' + $('#sel_coll_name').val() + '</a>');
                    buildMappingTable($thisJobLink);
                    buildOptionsTable($thisJobLink);
                    $(".community-wrap .ajax-loader").hide();
                },
                error: function(jqXHR, exception) {
                    if (jqXHR.status === 0) {
                        alert('Not connect.\n Verify Network.');
                    } else if (jqXHR.status == 404) {
                        alert('Requested page not found. [404]');
                    } else if (jqXHR.status == 500) {
                        alert('Internal Server Error [500].');
                    } else if (exception === 'parsererror') {
                        alert('Requested JSON parse failed.');
                    } else if (exception === 'timeout') {
                        alert('Timeout error.');
                    } else if (exception === 'abort') {
                        alert('Ajax request aborted.');
                    } else {
                        alert('Uncaught Error.\n' + jqXHR.responseText);
                    }
                }

            });

            e.preventDefault();
            return false;
        });

        function buildSaveData(cronid = 0) {

            var saveSelPostType = [];
            var savePostMapping = [];
            var collName = $(".job-title").val();
            var jobName = $("#job_name").val();

            $(".field-mapping .post_types").each(function (index) {
                var schedule_hour_day = [$(this).parents('.field-mapping').find('.schedule-at #schedule-hour').val(), $(this).parents('.field-mapping').find('.schedule-at #schedule-day').val()];
                var postStatus = $(this).parents('.field-mapping').find('input[name="pub-status"]:checked').val();
                var notifyEmail = $(this).parents('.field-mapping').find('.notify-email input').val();
                saveSelPostType.push({
                    'collectionID': $(this).parent().parent().parent().data('collectionid'),
                    'collectionName': $('#sel_coll_name').val(),
                    'collectionHandle': $('#sel_coll_handle').val(),
                    'postStatus': postStatus,
                    'postType': $(this).val(),
                    'frequency': $(this).parents(".field-mapping").find('.radio-when:checked').val(),
                    'when': schedule_hour_day,
                    'notifyEmail': notifyEmail,
                    'hasFileURL': 0,
                });
            });
            $(".mapping-table .table-row").each(function (index) {

                var dataType = $(this).find(".table-left select option:selected").data('field-type');
                if ($(this).find(".table-left select").val() !== 'not-selected' || $(this).find(".odocs-metadata").val() !== 'not-selected') {
                    if (dataType) {
                        switch (dataType) {
                            case 'taxonomy':
                                savePostMapping.push({
                                    'field_id': $(this).find(".table-left select").val(),
                                    'collectionID': $(this).parents('.field-mapping').data('collectionid'),
                                    'field_name': $(this).find(".odocs-metadata").val(),
                                    'field_type': $(this).find(".table-left select option:selected").data('field-type')
                                });
                                break;
                            case 'repeater':
                                savePostMapping.push({
                                    'field_id': $(this).find(".table-left select").val(),
                                    'collectionID': $(this).parents('.field-mapping').data('collectionid'),
                                    'field_name': $(this).find(".odocs-metadata").val(),
                                    'sub_fields': $(this).find(".table-left select option:selected").data('sub-fields'),
                                    'field_type': $(this).find(".table-left select option:selected").data('field-type'),
                                    'acf_name': $(this).find(".table-left select option:selected").data('field-name'),
                                    'sub_field_names': $(this).find(".table-left select option:selected").data('subfield-names')
                                });
                                break;
                        }
                    } else {
                        savePostMapping.push({
                            'field_id': $(this).find(".table-left select").val(),
                            'collectionID': $(this).parents('.field-mapping').data('collectionid'),
                            'field_name': $(this).find(".odocs-metadata").val(),
                            'acf_name': $(this).find(".table-left select option:selected").data('field-name')
                        });
                    }
                }
            });
            var dataToImport = {
                'postType': saveSelPostType,
                'cronID': cronID,
                'jobName': jobName,
                'postMapping': savePostMapping,
            };
            return dataToImport;
        }

        function buildMappingTable(jobLinkOBJ) {
            var collID = jobLinkOBJ.data("collectionid");
            var savedMappings = JSON.parse(jobLinkOBJ.parent().parent().find(".job-post-mapping").html());
            var wpCoreOpts = jobLinkOBJ.parent().parent().find(".job-wp-fields select").html();
            var acfFields = $(".field-mapping[data-collectionid='" + collID + "'] .table-row.default").find(".odocs-metadata").clone().html();
            $(".field-mapping[data-collectionid='" + collID + "'] .mapping-table .table-row").remove();
            $.each(savedMappings, function (index, elem) {
                var delMapping = '';
                //console.log("PETER: buildMappingTable: " + elem.field_id + ", Mapping Field: " + elem.field_name);
                if (elem.field_name !== 'dc.title' && elem.field_name !== 'dc.date.accessioned' && elem.field_name !== 'dc.description.abstract' && elem.field_name !== 'dc.identifier.ag') {
                    delMapping = '<a href="#" class="del-mapping"><i class="fa fa-times" aria-hidden="true"></i></a>';
                }
                var tableLeft = "<div class='table-left'><select class='wp-field-sel' name='wp-field-sel'>" + wpCoreOpts + "</select></div>";
                var tableRight = "<div class='table-right'><select class='odocs-metadata' name='odocs-metadata'>" + acfFields + "</select>" + delMapping + "</div>";
                if (index == 0) {
                    $(".field-mapping[data-collectionid='" + collID + "'] .mapping-table").append("<div class='table-row default'>" + tableLeft + tableRight + "</div>");
                } else {
                    $(".field-mapping[data-collectionid='" + collID + "'] .mapping-table").append("<div class='table-row'>" + tableLeft + tableRight + "</div>");
                }
                $(".field-mapping[data-collectionid='" + collID + "'] .mapping-table .wp-field-sel:eq( " + index + " )").val(elem.field_id);
                $(".field-mapping[data-collectionid='" + collID + "'] .mapping-table .odocs-metadata:eq( " + index + " )").val(elem.field_name)
            });
            $.each(savedMappings, function (index, elem) {
                $(".field-mapping[data-collectionid='" + collID + "'] .mapping-table .wp-field-sel:eq( " + index + " )").attr("disabled", true);
                $(".field-mapping[data-collectionid='" + collID + "'] .mapping-table .odocs-metadata:eq( " + index + " )").attr("disabled", true);
            });
            $(".field-mapping[data-collectionid='" + collID + "'] .acf-mapping").show();
            $(".field-mapping[data-collectionid='" + collID + "'] .form-wrap").show();
        }

        function buildOptionsTable(jobLinkOBJ) {
            // This builds from the first page, which lists all jobs
            var collID = jobLinkOBJ.data("collectionid");
            var importRowOBJs = jobLinkOBJ.parent().parent();
            $(importRowOBJs).each( function (index, el) {
                var importRowOBJ = $(this);
                //console.log('PETER: Current Cron id for list: ' + importRowOBJ.find('.imported-items').data('cronid'));
                var savedFrequency = importRowOBJ.find(".col-frequency").data("frequency");
                var savedDay = importRowOBJ.find(".col-frequency").data("import-day");
                var savedTime = importRowOBJ.find(".col-frequency").data("import-at");
                var importPostStatus = importRowOBJ.find(".import-post").data("status");
                var notifyEmail = importRowOBJ.find(".coll-notify").html();
                $(".field-mapping[data-collectionid='" + collID + "']").find("input[name='radio-when']").filter("[value='" + importRowOBJ.find(".col-frequency").data("frequency") + "']").prop("checked", true).trigger("change");
                $(".field-mapping[data-collectionid='" + collID + "'] [data-schedule='" + savedFrequency + "']").find("#schedule-day").val(importRowOBJ.find(".col-frequency").data("import-day"));
                $(".field-mapping[data-collectionid='" + collID + "'] [data-schedule='" + savedFrequency + "']").find("#schedule-hour").val(importRowOBJ.find(".col-frequency").data("import-at"));
                $(".field-mapping[data-collectionid='" + collID + "']").find("input[name='pub-status']").filter("[value='" + importPostStatus + "']").prop("checked", true);
                $(".field-mapping[data-collectionid='" + collID + "']").find(".notify-email input").val(notifyEmail);
            });
        }

    });
    $(window).load(function () {
        $(".opendocs-communities").on('click', 'a', function (e) {
            $(this).toggleClass("open");
            var communityID = $(this).data("comm-id");
            var data = {'action': 'getSubCommunity', 'data': communityID,};
            if ($(this).data("type") !== 'collection') {
                if (!$(this).hasClass("loaded")) {
                    $.ajax({
                        url: ajaxurl,
                        type: "POST",
                        data: data,
                        dataType: 'json',
                        success: function (response) {
                            if (response.length !== 0) {
                                $(".opendocs-communities a[data-comm-id='" + communityID + "']").after("<div class='sub-community' data-parent-id='" + communityID + "'></div>");
                                $.each(response, function (index, element) {
                                    $(".sub-community[data-parent-id='" + communityID + "']").append("<a href='#' class='community' data-comm-id='" + element.id + "' data-type='community' data-comm-handle='" + element.handle + "' data-comm-name='" + element.name.replace(/\([0-9]+\)/, '') + "'><span class='toggle-icon'><i class='fa fa-plus' aria-hidden='true'></i></span>" + element.name + "</a>");
                                });
                            }
                            var data = {
                                'action': 'getCollections',
                                'data': communityID,
                            };
                            $.ajax({
                                url: ajaxurl,
                                type: "POST",
                                data: data,
                                dataType: 'json',
                                success: function (response1) {
                                    if (!$(".sub-community[data-parent-id='" + communityID + "']").length) {
                                        $(".opendocs-communities a[data-comm-id='" + communityID + "']").after("<div class='sub-community' data-parent-id='" + communityID + "'></div>");
                                    }
                                    $.each(response1, function (index, element) {
                                        $(".sub-community[data-parent-id='" + communityID + "']").append("<a href='#' class='community collection' data-collid='" + element.id + "' data-type='collection' data-count='" + element.count + "' data-comm-name='" + element.name + "' data-comm-handle='" + element.handle + "'>" + element.name + " (" + element.count + ") </a>");
                                    });
                                }
                            });
                        }
                    });
                } else {
                    $(".sub-community[data-parent-id='" + communityID + "']").toggle();
                }

            }

            $(".opendocs-communities a[data-comm-id='" + communityID + "']").addClass("loaded");
            if ($(".opendocs-communities a[data-comm-id='" + communityID + "']").hasClass("open")) {
                $(".opendocs-communities a[data-comm-id='" + communityID + "']").find(".toggle-icon").html("<i class='fa fa-minus' aria-hidden='true'></i>");
            } else {
                $(".opendocs-communities a[data-comm-id='" + communityID + "']").find(".toggle-icon").html("<i class='fa fa-plus' aria-hidden='true'></i>");
            }
            e.preventDefault();
            return false;
        });

        $(".opendocs-communities").on('click', 'a.collection', function (e) {
            var $currentColl = $(this);

            var data = {
                'data': $(this).data("collid"),
                'action': 'isCollectionInCRON'
            };
            $.ajax({
                'url': ajaxurl,
                'type': "POST",
                'data': data,
                'success': function (response) {
                    $(".opendocs-communities a.community").removeClass("selected-collection");
                    selectCollection(response, $currentColl);
                }
            });
            e.preventDefault();
            return false;
        });

        $(" #tabs ").on('click', 'li a', function (e) {
            var collID = $(this).data('coll-id');
            $(".sel-collections select").val(collID);
        });


        function selectCollection(isCRONRunning, $currentColl) {
            var parentCommID = $($currentColl).parent().data("parent-id");
            var parentCommName = parentElems($currentColl.get(0));
            var isAdded = false;
            var selectedCollName = $currentColl.html();
            var selectedCollHandle = $currentColl.data('commHandle');
            var collParents = [];
            var collParentNames = '';
            if (isCRONRunning == 1) {
                $("#dialog").dialog('open');
            } else {
                $currentColl.addClass('selected-collection');
                collParents.push($currentColl.data('comm-name'));
                $(".opendocs-communities a.selected-collection").parents(".sub-community").each(function (i) {
                    collParents.push($(this).prev().data('comm-name'));
                });

                collParents = collParents.reverse();

                $("#sel_coll_name").val(collParents.join(' -> '));
                $("#sel_coll_handle").val(selectedCollHandle);

                $(".btn_post_mapping").show();
                $('html, body').animate({
                    scrollTop: $(".btn_post_mapping").offset().top
                }, 2000);
                collId = $($currentColl).data("collectionid");
                parentCommName.push($($currentColl).text());
                var communitiesBreadCrumb = '';
                for (var i = 0; i < parentCommName.length; i++) {
                    if (i >= 1) {
                        communitiesBreadCrumb = communitiesBreadCrumb + " > " + parentCommName[i];
                    } else {
                        communitiesBreadCrumb = communitiesBreadCrumb + parentCommName[i];
                    }
                }
                $(".btn_post_mapping button").attr("selCollName", selectedCollName).attr("commBreadCrumb", communitiesBreadCrumb);
            }
        }

        $(".btn_post_mapping button").on('click', function () {
            $(".community-wrap .ajax-loader").show();
            var dataToLoad = {'cronID': cronID, 'collID': $(".opendocs-communities a.selected-collection").data("collid")};
            var data = {
                'action': 'loadPostSelector',
                'data': JSON.stringify(dataToLoad)
            };
            $.ajax({
                url: ajaxurl,
                type: "POST",
                data: data,
                success: function (response1) {
                    currentPage = currentPage + 1;
                    var jobtitle = $(".opendocs-form .job-title").val();
                    addTab(response1, jobtitle, 0, $(".opendocs-communities a.selected-collection").data("collid"));
                    $(".field_mapping input[name='job_title']").val(jobtitle);
                    $(".field-mapping .field-mapping-title").html('Select Post Type to import for <a target="opendocs" href="'+ apiurl + $(".opendocs-communities a.selected-collection").data("comm-handle")+'">' + $(".opendocs-communities a.selected-collection").data("comm-name")) + '</a>';
                    $(".community-wrap .ajax-loader").hide();
                    $( 'html, body' ).animate( { scrollTop: $( "#tabs" ).offset().top }, 500 );
                    $(".btn_post_mapping").hide();
                    $(".form-wrap[data-page='2']").hide();
                    $(".form-wrap[data-page='3']").show();
                    $(".btn_view_items").show();
                }
            });
            if ($(".field-mapping[data-collectionid='" + collId + "'] .post_types").val() != 'sel') {
                $(".field-mapping[data-collectionid='" + collId + "'] .acf-mapping").show();
            }
            $(".action-links .clear-all").show();
        });

        function parentElems(elements, _array) {
            if (_array === undefined) {
                _array = [];
            } else {
                _array.push(elements.innerText);
            }
            // do recursion until BODY is reached
            if (!elements.classList.contains('toplevel')) return parentElems(elements.parentNode.previousElementSibling, _array);
            else return _array.reverse();
        }

        $(".sel-collections select").on('change', function (e) {

        });

        $(".community-wrap").on('change', '.field-mapping .post_types', function (e) {
            collId = $(this).parents(".field-mapping").data('collectionid');
            taxFields = [];
            cfields = [];
            var coreFields = [];
            var selPostType = $(this).val();
            var data = {
                'action': 'getACFields',
                'cptName': selPostType
            };
            console.log('PETER: getACFFields: ',data);
            if ($(this).val() != 'sel') {
                $(".field-mapping .acf-mapping").show();
                $(".btn_next").show();
                $(".field-mapping .ajax-loader").show();
                $.ajax({
                    url: ajaxurl,
                    type: "POST",
                    data: data,
                    dataType: 'json',
                    timeout: 0,
                    success: function (response1) {
                        cfields = [];
                        coreFields = {
                            'dc.title': 'Title',
                            'dc.date.accessioned': 'Date',
                            'dc.description.abstract': 'Content',
                            'dc.identifier.ag': 'IDS Identifier'
                        };
                        coreFieldsLength = 0;

                        for (var prop in coreFields) {
                            if ($(".odocs-metadata option[value='" + prop + "']").length > 0) {
                                cfields.push(coreFields[prop]);
                                coreFields['dc.identifier.ag'] = 'IDS Identifier';
                                coreFieldsLength++;
                            }
                        }
                        $.each(response1, function (index, element) {
                            if (element.type == 'repeater') {
                                cfields.push(element.id + "{{}}" + element.label + "{{}}" + element.sub_fields + "{{}}" + element.type + "{{}}" + element.name + "{{}}" + element.sub_fields_names);
                            } else {
                                cfields.push(element.id + "{{}}" + element.label + "{{}}" + element.type + "{{}}" + element.name);
                            }

                        });
                        $(".field-mapping .mapping-table .wp-field-sel").html('');
                        $(".field-mapping .mapping-table .default .wp-field-sel").append('<option value="not-selected">Select Wordpress Field</option>');
                        for (var i = 0; i < coreFieldsLength; i++) {
                            $(".field-mapping .mapping-table .default .wp-field-sel").append('<option value="' + cfields[i] + '">' + cfields[i] + '</option>');
                        }
                        $(".field-mapping .mapping-table .table-row:not(.default)").remove();
                        coreFieldsTempLength = coreFieldsLength - 1;
                        for (var i = coreFieldsLength; i < cfields.length; i++) {
                            var acf_field_meta = cfields[i];
                            acf_field_meta = acf_field_meta.split("{{}}");
                            // Check for repeater
                            if (acf_field_meta.length !== 4) {
                                $(".field-mapping .mapping-table .default .wp-field-sel").append('<option value="' + acf_field_meta[0] + '" data-sub-fields="' + acf_field_meta[2] + '" data-field-name="' + acf_field_meta[4] + '" data-subfield-names="' + acf_field_meta[5] + '" data-field-type="repeater">' + acf_field_meta[1] + ' (' + acf_field_meta[3] + ')</option>');
                            } else {
                                $(".field-mapping .mapping-table .default .wp-field-sel").append('<option value="' + acf_field_meta[0] + '" data-field-name="' + acf_field_meta[3] + '">' + acf_field_meta[1] + ' (' + acf_field_meta[2] + ')</option>');
                            }
                        }
                        // Get Post taxonomy list
                        var taxonomy_data = {
                            'action': 'getTaxonomies',
                            'cptName': selPostType
                        };
                        $.ajax({
                            url: ajaxurl,
                            type: "POST",
                            data: taxonomy_data,
                            dataType: 'json',
                            timeout: 0,
                            success: function (response1) {
                                $.each(response1, function (index, element) {
                                    taxFields.push(element.tax_id + ", " + element.label + ", " + element.type);
                                });
                                for (var i = 0; i < taxFields.length; i++) {
                                    var tax_field_meta = taxFields[i];
                                    tax_field_meta = tax_field_meta.split(", ");
                                    $(".field-mapping .mapping-table .default .wp-field-sel").append('<option value="' + tax_field_meta[0] + '" data-field-type="taxonomy">' + tax_field_meta[1] + '</option>');
                                }
                                $(".field-mapping .ajax-loader").hide();
                                loadCoreFieldOptions(coreFields);
                            }
                        });
                    }
                });
            } else {
                $(".field-mapping .acf-mapping").hide();
                $(".btn_next").hide();
            }
        });

        $(".community-wrap").on('click', '.new-mapping a', function (e) {
            collId = $(this).parents(".field-mapping").data('collectionid');
            var metaDataSelect = $(".field-mapping .default .odocs-metadata").html();
            var mapping_options = '<select class="wp-field-sel">';
            mapping_options = mapping_options + '<option value="not-selected">Select WordPress field</option>';
            if (cfields.length > 3) {
                for (var i = coreFieldsLength; i < cfields.length; i++) {
                    var acf_field_meta = cfields[i];
                    acf_field_meta = acf_field_meta.split("{{}}");
                    if (acf_field_meta.length !== 4) {
                        mapping_options = mapping_options + '<option value="' + acf_field_meta[0] + '" data-sub-fields="' + acf_field_meta[2] + '" data-field-name="' + acf_field_meta[4] + '"  data-subfield-names="' + acf_field_meta[5] + '" data-field-type="repeater">' + acf_field_meta[1] + ' (' + acf_field_meta[3] + ')</option>';
                    } else {
                        mapping_options = mapping_options + '<option value="' + acf_field_meta[0] + '" data-field-name="' + acf_field_meta[3] + '">' + acf_field_meta[1] + ' (' + acf_field_meta[2] + ')</option>';
                    }
                }
                for (var i = 0; i < taxFields.length; i++) {
                    var tax_field_meta = taxFields[i];
                    tax_field_meta = tax_field_meta.split(", ");
                    mapping_options = mapping_options + '<option value="' + tax_field_meta[0] + '" data-field-type="taxonomy">' + tax_field_meta[1] + '</option>';
                }
            } else {
                mapping_options = mapping_options + $(".field-mapping .table-row.default .wp-field-sel").html();
            }

            mapping_options = mapping_options + '</select>';
            $(".field-mapping .mapping-table").append('<div class="table-row"><div class="table-left">' + mapping_options + '</div><div class="table-right"><select class="odocs-metadata">' + metaDataSelect + '</select><a href="#" class="del-mapping"><i class="fa fa-times" aria-hidden="true"></i></a></div></div>');
            if (cfields.length == 3) {

            }
            e.preventDefault();
            return false;
        });

        $(".add-fieldMapping a.add-new").on('click', function (e) {
            $(".mapping-table .field-labels").append("<div class='table-row' data-saved='0'><div class='table-left'><input type='text' class='mapping-field' /></div><div class='table-middle'><input type='text' class='mapping-desc' /></div><div class='table-right'><input type='text' class='mapping-label' /></div><a href='#' class='del-fieldLabel'><i class='fa fa-times' aria-hidden='true'></i></a></div>");
            $(".no-field-labels").hide();
            e.preventDefault();
            return false;
        });

        $(".add-fieldMapping a.save").on('click', function (e) {
            var toSaveLabels = [];
            $(".mapping-table .table-row[data-saved='0']").each(function (i) {
                var fieldName = $(this).find(".mapping-field").val();
                var fieldLabel = $(this).find(".mapping-label").val();
                var fieldDesc = $(this).find(".mapping-desc").val();
                toSaveLabels.push({'name': fieldName, 'label': fieldLabel, 'desc': fieldDesc});
            });
            $(".ajax-loader").show();
            var data = {
                'action': 'saveFieldLabels',
                'data': JSON.stringify(toSaveLabels)
            };
            $.ajax({
                url: ajaxurl,
                type: "POST",
                data: data,
                dataType: 'json',
                success: function (response) {
                    $(".ajax-loader").hide();
                    $.each(response, function (index, element) {
                        $(".mapping-table .mapping-field").each(function (index) {
                            if ($(this).val() == element.name) {
                                $(this).attr("disabled", "true").parent().parent().data("saved", 1).data("label-id", element.id);
                            }
                        });

                    });
                }
            });
            e.preventDefault();
            return false;
        });

        $(".community-wrap").on('click', '.del-mapping', function (e) {
            var $thisRow = $(this).parent().parent();
            $('<div id="saveSuccess" title="Info"><p>Delete Mapping?</p></div>').dialog({
                modal: true,
                buttons: {
                    "Ok": function () {
                        $thisRow.remove();
                        $(this).dialog("close");
                    }, "Cancel": function () {
                        $(this).dialog("close");
                    }
                }
            });
            e.preventDefault();
            return false;
        });

        $(".community-wrap").on('click', '.del-fieldLabel', function (e) {
            if ($(this).parent().data('saved') == 1) {
                var $thisRow = $(this);
                var fieldLabelID = $(this).parent().data('label-id');
                $(".ajax-loader").show();
                $("#deleteFieldLabel").dialog({
                    buttons: {
                        "Ok": function () {
                            var $this = $(this);
                            var data = {
                                'action': 'deleteFieldLabel',
                                'data': fieldLabelID
                            };
                            $.ajax({
                                url: ajaxurl,
                                type: "POST",
                                data: data,
                                dataType: 'json',
                                success: function (response) {
                                    if (response == 1) {
                                        $thisRow.parent().remove();
                                        $this.dialog("close");
                                    }
                                    $(".ajax-loader").hide();
                                }
                            });
                        },
                        "Cancel": function () {
                            $(".ajax-loader").hide();
                            $(this).dialog("close");
                        }
                    }
                });
                $("#deleteFieldLabel").dialog("open");
            } else {
                $(this).parent().remove();
            }
            if ($(".field-labels").children().length == 1) {
                $(".no-field-labels").show();
            }
            e.preventDefault();
            return false;
        });

        $(".action-links .remove").on('click', function (e) {
            var selCollectionID = $(".sel-collections select").val();
            $(".sel-collections select option[value='" + selCollectionID + "']").remove();
            e.preventDefault();
            return false;
        });

        $(".action-links .clear-all").on('click', function (e) {
            $(".sel-collections select").html('');
            $("#tabs").tabs('destroy');
            $(".btn_next").hide();
            e.preventDefault();
            return false;
        });

        function loadCoreFieldOptions(coreFields) {
            for (var i = 0; i < coreFieldsLength - 1; i++) {
                var wpCore = $(".field-mapping .default .wp-field-sel").html();
                var acfFields = $(".field-mapping .default .odocs-metadata").html();
                $(".field-mapping .mapping-table").append('<div class="table-row new"><div class="table-left"><select class="wp-field-sel">' + wpCore + '</select></div><div class="table-right"><select class="odocs-metadata">' + acfFields + '</select></div></div>');
            }
            var coreFieldCounter = 0;
            for (var key in coreFields) {
                if ($(".odocs-metadata option[value='" + key + "']").length > 0) {
                    $(".field-mapping .mapping-table .wp-field-sel:eq( " + coreFieldCounter + " )").val(coreFields[key]).attr("disabled", true);
                    $(".field-mapping .mapping-table .odocs-metadata:eq( " + coreFieldCounter + " )").val(key).attr("disabled", true);
                    coreFieldCounter++;
                }
            }
        }

    });

    function addTab(tabContent, title, cronID, collID) {
        var tabCounter = 0;
        $("#tabs").show();
        if ($("#tabs > ul").length !== 0) {
            $("#tabs").tabs("destroy");
            $("#tabs").html('');
        }

        tabCounter = $("#tabs .ui-tabs-nav li").length;
        var tempTabIndex = 0;
        //if( $(" #tabs > ul").length == 0 ) {
        $(" #tabs ").append("<ul></ul>");
        $("#tabs").tabs({});
        //}
        $("#tabs ul").append('<li><a href="#tab-' + tabCounter + '" data-coll-id="' + collID + '" data-tab-id = "0">' + title + '</a></li>');
        if ($("#tabContent-" + collID).length) {
            $("#tabs").append('<div data-collid="' + collID + '" data-cron-id="' + cronID + '" id="tab-' + tabCounter + '" class="ui-tabs-panel ui-widget-content ui-corner-bottom"><div class="field-mapping form-wrap" data-page="1" data-collectionid="' + collID + '">' + tabContent + '</div></div>');
        } else {
            $("#tabs").append('<div data-collid="' + collID + '" data-cron-id="' + cronID + '" id="tab-' + tabCounter + '" class="ui-tabs-panel ui-widget-content ui-corner-bottom">' + tabContent + '</div>');
        }
        $("#tabs .ui-tabs-nav li").each(function (index) {
            if (tempTabIndex <= tabCounter) {
                $(this).find("a").attr('href', '#tab-' + tempTabIndex);
                tempTabIndex++;
            }
        });
        tempTabIndex = 0;
        $("#tabs .ui-tabs-panel").each(function (index) {
            if (tempTabIndex <= tabCounter) {
                $(this).attr('id', 'tab-' + tempTabIndex);
                tempTabIndex++;
            }
        });
        $("#tabs").tabs("refresh");
        $("#tabs").tabs("option", "active", tabCounter);
    }

})(jQuery);
