/**
 * Module Description
 * 
 * NSVersion    Date                    Author         
 * 1.00         2017-08-10 14:11:49     Ankith 
 *
 * Remarks:  Client script for the Item Pricing Page       
 * 
 * @Last Modified by:   Ankith
 * @Last Modified time: 2019-12-11 13:54:48
 *
 */



var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://1048144-sb3.app.netsuite.com';
}

var package_name_create = new Array(); //Array to capture all the package names assignes to services
var package_count_create = new Array(); // Array to capture all the prices based on the service type. so that during validation, it helps to determine, no two service types has the same price
var item_array = new Array();
var item_price_array = [];
var package_count = 0;
var item_count = 0;
var item_price_count = 0;
var package_create = true;
var discount_created = new Array();

var count_click = 0;

var package_call = false;

var ctx = nlapiGetContext();

$(window).load(function() {
    // Animate loader off screen
    $(".se-pre-con").fadeOut("slow");;
});

/**
 * [pageInit description] - On page initialization, load the addresses for this customer and create the array to make sure the Services entereed are unique. 
 */
function pageInit() {

    var customer_id = parseInt(nlapiGetFieldValue('customer'));

    var customer_record = nlapiLoadRecord('customer', customer_id);

    var zeeLocation = nlapiLoadRecord('partner', customer_record.getFieldValue('partner')).getFieldValue('location');

    //Search: SMC - Services
    var searched_jobs = nlapiLoadSearch('customrecord_service', 'customsearch_smc_services');

    var newFilters = new Array();
    newFilters[0] = new nlobjSearchFilter('custrecord_service_customer', null, 'is', parseInt(nlapiGetFieldValue('customer')));

    searched_jobs.addFilters(newFilters);

    var resultSet = searched_jobs.runSearch();

    //Create the item_price_array and package_name_create arrays based on the existing service records
    resultSet.forEachResult(function(searchResult) {

        var item_description = searchResult.getValue('custrecord_service_description');
        if (isNullorEmpty(item_description)) {
            item_description = 0;
        } else {
            item_description = item_description.replace(/\s+/g, '-').toLowerCase()
        }

        if (item_price_array[searchResult.getValue('custrecord_service')] == undefined) {
            item_price_array[searchResult.getValue('custrecord_service')] = [];
            item_price_array[searchResult.getValue('custrecord_service')][0] = searchResult.getValue('custrecord_service_price') + '_' + item_description;
        } else {
            var size = item_price_array[searchResult.getValue('custrecord_service')].length;
            item_price_array[searchResult.getValue('custrecord_service')][size] = searchResult.getValue('custrecord_service_price') + '_' + item_description;
        }

        item_price_count++;
        return true;
    });


    //Create the item_price_array and package_name_create arrays based on the financial tab items, if the service records do not exist
    if (item_price_count == 0) {

        for (y = 1; y <= nlapiGetLineItemCount('new_services'); y++) {
            var item_description = nlapiGetLineItemValue('new_services', 'new_description', y);
            if (isNullorEmpty(item_description)) {
                item_description = 0;
            } else {
                item_description = item_description.replace(/\s+/g, '-').toLowerCase()
            }
            if (item_price_array[nlapiGetLineItemValue('new_services', 'new_item', y)] == undefined) {
                item_price_array[nlapiGetLineItemValue('new_services', 'new_item', y)] = [];
                item_price_array[nlapiGetLineItemValue('new_services', 'new_item', y)][0] = nlapiGetLineItemValue('new_services', 'new_itemprice', y) + '_' + item_description;
            } else {
                var size = item_price_array[nlapiGetLineItemValue('new_services', 'new_item', y)].length;
                item_price_array[nlapiGetLineItemValue('new_services', 'new_item', y)][size] = nlapiGetLineItemValue('new_services', 'new_itemprice', y) + '_' + item_description;
            }
        }
    }

    console.log(item_price_array);


    /**
     * [searched_jobs description] - Load all the Addresses related to this customer
     * 
     */
    var searched_jobs = nlapiLoadSearch('customer', 'customsearch_smc_address');

    var newFilters = new Array();
    newFilters[0] = new nlobjSearchFilter('internalid', null, 'is', parseInt(nlapiGetFieldValue('customer')));

    searched_jobs.addFilters(newFilters);

    var resultSet = searched_jobs.runSearch();

    resultSet.forEachResult(function(searchResult) {

        var id = searchResult.getValue('addressinternalid', 'Address', null);
        var addr1 = searchResult.getValue('address1', 'Address', null);
        var addr2 = searchResult.getValue('address2', 'Address', null);
        var city = searchResult.getValue('city', 'Address', null);
        var state = searchResult.getValue('state', 'Address', null);
        var zip = searchResult.getValue('zipcode', 'Address', null);
        var lat = searchResult.getValue('custrecord_address_lat', 'Address', null);
        var lon = searchResult.getValue('custrecord_address_lon', 'Address', null);
        var default_shipping = searchResult.getValue('isdefaultshipping', 'Address', null);
        var default_billing = searchResult.getValue('isdefaultbilling', 'Address', null);
        var notaservice = searchResult.getValue("custrecord_not_a_service_address", "Address", null);


        //If the billing address does not have the lat/lng field set then hide all the other sections
        if (default_shipping == 'T' && (isNullorEmpty(notaservice) || notaservice == '2')) {
            if (isNullorEmpty(lon) || isNullorEmpty(lat)) {
                nlapiSetFieldValue('billing_address_error', 'F');
                document.getElementById('custpage_pricing_pane').style.display = 'none';
                document.getElementById('custpage_new_pricing_tab_pane').style.display = 'none';
                if (!isNullorEmpty(document.getElementById('custpage_invoices_pane'))) {
                    document.getElementById('custpage_invoices_pane').style.display = 'none';
                }
                document.getElementById('tr_add_order').style.display = 'none';
                document.getElementById('tr_secondaryadd_order').style.display = 'none';
                document.getElementById('tr_submitter').style.display = 'none';
                document.getElementById('tr_secondarysubmitter').style.display = 'none';
                // document.getElementById('tr_back').style.display = 'none';
                // document.getElementById('tr_secondaryback').style.display = 'none';
                document.getElementById('tr_secondaryreset').style.display = 'none';
                document.getElementById('tr_reset').style.display = 'none';
                document.getElementById('alert_box').style.display = 'none';
            }
        }

        return true;
    });

    nlapiSetFieldDisplay('custpage_html3', false);

    var error_status = nlapiGetFieldValue('custpage_error');
    if (error_status == 'T') {
        nlapiSetFieldDisplay('custpage_html3', true);
    }
}

