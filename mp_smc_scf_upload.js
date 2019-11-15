/**
 * Module Description
 * 
 * NSVersion    Date            		Author         
 * 1.00       	2017-09-25 11:00:04   	Ankith 
 *
 * Remarks:  Upload SCF for customer       
 * 
 * @Last Modified by:   mailplusar
 * @Last Modified time: 2019-05-07 11:43:28
 *
 */



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

function smc_uploadscf() {

	if (request.getMethod() == "GET") {

		var custid = request.getParameter('recid');
		var uploaded_file = request.getParameter('upload_file');
		var uploaded_file_id = request.getParameter('uploaded_file_id');

		var recCustomer = nlapiLoadRecord('customer', custid);

		var form = nlapiCreateForm('Service Commencement Details: <a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + custid + '">' + recCustomer.getFieldValue('entityid') + '</a> ' + recCustomer.getFieldValue('companyname'));


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

		form.addField('custpage_id', 'text', 'ID').setDisplayType('hidden').setDefaultValue(custid);
		form.addField('custpage_uploaded', 'text', 'Uploaded File').setDisplayType('hidden').setDefaultValue(uploaded_file);
		form.addField('custpage_uploaded_id', 'text', 'Uploaded File ID').setDisplayType('hidden').setDefaultValue(uploaded_file_id);

		form.addField('sales_internalid', 'integer', 'InternalID').setDisplayType('hidden').setDisplaySize(40);
		form.addField('custom_sale_status', 'select', 'Sale Status', 'customlist_trial_status').setDisplayType('hidden');
		form.addField('sales_type', 'select', 'Sale Type', 'customlist_sale_type').setDisplayType('hidden');

		form.addField('date_of_entry', 'date', 'Date of Entry').setDisplayType('disabled').setLayoutType('startrow').setDisplaySize(40).setDefaultValue(getDate());
		if (role != 1005) {
			form.addField('sales_rep', 'select', 'Sales Rep', 'employee').setLayoutType('startrow').setMandatory(true).setDefaultValue(396479);
		}
		var select_status = form.addField('status', 'select', 'Commencement Type').setLayoutType('startrow', 'startrow').setMandatory(true);
		select_status.addSelectOption(2, 'Signed');
		select_status.addSelectOption(1, 'Free Trial');

		form.addField('comm_date', 'date', 'Date - Commencing').setLayoutType('midrow').setDisplaySize(40).setMandatory(true);
		form.addField('signup_date', 'date', 'Date - Sign Up').setLayoutType('endrow').setDisplaySize(40).setMandatory(true);
		form.addField('in_out', 'select', 'Inbound / Outbound', 'customlist_in_outbound').setLayoutType('startrow').setMandatory(true);

		form.setScript('customscript_cl_smc_scf_uplaod');
		form.addSubmitButton('Submit');
		form.addResetButton();
		response.writePage(form);
	} else {

		nlapiSetRedirectURL('SUITELET', 'customscript_sl_smc_summary', 'customdeploy_sl_smc_summary', null, null);
	}

}