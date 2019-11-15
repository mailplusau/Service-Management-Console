/**
 * Module Description
 * 
 * NSVersion    Date            		Author         
 * 1.00       	2017-11-03 09:14:45   		Ankith 
 *
 * Remarks:         
 * 
 * @Last Modified by:   mailplusar
 * @Last Modified time: 2018-01-11 11:11:45
 *
 */
var ctx = nlapiGetContext();

function main(){

	var customer_id = ctx.getSetting('SCRIPT', 'custscriptcustomer_id');
	var no_service_typs_ids = ctx.getSetting('SCRIPT', 'custscriptids');
	var linked_service_typs_ids = ctx.getSetting('SCRIPT', 'custscriptlinked_service_ids');
	var financial_tab_arra = ctx.getSetting('SCRIPT', 'custscriptfinancial_tab_array');
	var financial_tab_price_arra = ctx.getSetting('SCRIPT', 'custscriptfinancial_tab_price_array');



	nlapiLogExecution('DEBUG', 'no_service_typs_ids', no_service_typs_ids);

	nlapiLogExecution('DEBUG', 'financial_tab_arra', financial_tab_arra);
	nlapiLogExecution('DEBUG', 'financial_tab_arra', financial_tab_price_arra);

	if(!isNullorEmpty(financial_tab_arra)){
		var item_array = financial_tab_arra.split(",");
	} else {
		var item_array = [];
	}
	
	if(!isNullorEmpty(financial_tab_price_arra)){
		var price_array = financial_tab_price_arra.split(",");
	} else {
		var price_array = [];
	}
	

	var ids = [];
	var linked_ids = [];

	if(isNullorEmpty(customer_id)){
		var body = 'Null customer id passed through to the Schedule script';

    	nlapiSendEmail(112209, ['ankith.ravindran@mailplus.com.au', 'willian.suryadharama@mailplus.com.au'], 'SMC - Customer Item Pricing Update (SC) - Empty Linked Services', body, null);
		return false;
	}

	if(!isNullorEmpty(no_service_typs_ids)){
		ids = no_service_typs_ids.split(",");
	}

	if(!isNullorEmpty(linked_service_typs_ids)){
		linked_ids = linked_service_typs_ids.split(",");
	} 
	// else {
	// 	var body = 'Error while updating the Financial Tab for customer ' + customer_id + '. The Linked Services parameter passed to schedule script is null';

 //    	nlapiSendEmail(112209, ['ankith.ravindran@mailplus.com.au', 'willian.suryadharama@mailplus.com.au'], 'Empty Linked Services', body, null);
	// 	return false;
	// }

	var count_array = new Array();

	var recCustomer = nlapiLoadRecord('customer', customer_id);

	var finacnial_tab_size = recCustomer.getLineItemCount('itempricing');
	var old_financial_tab_size = finacnial_tab_size;
	var new_financial_tab_size = 0;

	var initial_size_of_financial = recCustomer.getLineItemCount('itempricing');

	var non_service_types_length = (ids.length - 1);

	var delete_record = true;

	while(recCustomer.getLineItemCount('itempricing') > non_service_types_length && recCustomer.getLineItemCount('itempricing') > 0)
	{
		for(var y=0; y<non_service_types_length; y++){
			if(recCustomer.getLineItemValue('itempricing', 'item', old_financial_tab_size) == ids[y]){
				delete_record = false;
				break;
			} else {
				delete_record = true;
			}
		}

		if(delete_record == true){
			recCustomer.removeLineItem('itempricing', old_financial_tab_size);
			old_financial_tab_size = recCustomer.getLineItemCount('itempricing');
		} else {
			old_financial_tab_size = old_financial_tab_size - 1;
		}
	}

	var initial_size_of_financial = recCustomer.getLineItemCount('itempricing');

	// var service_type = nlapiLoadRecord('customrecord_service_type', item_list_value);

    for(var i =0; i<item_array.length; i++){
    		nlapiLogExecution('DEBUG', 'first', item_array[i]);
    		if(!isNullorEmpty(item_array[i])){
    			old_financial_tab_size++;
    			recCustomer.setLineItemValue('itempricing', 'item', old_financial_tab_size, item_array[i]);
		        recCustomer.setLineItemValue('itempricing', 'level', old_financial_tab_size, -1);
		        recCustomer.setLineItemValue('itempricing', 'price', old_financial_tab_size, price_array[i]);
    		}

    }


	nlapiSubmitRecord(recCustomer);
}