//On click of Review Addresses, go to Address Module
function reviewAddresses() {

    var params = {
        custid: parseInt(nlapiGetFieldValue('customer')),
        id: 'customscript_sl_smc_main',
        deploy: 'customdeploy_sl_smc_main'
    };
    params = JSON.stringify(params);
    var upload_url = baseURL + nlapiResolveURL('suitelet', 'customscript_sl_mod_address', 'customdeploy_sl_mod_address') + '&params=' + params;
    window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
}

function newReviewAddresses() {

    var params = {
        custid: parseInt(nlapiGetFieldValue('customer')),
        id: 'customscript_sl_smc_main',
        deploy: 'customdeploy_sl_smc_main'
    };
    params = JSON.stringify(params);
    var upload_url = baseURL + nlapiResolveURL('suitelet', 'customscript_sl_new_address_module', 'customdeploy_sl_new_address_module') + '&params=' + params;
    window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
}

//On click of create package, sends to create package page to give name to new package
function addPackage() {

    count_click++;

    var customer = parseInt(nlapiGetFieldValue('customer'));

    var count = updateServices();

    if (count == false) {
        return false;
    }

    var params = {
        custid: parseInt(nlapiGetFieldValue('customer')),
        id: 'customscript_sl_smc_main',
        deploy: 'customdeploy_sl_smc_main'
    };
    params = JSON.stringify(params);
    var upload_url = baseURL + nlapiResolveURL('suitelet', 'customscript_sl_mod_package', 'customdeploy_sl_mod_package') + '&params=' + params;
    window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");

}

