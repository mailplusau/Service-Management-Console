/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *
 * Module Description - Allows user to enter competitor if cancelllation reason is 'Competitor'. 
 * Reroutes back to the customscript_service_pricing_review_2 page
 * 
 * NSVersion    Date            		 Author         
 * 2.00       	2020-11-26 13:12:36      Ravija Maheshwari 
 *
 */

define(['N/error', 'N/runtime', 'N/search', 'N/url', 'N/record', 'N/format', 'N/email', 'N/currentRecord'],
function(error, runtime, search, url, record, format, email, currentRecord) {

    //Setup 
    var baseURL = 'https://1048144.app.netsuite.com';
    if (runtime.EnvType == "SANDBOX") {
        baseURL = 'https://system.sandbox.netsuite.com';
    }
    
    var zee = 0;
    var role = runtime.getCurrentUser().role;

    if (role == 1000) {
        zee = runtime.getCurrentUser();
    } else if (role == 3) { //Administrator
        zee = 6; //test
    } else if (role == 1032) { // System Support
        zee = 425904; //test-AR
    }


    function pageInit(context){
        //Hide cancel competitor field 
        var currentRec = currentRecord.get();
        var cancelCustField = currentRec.getField({fieldId: 'cancel_competitor'});
        cancelCustField.isDisplay = false;
    }

    function fieldChanged(context){
        if(context.fieldId == 'cancel_reason'){
            var currentRec = currentRecord.get();
            var recName = currentRec.getValue({fieldId: context.fieldId});
            if (!isNullorEmpty(recName)) {
                if(recName == 12){
                    // Cancellation reason is Competitor
                    // Show cancel competitor field
                    var cancelCustField = currentRec.getField({fieldId: 'cancel_competitor'});
                    cancelCustField.isDisplay = true;
                } else {
                    var cancelCustField = currentRec.getField({fieldId: 'cancel_competitor'});
                    cancelCustField.isDisplay = false;
                }
            }
        }
    }

    //Return back to the Service Pricing Review Page
    function onclick_back(){
        var output = url.resolveScript({
            deploymentId: 'customdeploy1',
            scriptId: 'customscript_service_pricing_review_2',
            returnExternalUrl: false
        });
        var upload_url = baseURL + output;
        window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
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
        onclick_back: onclick_back,
        fieldChanged: fieldChanged
    }
});