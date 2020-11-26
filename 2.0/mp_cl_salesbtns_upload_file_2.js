/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *
 * Module Description - Validates that the user entered correct file format
 * 
 * NSVersion    Date            		Author         
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
        var file_type;

        if (role == 1000) {
            zee = runtime.getCurrentUser();
        } else if (role == 3) { //Administrator
            zee = 6; //test
        } else if (role == 1032) { // System Support
            zee = 425904; //test-AR
        }

        function pageInit(context){
            file_type = currentRecord.get().getValue({fieldId:'custpage_file_type'});
            var date = new Date();

            if (file_type == 'F') {
                // No file entered
                alert('Please Upload either .pdf or .jpg or .png format');
                currentRecord.get().setValue({fieldId:'custpage_file_type', value: 'T'});
                return false;
            }
        }

        /**
         * Reroute to customscript_service_pricing_review_2 page
         */
        function handleBackToSMC() {
            var upload_url = baseURL + nlapiResolveURL('SUITELET', 'customscript_service_pricing_review_2', 'customdeploy1');
            window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
        }

        /**
         * Validates and sets field values in current record
         */
        function saveRecord(){
            var currRec = currentRecord.get();
            file_type = currRec.getValue({fieldId:'custpage_type'});
            if (type == 'product') {
                if (isNullorEmpty(currRec.getValue({fieldId:'upload_file_1'})) || isNullorEmpty(currRec.getValue({fieldId: 'upload_file_2'}))) {
                    alert('Please upload the Receipt/Pricing Statement and/or Full Rate Mailing Statement to continue');
                    return false;
                } else {
                    nlapiSetFieldValue('custpage_uploaded', 'T');
                    return true;
                }
        
            } else {
                if (isNullorEmpty(currRec.getValue({fieldId:'upload_file'})) && currRec.getValue({fieldId: 'custpage_uploaded'}) == 'F') {
                    alert('Please upload the Service Commencement Form');
                    return false;
                } else {
                    currRec.setValue({fieldId:'custpage_uploaded', value: 'T'});
                    return true;
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
            handleBackToSMC: handleBackToSMC,
            saveRecord: saveRecord
        }
    }
);

/**
 * Functions that may need to be added in future versions. 
 * Currently, these have been left out because 'upload_file_1_fs_lbl' and 'upload_file_2_fs_lbl'
 * are null elements on the Uplaod Commencement form page.
 */



// document.getElementById('upload_file_1_fs_lbl').onmouseover = function() { //receipt

// 	var URL = "https://system.netsuite.com/core/media/media.nl?id=1914828&c=1048144&h=6c2f4f7bcc255b2eb2b7&whence=";

// 	var width = 500;
// 	var height = 665;
// 	var left = (screen.width * 2 / 3) - (width / 2);
// 	var top = (screen.height / 2) - (height / 2);

// 	newwindow = window.open(URL, 'Sample Receipt', 'titlebar = no, toolbar=no, location=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=' + width + ', height=' + height + ', top=' + top + ', left=' + left);

// 	setTimeout(function() {
// 		newwindow.close();
// 	}, 10000);
// 	//newwindow = window.open(URL,'newwindow','location=1,status=1,scrollbars=1,  width=500,height=665');
// }

// document.getElementById('upload_file_2_fs_lbl').onmouseover = function() { //full rate mailing statement

// 	var URL = "https://system.netsuite.com/core/media/media.nl?id=1914725&c=1048144&h=28e0040bd180c8685f78&whence=";

// 	var width = 797;
// 	var height = 597;
// 	var left = (screen.width * 1 / 3) - (width / 2);
// 	var top = (screen.height / 2) - (height / 2);

// 	newwindow = window.open(URL, 'Sample Full Rate Mailing Statement', 'titlebar = no, toolbar=no, location=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=' + width + ', height=' + height + ', top=' + top + ', left=' + left);

// 	setTimeout(function() {
// 		newwindow.close();
// 	}, 10000);
// 	//newwindow = window.open(URL,'newwindow','location=1,status=1,scrollbars=1,  width=797,height=597');
// }