//From package page, it comes to this function and the page is reloaded.
function submit_package(customer, back) {
    if (back == 'back') {
        var url = baseURL + nlapiResolveURL('suitelet', 'customscript_sl_smc_main', 'customdeploy_sl_smc_main') + '&custid=' + customer;
        window.open(url, "_self", "height=500,width=800,modal=yes,alwaysRaised=yes");
    } else {
        document.getElementById("secondarysubmitter").click();
    }


}

//Validate delete of service items. The service records are made inactive as requested by Will.
function validateDelete(type) {
    if (type == 'new_services') {
        if (confirm("Are you sure you want to delete this item?\n\nThis action cannot be undone.")) {
            var item_name = nlapiGetCurrentLineItemValue(type, 'new_item');
            var item_package = nlapiGetCurrentLineItemValue(type, 'new_item_package');
            if (item_name == 17 && !isNullorEmpty(item_package)) {
                discount_created[item_package] = 'F';
            }
            if (!isNullorEmpty(nlapiGetCurrentLineItemValue(type, 'new_servicesinternalid'))) {

                //Inactive the service record on remove

                var service_record_id = nlapiGetCurrentLineItemValue(type, 'new_servicesinternalid');

                var service_record = nlapiLoadRecord('customrecord_service', service_record_id);

                service_record.setFieldValue('isinactive', 'T');

                nlapiSubmitRecord(service_record);
            }
            return true;
        } else {
            return false;
        }
    }
}

function clientFieldChanged(type, name, linenum) {

    if (type == 'new_services') {
        //Validate that discount cannot be selected as the service type manually
        if (name == 'new_item') {
            var item_name = nlapiGetCurrentLineItemValue('new_services', 'new_item');
            if (item_name == 17) {
                alert('Discount cannot be added manually.\n Discounts gets added only when Packages are assigned to two or more service items.');
                nlapiCancelLineItem('new_services');
                return false;
            } else if (!isNullorEmpty(nlapiGetCurrentLineItemValue('new_services', 'new_servicesinternalid'))) {
                alert('Cannot update this Service. Please remove this service and add a new service.');
                nlapiCancelLineItem('new_services');
                return false;
            }
            nlapiSetCurrentLineItemValue('new_services', 'new_changerow', 'T');
        }
        //validate that no two same service types will have the same price
        if (name == 'new_itemprice') {

            var item_name = nlapiGetCurrentLineItemValue('new_services', 'new_item');
            var item_price = nlapiGetCurrentLineItemValue('new_services', 'new_itemprice');
            var item_desc = nlapiGetCurrentLineItemValue('new_services', 'new_description');

            if (isNullorEmpty(item_desc)) {
                item_desc = 0;
            } else {
                item_desc = item_desc.replace(/\s+/g, '-').toLowerCase()
            }

            if (isNullorEmpty(nlapiGetCurrentLineItemValue('new_services', 'new_servicesinternalid'))) {


                if (item_price_array[item_name] != undefined) {

                    if (isNullorEmpty(item_price_array[item_name].length)) {
                        return false;
                    }

                    var size = item_price_array[item_name].length;

                    for (var x = 0; x < size; x++) {

                        var price_desc = item_price_array[item_name][x];

                        price_desc = price_desc.split('_');

                        if (price_desc[0] == item_price && price_desc[1] == item_desc) {
                            alert('Duplicate Service with same price has been entered');
                            // errorAlert('Error', 'Duplicate Service with same price has been entered'); 
                            nlapiCancelLineItem('new_services');
                            return false;
                        }
                    }

                    item_price_array[item_name][x] = item_price + '_' + item_desc;

                } else {
                    item_price_array[item_name] = [];
                    item_price_array[item_name][0] = item_price + '_' + item_desc;
                }
            } else {

                var new_service_record = nlapiLoadRecord('customrecord_service', nlapiGetCurrentLineItemValue('new_services', 'new_servicesinternalid'));

                var old_price = new_service_record.getFieldValue('custrecord_service_price');

                if (item_price_array[item_name] != undefined) {

                    if (isNullorEmpty(item_price_array[item_name].length)) {
                        return false;
                    }

                    var size = item_price_array[item_name].length;

                    for (var x = 0; x < size; x++) {

                        var price_desc = item_price_array[item_name][x];

                        price_desc = price_desc.split('_');

                        if (price_desc[0] == item_price && price_desc[1] == item_desc) {
                            alert('Duplicate Service with same price has been entered');
                            // errorAlert('Error', 'Duplicate Service with same price has been entered'); 
                            nlapiCancelLineItem('new_services');
                            return false;
                        } else if (price_desc[0] == old_price && price_desc[1] == item_desc) {
                            item_price_array[item_name][x] = item_price + '_' + item_desc;
                        }
                    }
                }
            }
            nlapiSetCurrentLineItemValue('new_services', 'new_changerow', 'T');

        }
        if (name == 'new_description' && !isNullorEmpty(nlapiGetCurrentLineItemValue('new_services', 'new_itemprice'))) {
            var item_name = nlapiGetCurrentLineItemValue('new_services', 'new_item');
            var item_price = nlapiGetCurrentLineItemValue('new_services', 'new_itemprice');
            var item_desc = nlapiGetCurrentLineItemValue('new_services', 'new_description');

            if (isNullorEmpty(item_desc)) {
                item_desc = 0;
            } else {
                item_desc = item_desc.replace(/\s+/g, '-').toLowerCase()
            }

            if (item_price_array[item_name] != undefined) {

                if (isNullorEmpty(item_price_array[item_name].length)) {
                    return false;
                }

                var size = item_price_array[item_name].length;

                for (var x = 0; x < size; x++) {

                    var price_desc = item_price_array[item_name][x];


                    price_desc = price_desc.split('_');

                    if (price_desc[0] == item_price && price_desc[1] == item_desc) {
                        alert('Duplicate Service with same price has been entered');
                        // errorAlert('Error', 'Duplicate Service with same price has been entered'); 
                        nlapiCancelLineItem('new_services');
                        return false;
                    }
                }

                item_price_array[item_name][x] = item_price + '_' + item_desc;

            } else {
                item_price_array[item_name] = [];
                item_price_array[item_name][0] = item_price + '_' + item_desc;
            }
            nlapiSetCurrentLineItemValue('new_services', 'new_changerow', 'T');
        }
    }
}

