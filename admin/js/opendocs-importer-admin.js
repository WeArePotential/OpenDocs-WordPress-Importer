(function ($) {
    //Declare global variables
    'use strict';
    var currentPage = 1; // Holds Current page number
    var cfields = ['Title', 'Date', 'Content']; // Default fields
    var taxFields = [];
    var collId = '';
    var skippedImports = 0;
    var existingItems = [];
    var chunkSize = 100;
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
    var cronID = -1;

    $(function () {
        // Show initial page
        $(".form-wrap[data-page='1']").show();
        // Set's up Jquery UI dialogs
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

        $("#deleteAll").dialog({
            autoOpen: false,
            modal: true,
            show: "blind",
            hide: "blind",
            buttons: {
                "Ok": function () {
                    var $this = $(this);
                    var data = {'action': 'deleteAllRejected'};
                    $.ajax({
                        url: ajaxurl,
                        type: "POST",
                        data: data,
                        success: function (response) {
                            if (response == 1) {
                                $('.rejected .item-row').remove();
                                $('.rejected .list-header').html('<h4>No rejected items!</h4>');
                                $this.dialog("close");
                            }
                        }
                    });
                },
                "Cancel": function () {
                    $(this).dialog("close");
                }
            }
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
            var collectionID = [];
            var itemsCount = 0;
            var paginationHTML = '';
            var allItemsInColl = [];

            if ($(".publish-status").attr('data-loaded') !== 'yes') {
                if ($(".opendocs-communities a.community").hasClass("selected-collection")) {
                    itemsCount = $(".opendocs-communities a.community.selected-collection").attr("data-count");
                    collectionID.push(new Array(itemsCount, $(".opendocs-communities a.community.selected-collection").attr('data-coll-id'), $("#existingItemIDs").html().split(',')));
                } else {
                    itemsCount = $("#coll_item_count").val();
                    collectionID.push(new Array(itemsCount, $("#edit_coll_id").val(), $("#existingItemIDs").html().split(',')));
                }

                // Retrieves items in selected collection (ignores rejected items)
                var data = {
                    'action': 'getItemsInCollection',
                    'data': collectionID
                };
                $(".ajax-loader").show();
                $.ajax({
                    url: ajaxurl,
                    type: "POST",
                    data: data,
                    dataType: 'json',
                    success: function (response) {
                        var itemsList = '';
                        var itemsArray = [];
                        var rejectedItems = [];
                        $(".ajax-loader").hide();
                        $(".btn_view_items,.btn_save,.btn_run_job,.btn_cancel").hide();
                        $(".btn_prev").show();
                        if ($("#rejected_items").val()) {
                            rejectedItems = $("#rejected_items").val();
                            rejectedItems = rejectedItems.split(', ');
                        }
                        $.each(response, function (index, element) {
                            if (rejectedItems.indexOf(element.id) === -1) {	// Check if item id is in reject list
                                itemsArray.push([element.id, element.name, element.date, element.collectionID, element.existing]);
                            }
                            allItemsInColl.push(element.id);
                        });
                        $("#allitemIDs").html(allItemsInColl.toString());
                        var perPage = 100;
                        itemsCount = parseInt(itemsArray.length);
                        var totalPages = Math.ceil(parseInt(itemsArray.length) / perPage); // Get total pages for pagination
                        $(".check-all").attr('curr-page', 'items-0');
                        // Divides the retrieved items list for pagination
                        for (var i = 0; i <= itemsArray.length; i += perPage) {
                            var tempArray = itemsArray.slice(i, i + perPage);
                            if (i === 0) {
                                $(".items-list:not(.imported-list)").append("<div class='items' id='items-" + i + "'></div>");
                            } else {
                                $(".items-list:not(.imported-list)").append("<div class='items' id='items-" + i + "' style='display: none;'></div>");
                            }
                            // Append data of item chunked items.
                            for (var j = 0; j < tempArray.length; j++) {
                                $(".items-list:not(.imported-list) #items-" + i).append("<div class='item-row' data-collectionid='" + tempArray[j][3] + "' existing='" + tempArray[j][4] + "'><div class='item-select'><input type='checkbox' name='item-" + tempArray[j][0] + "' value='" + tempArray[j][0] + "' id='import" + tempArray[j][0] + "' checked /></div><div class='item-select'><input type='checkbox' name='item-" + tempArray[j][0] + "' value='" + tempArray[j][0] + "' id='ignore" + tempArray[j][0] + "' /></div><div class='item-select'><input type='checkbox' name='item-" + tempArray[j][0] + "' value='" + tempArray[j][0] + "' id='reject" + tempArray[j][0] + "' /></div><label for='" + tempArray[j][0] + "'>" + tempArray[j][1] + "</label></div>");
                            }
                        }
                        paginationHTML = addPagination(totalPages, perPage);
                        $(".items-list:not(.imported-list)").append(paginationHTML);
                        $(".items-list:not(.imported-list)").prepend(paginationHTML);
                        $(".publish-status").attr('data-loaded', 'yes');
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

            console.log("Current Page: " + currentPage);

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
            var perPage = $(this).attr('data-perpage');
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
            $(sameGroupCheckboxes).attr("checked", false);
            $(this).attr("checked", true);
        });

        // Start import of items on click.
        $("#opendocs_import").on('click', function (e) {
            var checkedItemID = [];
            var ignoreIDs = [];
            var collectionNames = [];
            var postMapping = [];
            var selectedPostType = [];
            var toImportIDs = [];
            var toImportItemIDs = [];
            var toImportPostItemIDs = [];
            var existingItemIDs = [];
            var existingItemList = [];
            var allItemIDs = [];
            var allItemsExported = [];
            var currentChunkPage = 0;
            var responseArray = [];
            var chunkPages = 0;


            $(".items-list:not(.imported-list) .item-row").each(function (index) {
                if ($(this).find(".item-select").eq(2).find("input:checkbox").is(':checked')) {
                    checkedItemID.push($(this).find(".item-select").eq(2).find("input:checkbox").val());
                }
                if ($(this).find(".item-select").eq(2).find("input:checkbox").is(':checked')) {
                    ignoreIDs.push($(this).find(".item-select").eq(1).find("input:checkbox").val());
                }
            });
            var data = {
                'action': 'updateRejectedItems',
                'data': checkedItemID,
            };
            $.ajax({
                url: ajaxurl,
                type: "POST",
                data: data,
                dataType: 'json',
                success: function (response) {
                    console.log('Rejected Items updated, code ' + response);
                }
            });

            var jobName = $(".job-title").val();
            var notifyEmail = $(".field-mapping").find(".notify-email input").val();
            var schedule_hour_day = [$(".field-mapping").find(".schedule-at #schedule-hour").val(), $(".field-mapping").find(".schedule-at #schedule-day").val()];
            var postStatus = $(".field-mapping").find("input[name='pub-status']:checked").val();
            selectedPostType.push({
                'collectionID': $('.field-mapping').attr('data-collectionid'),
                'jobName': jobName,
                'collectionName': $("#sel-coll-name").val(),
                'notifyEmail': notifyEmail,
                'postStatus': postStatus,
                'postType': $(".field-mapping .post_types").val(),
                'postTypeName': $(".field-mapping .post_types option:selected").text(),
                'frequency': $(".field-mapping").find('.radio-when:checked').val(),
                'when': schedule_hour_day
            });
            $(".mapping-table .table-row").each(function (index) {
                var dataType = $(this).find(".table-left select option:selected").attr('data-field-type');
                if ($(this).find(".table-left select").val() !== 'not-selected' || $(this).find(".odocs-metadata").val() !== 'not-selected') {
                    if (dataType) {
                        switch (dataType) {
                            case 'taxonomy':
                                postMapping.push({
                                    'field_id': $(this).find(".table-left select").val(),
                                    'collectionID': $(this).parents('.field-mapping').attr('data-collectionid'),
                                    'value': $(this).find(".odocs-metadata").val(),
                                    'type': $(this).find(".table-left select option:selected").attr('data-field-type')
                                });
                                break;
                            case 'repeater':
                                postMapping.push({
                                    'field_id': $(this).find(".table-left select").val(),
                                    'collectionID': $(this).parents('.field-mapping').attr('data-collectionid'),
                                    'value': $(this).find(".odocs-metadata").val(),
                                    'sub_fields': $(this).find(".table-left select option:selected").attr('data-sub-fields'),
                                    'type': $(this).find(".table-left select option:selected").attr('data-field-type'),
                                    'acf_name': $(this).find(".table-left select option:selected").attr('data-field-name'),
                                    'sub_field_names': $(this).find(".table-left select option:selected").attr('data-subfield-names')
                                });
                                break;
                        }
                    } else {
                        postMapping.push({
                            'field_id': $(this).find(".table-left select").val(),
                            'collectionID': $(this).parents('.field-mapping').attr('data-collectionid'),
                            'value': $(this).find(".odocs-metadata").val(),
                            'acf_name': $(this).find(".table-left select option:selected").attr('data-field-name')
                        });
                    }
                }
            });
            $(".items-to-import.items-list:not(.imported-list) .item-row").each(function (index) {
                if ($(this).find(".item-select").eq(0).find("input:checkbox").is(':checked')) {
                    if (ignoreIDs.indexOf($(this).find(".item-select").eq(0).find("input:checkbox").val()) == -1) {
                        totalRecords++;
                    }
                }
            });

            $(".items-to-import.items-list:not(.imported-list) .item-row").each(function (index) {
                if ($(this).find(".item-select").eq(0).find("input:checkbox").is(':checked')) {
                    if (ignoreIDs.indexOf($(this).find(".item-select").eq(0).find("input:checkbox").val()) == -1) {
                        if ($(this).attr('existing') == "0") {
                            toImportIDs.push({
                                'id': $(this).find(".item-select").eq(0).find("input:checkbox").val(),
                                'collectionID': $(this).attr('data-collectionid')
                            });
                            toImportItemIDs.push($(this).find(".item-select").eq(0).find("input:checkbox").val());
                            toImportCount++;
                        }
                        if ($(this).attr('existing') == "1") {
                            existingItemIDs.push({
                                'id': $(this).find(".item-select").eq(0).find("input:checkbox").val(),
                                'collectionID': $(this).attr('data-collectionid')
                            });
                            existingItemList.push($(this).find(".item-select").eq(0).find("input:checkbox").val());
                            existingItemCount++;
                        }
                    }
                }
            });

            toImportPostItemIDs.push({
                'postType': $(".field-mapping .post_types").val(),
                'collectionID': $('.field-mapping').attr('data-collectionid'),
                'itemIDs': toImportItemIDs,
                'existingItems': existingItemList
            });

            chunkPages = Math.ceil(toImportCount / chunkSize);
            $("#toImportItemIDs").html(JSON.stringify(toImportPostItemIDs));

            var newItemCount = totalRecords - existingItemCount;

            console.log("To Import Count: " + newItemCount + ", of: " + totalRecords + ", existing: " + existingItemCount);

            var dataToImport = {
                'postType': selectedPostType,
                'postMapping': postMapping,
                'itemID': toImportIDs,
                'existingItemIDs': existingItemList,
                'allItems': $("#allitemIDs").html()
            };
            var datatoSend = {
                'action': 'insertItems',
                'data': JSON.stringify(dataToImport)
            };
            if (newItemCount > 0) {
                $.ajax({
                    url: ajaxurl,
                    type: "POST",
                    data: datatoSend,
                    dataType: 'json',
                    timeout: 0,
                    beforeSend: function () {
                        $(".form-wrap").hide();
                        $(".progress-wrap").show();
                        $(".community-wrap .btn_wrap").hide();
                    },
                    success: function (response) {
                        callbackTimer = setTimeout(function () {
                            checkForImportedPosts(toImportCount, newItemCount, existingItemCount);
                        }, 2000);
                        postOnlyImportTimer = setTimeout(function () {
                            checkIfPostOnlyImportDone();
                        }, 1000);
                    },
                    error: function (jqXHR, exception) {
                        if (jqXHR.status !== 500) {
                            callbackTimer = setTimeout(function () {
                                checkForImportedPosts(toImportCount, newItemCount, existingItemCount);
                            }, 2000);
                            postOnlyImportTimer = setTimeout(function () {
                                checkIfPostOnlyImportDone();
                            }, 1000);
                        }
                    }
                });
            } else {
                $(".form-wrap").hide();
                $(".form-wrap.existing-items-list").show();
                $(".community-wrap .btn_wrap").hide();
                allItemsExported.push({
                    'postType': $(".field-mapping .post_types").val(),
                    'itemIDs': allItemIDs,
                    'existingItems': $("#existingItemIDs").html().split(',')
                });
                showImportList(JSON.stringify(allItemsExported));
            }
        });
        $("#tabs").on('change', ".import-when input[type='radio']", function (e) {
            var schedule_at = $(this).val();
            var currCollID = $("#tabs .ui-tabs-active a").attr('data-tab-id');
            $(".ui-tabs-panel .import-when .schedule-at").hide();
            $(".ui-tabs-panel .import-when .schedule-at[data-schedule='" + schedule_at + "']").show();
        });

        function checkForImportedPosts(totalRecords, newItemCount, existingItemCount) {
            var itemIDs = $("#toImportItemIDs").html();
            var skippedMSG = '';

            $.ajax({
                url: ajaxurl,
                type: "POST",
                data: {'action': 'checkIfImportComplete', 'data': itemIDs},
                timeout: 0,
                success: function (response) {
                    var progress = parseInt(response) / newItemCount;
                    progress = Math.round(progress * 100);
                    successfullImports = response;
                    $(".progress-bar .progress").css("width", progress + "%").html(progress + "%");
                    console.log("Item Count: " + newItemCount + ", Imported: " + response);
                    if (existingItemCount !== 0) {
                        skippedMSG = ', skipped ' + existingItemCount;
                    }
                    $('.imported-progress').html('Imported ' + response + ' items of ' + newItemCount + skippedMSG);
                    if (response == newItemCount) {
                        clearTimeout(callbackTimer);
                        showImportList(itemIDs);
                    } else {
                        callbackTimer = setTimeout(function () {
                            checkForImportedPosts(totalRecords, newItemCount, existingItemCount);
                        }, 5000);
                    }
                },
                error: function (jqXHR, exception) {
                    callbackTimer = setTimeout(function () {
                        checkForImportedPosts(totalRecords, newItemCount, existingItemCount);
                    }, 5000);
                }
            });
        }

        function checkIfPostOnlyImportDone() {
            var itemIDs = $("#toImportItemIDs").html();
            $.ajax({
                url: ajaxurl,
                type: "POST",
                data: {'action': 'checkIfImportComplete', 'data': itemIDs},
                timeout: 0,
                success: function (response) {
                    if (response == 1) {
                        $('.imported-progress-info').html('Creation of posts done, now getting additional fields');
                        clearTimeout(postOnlyImportTimer);
                    } else {
                        $('.imported-progress-info').html('Creating posts');
                        postOnlyImportTimer = setTimeout(function () {
                            checkIfPostOnlyImportDone();
                        }, 5000);
                    }
                }
            });
        }

        function checkforErrorImports() {
            var itemIDs = $("#toImportItemIDs").html();
            console.log(itemIDs);
            $.ajax({
                url: ajaxurl,
                type: "POST",
                data: {'action': 'checkForErrorImports', 'data': itemIDs},
                timeout: 0,
                success: function (response) {
                    errorImportTimer = setTimeout(function () {
                        checkforErrorImports();
                    }, 10000);
                }
            });
        }

        function showImportList(items) {
            console.log('showImportList: ',items );
            $.ajax({
                url: ajaxurl,
                type: "POST",
                dataType: 'json',
                data: {'action': 'showImportList', 'data': items},
                timeout: 0,
                success: function (response) {
                    if (toImportCount <= 0) {
                        toImportCount = existingItemCount;
                    }
                    showImportedPosts(response);
                    $(".progress-wrap").hide();
                    $('.ajax-loader').hide();
                }
            });
        }

        function ImportItem(data) {
            var isImported = 0;

            return isImported;
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

            for (var i = 0; i < totalRecords; i++) {
                var tempArray = insertedPosts[i];
                console.log(tempArray.existing);
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
            var checkedboxID = $(this).attr('data-type');
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
            var clickedId = $(this).attr('data-id');
            var dataAction = $(this).attr('data-action');
            var action = 'deleteCRONJob';
            if (dataAction == 'rejectedItem') {
                action = 'deleteRejectedItem';
            }
            $("#dialogAction").dialog({
                modal: true,
                buttons: {
                    "Ok": function () {
                        var data = {'action': action, 'data': clickedId};
                        $.ajax({
                            url: ajaxurl,
                            type: "POST",
                            data: data,
                            success: function (response) {
                                if (response == 1) {
                                    $('.edit-list .item-delete a[data-id="' + clickedId + '"]').parents('.item-row').remove();
                                    $("#dialogAction").dialog("close");
                                }
                            }
                        });
                    },
                    "Cancel": function () {
                        $(this).dialog("close");
                    }
                }
            }).dialog("open");

            //$("#dialogAction").dialog("open");

            e.preventDefault();
            return false;
        });

        $(".imported-items").on('click', function (e) {
            var clickedId = $(this).attr('data-cronid');

            $("#imported-items-dialog-" + clickedId).dialog("open");
            e.preventDefault();
            return false;
        });

        $(".existing-items").on('click', function (e) {
            var clickedId = $(this).attr('data-cronid');

            $("#existing-items-dialog-" + clickedId).dialog("open");
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
                    $(divClass + " #items-" + i).append("<div class='item-row' data-postID='" + tempArray[j].id + "'><div class='row coll-name'><a href='" + tempArray[j].edit + "' target='_blank'>" + tempArray[j].title + "</a></div><div class='coll-info'><p class='action-links'><a href='http://opendocs.ids.ac.uk/opendocs/handle/" + tempArray[j].handle + "' target='_blank'>OpenDocs Link</a></p></div><div class='coll-date'>" + tempArray[j].date + "</div></div>");
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
            $('<div id="abortJob" title="Info"><p>Stop Import Job?</p></div>').dialog({
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
                $(".job-name").html($(".job-title").val());
                $(".form-wrap[data-page='1']").hide();
                $(".form-wrap[data-page='2']").show();
                $(".btn_prev").show();
                currentPage++;
            }
            e.preventDefault();
            return false;
        });

        $(".btn_save .opendoc_btn").on('click', function (e) {
            var saveSelPostType = [];
            var savePostMapping = [];
            var jobName = $(".field-mapping input[name='job_name']").val();

            $(".field-mapping .post_types").each(function (index) {
                var collName = $(".job-title").val();
                var notifyEmail = $(this).parents('.field-mapping').find('.notify-email input').val();
                var schedule_hour_day = [$(this).parents('.field-mapping').find('.schedule-at #schedule-hour').val(), $(this).parents('.field-mapping').find('.schedule-at #schedule-day').val()];
                var postStatus = $(this).parents('.field-mapping').find('input[name="pub-status"]:checked').val();
                saveSelPostType.push({
                    'collectionID': $(this).parent().parent().parent().attr('data-collectionid'),
                    'collectionName': collName,
                    'notifyEmail': notifyEmail,
                    'postStatus': postStatus,
                    'postType': $(this).val(),
                    'frequency': $(this).parents(".field-mapping").find('.radio-when:checked').val(),
                    'when': schedule_hour_day
                });
            });
            $(".mapping-table .table-row").each(function (index) {
                var dataType = $(this).find(".table-left select option:selected").attr('data-field-type');
                if ($(this).find(".table-left select").val() !== 'not-selected' || $(this).find(".odocs-metadata").val() !== 'not-selected') {
                    if (dataType) {
                        switch (dataType) {
                            case 'taxonomy':
                                savePostMapping.push({
                                    'field_id': $(this).find(".table-left select").val(),
                                    'collectionID': $(this).parents('.field-mapping').attr('data-collectionid'),
                                    'field_name': $(this).find(".odocs-metadata").val(),
                                    'field_type': $(this).find(".table-left select option:selected").attr('data-field-type')
                                });
                                break;
                            case 'repeater':
                                savePostMapping.push({
                                    'field_id': $(this).find(".table-left select").val(),
                                    'collectionID': $(this).parents('.field-mapping').attr('data-collectionid'),
                                    'field_name': $(this).find(".odocs-metadata").val(),
                                    'sub_fields': $(this).find(".table-left select option:selected").attr('data-sub-fields'),
                                    'field_type': $(this).find(".table-left select option:selected").attr('data-field-type'),
                                    'acf_name': $(this).find(".table-left select option:selected").attr('data-field-name'),
                                    'sub_field_names': $(this).find(".table-left select option:selected").attr('data-subfield-names')
                                });
                                break;
                        }
                    } else {
                        savePostMapping.push({
                            'field_id': $(this).find(".table-left select").val(),
                            'collectionID': $(this).parents('.field-mapping').attr('data-collectionid'),
                            'field_name': $(this).find(".odocs-metadata").val(),
                            'acf_name': $(this).find(".table-left select option:selected").attr('data-field-name')
                        });
                    }
                }
            });
            var dataToImport = {
                'postType': saveSelPostType,
                'cronID': cronID,
                'jobName': jobName,
                'postMapping': savePostMapping
            };
            var datatoSend = {'action': 'updateImportJob', 'data': JSON.stringify(dataToImport)};
            $.ajax({
                    url: ajaxurl,
                    type: "POST",
                    data: datatoSend,
                    dataType: 'json',
                    timeout: 0,
                    beforeSend: function () {
                        $(".community-wrap .ajax-loader").show();
                    },
                    success: function (response) {
                        $(".community-wrap .ajax-loader").hide();
                        if (response > 0) {
                            $("#tabs .ui-tabs-active a").text(jobName);
                            $('<div id="saveSuccess" title="Info"><p>Changes Saved</p></div>').dialog({
                                modal: true,
                                buttons: [{
                                    text: "Ok", click: function () {
                                        $(this).dialog("close");
                                    }
                                }]
                            });
                        }
                        console.log("Updated: " + response);
                    }
                }
            );
        });

        $(".edit-job").on('click', function (e) {
            $(".form-wrap[data-page='1']").hide();
            $(".form-wrap[data-page='3']").show();
            cronID = $(this).parents(".item-row").find(".item-delete a").attr("data-id");
            var $thisJobLink = $(this);
            $("#edit_coll_id").val($(this).attr("data-coll-id"));
            $("#coll_item_count").val($(this).attr("data-count"));
            $(".btn_cancel").show();
            currentPage++;
            var dataToSend = {'collID': $(this).attr("data-coll-id"), 'cronID': cronID};
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
                    addTab(response1, $thisJobLink.html(), $thisJobLink.attr("data-coll-id"));
                    $(".field-mapping .post_types").val($thisJobLink.attr("data-postType"));
                    $(".post_sel input[type='text']").val($thisJobLink.text());
                    buildMappingTable($thisJobLink);
                    buildOptionsTable($thisJobLink);
                    $(".community-wrap .ajax-loader").hide();
                }
            });

            e.preventDefault();
            return false;
        });

        function buildMappingTable(jobLinkOBJ) {
            var collID = jobLinkOBJ.attr("data-coll-id");
            var savedMappings = JSON.parse(jobLinkOBJ.parent().parent().find(".job-post-mapping").html());
            var wpCoreOpts = jobLinkOBJ.parent().parent().find(".job-wp-fields select").html();
            var acfFields = $(".field-mapping[data-collectionid='" + collID + "'] .table-row.default").find(".odocs-metadata").clone().html();
            $(".field-mapping[data-collectionid='" + collID + "'] .mapping-table .table-row").remove();
            $.each(savedMappings, function (index, elem) {
                var delMapping = '';
                console.log("WP Core: " + elem.field_id + ", Mapping Field: " + elem.field_name);
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
            var collID = jobLinkOBJ.attr("data-coll-id");
            var importRowOBJ = jobLinkOBJ.parent().parent();
            var savedFrequency = importRowOBJ.find(".col-frequency").attr("data-frequency");
            var savedDay = importRowOBJ.find(".col-frequency").attr("data-import-day");
            var savedTime = importRowOBJ.find(".col-frequency").attr("data-import-at");
            var importPostStatus = importRowOBJ.find(".import-post").attr("data-status");
            var notifyEmail = importRowOBJ.find(".coll-notify").html();
            $(".field-mapping[data-collectionid='" + collID + "']").find("input[name='radio-when']").filter("[value='" + importRowOBJ.find(".col-frequency").attr("data-frequency") + "']").attr("checked", true).trigger("change");
            $(".field-mapping[data-collectionid='" + collID + "'] [data-schedule='" + savedFrequency + "']").find("#schedule-day").val(importRowOBJ.find(".col-frequency").attr("data-import-day"));
            $(".field-mapping[data-collectionid='" + collID + "'] [data-schedule='" + savedFrequency + "']").find("#schedule-hour").val(importRowOBJ.find(".col-frequency").attr("data-import-at"));
            $(".field-mapping[data-collectionid='" + collID + "']").find("input[name='pub-status']").filter("[value='" + importPostStatus + "']").attr("checked", true);
            $(".field-mapping[data-collectionid='" + collID + "']").find(".notify-email input").val(notifyEmail);
        }

    });
    $(window).load(function () {
        $(".opendocs-communities").on('click', 'a', function (e) {
            $(this).toggleClass("open");
            var communityID = $(this).attr("data-comm-id");
            var data = {
                'action': 'getSubCommunity',
                'data': communityID,
            };
            if ($(this).attr("data-type") !== 'collection') {
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
                                    $(".sub-community[data-parent-id='" + communityID + "']").append("<a href='#' class='community' data-comm-id='" + element.id + "' data-type='community' data-comm-name='" + element.name.replace(/\([0-9]+\)/, '') + "'><span class='toggle-icon'><i class='fa fa-plus' aria-hidden='true'></i></span>" + element.name + "</a>");
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
                                        $(".sub-community[data-parent-id='" + communityID + "']").append("<a href='#' class='community collection' data-coll-id='" + element.id + "' data-type='collection' data-count='" + element.count + "' data-comm-name='" + element.name + "'>" + element.name + " (" + element.count + ") </a>");
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
                'data': $(this).attr("data-coll-id"),
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
            var collID = $(this).attr('data-tab-id');
            $(".sel-collections select").val(collID);
        });


        function selectCollection(isCRONRunning, $currentColl) {
            var parentCommID = $($currentColl).parent().attr("data-parent-id");
            var parentCommName = parentElems($currentColl.get(0));
            var isAdded = false;
            var selectedCollName = $currentColl.html();
            var collParents = [];
            var collParentNames = '';
            if (isCRONRunning == 1) {
                $("#dialog").dialog('open');
            } else {
                $currentColl.addClass('selected-collection');
                collParents.push($currentColl.attr('data-comm-name'));
                $(".opendocs-communities a.selected-collection").parents(".sub-community").each(function (i) {
                    collParents.push($(this).prev().attr('data-comm-name'));
                });

                collParents = collParents.reverse();

                $("#sel-coll-name").val(collParents.join(' -> '));

                $(".btn_post_mapping").show();
                $('html, body').animate({
                    scrollTop: $(".btn_post_mapping").offset().top
                }, 2000);
                collId = $($currentColl).attr("data-coll-id");
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
            var dataToLoad = {'cronID': cronID, 'collID': collId};
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
                    addTab(response1, $(".opendocs-form .job-title").val(), $(".opendocs-communities a.community[class='selected-collection']").attr("data-coll-id"));
                    $(".field-mapping .field-mapping-title").html('Select Post Type to import ' + $(".opendocs-communities a.selected-collection").attr("data-comm-name"));
                    $(".community-wrap .ajax-loader").hide();
                    //$( 'html, body' ).animate( { scrollTop: $( "#tabs" ).offset().top }, 500 );
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
            collId = $(this).parents(".field-mapping").attr('data-collectionid');
            taxFields = [];
            cfields = [];
            var coreFields = [];
            var selPostType = $(this).val();
            var data = {
                'action': 'getACFields',
                'cptName': selPostType
            };
            console.log(data);
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
                                cfields.push(element.id + "{{}}" + element.label + "{{}}" + element.sub_fields + "{{}}" + element.type + "{{}}" + element.name + "{{}}" + element.sub_fields_name);
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
            collId = $(this).parents(".field-mapping").attr('data-collectionid');
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
                                $(this).attr("disabled", "true").parent().parent().attr("data-saved", 1).attr("data-label-id", element.id);
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
            if ($(this).parent().attr('data-saved') == 1) {
                var $thisRow = $(this);
                var fieldLabelID = $(this).parent().attr('data-label-id');
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

    function addTab(tabContent, title, collID) {
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
        $("#tabs ul").append('<li><a href="#tab-' + tabCounter + '" data-tab-id="' + collID + '">' + title + '</a></li>');
        if ($("#tabContent-" + collID).length) {
            $("#tabs").append('<div data-coll-id="' + collID + '" id="tab-' + tabCounter + '" class="ui-tabs-panel ui-widget-content ui-corner-bottom"><div class="field-mapping form-wrap" data-page="1" data-collectionid="' + collID + '">' + tabContent + '</div></div>');
        } else {
            $("#tabs").append('<div data-coll-id="' + collID + '" id="tab-' + tabCounter + '" class="ui-tabs-panel ui-widget-content ui-corner-bottom">' + tabContent + '</div>');
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
