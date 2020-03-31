/**
 * Module Description
 * 
 * NSVersion    Date                    Author         
 * 1.00         2017-08-14 14:12:18     Ankith 
 *
 * Remarks: Page to review all the item lists and service records. Change the price or create package or add new service types         
 * 
 * @Last Modified by:   Ankith
 * @Last Modified time: 2020-03-11 13:30:32
 *
 */

//var baseURL = getDataCenterURL_systemURL();
var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://system.sandbox.netsuite.com';
}
var zee = 0;
var role = nlapiGetRole();

if (role == 1000) {
    zee = nlapiGetUser();
} else if (role == 3) { //Administrator
    zee = 6; //test
} else if (role == 1032) { // System Support
    zee = 425904; //test-AR
}

// WS: function added to test dynamic system URL for NetSuite
function getDataCenterURL_systemURL() {
    var headers = new Array(); //declare the webservice headers
    headers['Content-Type'] = 'text/xml';
    headers['SOAPAction'] = 'getDataCenterUrls';

    var xml = "<soapenv:Envelope xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' xmlns:platformCore='urn:core_2014_2.platform.webservices.netsuite.com' xmlns:platformMsgs='urn:messages_2014_2.platform.webservices.netsuite.com'> <soapenv:Header> </soapenv:Header> <soapenv:Body> <getDataCenterUrls xsi:type='platformMsgs:GetDataCenterUrlsRequest'> <account xsi:type='xsd:string'>1048144</account> </getDataCenterUrls> </soapenv:Body> </soapenv:Envelope>";

    /* The variable above was properly escaped and has no line breaks, apparently using the nlapiEscapeXML() does not resolve this because this is declared as a String not an XML type */

    var sUrl = "https://webservices.netsuite.com/services/NetSuitePort_2014_2"
    /* use the latest webservice URL to call the getDataCenterURLs command. */

    resp = nlapiRequestURL(sUrl, xml, headers); // creates and calls the web service request

    var res = nlapiStringToXML(resp.getBody()); // gets the body of the request into XML form

    var webServicesNode = res.getElementsByTagName("webservicesDomain"); // gets the webservices domain node

    var restNode = res.getElementsByTagName("restDomain"); // gets the REST domain node

    var systemNode = res.getElementsByTagName("systemDomain"); // gets the system domain node

    var webServicesURL = webServicesNode[0].textContent; // get the text content of the node and store it to a variable to use

    var restURL = restNode[0].textContent; // same process as above

    var systemURL = systemNode[0].textContent; // same process as above

    return systemURL;
}


