/**
 * Module Description
 * 
 * NSVersion    Date            		Author         
 * 1.00       	2017-09-25 12:00:08  		Ankith 
 *
 * Remarks: Client script to create Commencement Register with Uploaded SCF         
 * 
 * @Last Modified by:   mailplusar
 * @Last Modified time: 2019-05-07 11:43:44
 *
 */


var custId;
var uploaded_file;
var custpage_uploaded_id;

var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://system.sandbox.netsuite.com';
}


function clientPageInit(type) {

	custId = nlapiGetFieldValue('custpage_id');
	uploaded_file = nlapiGetFieldValue('custpage_uploaded');
	custpage_uploaded_id = nlapiGetFieldValue('custpage_uploaded_id');
}



function saveRecord() {


	var PO = 0,
		MAILPU = 0,
		DX = 0,
		DXPU = 0,
		H2H = 0,
		EB = 0,
		CB = 0,
		OTHER = 0;

	if (nlapiGetFieldValue('custpage_uploaded') == 'F') {
		nlapiSetFieldValue('custpage_uploaded', 'T');
		return true;

	} else {

		nlapiSetFieldValue('custpage_uploaded', 'F');
	}

	//To check the status field has been select and not empty
	if (isNullorEmpty(nlapiGetFieldValue('status'))) {
		alert('Please select the status');
		nlapiSetFieldValue('custpage_uploaded', 'T');
		return false;
	}

	if (isNullorEmpty(nlapiGetFieldValue('signup_date'))) {
		alert('Please enter a Date - Sign Up');
		nlapiSetFieldValue('custpage_uploaded', 'T');
		return false;
	}

	//To check the commencement date field is not empty
	if (isNullorEmpty(nlapiGetFieldValue('comm_date'))) {
		alert('Please enter a Date- Commencing');
		nlapiSetFieldValue('custpage_uploaded', 'T');
		return false;
	}

	//To check the type of sale field is not empty
	if (isNullorEmpty(nlapiGetFieldValue('in_out'))) {
		alert('Please select Inbound/Outbound');
		nlapiSetFieldValue('custpage_uploaded', 'T');
		return false;
	}

	var recCustomer = nlapiLoadRecord('customer', custId);
	var zee = recCustomer.getFieldValue('partner');
	var zeeRecord = nlapiLoadRecord('partner', zee);
	var state_id = zeeRecord.getFieldValue('location');

	customer_comm_reg = nlapiCreateRecord('customrecord_commencement_register');
	customer_comm_reg.setFieldValue('custrecord_date_entry', nlapiGetFieldValue('date_of_entry'));
	customer_comm_reg.setFieldValue('custrecord_comm_date', nlapiGetFieldValue('comm_date'));
	customer_comm_reg.setFieldValue('custrecord_comm_date_signup', nlapiGetFieldValue('signup_date'));
	customer_comm_reg.setFieldValue('custrecord_customer', custId);
	customer_comm_reg.setFieldValue('custrecord_salesrep', nlapiGetFieldValue('sales_rep'));
	customer_comm_reg.setFieldValue('custrecord_franchisee', zee);
	customer_comm_reg.setFieldValue('custrecord_wkly_svcs', '5');
	customer_comm_reg.setFieldValue('custrecord_in_out', nlapiGetFieldValue('in_out'));
	customer_comm_reg.setFieldValue('custrecord_trial_status', nlapiGetFieldValue('status'));
	customer_comm_reg.setFieldValue('custrecord_state', state_id);
	customer_comm_reg.setFieldValue('custrecord_sale_type', 1);
	customer_comm_reg.setFieldValue('custrecord_po', PO);
	customer_comm_reg.setFieldValue('custrecord_dx', DX);
	customer_comm_reg.setFieldValue('custrecord_mail_pu', MAILPU);
	customer_comm_reg.setFieldValue('custrecord_dx_pu', DXPU);
	customer_comm_reg.setFieldValue('custrecord_bk_counter', CB);
	customer_comm_reg.setFieldValue('custrecord_bk_express', EB);
	customer_comm_reg.setFieldValue('custrecord_h2h', H2H);
	customer_comm_reg.setFieldValue('custrecord_other_svc', OTHER);
	if (custpage_uploaded_id != null) {
		customer_comm_reg.setFieldValue('custrecord_scand_form', parseInt(custpage_uploaded_id));
	}

	var new_comm_reg_id = nlapiSubmitRecord(customer_comm_reg);

	var body = 'New Service Commencement Form uploaded by Franchisee for Customer: ' + recCustomer.getFieldValue('entityid') + ' ' + recCustomer.getFieldValue('companyname') + '. Please Review';

	nlapiSendEmail(112209, ['popie.popie@mailplus.com.au', 'levi.arrogante@mailplus.com.au', 'ankith.ravindran@mailplus.com.au'], 'SMC - New SCF Uploaded', body, null);

	return true;

}