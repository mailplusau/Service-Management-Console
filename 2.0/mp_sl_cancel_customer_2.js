/**

 *@NApiVersion 2.0
 *@NScriptType Suitelet
 *
 * Module Description - Page to cancel a customer
 * 
 * NSVersion    Date            		 Author         
 * 2.00       	2020-11-26 13:12:36      Ravija Maheshwari 
 */

define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/redirect', 'N/format', 'N/currentRecord'],
function(ui, email, runtime, search, record, http, log, redirect, format, currentRecord) {
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
                title: 'Cancel Customer'
            });
            
            form.addField({
                id: 'customer_id',
                type: ui.FieldType.TEXT,
                label: 'customer'
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN
            }).defaultValue = context.request.parameters.custid

            form.addField({
                id: 'cancel_date',
                type: ui.FieldType.DATE,
                label: 'SERVICE CANCELLATION DATE'
            }).defaultValue = getDate()

            form.addField({
                id: 'cancel_reason',
                type:  ui.FieldType.SELECT,
                label: 'SERVICE CANCELATION REASON',
                source: 'customlist58'
            }).defaultValue = 38

            form.addField({
                id: 'cancel_notice',
                label: 'SERVICE CANCELLATION NOTICE',
                type:  ui.FieldType.SELECT,
                source: 'customlist_cancellation_notice'
            }).defaultValue = 12

            form.addField({
                id: 'cancel_competitor',
                label: 'SERVICE CANCELLATION COMPETITOR',
                type:  ui.FieldType.SELECT,
                source:  'customlist33'
            });

            form.addField({
                id:'cancel_notes',
                label: 'CANCELLATION NOTES',
                type:  ui.FieldType.LONGTEXT
            });

          
            form.addSubmitButton({
                label : 'Cancel'
            });
    
            form.addButton({
                id:'back',
                label:'Back',
                functionName: 'onclick_back()'
            });

            form.clientScriptFileId = 4372324; //Prod - 4372324, Sandbox -  4241212
            context.response.writePage(form);

        }else{
            var customer = context.request.parameters.customer_id;
            var comm_reg_results = commRegSearch(customer);

            var recCustomer = record.load({
                type: record.Type.CUSTOMER,
                id: customer,
                isDynamic: true
            });

            // recCustomer.setValue({fieldId: 'custentity13', value: context.request.parameters.cancel_date}); -> INVALID DATE SYNTAX
            recCustomer.setValue({fieldId: 'custentity_service_cancellation_notice', value: context.request.parameters.cancel_notice});
            recCustomer.setValue({fieldId: 'custentity_service_cancellation_reason', value: context.request.parameters.cancel_reason});
            recCustomer.setValue({fieldId: 'custentity_14',value: context.request.parameters.cancel_competitor});
            recCustomer.setValue({fieldId: 'entitystatus', value: 22});
            recCustomer.save();

            if(!isNullorEmpty(comm_reg_results)){
                if(comm_reg_results.length > 1){
                    //Send error email
                }else{
                    var comm_reg_record = record.load({
                        type: 'customrecord_commencement_register',
                        id: comm_reg_results[0].getValue('internalid'),
                        isDynamic:  true,
                    });
                    comm_reg_record.setValue({fieldId:'custrecord_trial_status', value: 3 });
                    comm_reg_record.save();
                }
            }

            var noteRecord = record.create({
                type: record.Type.NOTE
            }); 

            var memo = '';
            memo += 'Cancel Date:' + context.request.parameters.cancel_date + '\n Reason: ' + context.request.parameters.cancel_reason;
            if(!isNullorEmpty(context.request.parameters.cancel_competitor)) {
                memo += ', ' + context.request.parameters.cancel_competitor;
            }
            memo += ' \nMedium: ' + context.request.parameters.cancel_notice + ' \nCancelled By: ' + runtime.getCurrentUser().id; // + '\nNotes: '+ currentRecord.getValue({fieldId: 'cancel_notes'});
            
            noteRecord.setValue({
                fieldId: 'title',
                value: "Cancellation",
            });
            noteRecord.setValue({
                fieldId: 'notetype',
                value: 7
            });
            noteRecord.setValue({
                fieldId: 'direction',
                value: 1,
            });
            noteRecord.setValue({
                fieldId: 'note',
                value: memo,
            });
            noteRecord.setValue({
                fieldId: 'entity',
                value: customer,
            });
            noteRecord.setValue({
                fieldId: 'title',
                value: "Cancellation",
            });
            log.debug({
                title: 'date obj',
                details: typeof getDate()
            });

            // noteRecord.setValue({
            //     fieldId: 'notedate',
            //     value: getDate(),
            // });
         
            
            noteRecord.save();
            redirect.toSuitelet({
                scriptId: 'customscript_service_pricing_review_2',
                deploymentId: 'customdeploy1',
                parameters: null            
            });

        }   
    }

    /**
     * Function to search a customer's commencement register 
     * @param {*} customer  -  customer id
     */
    function commRegSearch(customer){
        
        var array_status =  new Array;
        array_status[0] = '1'; //Trial Status
        array_status[1] = '2' // Signed Status

        var mySearch = search.create({
            title: 'Commencement Register Search',
            type: 'customrecord_commencement_register',
            id:  null,
            columns: ['internalid'],
            filters: [
                ['custrecord_trial_status','anyof', array_status],
                'and',
                ['custrecord_customer', 'is', customer]
            ]
        });

        return mySearch.run().getRange(0,1000);
    }

    /**
     * [getDate description] - Get the current date
     * @return{​​​​​​​​[String]}​​​​​​​​ [description] - return the string date
    */
    function getDate() {​​​​​​​​
        var date = new Date();
        date = format.format({​​​​​​​​
            value: date,
            type: format.Type.DATE
        }​​​​​​​​);
        return date;
    }​​​​​​​​

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