function main(request, response) {

    var ctx = nlapiGetContext();

    if (request.getMethod() == "GET") {

        var no_service_types = new Array();
        var no_service_ids = '';
        var linked_service_ids = '';
        var no_services_count = 0;

        var params = request.getParameter('custparam_params');

        params = JSON.parse(params);

        if (isNullorEmpty(request.getParameter('custid'))) {
            nlapiLogExecution('DEBUG', 'params.servicechange', params.servicechange)
            var custid = parseInt(params.custid);
            if(!isNullorEmpty(params.servicechange)){
                var servicechange = parseInt(params.servicechange);
            } else {
                var servicechange = 0;
            }
            
        } else {

            var custid = request.getParameter('custid');
            var servicechange = 'F';
        }

        nlapiLogExecution('DEBUG', 'custid', custid);

        var recCustomer = nlapiLoadRecord('customer', custid);
        var basePrice = nlapiLookupField('customer', custid, 'partner.custentity_franchisee_base_price', true);
        basePrice = isNullorEmpty(basePrice) ? "" : parseFloat(basePrice.replace('$', '')) / 1.1;

        nlapiLogExecution('DEBUG', 'Test', 1);

        //Check if the customer is a Special Customer, if Yes do not allow them to create/edit services
        //

        var sc_type = recCustomer.getFieldValue('custentity_special_customer_type');
        var linked_mp_customer = recCustomer.getFieldValue('custentity_np_mp_customer');
        var linked_mp_customer_text = recCustomer.getFieldText('custentity_np_mp_customer');

        var adminFeesNotApplicable = recCustomer.getFieldValue('custentity_inv_no_admin_fee');

        var admin_fees_service_id = null;

        if (adminFeesNotApplicable == 1) {
            var customer_admin_fees = null;
        } else {
            var customer_admin_fees = recCustomer.getFieldValue('custentity_admin_fees');
            var searched_services = nlapiLoadSearch('customrecord_service', 'customsearch_service_invoicing_add_srv_2');

            var newFilters = new Array();

            //Zee filter is used because Customer is owned by TEST and jobs for this customer belongs to both TEST and TEST-AR. So we pull out only the Admin Fees Service based on the zee logged in. 
            //
            //WS: Zee filter put in place to prevent current franchisee from retrieving previous franchisee's admin fees.
            //assumption: admin fee service record will not need to be replicated on new transfer workflow as AIC script already reads Account Admin Fee from customer record. 
            //
            // if (!isNullorEmpty(scID)) {
            //     var admin_fees_customer = scID;
            // } else {
                var admin_fees_customer = custid;
            // }

            newFilters = [
                [
                    ["custrecord_service_franchisee", "anyof", zee], "AND", ["custrecord_service_customer", "is", admin_fees_customer], "AND", "NOT", ["custrecord_service_customer", "anyof", "@NONE@"]
                ],
                "AND", ["custrecord_service", "is", "22"], "AND", ["isinactive", "is", "F"]
            ];


            searched_services.setFilterExpression(newFilters);

            var resultSet = searched_services.runSearch();

            resultSet.forEachResult(function(searchResult) {
                admin_fees_service_id = searchResult.getValue('internalid');
                customer_admin_fees = parseFloat(searchResult.getValue('custrecord_service_price'));
                return true;
            });
        }

        // var comm_reg_results = commRegSearch(custid);

        /**
         * Desciption - To get all the services associated with this customer
         * Search: SMC - Services
         */
        var serviceSearch = nlapiLoadSearch('customrecord_service', 'customsearch_smc_services');

        var newFilters_service = new Array();
        newFilters_service[newFilters_service.length] = new nlobjSearchFilter('custrecord_service_customer', null, 'is', custid);

        serviceSearch.addFilters(newFilters_service);

        var resultSet_service = serviceSearch.runSearch();

        var serviceResult = resultSet_service.getResults(0, 1);

        nlapiLogExecution('DEBUG', 'Test', 2);

        /**
         * Desciption - To get all the packages associated with this customer
         * Search: SMC - Packages (no Discount)
         */
        var packageSearch = nlapiLoadSearch('customrecord_service_package', 'customsearch_smc_packages');

        var newFilters_package = new Array();
        newFilters_package[newFilters_package.length] = new nlobjSearchFilter('custrecord_service_package_customer', null, 'is', custid);

        packageSearch.addFilters(newFilters_package);

        var resultSet_package = packageSearch.runSearch();

        var packageResult = resultSet_package.getResults(0, 1);

        nlapiLogExecution('DEBUG', 'Test', 3);

        // var serviceSearch = serviceFuncSearch(custid, comm_reg_results);

        // var packageSearch = packageFuncSearch(custid, comm_reg_results);

        var form = nlapiCreateForm('Review: <a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + custid + '">' + recCustomer.getFieldValue('entityid') + '</a> ' + recCustomer.getFieldValue('companyname'));


        nlapiLogExecution('DEBUG', 'Test', 5);
        /**
         * Description - Add all the API's to the begining of the page
         */
        var content = '';
        content += '<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyA92XGDo8rx11izPYT7z2L-YPMMJ6Ih1s0&libraries=places"></script>';
        var fld = form.addField('mainfield', 'inlinehtml');
        fld.setDefaultValue(content);
        var inlinehtml2 = '';
        inlinehtml2 += '<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js">';
        inlinehtml2 += '<script src="//code.jquery.com/jquery-1.11.0.min.js"></script>';
        inlinehtml2 += '<link type="text/css" rel="stylesheet" href="https://cdn.datatables.net/1.10.13/css/jquery.dataTables.min.css"><link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
        inlinehtml2 += '<link href="//netdna.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" rel="stylesheet">';
        inlinehtml2 += '<script src="//netdna.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script>';

        nlapiLogExecution('DEBUG', 'sctype', sc_type)

        if (isNullorEmpty(sc_type) || sc_type == 2 || sc_type == 4) {
            inlinehtml2 += '<div class="se-pre-con"></div><div style=\"background-color: #cfeefc !important;border: 1px solid #e91e63;padding: 10px 10px 10px 20px;width:96%;position:absolute;font-size:12px"><b><u>Primary Objectives:</u></b><ul><li>Review Addresses to make sure all is up-to-date; and</li><li>Review Item Pricing and translate these into relevant core Service components\'</li></ul></div><br><br><br><br>';

            //Alert box to show the list of items that do not have any matched service type record. 
            var inlinehtml3 = '<div id="alert_box" style="background-color: rgba(244, 67, 54, 0.72) !important;border: 1px solid #417ed9;padding: 10px 10px 10px 20px;width:96%;position:absolute"><b><u>ALERT!!!:</u></b><br>These items are not automatically translated into services. Please Review.<ul>';

            form.addField('custpage_html2', 'inlinehtml').setPadding(1).setLayoutType('outsideabove').setDefaultValue(inlinehtml2);

            form.addFieldGroup('custtab_main', 'Main').setShowBorder(false).setCollapsible(false);

            form.addField('pricing_notes', 'longtext', 'Pricing Note', null, 'custtab_main').setLayoutType('startrow', 'startcol').setDefaultValue(recCustomer.getFieldValue('custentity_customer_pricing_notes'));

            form.addTab('custpage_addresses', 'Addresses'); //Tab for Addresses
            form.addTab('custpage_invoices', '3 Months Service Invoices'); // Tab for Invoices
            form.addTab('custpage_pricing', 'Pricing Item on Financial Tab'); // Tab for the Prices from the financial tab
            form.addTab('custpage_new_pricing_tab', 'New Services'); // Tab for the new / converted services

            var d = new Date();
            d.setMonth(d.getMonth() - 3);

            var today = new Date();

            nlapiLogExecution('DEBUG', 'Test', 6);

            // Search invoice list for the last 3 months invoices for customer
            var fils = new Array();
            fils[fils.length] = new nlobjSearchFilter('entity', null, 'is', custid);
            fils[fils.length] = new nlobjSearchFilter('mainline', null, 'is', true);
            fils[fils.length] = new nlobjSearchFilter('memorized', null, 'is', false);
            fils[fils.length] = new nlobjSearchFilter('custbody_inv_type', null, 'is', '@NONE@');
            fils[fils.length] = new nlobjSearchFilter('trandate', null, 'onorafter', null, 'threeMonthsAgo');
            fils[fils.length] = new nlobjSearchFilter('voided', null, 'is', false);

            var cols = new Array();
            cols[cols.length] = new nlobjSearchColumn('internalid');
            cols[cols.length] = new nlobjSearchColumn('tranid');
            cols[cols.length] = new nlobjSearchColumn('total');
            cols[cols.length] = new nlobjSearchColumn('trandate').setSort(true);
            cols[cols.length] = new nlobjSearchColumn('status');

            var inv_results = nlapiSearchRecord('invoice', null, fils, cols);

            nlapiLogExecution('DEBUG', 'Test', 4);


            //Display sublist only if invoices are present
            if (!isNullorEmpty(inv_results)) {
                // form.addSubTab('custpage_invoices', '3 Months Invoices', 'custom_invoices');
                var sublistInvoices = form.addSubList('custpage_inv', 'staticlist', 'Invoices', 'custpage_invoices');
                sublistInvoices.addField('inv_id', 'integer', 'InternalID').setDisplayType('hidden');
                sublistInvoices.addField('inv_date', 'date', 'Invoice Date').setDisplayType('disabled');
                sublistInvoices.addField('inv_no', 'text', 'Invoice Number').setDisplayType('disabled');
                sublistInvoices.addField('inv_total', 'currency', 'Invoice Total').setDisplayType('disabled');
                sublistInvoices.addField('inv_status', 'text', 'Status').setDisplayType('disabled');

                for (var x = 0; x < inv_results.length; x++) {
                    sublistInvoices.setLineItemValue('inv_id', x + 1, inv_results[x].getValue('internalid'));
                    sublistInvoices.setLineItemValue('inv_date', x + 1, inv_results[x].getValue('trandate'));
                    //sublistInvoices.setLineItemValue('inv_no', x+1, inv_results[x].getValue('tranid'));
                    sublistInvoices.setLineItemValue('inv_no', x + 1, '<a href="' + baseURL + '/app/accounting/transactions/custinvc.nl?id=' + inv_results[x].getValue('internalid') + '">' + inv_results[x].getValue('tranid') + '</a>');
                    //sublistInvoices.setLineItemValue('inv_link', x+1, baseURL + '/app/accounting/transactions/custinvc.nl?id='+inv_results[x].getValue('internalid'));
                    sublistInvoices.setLineItemValue('inv_total', x + 1, inv_results[x].getValue('total'));
                    sublistInvoices.setLineItemValue('inv_status', x + 1, inv_results[x].getText('status'));
                }
            }



            form.addField('customer', 'text', 'Customer').setDisplayType('hidden').setDefaultValue(custid);
            form.addField('servicechange', 'text', 'servicechange').setDisplayType('hidden').setDefaultValue(servicechange);
            form.addField('financial_item_array', 'textarea', 'Financial').setDisplayType('hidden');
            form.addField('financial_price_array', 'textarea', 'Financial').setDisplayType('hidden');
            form.addField('lon_array', 'textarea', 'Longitude').setDisplayType('hidden');
            form.addField('lat_array', 'textarea', 'Latitude').setDisplayType('hidden');

            form.addFieldGroup('service', 'Service Details').setShowBorder(true).setCollapsible(false);

            //Lists of all the items present in the financial tab
            var sublistPricing = form.addSubList('services', 'staticlist', 'Pricing Item', 'custpage_pricing');
            sublistPricing.addField('servicesinternalid', 'integer', 'InternalID').setDisplayType('hidden');
            sublistPricing.addField('item', 'text', 'Pricing Item').setDisplayType('disabled');
            sublistPricing.addField('itemprice', 'currency', 'Price (ex GST)');

            for (var i = 1; i <= recCustomer.getLineItemCount('itempricing'); i++) {
                sublistPricing.setLineItemValue('item', i, recCustomer.getLineItemText('itempricing', 'item', i));
                sublistPricing.setLineItemValue('itemprice', i, recCustomer.getLineItemValue('itempricing', 'price', i));
            }

            sublistPricing.addField('deletepricing', 'text', 'Deleted Pricing').setDisplayType('hidden');


            //List of all the items based on the service type
            form.addSubTab('custpage_new_pricing', 'New Services', 'custpage_new_pricing_tab');

            var sublistNewPricing = form.addSubList('new_services', 'inlineeditor', 'Services', 'custpage_new_pricing');
            sublistNewPricing.addField('new_servicesinternalid', 'integer', 'InternalID').setDisplayType('hidden');
            sublistNewPricing.addField('new_changerow', 'text', 'Change').setDisplayType('hidden');
            sublistNewPricing.addField('new_datereview', 'text', 'Date Review').setDisplayType('hidden');
            var service_type_select = sublistNewPricing.addField('new_item', 'select', 'Service').setMandatory(true);
            service_type_select.addSelectOption('', '');
            //For the new services to load only the service type of category services and extras(custom price)
            var service_type_search = serviceTypeSearch(null, [1]);
            for (var x = 0; x < service_type_search.length; x++) {
                // if (service_type_search[x].getValue('internalid') != 21) {
                    service_type_select.addSelectOption(service_type_search[x].getValue('internalid'), service_type_search[x].getValue('name'));
                // }

            }
            sublistNewPricing.addField('new_description', 'text', 'Service Description');
            sublistNewPricing.addField('new_packages_id', 'text', 'packages id').setDisplayType('hidden');
            sublistNewPricing.addField('new_itemprice', 'currency', 'Price (ex GST)').setMandatory(true);
            if (packageResult.length != 0) {
                var package_list = sublistNewPricing.addField('new_item_package', 'text', 'Package Name').setDisplayType('disabled');
            }

            var error_boolean = 'F';

            //If the service record exists, it displayes the list based on the service record
            if (serviceResult.length != 0) {

                var new_item_count = 1;
                resultSet_service.forEachResult(function(searchResult_service) {

                    if (searchResult_service.getValue('custrecord_service_category') == 2 || searchResult_service.getValue('custrecord_service_category') == 3) {

                    } else {
                        sublistNewPricing.setLineItemValue('new_servicesinternalid', new_item_count, searchResult_service.getValue('internalid'));
                        sublistNewPricing.setLineItemValue('new_item', new_item_count, searchResult_service.getValue('custrecord_service'));
                        sublistNewPricing.setLineItemValue('new_itemprice', new_item_count, searchResult_service.getValue('custrecord_service_price'));
                        sublistNewPricing.setLineItemValue('new_item_package', new_item_count, searchResult_service.getText('custrecord_service_package'));
                        sublistNewPricing.setLineItemValue('new_packages_id', new_item_count, searchResult_service.getValue('custrecord_service_package'));
                        sublistNewPricing.setLineItemValue('new_description', new_item_count, searchResult_service.getValue('custrecord_service_description'));
                        sublistNewPricing.setLineItemValue('new_datereview', new_item_count, searchResult_service.getValue('custrecord_service_date_reviewed'));
                        sublistNewPricing.setLineItemValue('new_changerow', new_item_count, 'F');
                        new_item_count++;
                    }
                    return true;
                });

                //Collect all the Item ID's that do no have any matched service type records
                for (var i = 1; i <= recCustomer.getLineItemCount('itempricing'); i++) {
                    var itemlist_value = recCustomer.getLineItemValue('itempricing', 'item', i);
                    var itemlist_text = recCustomer.getLineItemText('itempricing', 'item', i);

                    //For the new services to load only the service type of category services and extras(custom price) 
                    var service_type_search = serviceTypeSearch(itemlist_value, [1]);

                    if (isNullorEmpty(service_type_search)) {
                        no_service_types[no_services_count] = itemlist_text;
                        inlinehtml3 += '<li>' + itemlist_text + '</li>';
                        no_service_ids += itemlist_value + ',';
                        no_services_count++;
                        error_boolean = 'T';
                    } else {
                        linked_service_ids += itemlist_value + ',';
                    }
                }

            } else {
                //If the service record does not exists, lists all the items from the financial tab
                var y = 1;
                for (var i = 1; i <= recCustomer.getLineItemCount('itempricing'); i++) {
                    var itemlist_value = recCustomer.getLineItemValue('itempricing', 'item', i);
                    var itemlist_text = recCustomer.getLineItemText('itempricing', 'item', i);

                    var service_type_search = serviceTypeSearch(itemlist_value, [1]);

                    if (!isNullorEmpty(service_type_search)) {
                        sublistNewPricing.setLineItemValue('new_item', y, service_type_search[0].getValue('internalid'));
                        sublistNewPricing.setLineItemValue('new_itemprice', y, recCustomer.getLineItemValue('itempricing', 'price', i));
                        sublistNewPricing.setLineItemValue('new_changerow', y, 'T');

                        linked_service_ids += itemlist_value + ',';
                        y++;
                    } else {
                        //Collect all the Item ID's that do no have any matched service type records
                        no_service_types[no_services_count] = itemlist_text;
                        inlinehtml3 += '<li>' + itemlist_text + '</li>';
                        no_service_ids += itemlist_value + ',';
                        no_services_count++;
                        error_boolean = 'T';

                    }

                }
            }

            form.addField('custpage_error', 'text', 'Error').setDisplayType('hidden').setDefaultValue(error_boolean);

            form.addField('custpage_ids', 'text', 'IDs').setDisplayType('hidden').setDefaultValue(no_service_ids);
            form.addField('linked_custpage_ids', 'text', 'IDs').setDisplayType('hidden').setDefaultValue(linked_service_ids);


            /**
             * Description - Get all the addresses related to this customer
             * Search: SMC - Addresses
             */

            var searchedAddresses = nlapiLoadSearch('customer', 'customsearch_smc_address');

            var newFilters = new Array();
            newFilters[newFilters.length] = new nlobjSearchFilter('internalid', null, 'is', custid);

            searchedAddresses.addFilters(newFilters);

            var resultSetAddresses = searchedAddresses.runSearch();


            var sublistAdd = form.addSubList('custpage_add', 'staticlist', 'Addresses', 'custpage_addresses');

            sublistAdd.addField('custpage_addressinternalid', 'integer', 'InternalID').setDisplayType('hidden');

            sublistAdd.addField('custpage_address1', 'text', 'Building/Level/Unit/Suite - OR - Postal Box').setDisplayType('disabled');

            sublistAdd.addField('custpage_address2', 'text', 'Street No. & Name').setDisplayType('disabled');
            sublistAdd.addField('custpage_city', 'text', 'City').setDisplayType('disabled');
            var fldState = sublistAdd.addField('custpage_state', 'text', 'State').setDisplayType('disabled');
            var fldState = sublistAdd.addField('custpage_country', 'text', 'Country').setDisplayType('hidden');
            sublistAdd.addField('custpage_zipcode', 'text', 'Postcode').setDisplayType('disabled');
            sublistAdd.addField('custpage_dontvalidate_add', 'checkbox', 'Dont Validate').setDisplayType('hidden');

            sublistAdd.addField('custpage_isdefaultshipping', 'checkbox', 'Site Address').setDisplayType('disabled');
            sublistAdd.addField('custpage_isdefaultbilling', 'checkbox', 'Billing Address').setDisplayType('disabled');
            sublistAdd.addField('custpage_isresidential', 'checkbox', 'Postal Address').setDisplayType('disabled');

            sublistAdd.addField('custpage_deletedaddresses', 'text', 'Deleted Addresses').setDisplayType('hidden');
            sublistAdd.addField('custpage_lat', 'text', 'Lat').setLayoutType('startrow').setDisplayType('hidden');
            sublistAdd.addField('custpage_lng', 'text', 'Lng').setLayoutType('startrow').setDisplayType('hidden');

            form.addField('deletedaddresses', 'text', 'Deleted Addresses').setDisplayType('hidden');

            var y = 1;
            var billing_error = 'F';
            resultSetAddresses.forEachResult(function(searchResultAddresses) {

                var id = searchResultAddresses.getValue('addressinternalid', 'Address', null);
                var addr1 = searchResultAddresses.getValue('address1', 'Address', null);
                var addr2 = searchResultAddresses.getValue('address2', 'Address', null);
                var city = searchResultAddresses.getValue('city', 'Address', null);
                var state = searchResultAddresses.getValue('state', 'Address', null);
                var zip = searchResultAddresses.getValue('zipcode', 'Address', null);
                var lat = searchResultAddresses.getValue('custrecord_address_lat', 'Address', null);
                var lon = searchResultAddresses.getValue('custrecord_address_lon', 'Address', null);
                var default_shipping = searchResultAddresses.getValue('isdefaultshipping', 'Address', null);
                var default_billing = searchResultAddresses.getValue('isdefaultbilling', 'Address', null);

                sublistAdd.setLineItemValue('custpage_addressinternalid', y, id);
                sublistAdd.setLineItemValue('custpage_address1', y, addr1);
                sublistAdd.setLineItemValue('custpage_address2', y, addr2);
                sublistAdd.setLineItemValue('custpage_city', y, city);
                sublistAdd.setLineItemValue('custpage_state', y, state);
                sublistAdd.setLineItemValue('custpage_zipcode', y, zip);
                sublistAdd.setLineItemValue('custpage_isdefaultbilling', y, default_billing);
                sublistAdd.setLineItemValue('custpage_isdefaultshipping', y, default_shipping);
                // nlapiSetLineItemValue('addresses','isshipaddress', addressSearch[x].getValue('isshipaddress'));
                // 

                for (indexY = 1; indexY <= recCustomer.getLineItemCount('addressbook'); indexY++) {
                    if (parseInt(id) == parseInt(recCustomer.getLineItemValue('addressbook', 'id', indexY))) {
                        sublistAdd.setLineItemValue('custpage_isresidential', y, recCustomer.getLineItemValue('addressbook', 'isresidential', indexY));
                    }
                }



                sublistAdd.setLineItemValue('custpage_lat', y, lat);
                sublistAdd.setLineItemValue('custpage_lng', y, lon);
                sublistAdd.setLineItemValue('custpage_dontvalidate_add', y, 'T');

                //To check if billing address has the lat/lng fields set
                if (default_billing == 'T') {
                    if (isNullorEmpty(lon) || isNullorEmpty(lat)) {
                        billing_error = 'F';
                    } else {
                        billing_error = 'T';
                    }
                }
                y++;
                return true;
            });


            form.addField('billing_address_error', 'text', 'Billing Address Error').setDisplayType('hidden').setDefaultValue(billing_error);

            inlinehtml3 += '</ul></div><br/><br/><br><br><br/><br/><br><br><br/><br/><br><br>';

            form.addField('custpage_html3', 'inlinehtml').setPadding(1).setLayoutType('outsideabove').setDefaultValue(inlinehtml3);

            form.addSubmitButton('Save');
            form.addButton('back', 'Back', 'onclick_back()');
            form.addButton('reset', 'Reset', 'onclick_reset()');
            form.addButton('add_order', 'Create / Edit Packages', 'addPackage()');
            form.addButton('review_address', 'Review Addresses', 'newReviewAddresses()');
            // if(role == 1032){
            //     form.addButton('review_address', 'New Review Addresses', 'newReviewAddresses()');
            // }
            form.setScript('customscript_cl_smc_main');
        } else {

            var linkedCustomerRec = nlapiLoadRecord('customer', linked_mp_customer);

            // var params = '{\"custid\":' + linked_mp_customer + '}';


            inlinehtml2 += '<div style=\"background-color: #cfeefc !important;border: 1px solid #e91e63;padding: 10px 10px 10px 20px;width:96%;position:absolute;font-size:12px"><b><u>IMPORTANT:</u></b><ul><li>This customer is has a special billing arrangement with Mailplus and cannot be reviewed directly. </br>Please review Service and Address information on <b>Customer: <a href="' + baseURL + '/app/site/hosting/scriptlet.nl?script=628&deploy=1&compid=1048144&unlayered=T&custid=' + linked_mp_customer + '">' + linkedCustomerRec.getFieldValue('entityid') + ' ' + linkedCustomerRec.getFieldValue('companyname') + ' </a></b>.</li></ul></div><br><br><br><br>';

            form.addField('custpage_html2', 'inlinehtml').setPadding(1).setLayoutType('outsideabove').setDefaultValue(inlinehtml2);

            // form.addButton('back', 'Back', 'onclick_back()');
        }

        response.writePage(form);

    } else {


        var customer = parseInt(request.getParameter('customer'));
        var servicechange = parseInt(request.getParameter('servicechange'));
        var no_service_typs_ids = request.getParameter('custpage_ids');
        var linked_service_ids = request.getParameter('linked_custpage_ids');
        var financial_tab_item_array = request.getParameter('financial_item_array');
        var financial_tab_price_array = request.getParameter('financial_price_array');


        /**
         * [params3 description] - Params passed to delete / edit / create the financial tab
         */
        var params3 = {
            custscriptcustomer_id: customer,
            custscriptids: no_service_typs_ids,
            custscriptlinked_service_ids: linked_service_ids,
            custscriptfinancial_tab_array: financial_tab_item_array.toString(),
            custscriptfinancial_tab_price_array: financial_tab_price_array.toString()
        }

        /**
         * Description - Schedule Script to create / edit / delete the financial tab items with the new details
         */
        var status = nlapiScheduleScript('customscript_sc_smc_item_pricing_update', 'customdeploy1', params3);
        nlapiLogExecution('DEBUG',servicechange)
        if (status == 'QUEUED') {
            if(isNullorEmpty(servicechange) || servicechange == 'F' || servicechange == 0){
                nlapiSetRedirectURL('SUITELET', 'customscript_sl_smc_summary', 'customdeploy_sl_smc_summary', null, null);
            } else {
                 nlapiSetRedirectURL('SUITELET', 'customscript_sl_servchg_customer_list', 'customdeploy_sl_servchg_customer_list', null, null);
            }
            
            return false;
        }
    }
}

/**
 * [getDate description] - To get the current date
 * @return {[String]} [description]
 */
function getDate() {
    var date = new Date();
    if (date.getHours() > 6) {
        date = nlapiAddDays(date, 1);
    }
    date = nlapiDateToString(date);
    return date;
}

function getStartDate() {
    var today = nlapiStringToDate(getDate());
    var startdate = nlapiAddDays(today, 2);
    if (startdate.getDay() == 0) {
        startdate = nlapiAddDays(startdate, 1)
    } else if (startdate.getDay() == 6) {
        startdate = nlapiAddDays(startdate, 2)
    }
    return nlapiDateToString(startdate);
}