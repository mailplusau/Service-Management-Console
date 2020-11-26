/**

 *@NApiVersion 2.0
 *@NScriptType Suitelet
 * Module Description - User can upload a SMC File and then they are routed to Preview file page
 * 
 * NSVersion    Date            		Author         
 * 2.00       	2020-11-26 13:12:36      Ravija Maheshwari 
 *
 */

define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/redirect', 'N/file'],
    function(ui, email, runtime, search, record, http, log, redirect, file) {

        function onRequest(context) {
            if(context.request.method === 'GET'){

                //GET request params
                var type = context.request.parameters.type;
                var uploaded_file = context.request.parameters.upload_file;
                var uploaded_file_id = context.request.parameters.uploaded_file_id;
                var file_type = context.request.parameters.file_type;
                var custscript_partner =  context.request.parameters.custscript_partner;
                if (!isNullorEmpty(custscript_partner)) {
                    var reconcile_page = 'T'
                }

                if (type == 'product') {
                    var ap_stock_receipt = context.request.parameters.ap_stock_receipt_id;

                    var form = ui.createForm({
                        title: 'Upload Form'
                    });

                    form.addField({
                        id: 'upload_file_1',
                        type: ui.FieldType.FILE,
                        label: 'Post Office Receipt -or- Pricing Statement'
                    }).updateBreakType({
                        breakType: ui.FieldBreakType.STARTROW
                    }).updateDisplaySize({
                        height: 40,
                        width: 40
                    });  
                    
                    form.addField({
                        id: 'upload_file_2',
                        type: ui.FieldType.FILE,
                        label: 'Full Rate Mailing Statement (Yellow Carbon Copy)'
                    }).updateBreakType({
                        breakType: ui.FieldBreakType.STARTROW
                    }).updateDisplaySize({
                        height: 40,
                        width: 40
                    });   

                    form.addField({
                        id: 'ap_stock_receipt_id',
                        type: ui.FieldType.TEXT,
                        label: 'ID'
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = ap_stock_receipt;

                    form.addField({
                        id: 'custpage_type',
                        type: ui.FieldType.TEXT,
                        label: 'Type'
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = type;

                    form.addField({
                        id: 'custpage_uploaded',
                        type: ui.FieldType.TEXT,
                        label: 'Uploaded File'
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = uploaded_file;

                    form.addField({
                        id: 'custpage_uploaded_id',
                        type: ui.FieldType.TEXT,
                        label: 'Uploaded File ID'
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = uploaded_file_id;

                    form.addField({
                        id: 'custpage_file_type',
                        type: ui.FieldType.TEXT,
                        label: 'Uploaded File ID'
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = file_type;

                    form.addField({
                        id: 'custpage_reconcile_page',
                        type: ui.FieldType.TEXT,
                        label: 'Reconcile Page'
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = reconcile_page;

                    form.addField({
                        id: 'custscript_partner',
                        type: ui.FieldType.TEXT,
                        label: 'Reconcile'
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = custscript_partner;


                    var inlinehtml2 = '<div style="background-color: #cfeefc !important;border: 1px solid #417ed9;padding: 10px 10px 10px 20px;width:100%"><b><u>Instructions:</u></b><br/>Click the “Choose File” to Upload the relevant supporting document listed for your <b style="color:red">DISPUTE</b> request. <br/><ul><li><b><u>Australia Post Post Office Receipt</u></b> OR <b><u>Australia Post Pricing Statement (ones you receive in your mail) </u></b> and</li><li><b><u>Full Rate Mailing Statement (Yellow Carbon Copy)</u></b>.</li></ul>Hover your mouse cursor over each field to preview an example of acceptable supporting documents. <br/> Upon upload, you will be required to preview your uploaded documents, to verify the correct ones has been uploaded to the system. </div><br/><br/>';
                    
                    form.addField({
                        id: 'custpage_html2',
                        type: ui.FieldType.INLINEHTML,
                        label: 'Reconcile'
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = custscript_partner;

                    form.addField({
                        id: 'custpage_html2',
                        type: ui.FieldType.INLINEHTML,
                        label: 'inline html'
                    }).updateLayoutType({
                        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE 
                    }).defaultValue = inlinehtml2;

                    form.addButton({
                        id: 'doc_back',
                        label: 'Back',
                    });
                    form.addButton({
                        id: 'no_products',
                        label: 'No Products Purchased',
                    });
                    // form.addButton('doc_back', 'Back', 'onclick_Back()');
                    // form.addButton('no_products', 'No Products Purchased', 'onclick_NoPurchase()');
                    context.response.writePage(form);
                }else{
                    var custId = context.request.parameters.recid;
                    var sales_record_id = context.request.parameters.sales_record_id;
                    var customer_record = record.load({
                        type: record.Type.CUSTOMER,
                        id: custId
                    });

                    var form = ui.createForm({
                        title: 'Upload Commencement Form'
                    });

                    form.addField({
                        id: 'upload_file',
                        label: 'Select File',
                        type: ui.FieldType.FILE
                    }).updateDisplaySize({
                        height: 40,
                        width: 100
                    });

                    form.addField({
                        id: 'custpage_id',
                        label: 'ID',
                        type: ui.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    });

                    form.addField({
                        id: 'custpage_sales_record_id',
                        label: 'Sales Record ID',
                        type: ui.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = sales_record_id;

                    form.addField({
                        id: 'custpage_uploaded',
                        label: 'Uploaded File',
                        type: ui.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = uploaded_file;

                    form.addField({
                        id: 'custpage_uploaded_id',
                        label: 'Uploaded File ID',
                        type: ui.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = uploaded_file_id;

                    form.addField({
                        id: 'custpage_file_type',
                        label: 'Uploaded File ID',
                        type: ui.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = file_type;

                    form.addField({
                        id: 'custpage_customer_id',
                        label: 'Customer ID',
                        type: ui.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = customer_record.getValue({fieldId: 'entityid'});

                    form.addField({
                        id: 'custpage_type',
                        label: 'Type',
                        type: ui.FieldType.TEXT
                    }).updateDisplayType({
                        displayType: ui.FieldDisplayType.HIDDEN
                    }).defaultValue = type;

                    if(type == 'SMC'){
                        form.addButton({
                            id: 'doc_back',
                            label: 'Back',
                            functionName: 'handleBackToSMC'
                        });

                    }
                   
                }
                
                form.clientScriptFileId = 4504772;
                form.addSubmitButton({ label : 'Upload File'});
                form.addResetButton();
                context.response.writePage(form);
                
            }else{
                // POST request 
                var page_type = context.request.parameters.custpage_type;
                var uploaded_file_flag = context.request.parameters.custpage_uploaded;
                var reconcile_page = context.request.parameters.custpage_reconcile_page;
                var custscript_partner = context.request.parameters.custscript_partner;

                if (page_type == 'product') {
                    var ap_stock_receipt_id = context.request.parameters.ap_stock_receipt_id;
                    if (uploaded_file_flag == 'T') {
                        
                        var file_1 = context.request.files.upload_file_1;
                        var file_2 =  context.request.files.upload_file_2;

                        if(runtime.envType == "SANDBOX"){
                            file_1.folder = 1652140;
                            file_2.folder = 1652140;
                        }else{
                            file_1.folder = 1652140;
                            file_2.folder = 1652140;
                        }

                        var file_type_1 = file_1.fileType;
                        var file_type_2 = file_2.fileType;

                        var file_naming_1 = fileNamingExt(file_type_1, ap_stock_receipt_id, 'POR');
                        var file_naming_2 = fileNamingExt(file_type_2, ap_stock_receipt_id, 'FRM');
                        
                        if(file_naming_1 == false || file_naming_2 == false){
                            var params = {
                                ap_stock_receipt_id: ap_stock_receipt_id,
                                uploaded_file: 'F',
                                uploaded_file_id: null,
                                file_type: 'F',
                                type: 'product',
                                reconcile_page: reconcile_page,
                                custscript_partner: custscript_partner
                            };
                            redirect.toSuitelet({
                                scriptId: 'customscript_sl_sales_btns_upload_file_2',
                                deploymentId: 'customdeploy_sl_salesbtns_upload_file_2',
                                parameters: params
                            });
                        }else{
                            file_1.name = file_naming_1;
                            file_2.name = file_naming_2;

                            // Create file and upload it to the file cabinet.
                            var id_1 = file_1.save();
                            var id_2 = file_2.save();

                            // Navigate to preview the uploaded file
                            var params = {
                                ap_stock_receipt_id: ap_stock_receipt_id,
                                uploaded_file: 'T',
                                uploaded_file_id_1: id_1,
                                uploaded_file_id_2: id_2,
                                file_type: 'T',
                                type: 'product',
                                reconcile_page: reconcile_page,
                                custscript_partner: custscript_partner
                            };
                            redirect.toSuitelet({
                                scriptId: 'customscript_sl_salesbtns_preview_file',
                                deploymentId: 'customdeploy_sl_salesbtns_preview_file',
                                parameters: params
                            });
                        }
                    }
                }else{
                   // From the Upload Commencement File page
                   var customer = context.request.parameters.custpage_id;
                   var sales_id = context.request.parameters.custpage_sales_record_id;
                   var entity_id = context.request.parameters.custpage_customer_id;
                
                    if (uploaded_file_flag == 'T') {
                       var file = context.request.files.upload_file;

                        // set the folder where this file will be added. In this case, 10 is the internal ID
                        // of the SuiteScripts folder in the NetSuite file cabinet
                        if (runtime.envType == "SANDBOX") {
                            file.folder = 1584456;
                        } else {
                            file.folder = 1652140;
                        } 

                        var type = file.fileType;

                        //Set file name
                        var file_name = '';
                        if(type == 'JPGIMAGE'){
                            file_name = getDate() + '_' + entity_id + '.' + 'JPGIMAGE';
                        }else if(type == 'PDF'){
                            file_name = getDate() + '_' + entity_id + '.' + 'PDF';
                        }else if(type == 'PNGIMAGE'){   
                            file_name = getDate() + '_' + entity_id + '.' + 'PNGIMAGE';                             
                        }else if(type == 'PJPGIMAGE'){
                            file_name = getDate() + '_' + entity_id + '.' + 'PJPGIMAGE'; 
                        }else{
                            //redirect back to the same page since the format of the file is incorrect
                            var params = {
                                recid: customer,
                                sales_record_id: sales_id,
                                uploaded_file: 'F',
                                uploaded_file_id: null,
                                file_type: 'F',
                                type: page_type
                            };
                            redirect.toSuitelet({
                                scriptId: 'customscript_sl_salesbtns_upload_file_2',
                                deploymentId: 'customdeploy_sl_salesbtns_upload_file_2',
                                parameters: params
                            });
                        }


                        file.name = file_name;
                        // Create file and upload it to the file cabinet.
                        var id = file.save();
                        var params = generateParams(page_type, customer, sales_id, id);
                        redirect.toSuitelet({
                            scriptId: 'customscript_sl_salesbtns_preview_file',
                            deploymentId: 'customdeploy_sl_salesbtns_preview_file',
                            parameters: params
                        });
                    }
                }
            }
        }
        
        
        /**
         * Get the params object to reroute user to preview page after they uplaod a valid file
         * @param {} page_type 
         * @param {*} customer 
         * @param {*} sales_id 
         * @param {*} id 
         */
        function generateParams(page_type, customer, sales_id, id){
            if(page_type == 'SMC'){
                var params = {
                    recid: customer,
                    sales_record_id: sales_id,
                    uploaded_file: 'T',
                    uploaded_file_id: id,
                    file_type: 'T',
                    type: page_type
                };
            }

            return params;
        }

        /**
         * Functon that provides a file name
         * @param  type 
         * @param {*} id 
         * @param {*} id_type 
         */
        function fileNamingExt(type, id, id_type) {

            if (type == 'JPGIMAGE') {
                type = 'jpg';
                var file_name = getDate() + '_' + id + '_' + id_type + '.' + type;
        
                return file_name;
        
            } else if (type == 'PDF') {
                type == 'pdf';
                var file_name = getDate() + '_' + id + '_' + id_type + '.' + type;
        
                return file_name;
            } else {
                return false;
        
            }
        
        }
        
        /**
         * Funtion to return the current date string YYYYMMDD_hhmm
         */
        function getDate() {
            var date = (new Date());
            var date_string = date.getFullYear() + '' + (date.getMonth() + 1) + '' + date.getDate() + '_' + date.getHours() + '' + date.getMinutes();

            return date_string;
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
    }
)