    /**
     * Module Description
     * 
     * Version    Date            Author           Remarks
     * 1.00       30 Mar 2017     Ankith           Page to cancel the customer. 
     *
     */

function cancel_customer(request, response){

	if (request.getMethod() == "GET")
	{
		var form = nlapiCreateForm('Cancel Customer', true);
		
		form.addField('customer_id', 'text', 'customer').setDisplayType('hidden').setDefaultValue(request.getParameter('custid'));

		form.addField('cancel_date', 'date', 'SERVICE CANCELLATION DATE').setLayoutType('startrow').setMandatory(true);
		form.addField('cancel_reason', 'select', 'SERVICE CANCELATION REASON', 'customlist58').setLayoutType('startrow').setMandatory(true);
		form.addField('cancel_notice', 'select', 'SERVICE CANCELLATION NOTICE', 'customlist_cancellation_notice').setLayoutType('startrow');
		form.addField('cancel_competitor', 'select', 'SERVICE CANCELLATION COMPETITOR', 'customlist33').setLayoutType('startrow');
		form.addField('cancel_notes', 'longtext', 'CANCELLATION NOTES').setLayoutType('startrow');
		form.addSubmitButton('Cancel');
		form.addButton('back', 'Back', 'onclick_back()')
		
		form.setScript('customscript_cl_cancel_customer');
		
		response.writePage(form);
	} else {
		var ctx = nlapiGetContext();
		var customer = request.getParameter('customer_id');
		var comm_reg_results = commRegSearch(customer);
		
		var recCustomer = nlapiLoadRecord('customer', customer);

		recCustomer.setFieldValue('custentity13', request.getParameter('cancel_date'));
		recCustomer.setFieldValue('custentity_service_cancellation_notice',request.getParameter('cancel_notice'));
		recCustomer.setFieldValue('custentity_service_cancellation_reason',request.getParameter('cancel_reason'));
		recCustomer.setFieldValue('custentity14',request.getParameter('cancel_competitor'));
		// recCustomer.setFieldValue('entitystatus',22);

		nlapiSubmitRecord(recCustomer);

		if(!isNullorEmpty(comm_reg_results)){
			if(comm_reg_results.length > 1){
	    		//Send Error Email
	    		
	    	} else {
	    		 var comm_reg_record = nlapiLoadRecord('customrecord_commencement_register', comm_reg_results[0].getValue('internalid'));
	    		 comm_reg_record.setFieldValue('custrecord_trial_status', 3);
	    		 nlapiSubmitRecord(comm_reg_record);
	    	}
		}

		var noteRecord = nlapiCreateRecord('note');
		
		var memo = '';

		memo += 'Cancel Date:' + request.getParameter('cancel_date') + '\n Reason: ' + request.getParameter('cancel_reason');
		if(!isNullorEmpty(request.getParameter('cancel_competitor'))){
			memo += ', ' + request.getParameter('cancel_competitor');
		}
		memo += ' \nMedium: ' + request.getParameter('cancel_notice') + ' \nCancelled By: ' + ctx.getUser() + '\nNotes: '+ nlapiGetFieldValue('cancel_notes');

		noteRecord.setFieldValue('title', 'Cancellation');
		noteRecord.setFieldValue('notetype',7);
		noteRecord.setFieldValue('direction', 1);
		noteRecord.setFieldValue('note', memo);
		noteRecord.setFieldValue('entity', customer);
		noteRecord.setFieldValue('notedate', getDate());

		nlapiSubmitRecord(noteRecord);
   		
   		nlapiSetRedirectURL('SUITELET', 'customscript_sl_smc_summary', 'customdeploy_sl_smc_summary', null, null);

	}
}

function getDate() {
    var date = new Date();
    // if (date.getHours() > 6)
    // {
    //     date = nlapiAddDays(date, 1);
    // }
    date = nlapiDateToString(date);

    return date;
}
