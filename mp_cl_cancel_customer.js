/**
 * Module Description
 * 
 * NSVersion    Date            		Author         
 * 1.00       	2017-11-27 13:12:36   		Ankith 
 *
 * Remarks:         
 * 
 * @Last Modified by:   mailplusar
 * @Last Modified time: 2019-05-07 10:12:31
 *
 */


var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://system.sandbox.netsuite.com';
}

function pageInit(){
	nlapiSetFieldDisplay('cancel_competitor', false);
}

function saveRecord()
{
	
	return true;
}

function onclick_back(){

	var upload_url = baseURL + nlapiResolveURL('SUITELET', 'customscript_sl_smc_summary', 'customdeploy_sl_smc_summary');
    window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
}

function clientFieldChanged(type, name, linenum) {
	if(name == 'cancel_reason'){
		if (!isNullorEmpty(nlapiGetFieldValue(name))) {
	 		if(nlapiGetFieldValue(name) == 12){
	 			nlapiSetFieldDisplay('cancel_competitor', true);
	 		} else {
	 			nlapiSetFieldDisplay('cancel_competitor', false);
	 		}
	 	}
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
