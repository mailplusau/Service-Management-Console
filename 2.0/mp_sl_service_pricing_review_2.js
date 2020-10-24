/**

 *@NApiVersion 2.0
 *@NScriptType Suitelet

 */

 /**
  * Module Description - Page to show the list of all the customers based on the franchisee. To convert all the items listed in the financial tab into service records. Ability for the franchisee to cancel a customer as well.       
  * NS Version       Date             Author
  * 2.00             2020-10-25       Ravija Maheshwari
  * 
  * @Last Modified by: Ravija
  * @Last Modified time: 2020-10-25  12:28
  */

define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/redirect'],
    function(ui, email, runtime, search, record, http, log, redirect) {
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


            if(context.request.method === 'GET'){
                var form = ui.createForm({
                    title: 'Service Management Console'
                })
            }

            //Load Jquery
            var inlinehtml2 = '<script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ" crossorigin="anonymous"></script>';

            // Load DataTables
            inlinehtml2 += '<link rel="stylesheet" type="text/css" href="//cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css">';
            inlinehtml2 += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js"></script>';

            // Load Bootstrap
            inlinehtml2 += '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" crossorigin="anonymous">';
            inlinehtml2 += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js" integrity="sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd" crossorigin="anonymous"></script>';

            // Load Netsuite stylesheet and script
            inlinehtml2 += '<link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/>';
            inlinehtml2 += '<script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script>';
            inlinehtml2 += '<link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
            inlinehtml2 += '<style>.mandatory{color:red;}</style>';

            inlinehtml2 += '<link href="//netdna.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" rel="stylesheet"><script src="//netdna.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script><link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/><script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script><link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
        

            var htmlConstruct = form.addField({
                id: 'custpage_html2',
                type: ui.FieldType.INLINEHTML,
                label: ' '
            }).defaultValue = inlinehtml2;
            
            
            var inlineQty = '';


            //Instructions
            inlineQty += '<button type="button" class="btn btn-sm btn-info instruction_button" data-toggle="collapse" data-target="#demo">Click for Instructions</button>';
            inlineQty += '<div id="demo" class="collapse" style="background-color:llightgrey;">';
            inlineQty += '<u>IMPORTANT INSTRUCTIONS:</u> Functionalities available on the Customer listing/table:';
            inlineQty += '<ul>';
            inlineQty += '<li><b> Sort: </b> Click on column headers to sort customer list according to the values in the columns. This is default to "Customer Name".</li>';
            inlineQty += '<li><b> Clickable Actions available per customer: </b></li>';
            inlineQty += '<ul>';
            inlineQty += '<li><b>UPLOAD SCF Button:</b> Available for customers with missing Service Commencement Forms (SCF) in the system. You will need to upload the latest signed SCF for each relevant customers which outlines the service commencement date along with the Service(s) and Price(s).</li>';
            inlineQty += '<li><b> REVIEW button: </b> Review or Edit customer details (eg. Addresses, Service and Pricing, Packages) to set them up for Run Digitalisation</li>';
            inlineQty += '<li><b> COVID CANCEL button: </b> You may Cancel non-active customers providing details and reasons around the Cancellation.</li>';
            inlineQty += '<li><b> DO NOT NEED button: </b> To cancel customers with <b><u>Adhoc</u></b> arrangements.</li>';
            inlineQty += '<li><b> Duplicate COMMREG: </b Please contact Head Office if you see this Action against any customer.</li>';
            inlineQty += '</ul></ul></div>';

              //If role is Admin or System Support, dropdown to select zee
            if(role != 1000){
                inlineQty += '<div class="row">';
                inlineQty += '<div class="col-xs-12 admin_section"><b>Select Zee</b> <select class="form-control zee_dropdown">';
                inlineQty += '<option value=""></option>';

                ///Load Franchisee search
                var searched_zee = search.load({
                    id: 'customsearch_smc_franchisee'
                });

                var count_zee = 0;
                var zee_id;

                searched_zee.run().each(function (searchResult_zee){
                    zee_id = searchResult_zee.getValue('internalid');
                    // WS Edit: Updated entityid to companyname
                    zee_name = searchResult_zee.getValue('companyname');

                    if (context.request.parameters.zee == zee_id) {
                        inlineQty += '<option value="' + zee_id + '" selected="selected">' + zee_name + '</option>';
                    } else {
                        inlineQty += '<option value="' + zee_id + '">' + zee_name + '</option>';
                    }
                    return true;
                });
                inlineQty += '</select></div>';
                
                //Set zee to selected zee
                if (!isNullorEmpty(context.request.parameters.zee)) {
                    zee = context.request.parameters.zee;
                }
            }
        


            inlineQty += '<style> table#customer {font-size: 14px;text-align: center;border: none; font-weight: bold;} table th{text-align: center;} </style>';
            inlineQty += '<div class="form-group container-fluid customers_preview_section">';
            inlineQty += '<table cellpadding="15" id="customers-preview" class="table table-responsive table-striped customer tablesorter" cellspacing="0">';
            inlineQty += '<thead style="color: white;background-color: #607799;">';
            inlineQty += '<tr class="text-center">';
            inlineQty += '<th scope="col">Review Complete</th>';
            inlineQty += '<th scope="col">ID</th>';
            inlineQty += '<th scope="col">Customer Name</th>';
            inlineQty += '<th scope="col">Action</th>';
            inlineQty += '</tr>';
            inlineQty += '</thead>';
            inlineQty += '<tbody>';



            //Search Function for customers in a franchisees
            var zeeRecord = record.load({
                type: record.Type.PARTNER,
                id: zee,
                isDynamic: true
            });

            var name = zeeRecord.getValue({
                fieldId: 'companyname'
            });

            var customerSearch = search.load({
                id: 'customsearch_smc_customer'
            });

            customerSearch.filters.push(search.createFilter({
                name: 'partner',
                join: null,
                operator: 'anyof',
                values: zee
            }));


            var resultSet = customerSearch.run();
            resultSet.each( function(searchResult, index) {

                var custid = searchResult.getValue({
                    name: 'internalid', 
                    join: null, 
                    summary: "GROUP"
                });

                var entityid = searchResult.getValue({
                    name: 'entityid',
                    join: null,
                    summary: "GROUP"
                });

                var companyname = searchResult.getValue({
                    name: 'companyname',
                    join: null,
                    summary: "GROUP"     
                });

                //WS Edit: Retrieve column values to Identify Reviewed Services and Correct CommReg
                //Count of Reviewed Services
                var serviceCount = searchResult.getValue({
                    name: 'formulanumeric',
                    join: null,
                    summary: "MAX"
                }); 
                
                //Count of Correct CommReg
                var commRegCount = searchResult.getValue({
                    name: 'formulacurrency',
                    join: null,
                    summary: "COUNT"
                });

                    
                //WS Edit: to Account for Duplicate CommReg
                if (commRegCount == 0) {
                    inlineQty += '<tr><td></td><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + custid + '"><p style="text-align:left;">' + entityid + '</p></a></td><td ><p style="text-align:left;">' + companyname + '</p></td><td><div class="row"><div class="col-sm-6"><input type="button" class="commRegUpload form-control btn-default" value="UPLOAD SCF" id="commRegUpload_'+custid+'"></div><div class="col-sm-6"><input type="button" id="cancel_customer_'+custid+'" class="form-control btn-danger cancel_customer" value="COVID CANCEL"></div></div></td></tr>';
                } else if (commRegCount > 1) {
                    inlineQty += '<tr><td></td><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + custid + '"><p style="text-align:left;">' + entityid + '</p></a></td><td ><p style="text-align:left;">' + companyname + '</p></td><td><div class="row"><div class="col-sm-6"><input type="button" class="commRegUpload form-control btn-default" value="Duplicate COMMREG"></div><div class="col-sm-6"><input type="button" id="cancel_customer_'+custid+'" class="form-control btn-danger cancel_customer" value="COVID CANCEL"></div></div></td></tr>';
                } else if (serviceCount == 0) {
                    //If no service record present for customer, Review button will be shown
                    inlineQty += '<tr><td></td><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + custid + '"><p style="text-align:left;">' + entityid + '</p></a></td><td><p style="text-align:left;">' + companyname + '</p></td><td><div class="row"><div class="col-sm-6"><input type="button" class="review_customer form-control btn-warning" value="REVIEW" id="review_customer_'+custid+'" ></div><div class="col-sm-6"><input type="button" id="cancel_customer_'+custid+'" class="form-control btn-danger cancel_customer" value="COVID CANCEL"></div></div></td></tr>';
                } else {
                    //If service record is present for customer, Edit button is shown
                    inlineQty += '<tr class="dynatable-editable"><td style="text-align: center;"><img src="https://1048144.app.netsuite.com/core/media/media.nl?id=1990778&c=1048144&h=e7f4f60576de531265f7" height="25" width="25"></td><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + custid + '"><p style="text-align:left;">' + entityid + '</p></a></td><td><p style="text-align:left;">' + companyname + '</p></td><td><div class="row"><div class="col-sm-6"><input type="button" class="edit_customer form-control btn-primary" value="EDIT" id="review_customer_'+custid+'"></div><div class="col-sm-6"><input type="button" id="cancel_customer_'+custid+'" class="form-control btn-danger cancel_customer" value="COVID CANCEL"></div></div></td></tr>';
                }
                return true;
            });

            inlineQty += '</tbody>';
            inlineQty += '</table>';

            var htmlConstruct2 = form.addField({
                id: 'preview_table',
                type: ui.FieldType.INLINEHTML,
                label: ' '
            // }).updateLayoutType({
            //     layoutType: ui.FieldLayoutType.OUTSIDEBELOW
            }).updateBreakType({
                breakType: ui.FieldBreakType.STARTROW
            }).defaultValue = inlineQty;
            

            form.clientScriptFileId = 4366608;  //For Sandbox - 4240599
            context.response.writePage(form);
        }


        /**
         * [getDate description] - Function to get the current date
         * @return {[String]} [description] - Return the current date
         */
        function getDate() {
            var date = new Date();
            if (date.getHours() > 6) {
                date = nlapiAddDays(date, 1);
            }
            date = nlapiDateToString(date);
            return date;
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
