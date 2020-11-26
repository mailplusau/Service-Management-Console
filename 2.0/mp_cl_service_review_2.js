/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *
 * Module Description - Client script for review services page
 * 
 * NSVersion    Date            		 Author         
 * 2.00       	2020-11-26 13:12:36      Ravija Maheshwari 
 */


define(['N/error', 'N/runtime', 'N/search', 'N/url', 'N/record', 'N/format', 'N/email', 'N/currentRecord'],
function(error, runtime, search, url, record, format, email, currentRecord) {

    //Setup 
    var baseURL = 'https://1048144.app.netsuite.com';
    if (runtime.EnvType == "SANDBOX") {
        baseURL = 'https://system.sandbox.netsuite.com';
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

    /**
     * On page initialization, load the addresses for this customer and create the array 
     * to make sure the Services entereed are unique. 
     */
    function pageInit(context){
        var customer_id = currentRecord.get().getValue({fieldId:'customer'});

        //Get currently active customer record 
        var customer_record = record.load({
            type: record.Type.CUSTOMER,
            id: parseInt(customer_id),
            isDynamic: true
        });

        //Get current zee location
        var zeeLocation = record.load({
            type: record.Type.PARTNER,
            id: customer_record.getValue({fieldId: 'partner'}),
            isDynamic: true
        }).getValue({fieldId: 'location'});

        //Search: SMC - Services
        var searched_jobs = search.load({
            type: 'customrecord_service',
            id:'customsearch_smc_services',
        });

        var newFilter = search.createFilter({
            name: 'custrecord_service_customer',
            join: null,
            operator: search.Operator.IS,
            values:  customer_id,
        });

        searched_jobs.filters.push(newFilter);

        var resultSet = searched_jobs.run();

        resultSet.each(function(searchResult) {
            var item_description = searchResult.getValue({name: 'custrecord_service_description'});
            if (isNullorEmpty(item_description)) {
                item_description = 0;
            } else {
                item_description = item_description.replace(/\s+/g, '-').toLowerCase()
            }
            
            if (item_price_array[searchResult.getValue({name: 'custrecord_service'})] == undefined) {
                item_price_array[searchResult.getValue({name: 'custrecord_service'})] = [];
                item_price_array[searchResult.getValue({name: 'custrecord_service'})][0] = searchResult.getValue({name: 'custrecord_service_price'}) + '_' + item_description;
            } else {
                var size = item_price_array[searchResult.getValue({name: 'custrecord_service'})].length;
                item_price_array[searchResult.getValue({name: 'custrecord_service'})][size] = searchResult.getValue({name:'custrecord_service_price'}) + '_' + item_description;
            }
            item_price_count++;
            return true;
        });
        
        //Create the item_price_array and package_name_create arrays based on the financial tab items, if the service records do not exist
        if (item_price_count == 0) {
            for (y = 0; y < currentRecord.get().getLineCount({sublistId: 'new_services'}); y++) {
                var current_record = currentRecord.get();
                var item_description = current_record.getSublistValue({
                    sublistId: 'new_services',
                    fieldId: 'new_description',
                    line: y
                });

                if (isNullorEmpty(item_description)) {
                    item_description = 0;
                } else {
                    item_description = item_description.replace(/\s+/g, '-').toLowerCase()
                }

                var service_description = current_record.getSublistValue({
                    sublistId: 'new_services',
                    fieldId: 'new_description',
                    line: y
                });
                
                if (item_price_array[service_description] == undefined) {
                    item_price_array[service_description] = [];
                    item_price_array[service_description][0] = service_description + '_' + item_description;
                } else {
                    var size = item_price_array[service_description].length;
                    item_price_array[service_description][size] = service_description + '_' + item_description;
                }
            }
        }
    
        // Load all the Addresses related to this customer
        var searched_addresses = search.load({
            type: search.Type.CUSTOMER,
            id:'customsearch_smc_address',
        });

        var newFilter = search.createFilter({
            name: 'internalid',
            join: null,
            operator: search.Operator.IS,
            values:  customer_id,
        });

        searched_addresses .filters.push(newFilter);
        var resultSet = searched_addresses.run();

        resultSet.each(function(searchResult) {
            var id = searchResult.getValue({name: 'addressinternalid', join: 'Address', summary: null});
            var addr1 = searchResult.getValue({name: 'address1', join: 'Address', summary: null});
            var addr2 = searchResult.getValue({name: 'address2', join: 'Address', summary: null});
            var city = searchResult.getValue({name: 'city', join: 'Address', summary: null});
            var state = searchResult.getValue({name: 'state', join: 'Address', summary: null});
            var zip = searchResult.getValue({name: 'zipcode', join: 'Address', summary: null});
            var lat = searchResult.getValue({name: 'custrecord_address_lat', join: 'Address', summary: null});
            var lon = searchResult.getValue({name: 'custrecord_address_lon', join: 'Address', summary: null});
            var default_shipping = searchResult.getValue({name: 'isdefaultshipping', join:'Address',summary: null});
            var default_billing = searchResult.getValue({name:'isdefaultbilling', join:'Address',summary: null});
            var notaservice = searchResult.getValue({name:"custrecord_not_a_service_address", join:"Address", summary:null});
    
            //If the billing address does not have the lat/lng field set then hide all the other sections
            if (default_shipping == 'T' && (isNullorEmpty(notaservice) || notaservice == '2')) {
                if (isNullorEmpty(lon) || isNullorEmpty(lat)) {
                    currentRecord.get().setValue({fieldId: 'billing_address_error', value: 'F'});
                    document.getElementById('custpage_pricing_pane').style.display = 'none';
                    document.getElementById('custpage_new_pricing_tab_pane').style.display = 'none';
                    if (!isNullorEmpty(document.getElementById('custpage_invoices_pane'))) {
                        document.getElementById('custpage_invoices_pane').style.display = 'none';
                    }
                    document.getElementById('tr_add_order').style.display = 'none';
                    document.getElementById('tr_secondaryadd_order').style.display = 'none';
                    document.getElementById('tr_submitter').style.display = 'none';
                    document.getElementById('tr_secondarysubmitter').style.display = 'none';
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

        //Attach onClick event handlers to form buttonds
        $("#review_address").on('click', handleReviewAddress);
        $("#add_order").on('click', handleAddPackage);
        $("#back").on('click', onclick_back);
    };


    //On click of Review Addresses, go to Address Module
    function handleReviewAddress() {
        var params = JSON.stringify({
            custid: parseInt(currentRecord.get().getValue({fieldId: 'customer'})),
            id: 'customscript_sl_smc_main',
            deploy: 'customdeploy_sl_smc_main'
        });
    
        var upload_url = baseURL + nlapiResolveURL('suitelet', 'customscript_sl_new_address_module', 'customdeploy_sl_new_address_module') + '&params=' + params;
        window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
    }


    //On click of create package, sends to create package page to give name to new package
    function handleAddPackage() {
        console.log('Clicked add package');
        count_click++;
        var customer = parseInt(currentRecord.get().getValue({fieldId: 'customer'}));
        var count = updateServices();

        if (count == false) {
            return false;
        }

        var params = JSON.stringify({
            custid: customer,
            id: 'customscript_sl_smc_main',
            deploy: 'customdeploy_sl_smc_main'
        });
        var upload_url = baseURL + nlapiResolveURL('suitelet', 'customscript_sl_mod_package', 'customdeploy_sl_mod_package') + '&params=' + params;
        window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
    }

    //Goes to the main page
    function onclick_back() {
        var currRec = currentRecord.get();
        if (currRec.getValue({fieldId: 'servicechange'}) == 'T') {
          
            var upload_url = baseURL + nlapiResolveURL('SUITELET', 'customscript_sl_servchg_customer_list', 'customdeploy_sl_servchg_customer_list');
        } else {
            var upload_url = baseURL + nlapiResolveURL('SUITELET', 'customscript_service_pricing_review_2', 'customdeploy1');
        }

        window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
    }

    /**
    *  Update / create the services associated with this customer.
    */
    function updateServices(){
        if (count_click == 1) {
            var context = nlapiGetContext(); //TODO
    
            var package_name_create = new Array();
            var delete_record = true;
            var no_service_typs_ids = (currentRecord.get().getValue({fieldId: 'custpage_ids'}));
            var ids = [];

            if (!isNullorEmpty(no_service_typs_ids)) {
                ids = no_service_typs_ids.split(",");
            }

            var count_array = new Array();
            var customer = parseInt(currentRecord.get().getValue({fieldId: 'customer'}));
            var recCustomer = record.load({
                type: record.Type.CUSTOMER,
                id: customer
            });
            var franchisee = recCustomer.getValue({fieldId: 'partner'});
            
            //Search commencement registers
            var commReg_search = search.load({
                type: 'customrecord_commencement_register',
                id:'customsearch_service_commreg_assign'
            });

            var filterArray = [];
            filterArray.push(["custrecord_customer", search.Operator.ANYOF, customer]);
            filterArray.push('AND');
            filterArray.push(["custrecord_franchisee", search.Operator.IS, franchisee]);

            commReg_search.filterExpression = filterArray;
            var comm_reg_results = commReg_search.run();

            var count_commReg = 0;
            var commReg = null;

            comm_reg_results.each(function(searchResult) {
                count_commReg++;
                /** 
                 * [if description] - Only the latest comm Reg needs to be assigned
                 */
                if (count_commReg == 1) {
                    commReg = searchResult.getValue({name:'internalid'});
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
            var recCustomer = record.load({
                type: record.Type.CUSTOMER,
                id: customer,
                isDynamic: true
            });

            var finacnial_tab_size = recCustomer.getLineCount({sublistId: 'itempricing'});
            var old_financial_tab_size = finacnial_tab_size;
            var new_financial_tab_size = 0;
            var non_service_types_length = (ids.length - 1);
            var initial_size_of_financial = recCustomer.getLineCount({sublistId: 'itempricing'});

            var financial_tab_item_array = [];
            var financial_tab_price_array = [];
           
            
        //Go through the list of all the new services
        for (y = 0; y < currentRecord.get().getLineCount({sublistId: 'new_services'}); y++) {

            var rec = currentRecord.get();
            var item_list_value = rec.getSublistValue({sublistId: 'new_services', fieldId: 'new_item', line: y});
            var package_name_stored = rec.getSublistValue({sublistId:'new_services', fieldId: 'new_item_package', line: y});
            var service_record_id = rec.getSublistValue({sublistId:'new_services', fieldId: 'new_servicesinternalid', line: y});
            var package_name_stored_text = rec.getSublistText({sublistId:'new_services', fieldId: 'new_item_package', line: y});
            var item_price_stored = rec.getSublistValue({sublistId:'new_services', fieldId: 'new_itemprice', line: y});
            var item_desc = rec.getSublistValue({sublistId:'new_services', fieldId: 'new_description', line: y});
            var change_row = rec.getSublistValue({sublistId:'new_services', fieldId: 'new_changerow', line: y});
            var date_review = rec.getSublistValue({sublistId:'new_services', fieldId: 'new_datereview', line: y});

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
            else if (rec.getSublistValue({sublistId:'new_services', fieldId: 'new_itemprice', line: y}) != 0) {

                var service_type = record.load({
                    type: 'customrecord_service_type',
                    id: item_list_value,
                    isDynamic: true,
                });
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
                        financial_tab_item_array[initial_size_of_financial] = service_type.getValue({fieldId: 'custrecord_service_type_ns_item'});
                        financial_tab_price_array[initial_size_of_financial] = item_price_stored;
                    } else {
                        //if the size is more than 1, go through the NS array in the service type record and create the ns iitems in the financial tab respectively
                        var ns_array_items = service_type.getValue({fieldId: 'custrecord_service_type_ns_item_array'});
                        if (!isNullorEmpty(ns_array_items)) {
                            var ns_items = ns_array_items.split(",")

                            if (count_array[item_list_value] < ns_items.length) {
                                initial_size_of_financial++;
                                if (count_array[item_list_value] == -1) {
                                    financial_tab_item_array[initial_size_of_financial] = service_type.getValue({fieldId: 'custrecord_service_type_ns_item'});
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
                            financial_tab_item_array[initial_size_of_financial] = service_type.getValue({fieldId: 'custrecord_service_type_ns_item'});
                            financial_tab_price_array[initial_size_of_financial] = item_price_stored;
                            count_array[item_list_value] = count_array[item_list_value] + 1;
                        }
                    }
                }

                if (change_row == 'T' || isNullorEmpty(date_review)) {
                    //if the service record exists and the prices match, update the service record.
                    if (!isNullorEmpty(service_record_id)) {
                        var new_service_record = record.load({
                            type: 'customrecord_service',
                            id: service_record_id,
                            isDynamic: true,
                        });
                        var service_record_price = new_service_record.getValue({fieldId: 'custrecord_service_price'});
                        var service_record_comm_reg = new_service_record.getValue({fieldId: 'custrecord_service_comm_reg'});
                        if (commReg == service_record_comm_reg) {
                            new_service_record.setValue({fieldId: 'custrecord_service', value: item_list_value});
                            new_service_record.setValue({fieldId: 'name', value: service_type.getValue({fieldId: 'name'})});
                            new_service_record.setValue({fieldId: 'custrecord_service_price', value: item_price_stored});
                            new_service_record.setValue({fieldId: 'custrecord_service_description', value: rec.getSublistValue({sublistId:'new_services', fieldId: 'new_description', line: y })});

                            if (!isNullorEmpty(commReg)) {
                                new_service_record.setValue({fieldId: 'custrecord_service_comm_reg', value: commReg});
                            }
                        } else {
                            var new_service_record = record.create({
                                type: 'customrecord_service',
                                isDynamic: true,
                            });
                            new_service_record.setValue({fieldId: 'custrecord_service', value: item_list_value});
                            new_service_record.setValue({fieldId: 'name', value: service_type.getValue({fieldId: 'name'})});
                            new_service_record.setValue({fieldId: 'custrecord_service_price', value: item_price_stored});
                            new_service_record.setFieldValue('custrecord_service_customer', customer);
                            new_service_record.setValue({fieldId: 'custrecord_service_description', value: rec.getSublistValue({sublistId:'new_services', fieldId: 'new_description', line: y })});
                            if (!isNullorEmpty(commReg)) {
                                new_service_record.setValue({fieldId: 'custrecord_service_comm_reg', value: commReg});
                            }
                        }

                        // WS Edit: Add identifier for zee reviewed Services
                        // new_service_record.setValue({fieldId: 'custrecord_service_date_reviewed', value: getDate()});

                        var service_id = new_service_record.save();
                    } else {
                        //If the service record does not exist, create a new service record.    
                        var new_service_record = record.create({
                            type: 'customrecord_service',
                            isDynamic: true,
                        });
                        new_service_record.setValue({fieldId: 'custrecord_service', value: item_list_value});
                        new_service_record.setValue({fieldId: 'name', value: service_type.getValue({fieldId: 'name'})});
                        new_service_record.setValue({fieldId: 'custrecord_service_price', value: item_price_stored});
                        new_service_record.setFieldValue('custrecord_service_customer', customer);
                        new_service_record.setValue({fieldId: 'custrecord_service_description', value: rec.getSublistValue({sublistId:'new_services', fieldId: 'new_description', line: y })});

                        if (!isNullorEmpty(commReg)) {
                              new_service_record.setValue({fieldId: 'custrecord_service_comm_reg', value: commReg});
                        }

                        // WS Edit: Add identifier for zee reviewed Services
                        // new_service_record.setValue({fieldId: 'custrecord_service_date_reviewed', value: getDate()});

                        var service_id = new_service_record.save();
                    }
                }
            }
        }

        currentRecord.get().setValue({fieldId: 'financial_item_array', value: financial_tab_item_array.toString()});
        currentRecord.get().setValue({fieldId: 'financial_price_array', value: financial_tab_price_array.toString()});
        recCustomer.setValue({fieldId: 'custentity_customer_pricing_notes', value: currentRecord.get().getValue({fieldId: 'pricing_notes'})});
        recCustomer.save();
        return currentRecord.get().getLineCount({sublistId: 'new_services'});
        }
    }

    //From package page, it comes to this function and the page is reloaded.
    function submit_package(customer, back){
        if (back == 'back') {
            var url = baseURL + nlapiResolveURL('suitelet', 'customscript_sl_smc_main', 'customdeploy_sl_smc_main') + '&custid=' + customer;
            window.open(url, "_self", "height=500,width=800,modal=yes,alwaysRaised=yes");
        } else {
            document.getElementById("secondarysubmitter").click();
        }
    }

    //Validate delete of service items. The service records are made inactive as requested by Will.
    function validateDelete(context) {
        if(context.sublistId == 'new_services'){
            if (window.confirm("Are you sure you want to delete this item?\n\nThis action cannot be undone.")) {
                var currRec = currentRecord.get();
                var item_name = currRec.getCurrentSublistValue({sublistId: context.sublistId, fieldId: 'new_item'});
                var item_package = currRec.getCurrentSublistValue({sublistId: context.sublistId, fieldId: 'new_item_package'});  
                if (item_name == 17 && !isNullorEmpty(item_package)) {
                    discount_created[item_package] = 'F';
                }
                if (!isNullorEmpty(currRec.getCurrentSublistValue({sublistId: context.sublistId, fieldId: 'new_servicesinternalid'}))) {
    
                    //Inactive the service record on remove
                    var service_record_id = currRec.getCurrentSublistValue({sublistId: context.sublistId, fieldId: 'new_servicesinternalid'}); 
                    
                    var service_record = record.load({
                        type: 'customrecord_service',
                        id: service_record_id,
                        isDynamic: true,
                    });
    
                    service_record.setValue({fieldId: 'isinactive', value: true});
                    service_record.save();
                }
                return true;
            } else {
                return false;
            }
        }
    }

    function saveRecord(){
        count_click++;
        var result = true;
        if (package_call == false) {
            var result = updateServices();
        }

        console.log(result);
        if (result == false) {
            return false;
        }

        return true;
    }

    function fieldChanged(context){
        if(context.sublistId == 'new_services') {
            //Validate that discount cannot be selected as the service type manually
            if (context.fieldId  == 'new_item') {
                var currentRec = currentRecord.get();
                var item_name = currentRec.getCurrentSublistValue({sublistId: 'new_services', fieldId: 'new_item'});
                if (item_name == 17) {
                    alert('Discount cannot be added manually.\n Discounts gets added only when Packages are assigned to two or more service items.');
                    nlapiCancelLineItem('new_services');
                    return false;
                } else if (!isNullorEmpty(nlapiGetCurrentLineItemValue('new_services', 'new_servicesinternalid'))) {
                    alert('Cannot update this Service. Please remove this service and add a new service.');
                    nlapiCancelLineItem('new_services');
                    return false;
                }
                currentRecord.get().setCurrentSublistValue({sublistId: 'new_services', fieldId:'new_changerow', value: 'T'});
            }

            //validate that no two same service types will have the same price
            if (context.fieldId == 'new_itemprice') {
                var currentRec = currentRecord.get();
                var item_name = currentRec.getCurrentSublistValue({sublistId: 'new_services', fieldId: 'new_item'});
                var item_price = currentRec.getCurrentSublistValue({sublistId: 'new_services', fieldId: 'new_itemprice'});
                var item_desc = currentRec.getCurrentSublistValue({sublistId: 'new_services', fieldId: 'new_description'});

                if (isNullorEmpty(item_desc)) {
                    item_desc = 0;
                } else {
                    item_desc = item_desc.replace(/\s+/g, '-').toLowerCase()
                }

                if (isNullorEmpty(currentRecord.get().getCurrentSublistValue({sublistId:'new_services', fieldId: 'new_servicesinternalid'}))) {
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
                                currentRecord.get().cancelLine({sublistId: 'new_services'});
                                return false;
                            }
                        }
    
                        item_price_array[item_name][x] = item_price + '_' + item_desc;
    
                    } else {
                        item_price_array[item_name] = [];
                        item_price_array[item_name][0] = item_price + '_' + item_desc;
                    }
                }else{
                    var new_service_record = record.load({
                        type: 'customrecord_service',
                        id:  currentRecord.get().getCurrentSublistValue({sublistId: 'new_services', fieldId: 'new_servicesinternalid'}),
                        isDynamic: true
                    });

                    var old_price = new_service_record.getValue({fieldId: 'custrecord_service_price'});
    
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
                                currentRecord.get().cancelLine({sublistId: 'new_services'});
                                return false;
                            } else if (price_desc[0] == old_price && price_desc[1] == item_desc) {
                                item_price_array[item_name][x] = item_price + '_' + item_desc;
                            }
                        }
                    }
                }
                currentRecord.get().setCurrentSublistValue({sublistId: 'new_services', fieldId:'new_changerow', value: 'T'});
            }

            if (context.fieldId == 'new_description' && !isNullorEmpty(currRecord.get().getCurrentSublistValue({sublistId: 'new_services', fieldId: 'new_itemprice'}))){
                var currentRec = currentRecord.get();
                var item_name = currentRec.getCurrentSublistValue({sublistId: 'new_services', fieldId: 'new_item'});
                var item_price = currentRec.getCurrentSublistValue({sublistId: 'new_services', fieldId: 'new_itemprice'});
                var item_desc = currentRec.getCurrentSublistValue({sublistId: 'new_services', fieldId: 'new_description'});
    
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
                            currentRecord.get().cancelLine({sublistId: 'new_services'});
                            return false;
                        }
                    }
    
                    item_price_array[item_name][x] = item_price + '_' + item_desc;
    
                } else {
                    item_price_array[item_name] = [];
                    item_price_array[item_name][0] = item_price + '_' + item_desc;
                }
                currentRecord.get().setCurrentSublistValue({sublistId: 'new_services', fieldId:'new_changerow', value: 'T'});
            }
        }
    }

    /**
     * Is Null or Empty.
     *
     * @param {Object} strVal
     */
    function isNullorEmpty(strVal) {
        return (strVal == null || strVal == '' || strVal == 'null' || strVal == undefined || strVal == 'undefined' || strVal == '- None -');
    }
    

    return {
        pageInit: pageInit,
        validateDelete: validateDelete,
        saveRecord: saveRecord,
        fieldChanged: fieldChanged,
    }
});
