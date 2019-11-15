function convertToServices() {
	var serviceSearch = nlapiLoadSearch('customrecord_service', 'customsearch_smc_services');

	var newFilters_service = new Array();
	newFilters_service[newFilters_service.length] = new nlobjSearchFilter('custrecord_service_customer', null, 'is', custid);

	serviceSearch.addFilters(newFilters_service);

	var resultSet_service = serviceSearch.runSearch();

	var serviceResult = resultSet_service.getResults(0, 1);

	if (serviceResult.length == 0) {
		//If the service record does not exists, lists all the items from the financial tab
		var y = 1;
		for (var i = 1; i <= recCustomer.getLineItemCount('itempricing'); i++) {
			var itemlist_value = recCustomer.getLineItemValue('itempricing', 'item', i);
			var itemlist_text = recCustomer.getLineItemText('itempricing', 'item', i);

			var service_type_search = serviceTypeSearch(itemlist_value, [1]);

			if (!isNullorEmpty(service_type_search)) {
				sublistNewPricing.setLineItemValue('new_item', y, service_type_search[0].getValue('internalid'));
				sublistNewPricing.setLineItemValue('new_itemprice', y, recCustomer.getLineItemValue('itempricing', 'price', i));
				sublistNewPricing.setLineItemValue('new_changerow', y, 'T');

				y++;
			}
		}
	}
}