//Goes to the main page
function onclick_back() {
    if (nlapiGetFieldValue('servicechange') == 'T') {
        var upload_url = baseURL + nlapiResolveURL('SUITELET', 'customscript_sl_servchg_customer_list', 'customdeploy_sl_servchg_customer_list');
    } else {
        var upload_url = baseURL + nlapiResolveURL('SUITELET', 'customscript_sl_smc_summary', 'customdeploy_sl_smc_summary');

    }

    window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
}


/**
 * [updateServices description] - Update / create the services associated with this customer.
 */
function updateServices() {

    if (count_click == 1) {
        var context = nlapiGetContext();

        var package_name_create = new Array();

        var delete_record = true;

        var no_service_typs_ids = (nlapiGetFieldValue('custpage_ids'));


        var ids = [];

        if (!isNullorEmpty(no_service_typs_ids)) {
            ids = no_service_typs_ids.split(",");
        }

        var count_array = new Array();
        var customer = parseInt(nlapiGetFieldValue('customer'));
        var recCustomer = nlapiLoadRecord('customer', customer);
        var franchisee = recCustomer.getFieldValue('partner');

        var commReg_search = nlapiLoadSearch('customrecord_commencement_register', 'customsearch_service_commreg_assign');

        var filterExpression = [
            ["custrecord_customer", "anyof", customer], // customer id
            "AND", ["custrecord_franchisee", "is", franchisee] // partner id
        ];

        commReg_search.setFilterExpression(filterExpression);

        var comm_reg_results = commReg_search.runSearch();

        var count_commReg = 0;
        var commReg = null;

        comm_reg_results.forEachResult(function(searchResult) {
            count_commReg++;

            /**
             * [if description] - Only the latest comm Reg needs to be assigned
             */
            if (count_commReg == 1) {
                commReg = searchResult.getValue('internalid');
            }

            /**
             * [if description] - if more than one Comm Reg, error mail is sent
             */
            if (count_commReg > 1) {
                return false;
            }
            return true;
        });

        if (isNullorEmpty(commReg)) {
            alert('No Commencement Register associated with this customer. Please contact Head Office');
            return false;
        }

        var recCustomer = nlapiLoadRecord('customer', customer);

        var finacnial_tab_size = recCustomer.getLineItemCount('itempricing');
        var old_financial_tab_size = finacnial_tab_size;
        var new_financial_tab_size = 0;

        var non_service_types_length = (ids.length - 1);

        var initial_size_of_financial = recCustomer.getLineItemCount('itempricing');

        var financial_tab_item_array = [];
        var financial_tab_price_array = [];


        //Go through the list of all the new services
        for (y = 1; y <= nlapiGetLineItemCount('new_services'); y++) {

            var item_list_value = nlapiGetLineItemValue('new_services', 'new_item', y);
            var package_name_stored = nlapiGetLineItemValue('new_services', 'new_item_package', y);
            var service_record_id = nlapiGetLineItemValue('new_services', 'new_servicesinternalid', y);
            var package_name_stored_text = nlapiGetLineItemText('new_services', 'new_item_package', y);
            var item_price_stored = nlapiGetLineItemValue('new_services', 'new_itemprice', y);
            var item_desc = nlapiGetLineItemValue('new_services', 'new_description', y);
            var change_row = nlapiGetLineItemValue('new_services', 'new_changerow', y);
            var date_review = nlapiGetLineItemValue('new_services', 'new_datereview', y);

            if (isNullorEmpty(item_desc)) {
                item_desc = 0;
            } else {
                item_desc = item_desc.replace(/\s+/g, '-').toLowerCase()
            }

            //If the service is discount, the price is made -ve if the price is more than 0
            if (item_list_value == 17 && item_price_stored > 0) {
                item_price_stored = -Math.abs(item_price_stored);
            }


            //If Discount item is added and no package is assigned, then no service record is created.
            if ((item_list_value == 17 && isNullorEmpty(package_name_stored))) {

            }
            //if the price of a service is 0, the service is not created. 
            else if (nlapiGetLineItemValue('new_services', 'new_itemprice', y) != 0) {

                var service_type = nlapiLoadRecord('customrecord_service_type', item_list_value);

                if (count_array[item_list_value] == undefined) {
                    count_array[item_list_value] = -1;
                }

                //If the service is discount, it is not created in the item list in the financial tab
                if (item_list_value != 17) {
                    //Get the size of the previously existing item and price array
                    var size = item_price_array[item_list_value].length;

                    //if the size is 1, directly create in the financial tab
                    if (size == 1) {
                        initial_size_of_financial++;
                        financial_tab_item_array[initial_size_of_financial] = service_type.getFieldValue('custrecord_service_type_ns_item');
                        financial_tab_price_array[initial_size_of_financial] = item_price_stored;
                    } else {
                        //if the size is more than 1, go through the NS array in the service type record and create the ns iitems in the financial tab respectively
                        var ns_array_items = service_type.getFieldValue('custrecord_service_type_ns_item_array');
                        if (!isNullorEmpty(ns_array_items)) {

                            var ns_items = ns_array_items.split(",")

                            if (count_array[item_list_value] < ns_items.length) {
                                initial_size_of_financial++;
                                if (count_array[item_list_value] == -1) {
                                    financial_tab_item_array[initial_size_of_financial] = service_type.getFieldValue('custrecord_service_type_ns_item');
                                    financial_tab_price_array[initial_size_of_financial] = item_price_stored;

                                    count_array[item_list_value] = count_array[item_list_value] + 1;

                                } else {

                                    financial_tab_item_array[initial_size_of_financial] = ns_items[count_array[item_list_value]];
                                    financial_tab_price_array[initial_size_of_financial] = item_price_stored;

                                    count_array[item_list_value] = count_array[item_list_value] + 1;
                                }
                            }
                        } else if (count_array[item_list_value] == -1) {

                            initial_size_of_financial++;
                            financial_tab_item_array[initial_size_of_financial] = service_type.getFieldValue('custrecord_service_type_ns_item');
                            financial_tab_price_array[initial_size_of_financial] = item_price_stored;
                            count_array[item_list_value] = count_array[item_list_value] + 1;
                        }
                    }
                }

                if (change_row == 'T' || isNullorEmpty(date_review)) {
                    //if the service record exists and the prices match, update the service record.
                    if (!isNullorEmpty(service_record_id)) {
                        var new_service_record = nlapiLoadRecord('customrecord_service', service_record_id);
                        var service_record_price = new_service_record.getFieldValue('custrecord_service_price');
                        var service_record_comm_reg = new_service_record.getFieldValue('custrecord_service_comm_reg');
                        if (commReg == service_record_comm_reg) {
                            new_service_record.setFieldValue('custrecord_service', item_list_value);
                            new_service_record.setFieldValue('name', service_type.getFieldValue('name'));
                            new_service_record.setFieldValue('custrecord_service_price', item_price_stored);
                            new_service_record.setFieldValue('custrecord_service_description', nlapiGetLineItemValue('new_services', 'new_description', y));
                            // new_service_record.setFieldValue('custrecord_service_franchisee', franchisee);

                            if (!isNullorEmpty(commReg)) {
                                new_service_record.setFieldValue('custrecord_service_comm_reg', commReg);

                            }
                        } else {
                            var new_service_record = nlapiCreateRecord('customrecord_service', {
                                recordmode: 'dynamic'
                            });
                            new_service_record.setFieldValue('custrecord_service', item_list_value);
                            new_service_record.setFieldValue('name', service_type.getFieldValue('name'));
                            new_service_record.setFieldValue('custrecord_service_price', item_price_stored);
                            new_service_record.setFieldValue('custrecord_service_customer', customer);
                            new_service_record.setFieldValue('custrecord_service_description', nlapiGetLineItemValue('new_services', 'new_description', y));
                            if (!isNullorEmpty(commReg)) {
                                new_service_record.setFieldValue('custrecord_service_comm_reg', commReg);

                            }
                        }

                        // WS Edit: Add identifier for zee reviewed Services
                        new_service_record.setFieldValue('custrecord_service_date_reviewed', getDate());

                        var service_id = nlapiSubmitRecord(new_service_record);
                    } else {
                        //If the service record does not exist, create a new service record.    
                        var new_service_record = nlapiCreateRecord('customrecord_service', {
                            recordmode: 'dynamic'
                        });
                        new_service_record.setFieldValue('custrecord_service', item_list_value);
                        new_service_record.setFieldValue('name', service_type.getFieldValue('name'));
                        new_service_record.setFieldValue('custrecord_service_price', item_price_stored);
                        new_service_record.setFieldValue('custrecord_service_customer', customer);
                        new_service_record.setFieldValue('custrecord_service_description', nlapiGetLineItemValue('new_services', 'new_description', y));
                        if (!isNullorEmpty(commReg)) {
                            new_service_record.setFieldValue('custrecord_service_comm_reg', commReg);

                        }

                        // WS Edit: Add identifier for zee reviewed Services
                        new_service_record.setFieldValue('custrecord_service_date_reviewed', getDate());

                        var service_id = nlapiSubmitRecord(new_service_record);
                    }
                }

            }
        }


        nlapiSetFieldValue('financial_item_array', financial_tab_item_array.toString());
        nlapiSetFieldValue('financial_price_array', financial_tab_price_array.toString());

        recCustomer.setFieldValue('custentity_customer_pricing_notes', nlapiGetFieldValue('pricing_notes'));
        nlapiSubmitRecord(recCustomer);

        return nlapiGetLineItemCount('new_services');
    }
}


function saveRecord(destination) {

    count_click++;

    var result = true;

    if (package_call == false) {
        var result = updateServices();
    }


    if (result == false) {
        return false;
    }

    return true;
}


/**
 * [countInArray description] - to count the number of times a number is present in an array
 * @param  {[Array]} array         [description]
 * @param  {[Number]} num_to_search [description]
 * @return {[Number]}               [description]
 */
function countInArray(array, num_to_search) {
    var count = 0;
    for (var i = 0; i < array.length; i++) {
        if (array[i] === num_to_search) {
            count++;
        }
    }
    return count;
}


/**
 * [getDate description] - Get the current date
 * @return {[String]} [description] - return the string date
 */
function getDate() {
    var date = new Date();
    // if (date.getHours() > 6)
    // {
    //     date = nlapiAddDays(date, 1);
    // }
    date = nlapiDateToString(date);

    return date;
}