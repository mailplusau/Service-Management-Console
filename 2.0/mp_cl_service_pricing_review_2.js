/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

 /**
  * Module Description - Client script for the Item pricing Review Main page         
  * NS Version       Date             Author
  * 2.00             2020-10-25       Ravija Maheshwari
  * 
  * @Last Modified by: Ravija
  * @Last Modified time: 2020-10-25  12:28
  */


 define(['N/error', 'N/runtime', 'N/search', 'N/url', 'N/record', 'N/format', 'N/email'],
 function(error, runtime, search, url, record, format, email) {

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
         AddStyle('https://1048144.app.netsuite.com/core/media/media.nl?id=1988776&c=1048144&h=58352d0b4544df20b40f&_xt=.css', 'head');
         
         //To show loader while the page is loading
         $(window).load(function() {
             // Animate loader off screen
             $(".se-pre-con").fadeOut("slow");;
         });

         //Add datatable styling 
         $(document).ready(function () {
             var customersTable = $('#customers-preview').DataTable({
                 "pageLength": 25
             });
         });


         //On selecting zee, reload the SMC - Summary page with selected Zee parameter
         $(document).on("change", ".zee_dropdown", function(e) {

             var zee = $(this).val();

             var url = baseURL + "/app/site/hosting/scriptlet.nl?script=1058&deploy=1&compid=1048144&sorts[customername]=1";
             if (nlapiGetContext().getEnvironment() == "SANDBOX") {
                 url = baseURL + "/app/site/hosting/scriptlet.nl?script=1058&deploy=1&sorts[customername]=1";
             }
             url += "&zee=" + zee + "";

             window.location.href = url;
         });

         $(".edit_customer").on('click', onclick_reviewPage)
         $(".cancel_customer").on('click', onclick_cancel)
         $(".commRegUpload").on('click', commRegUpload)
         $(".review_customer").on('click', onclick_reviewPage)
     
     }

     //On click of review goes to the review page
     function onclick_reviewPage() {
         //Retrive customer id
         var custid = (this.id).split('_')[2];

         var myParams = JSON.stringify({
             custid: custid,
             servicechange: 0
         });

         var output = url.resolveScript({
             deploymentId: 'customdeploy_mp_sl_service_review_2',
             scriptId: 'customscript_mp_sl_service_review_2',
             returnExternalUrl: false
         });
      
         var upload_url = baseURL + output + '&unlayered=T&custparam_params='  + myParams
         window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
     }

     //On click of Cancel, goes to the cancel page
     function onclick_cancel() {
         //Retrive customer id
         var custid = (this.id).split('_')[2];

         var output = url.resolveScript({
             deploymentId: 'customdeploy1',
             scriptId: 'customscript_mp_sl_cancel_customer_2',
             returnExternalUrl: false
         });

         var upload_url = baseURL + output + '&unlayered=T&custid=' + custid;
         window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
     }

     //On click of Upload SCF
     function commRegUpload() {
         //Retrive customer id
         var custid = (this.id).split('_')[1];

         var output = url.resolveScript({
             deploymentId: 'customdeploy_sl_salesbtns_upload_file_2',
             scriptId: 'customscript_sl_sales_btns_upload_file_2',
             returnExternalUrl: false
         });
     
         var upload_url = baseURL + output + '&recid=' + custid + '&sales_record_id=' + null + '&upload_file=F&upload_file_id=' + null + '&file_type=T&type=SMC';
         window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
     }



     /**
      * [AddStyle description] - Add the CSS to the position specified in the page
      * @param {[type]} cssLink [description]
      * @param {[type]} pos     [description]
      */
     function AddStyle(cssLink, pos) {
         var tag = document.getElementsByTagName(pos)[0];
         var addLink = document.createElement('link');
         addLink.setAttribute('type', 'text/css');
         addLink.setAttribute('rel', 'stylesheet');
         addLink.setAttribute('href', cssLink);
         tag.appendChild(addLink);
     }

     return {
         pageInit: pageInit
     };
 });
