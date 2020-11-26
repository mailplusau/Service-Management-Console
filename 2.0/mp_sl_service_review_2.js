/**

* @NApiVersion 2.x
* @NScriptType Suitelet
*
* Module Description: Page to review all the item lists and service records. 
* Allows user to change the price or create package or add new service types    
* 
* NSVersion    Date                    Author          
* 2.00         2020-10-11 14:12:18     Ravija Maheshwari   
*
* Last Modified By: Ravija Maheshwari
* Date and Time: 2020-6-11 13:17
*/

define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/redirect', 'N/format', 'N/currentRecord', 'N/task'],
function(ui, email, runtime, search, record, http, log, redirect, format, currentRecord, task) {
    function onRequest(context) {

        //Setup
        var baseURL = 'https://system.na2.netsuite.com';
        if (runtime.EnvType == "SANDBOX") {
            baseURL = 'https://system.sandbox.netsuite.com';
        }

        var zee = 0;
        var role = runtime.getCurrentUser().role;

        if (role == 1000) {
            zee = runtime.getCurrentUser().id;
        } else if (role == 3) { //Administrator
            zee = 6; //test
        } else if (role == 1032) { // System Support
            zee = 425904; //test-AR
        }


        if(context.request.method === 'GET') {
            
            var no_service_types = new Array();
            var no_service_ids = '';
            var linked_service_ids = '';
            var no_services_count = 0;

            var params = context.request.parameters.custparam_params;
            params = JSON.parse(params);

            if(isNullorEmpty(context.request.parameters.custid)){
                var custid = parseInt(params.custid);
                if(!isNullorEmpty(params.servicechange)){
                    var servicechange = parseInt(params.servicechange);
                }else{
                    var servicechange = 0;
                }
            }else{
                var custid = context.request.parameters.custid;
                var servicechange = 'F';
            }
            
            //Load customer record
            var recCustomer = record.load({
                type:'customer',
                id: custid,
                isDynamic: true
            });
            
            //Get the franchisee base price
            var basePrice = search.lookupFields({
                type: search.Type.CUSTOMER,
                id: custid,
                columns: 'partner.custentity_franchisee_base_price',
                text: true
            });
        
            basePrice = basePrice["partner.custentity_franchisee_base_price"];
            basePrice = (basePrice.length == 0) ? "" : parseFloat(basePrice[0].text.replace('$', '')) / 1.1;

            //Check if the customer is a Special Customer, if Yes do not allow them to create/edit services
            var sc_type = recCustomer.getValue({
                fieldId: 'custentity_special_customer_type'
            });

            var linked_mp_customer =recCustomer.getValue({
                fieldId: 'custentity_np_mp_customer'
            });

            var linked_mp_customer_text =recCustomer.getText({
                fieldId: 'custentity_np_mp_customer'
            }); 

            var adminFeesNotApplicable =recCustomer.getValue({
                fieldId: 'custentity_inv_no_admin_fee'
            }); 
            var admin_fees_service_id = null;

            if (adminFeesNotApplicable == 1) {
                var customer_admin_fees = null;
            } else {
                var customer_admin_fees = recCustomer.getValue({
                    fieldId: 'custentity_admin_fees'
                });


                var newFilters = new Array();
    
                //Zee filter is used because Customer is owned by TEST and jobs for this customer belongs to both TEST and TEST-AR. So we pull out only the Admin Fees Service based on the zee logged in. 
                //
                //WS: Zee filter put in place to prevent current franchisee from retrieving previous franchisee's admin fees.
                //assumption: admin fee service record will not need to be replicated on new transfer workflow as AIC script already reads Account Admin Fee from customer record. 
                var admin_fees_customer = custid;
                
                newFilters = [
                    [
                        ["custrecord_service_franchisee", "anyof", zee], "AND", ["custrecord_service_customer", "is", admin_fees_customer], "AND", "NOT", ["custrecord_service_customer", "anyof", "@NONE@"]
                    ],
                    "AND", ["custrecord_service", "is", "22"], "AND", ["isinactive", "is", "F"]
                ];
                
                var searched_services = search.load({
                    type: 'customrecord_service',
                    id: 'customsearch_service_invoicing_add_srv_2',
                    filters: newFilters
                });
    
                searched_services.run().each(function(searchResult) {
                    admin_fees_service_id = searchResult.getValue({name: 'internalid'});
                    customer_admin_fees = parseFloat(searchResult.getValue({name: 'custrecord_service_price'}));
                    return true;
                });
            }

            //Search for all services opted by the customer
            var serviceSearch = search.load({
                type: 'customrecord_service',
                id: 'customsearch_smc_services'
            });

            var newFilters_service = search.createFilter({
                name: 'custrecord_service_customer',
                join: null,
                operator: search.Operator.IS,
                values: custid,
            });

            serviceSearch.filters.push(newFilters_service);

            var resultSet_service = serviceSearch.run();
            var serviceResult = resultSet_service.getRange(0,1);
            

            /**
             * Desciption - To get all the packages associated with this customer
             * Search: SMC - Packages (no Discount)
             */

            var newFilters_package = search.createFilter({
                name: 'custrecord_service_package_customer',
                join: null,
                operator: search.Operator.IS,
                values: custid
            });
            
            var packageSearch = search.load({
                type: 'customrecord_service_package',
                id: 'customsearch_smc_packages'
            });

            packageSearch.filters.push(newFilters_package);

            var packageResult = packageSearch.run().getRange(0,1);

            var form = ui.createForm({
                title: 'Review: <a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + custid + '">' + 
                recCustomer.getValue({fieldId: 'entityid'}) + '</a> ' + recCustomer.getValue({fieldId: 'companyname'})
            });

            /**
             * Description - Add all the API's to the begining of the page
             */
            var content = '';
            content += '<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyA92XGDo8rx11izPYT7z2L-YPMMJ6Ih1s0&libraries=places"></script>';
            var fld = form.addField({
                id: 'mainfield',
                label: 'inlinehtml',
                type: ui.FieldType.INLINEHTML
            }).setDefaultValue = content;

            var inlinehtml2 = '';
            inlinehtml2 += '<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js">';
            inlinehtml2 += '<script src="//code.jquery.com/jquery-1.11.0.min.js"></script>';
            inlinehtml2 += '<link type="text/css" rel="stylesheet" href="https://cdn.datatables.net/1.10.13/css/jquery.dataTables.min.css"><link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
            inlinehtml2 += '<link href="//netdna.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" rel="stylesheet">';
            inlinehtml2 += '<script src="//netdna.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script>';

            if(isNullorEmpty(sc_type) || sc_type == 2  || sc_type === 4){
                inlinehtml2 += '<div style=\"background-color: #cfeefc !important;border: 1px solid #e91e63;padding: 10px 10px 10px 20px;width:96%;position:absolute;font-size:12px"><b><u>Primary Objectives:</u></b><ul><li>Review Addresses to make sure all is up-to-date; and</li><li>Review Item Pricing and translate these into relevant core Service components\'</li></ul></div><br><br><br><br>';
                
                //Alert box to show the list of items that do not have any matched service type record. 
                var inlinehtml3 = '<div id="alert_box" style="background-color: rgba(244, 67, 54, 0.72) !important;border: 1px solid #417ed9;padding: 10px 10px 10px 20px;width:96%;"><b><u>ALERT!!!:</u></b><br>These items are not automatically translated into services. Please Review.<ul>';

                form.addField({
                    id: 'custpage_html2',
                    label: 'inlinehtml',
                    type: ui.FieldType.INLINEHTML
                }).updateLayoutType({
                    layoutType: ui.FieldLayoutType.OUTSIDEABOVE
                }).defaultValue = inlinehtml2;
                
                var main = form.addFieldGroup({
                    id: 'custtab_main',
                    label: 'Main'
                }).isBorderHidden = true;
                main.isCollapsible = false;

                form.addField({
                    id: 'pricing_notes',
                    label: 'Pricing Note',
                    type: ui.FieldType.LONGTEXT,
                    container: 'custtab_main'
                }).updateLayoutType({
                    layoutType: ui.FieldLayoutType.STARTROW
                }).updateBreakType({
                    breakType: ui.FieldBreakType.STARTCOL
                }).defaultValue = recCustomer.getValue({fieldId:'custentity_customer_pricing_notes'});

                //Tab for Addresses
                form.addTab({
                    id:'custpage_addresses',
                    label: 'Addresses'
                });
                // Tab for Invoices
                form.addTab({
                    id:'custpage_invoices',
                    label: '3 Months Service Invoices'
                });
                // Tab for the Prices from the financial tab
                form.addTab({
                    id:'custpage_pricing',
                    label: 'Pricing Item on Financial Tab'
                });
                // Tab for the new / converted services
                form.addTab({
                    id:'custpage_new_pricing_tab',
                    label: 'New Services'
                });

                var d = new Date();
                d.setMonth(d.getMonth() - 3);
                var today = new Date();

                var fils = new Array();
                fils[fils.length] = createSearchFilter('entity', null, search.Operator.IS, custid);
                fils[fils.length] = createSearchFilter('mainline', null,search.Operator.IS, true );
                fils[fils.length] = createSearchFilter('memorized', null,search.Operator.IS, false );
                fils[fils.length] = createSearchFilter('custbody_inv_type', null,search.Operator.IS, '@NONE@');
                fils[fils.length] = createSearchFilter('trandate', null,search.Operator.ONORAFTER,'threeMonthsAgo' ) //what was the null for here
                fils[fils.length] = createSearchFilter('voided', null,search.Operator.IS, false );

                var inv_results = search.create({
                    type: search.Type.INVOICE,
                    filters: fils,
                    columns: ['internalid', 'tranid', 'total', 'trandate', 'status']
                }).run().getRange({
                    start: 0,
                    end: 1000
                });

                if(!isNullorEmpty(inv_results)){
                    //Test with custid =  2088
                    var sublistInvoices = form.addSublist({
                        id: 'custpage_inv',
                        label: 'Invoices',
                        tab: 'custpage_invoices',
                        type: ui.SublistType.STATICLIST
                    });

                    sublistInvoices.addField({
                        id: 'inv_id',
                        type: ui.FieldType.INTEGER,
                        label: 'InternalID'
                    }).displayType = ui.SublistDisplayType.HIDDEN; //not working?

                    sublistInvoices.addField({
                        id: 'inv_date',
                        type: ui.FieldType.DATE,
                        label: 'Invoice Date'
                    }).displayType = ui.SublistDisplayType.DISABLED;

                    sublistInvoices.addField({
                        id: 'inv_no',
                        type: ui.FieldType.TEXT,
                        label: 'Invoice Number'
                    }).displayType = ui.SublistDisplayType.DISABLED;

                    sublistInvoices.addField({
                        id: 'inv_total',
                        type: ui.FieldType.CURRENCY,
                        label: 'Invoice Total'
                    }).displayType = ui.SublistDisplayType.DISABLED;

                    sublistInvoices.addField({
                        id: 'inv_status',
                        type: ui.FieldType.TEXT,
                        label: 'Status'
                    });
                
                    for (var x = 0; x < inv_results.length; x++) {
                        sublistInvoices.setSublistValue({
                            id: 'inv_id',
                            line: x,
                            value: inv_results[x].getValue({name:'internalid'})
                        });
                        sublistInvoices.setSublistValue({
                            id: 'inv_date',
                            line: x,
                            value: inv_results[x].getValue({name:'trandate'})
                        });
                        sublistInvoices.setSublistValue({
                            id: 'inv_no',
                            line: x,
                            value:  '<a href="' + baseURL + '/app/accounting/transactions/custinvc.nl?id=' + inv_results[x].getValue({name:'internalid'}) + '">' + inv_results[x].getValue({name:'tranid'}) + '</a>'
                        });

                        sublistInvoices.setSublistValue({
                            id: 'inv_total',
                            line: x,
                            value: inv_results[x].getValue({name:'total'})
                        });
                        sublistInvoices.setSublistValue({
                            id: 'inv_status',
                            line: x,
                            value: inv_results[x].getValue({name:'status'})
                        });
                    }
                }

                form.addField({
                    id: 'customer',
                    label: 'Customer',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = custid;

                form.addField({
                    id: 'servicechange',
                    label: 'servicechange',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = servicechange;

                form.addField({
                    id: 'financial_item_array',
                    label: 'Financial',
                    type: ui.FieldType.TEXTAREA
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });

                form.addField({
                    id: 'financial_price_array',
                    label: 'Financial',
                    type: ui.FieldType.TEXTAREA
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });

                form.addField({
                    id: 'lon_array',
                    label: 'Longitude',
                    type: ui.FieldType.TEXTAREA
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });

                form.addField({
                    id: 'lat_array',
                    label: 'Latitude',
                    type: ui.FieldType.TEXTAREA
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });

                var fldGroup = form.addFieldGroup({
                    id: 'service',
                    label: 'Service Details'
                }).isBorderHidden = true;
                fldGroup.isCollapsible = false;

                //Lists of all the items present in the financial tab
                var sublistPricing = form.addSublist({
                    id: 'services',
                    label: 'Pricing Item',
                    tab: 'custpage_pricing',
                    type: ui.SublistType.STATICLIST
                });

                sublistPricing.addField({
                    id: 'servicesinternalid',
                    type: ui.FieldType.INTEGER,
                    label: 'InternalID'
                }).updateDisplayType({
                    displayType: ui.SublistDisplayType.HIDDEN
                });
                
                sublistPricing.addField({
                    id: 'item',
                    type: ui.FieldType.TEXT,
                    label: 'Pricing Item'
                }).displayType = ui.SublistDisplayType.DISABLED; 

                sublistPricing.addField({
                    id: 'itemprice',
                    type: ui.FieldType.CURRENCY,
                    label: 'Price (ex GST)'
                });

                for (var i = 1; i <= recCustomer.getLineCount({sublistId:'itempricing'}); i++) {
                    sublistPricing.setSublistValue({
                        id: 'item',
                        line: i-1,
                        value: recCustomer.getSublistText({sublistId:'itempricing', fieldId:'item', line: i-1})              
                    });

                    sublistPricing.setSublistValue({
                        id: 'itemprice',
                        line: i-1,
                        value: recCustomer.getSublistText({sublistId:'itempricing', fieldId:'price', line: i-1})       
                    });
                }

                sublistPricing.addField({
                    id: 'deletepricing',
                    type: ui.FieldType.TEXT,
                    label: 'Deleted Pricing'            
                }).updateDisplayType({
                    displayType: ui.SublistDisplayType.HIDDEN
                });

                //List of all the items based on the service type
                form.addSubtab({
                    id: 'custpage_new_pricing',
                    label: 'New Services',
                    tab: 'custpage_new_pricing_tab',
                });

                //Sublist
                var sublistNewPricing = form.addSublist({
                    id : 'new_services',
                    type : ui.SublistType.INLINEEDITOR,
                    label : 'Services',
                    tab: 'custpage_new_pricing'
                });

                sublistNewPricing.addField({ id: 'new_servicesinternalid', type: ui.FieldType.INTEGER, label:'InternalID'}).updateDisplayType({displayType: ui.SublistDisplayType.HIDDEN});

                sublistNewPricing.addField({ id: 'new_changerow', type: ui.FieldType.TEXT, label:'Change'}).updateDisplayType({displayType: ui.SublistDisplayType.HIDDEN});

                sublistNewPricing.addField({ id: 'new_datereview', type: ui.FieldType.TEXT, label:'Date Review'}).updateDisplayType({displayType: ui.SublistDisplayType.HIDDEN});

                var service_type_select = sublistNewPricing.addField({ id: 'new_item', type: ui.FieldType.SELECT, label:'Service'});

                //For the new services to load only the service type of category services and extras(custom price)
                var service_type_search = serviceTypeSearch(null, [1]);

                service_type_select.addSelectOption({
                    value: '',
                    text: ''
                });

                for (var x = 0; x < service_type_search.length; x++) {
                    service_type_select.addSelectOption({
                        value: service_type_search[x].getValue({name:'internalid'}),
                        text: service_type_search[x].getValue({name: 'name'})
                    });
                }

                sublistNewPricing.addField({ id: 'new_description', type: ui.FieldType.TEXT, label:'Service Description'});

                sublistNewPricing.addField({ id: 'new_packages_id', type: ui.FieldType.TEXT, label:'packages id'}).updateDisplayType({displayType: ui.SublistDisplayType.HIDDEN});

                sublistNewPricing.addField({ id: 'new_itemprice', type: ui.FieldType.CURRENCY, label:'Price (ex GST)'});

                if (packageResult.length != 0) {
                    var package_list =   sublistNewPricing.addField({ id: 'new_item_package', type: ui.FieldType.CURRENCY, label:'Package Name'}); 
                }

                var error_boolean = 'F';
            
                //If the service record exists, it displayes the list based on the service record
                if (serviceResult.length != 0) {
                    var new_item_count = 0;
                    resultSet_service.each(function(searchResult_service, index){
                        if (searchResult_service.getValue({name: 'custrecord_service_category'}) == 2 || searchResult_service.getValue({name: 'custrecord_service_category'}) == 3) {
                            // do nothing
                        } else { 
                            sublistNewPricing.setSublistValue({
                                id: 'new_servicesinternalid',
                                line: new_item_count,
                                value: searchResult_service.getValue({name:'internalid'})              
                            });
                            sublistNewPricing.setSublistValue({
                            id: 'new_item',
                            line: new_item_count,
                            value: searchResult_service.getValue({name:'custrecord_service'})              
                            });
                            sublistNewPricing.setSublistValue({
                                id: 'new_itemprice',
                                line: new_item_count,
                                value: searchResult_service.getValue({name:'custrecord_service_price'})              
                            });
                            
                            if(!isNullorEmpty(searchResult_service.getText({name:'custrecord_service_package'}))){
                                sublistNewPricing.setSublistValue({
                                id: 'new_item_package',
                                line: new_item_count,
                                value: searchResult_service.getText({name:'custrecord_service_package'})              
                                });
                            }

                            if(!isNullorEmpty(searchResult_service.getValue({name:'custrecord_service_package'}))){
                                sublistNewPricing.setSublistValue({
                                    id: 'new_packages_id',
                                    line: new_item_count,
                                    value: searchResult_service.getValue({name:'custrecord_service_package'})              
                                });
                            }

                            if(!isNullorEmpty(searchResult_service.getValue({name:'custrecord_service_description'}))){
                                sublistNewPricing.setSublistValue({
                                    id: 'new_description',
                                    line: new_item_count,
                                    value: searchResult_service.getValue({name:'custrecord_service_description'})              
                                });
                            }
                            if(!isNullorEmpty(searchResult_service.getValue({name:'custrecord_service_date_reviewed'}))){
                                sublistNewPricing.setSublistValue({
                                    id: 'new_datereview',
                                    line: new_item_count,
                                    value: searchResult_service.getValue({name:'custrecord_service_date_reviewed'})              
                                });
                            }
                            if(!isNullorEmpty(searchResult_service.getValue({name:'F'}))){
                                sublistNewPricing.setSublistValue({
                                    id: 'new_changerow',
                                    line: new_item_count,
                                    value: searchResult_service.getValue({name:'F'})              
                                });
                            }
                            new_item_count++;
                        }
                        return true;
                    });

                    //Collect all the Item ID's that do no have any matched service type records
                    for (var i = 0; i < recCustomer.getLineCount({sublistId:'itempricing'}); i++) {
                        var itemlist_value = recCustomer.getSublistValue({sublistId:'itempricing', fieldId:'item', line: i});
                        var itemlist_text = recCustomer.getSublistText({sublistId:'itempricing', fieldId:'item', line:i});

                        //For the new services to load only the service type of category services and extras(custom price) 
                        var service_type_search = serviceTypeSearch(itemlist_value, [1]);

                        if(!(isNullorEmpty(service_type_search))){
                            no_service_types[no_services_count] = itemlist_text;
                            inlinehtml3 += '<li>' + itemlist_text + '</li>';
                            no_service_ids += itemlist_value + ',';
                            no_services_count++;
                            error_boolean = 'T';
                        }else{ 
                            linked_service_ids += itemlist_value + ',';
                        }
                    }
                } else {
                    //If the service record does not exist, lists all the items from the financial tab
                    var y = 0;
                    for (var i = 0; i < recCustomer.getLineCount({sublistId:'itempricing'}); i++) {
                        var itemlist_value = recCustomer.getSublistValue({sublistId:'itempricing', fieldId:'item', line:i});
                        var itemlist_text = recCustomer.getSublistText({sublistId:'itempricing', fieldId:'item', line:i});
                        var service_type_search = serviceTypeSearch(itemlist_value, [1]);
                        
                        
                        if(!isNullorEmpty(service_type_search)){
                            sublistNewPricing.setSublistValue({id: 'new_item', line: y, value: service_type_search[0].getValue({name:'internalid'})});
                            sublistNewPricing.setSublistValue({id: 'new_itemprice', line: y, value: recCustomer.getSublistValue({sublistId:'itempricing', fieldId: 'price', line: i})});
                            sublistNewPricing.setSublistValue({id: 'new_changerow', line: y, value: 'T'});
                            linked_service_ids += itemlist_value + ',';
                            y++;
                        }else{
                             //Collect all the Item ID's that do no have any matched service type records
                             no_service_types[no_services_count] = itemlist_text;
                             inlinehtml3 += '<li>' + itemlist_text + '</li>';
                             no_service_ids += itemlist_value + ',';
                             no_services_count++;
                             error_boolean = 'T';
                        }
                    }
                }

                form.addField({
                    id: 'custpage_error',
                    label: 'Error',
                    type: ui.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = error_boolean;

                form.addField({
                    id: 'custpage_ids',
                    label: 'IDs',
                    type: ui.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = no_service_ids;

                form.addField({
                    id: 'linked_custpage_ids',
                    label: 'IDs',
                    type: ui.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = linked_service_ids;
        


                /**
                 * Description - Get all the addresses related to this customer
                 * Search: SMC - Addresses
                 */
                
                //Search for customer's address
                var searchedAddresses = search.load({
                    type: search.Type.CUSTOMER,
                    id: 'customsearch_smc_address',
                    isDynamic: true
                });

                var newFilters =  search.createFilter({
                    name: 'internalid',
                    join: null,
                    operator: search.Operator.IS,
                    values: custid
                });

                searchedAddresses.filters.push(newFilters);
                var resultSetAddresses = searchedAddresses.run();

                var subListAdd = form.addSublist({
                    id: 'custpage_add',
                    label:'Addresses',
                    tab:'custpage_addresses',
                    type: ui.SublistType.STATICLIST
                });

                subListAdd.addField({
                    id: 'custpage_addressinternalid',
                    label: 'InternalID',
                    type: ui.FieldType.INTEGER
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });

                
                subListAdd.addField({
                    id: 'custpage_address1',
                    label: 'Building/Level/Unit/Suite - OR - Postal Box',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.DISABLED
                });

                subListAdd.addField({
                    id: 'custpage_address2',
                    label: 'Street No. & Name',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.DISABLED
                });

                subListAdd.addField({
                    id: 'custpage_city',
                    label: 'City',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.DISABLED
                });

                subListAdd.addField({
                    id: 'custpage_country',
                    label: 'Country',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });

                subListAdd.addField({
                    id: 'custpage_state',
                    label: 'State',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.DISABLED
                });

                // subListAdd.addField({
                //     id: 'custpage_country',
                //     label: 'Country',
                //     type: ui.FieldType.TEXT
                // }).updateDisplayType({
                //     displayType: ui.FieldDisplayType.HIDDEN
                // });

                subListAdd.addField({
                    id: 'custpage_zipcode',
                    label: 'Postcode',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.DISABLED
                });

                subListAdd.addField({
                    id: 'custpage_dontvalidate_add',
                    label: 'Dont Validate',
                    type: ui.FieldType.CHECKBOX
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });

                subListAdd.addField({
                    id: 'custpage_isdefaultshipping',
                    label: 'Site Address',
                    type: ui.FieldType.CHECKBOX
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.DISABLED
                });

                subListAdd.addField({
                    id: 'custpage_isdefaultbilling',
                    label: 'Billing Address',
                    type: ui.FieldType.CHECKBOX
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.DISABLED
                });

                subListAdd.addField({
                    id: 'custpage_isresidential',
                    label: 'Postal Address',
                    type: ui.FieldType.CHECKBOX
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.DISABLED
                });

                subListAdd.addField({
                    id: 'custpage_deletedaddresses',
                    label: 'Deleted Addresses',
                    type: ui.FieldType.CHECKBOX
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });

                subListAdd.addField({
                    id: 'custpage_lat',
                    label: 'Lat',
                    type: ui.FieldType.TEXT
                }).updateBreakType({
                    breakType: ui.FieldBreakType.STARTROW
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });


                subListAdd.addField({
                    id: 'custpage_lng',
                    label: 'Lng',
                    type: ui.FieldType.TEXT
                }).updateBreakType({
                    breakType: ui.FieldBreakType.STARTROW
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });

                form.addField({
                    id: 'deletedaddresses',
                    label: 'Deleted Addresses',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });

                var y = 0;
                var billing_error = 'F';
                resultSetAddresses.each(function(searchResultAddresses){
                    var id = searchResultAddresses.getValue({name:'addressinternalid', join: 'Address', summary: null});
                    var addr1 = searchResultAddresses.getValue({name:'address1', join: 'Address', summary: null});
                    var addr2 = searchResultAddresses.getValue({name:'address2', join: 'Address', summary: null});
                    var city = searchResultAddresses.getValue({name:'city', join: 'Address', summary: null});
                    var state = searchResultAddresses.getValue({name:'state', join: 'Address', summary: null});
                    var zip = searchResultAddresses.getValue({name:'zipcode', join: 'Address', summary: null});
                    var lat = searchResultAddresses.getValue({name:'custrecord_address_lat', join: 'Address', summary: null});
                    var lon = searchResultAddresses.getValue({name:'custrecord_address_lon', join: 'Address', summary: null});
                    var default_shipping = searchResultAddresses.getValue({name:'isdefaultshipping', join: 'Address', summary: null});
                    var default_billing = searchResultAddresses.getValue({name:'isdefaultbilling', join: 'Address', summary: null});

                    if(!isNullorEmpty(id)){
                        subListAdd.setSublistValue({id: 'custpage_addressinternalid',line: y,value: id});
                    }
                    if(!isNullorEmpty(addr1)){
                        subListAdd.setSublistValue({id:'custpage_address1',line: y, value: addr1});
                    }
                    if(!isNullorEmpty(addr2)){
                        subListAdd.setSublistValue({id:'custpage_address2',line: y, value: addr2});
                    }
                    if(!isNullorEmpty(city)){
                        subListAdd.setSublistValue({id: 'custpage_city',line: y,value: city});
                    }
                    if(!isNullorEmpty(state)){
                        subListAdd.setSublistValue({id: 'custpage_state',line: y,value: state});
                    }
                    if(!isNullorEmpty(zip)){
                        subListAdd.setSublistValue({id:'custpage_zipcode',line: y,value: zip});
                    }
                    if(!isNullorEmpty(default_billing)){
                        var billing = default_billing? 'T' : 'F';
                        subListAdd.setSublistValue({id:'custpage_isdefaultbilling',line: y,value: billing});
                    }
                    if(!isNullorEmpty(default_shipping)){
                        var billing = default_shipping ? 'T' : 'F';
                        subListAdd.setSublistValue({id:'custpage_isdefaultshipping',line: y,value: billing});
                    }
                    
                    for(var indexY = 0; indexY < recCustomer.getLineCount('addressbook'); indexY++){

                        if(parseInt(id) == parseInt(recCustomer.getSublistValue({sublistId: 'addressbook', fieldId:'id', line: indexY}))){
                            if(recCustomer.getSublistValue({sublistId: 'addressbook', fieldId:'isresidential', line: indexY}) == true){
                                subListAdd.setSublistValue({id: 'custpage_isresidential',line: y, value: 'T'});
                            }else{
                                subListAdd.setSublistValue({id: 'custpage_isresidential',line: y, value: 'F'});
                            }
                            
                        }
                    }

                    if(!isNullorEmpty(lat)){
                        subListAdd.setSublistValue({id:'custpage_lat',line: y ,value: lat});
                    }

                    if(!isNullorEmpty(lon)){
                        subListAdd.setSublistValue({id:'custpage_lng',line: y ,value: lon});
                    }
                    subListAdd.setSublistValue({id:'custpage_dontvalidate_add',line: y ,value: 'T'});
                
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

                form.addField({
                    id: 'billing_address_error',
                    label: 'Billing Address Error',
                    type: ui.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = billing_error;

                inlinehtml3 += '</ul></div><br/><br/><br><br><br/><br/><br><br><br/><br/><br><br>';

                form.addField({
                    id: 'custpage_html3',
                    label: 'Billing Address Error',
                    type: ui.FieldType.INLINEHTML,
                }).updateLayoutType({
                    layoutType: ui.FieldLayoutType.OUTSIDEABOVE
                }).defaultValue = inlinehtml3;

                form.addSubmitButton({
                    label: 'Save'
                });

                form.addButton({
                    id: 'back',
                    label: 'Back',
                });

                form.addResetButton();

                form.addButton({
                    id: 'add_order',
                    label: 'Create / Edit Packages'
                });

                form.addButton({
                    id: 'review_address',
                    label: 'Review Addresses'
                });

                form.clientScriptFileId = 4498487;

            }else {
                var linkedCustomerRec = record.load({
                    type: record.Type.CUSTOMER,
                    id: linked_mp_customer,
                    isDynamic: true
                });

                inlinehtml2 += '<div style=\"background-color: #cfeefc !important;border: 1px solid #e91e63;padding: 10px 10px 10px 20px;width:96%;position:absolute;font-size:12px"><b><u>IMPORTANT:</u></b><ul><li>This customer is has a special billing arrangement with Mailplus and cannot be reviewed directly. </br>Please review Service and Address information on <b>Customer: <a href="' + baseURL + '/app/site/hosting/scriptlet.nl?script=628&deploy=1&compid=1048144&unlayered=T&custid=' + linked_mp_customer + '">' + linkedCustomerRec.getValue({fieldId:'entityid'}) + ' ' + linkedCustomerRec.getValue({fieldId: 'companyname'}) + ' </a></b>.</li></ul></div><br><br><br><br>';
                
                form.addField({
                    id: 'custpage_html2',
                    label: 'Billing Address Error',
                    type: ui.FieldType.INLINEHTML,
                }).updateLayoutType({
                    layoutType: ui.FieldLayoutType.OUTSIDEABOVE
                }).defaultValue = inlinehtml2;           
            } 
            context.response.writePage(form);
        }else{
            var customer = parseInt(context.request.parameters.customer);
            var servicechange = parseInt(context.request.parameters.servicechange);
            var no_service_typs_ids = context.request.parameters.custpage_ids;
            var linked_service_ids = context.request.parameters.linked_custpage_ids;
            var financial_tab_item_array = context.request.parameters.financial_item_array;
            var financial_tab_price_array = context.request.parameters.financial_price_array;

            //Update the RunScheduled box for the customer
            // updateGreenTick(customer);

            
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

            var status = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: 'customscript_sc_smc_item_pricing_update',
                deploymentId: 'customdeploy1',
                params: params3
            });

            if(status == 'QUEUED'){
                if(isNullorEmpty(servicechange) || servicechange == 'F' || servicechange == 0){
                    redirect.toSuitelet({
                        scriptId: 'customscript_sl_smc_summary',
                        deploymentId: 'customdeploy_sl_smc_summary',
                        parameters: null
                    });
                }else {
                    redirect.toSuitelet({
                        scriptId: 'customscript_sl_servchg_customer_list',
                        deploymentId: 'customdeploy_sl_servchg_customer_list',
                        parameters: null
                    });
                }
                return false;
            }
        }   
    }  

    function createSearchFilter(name, join, operator, values){
        var filter = search.createFilter({
            name: name,
            join: join,
            operator: operator,
            values: values
        });
        return filter;
    }
    

    
    function serviceTypeSearch(service_type_id, service_cat){

        var service_type_search =  search.create({
            type: 'customrecord_service_type',
            columns: ['internalid', 'custrecord_service_type_ns_item_array', 'name']
        });

        if(!isNullorEmpty(service_type_id)){
            newFilter = search.createFilter({
                name: 'custrecord_service_type_ns_item',
                join: null,
                operator: search.Operator.IS,
                values: service_type_id
            });

            service_type_search.filters.push( newFilter);
        }

        if(!isNullorEmpty(service_cat)){
            newFilter = search.createFilter({
                name: 'custrecord_service_type_category',
                join: null,
                operator: search.Operator.ANYOF,
                values: service_cat
            });

            service_type_search.filters.push( newFilter);
        }

        //Service type search results
        var results = service_type_search.run().getRange({
            start: 0,
            end: 1000
        });

        if(isNullorEmpty(service_type_search)){
            var service_type_search2 =  search.create({
                type: 'customrecord_service_type',
                filters: filters,
                columns: ['internalid', 'custrecord_service_type_ns_item_array']
            });

            service_type_id = service_type_id + ',';
            var serviceItemFilter = search.createFilter({
                name: 'custrecord_service_type_ns_item_array',
                join: null,
                operator: search.Operator.CONTAINS,
                values: service_type_id
            });
            service_type_search2.filters.push(serviceItemFilter);

            if(!isNullorEmpty(service_cat)){
                var serviceCategoryFilter = search.createFilter({
                    name: 'custrecord_service_type_category',
                    join: null,
                    operator: search.Operator.ANYOF,
                    values: service_cat
                });
                service_type_search2.filters.push(serviceCategoryFilter);
            }

            //Service type search results
            var results2 = service_type_search2.run().getRange({
                start: 0,
                end: 1000
            });

            return results2;
        }
        
        return results;
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
        onRequest: onRequest
    };
});
    
        
    





