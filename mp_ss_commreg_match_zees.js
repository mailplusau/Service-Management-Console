/*
* @Author: ankith.ravindran
* @Date:   2018-12-19 09:06:48
* @Last Modified by:   ankith.ravindran
* @Last Modified time: 2018-12-19 10:19:06
*/


function main() {

	//Load search SMC - Comm Reg - Different Zee
	var diffZeesCommRegSearch = nlapiLoadSearch('customrecord_commencement_register', 'customsearch_smc_commreg_diff_zees');

	//Run through the search
	var resultDiffZeesCommReg = diffZeesCommRegSearch.runSearch();

	//iterate through each line from the search
	resultDiffZeesCommReg.forEachResult(function(searchResult) {

			//Get values from the search
			var commRegId = searchResult.getValue("internalid"); // Commencement Internal ID
			var customerZee = searchResult.getValue("partner","CUSTRECORD_CUSTOMER",null); // Customer Zee
			var commRegZee = searchResult.getValue("custrecord_franchisee"); // Comm Reg Zee


			//Check to zee that the Comm Reg Zee and the customer Zee does not match
			if(commRegZee != customerZee){

				//Load the commreg record
				var commRegRecord = nlapiLoadRecord('customrecord_commencement_register', commRegId);

				commRegRecord.setFieldValue('custrecord_franchisee', customerZee); // Set the comm reg zee to the customer zee
				commRegRecord.setFieldValue('custrecord_std_equiv', 1); // Set the Standard Equivalent field to 1

				nlapiSubmitRecord(commRegRecord); // Submit Record
			}

		//Repeat
		return true;
	});
}