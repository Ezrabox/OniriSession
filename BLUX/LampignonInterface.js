function sendValuesForObject(object, data, interface)
{
	
	var outValue = data.values.dimmer.outValue;

	//var ip = "200.200.1."+(params.totemID*10+params.lampignonID);
	//var port = 12001;

	var args = [interface.totemID, interface.lampignonID, interface.outputID, outValue];
	local.send("/setLamp",args);
	script.log(args);

	//script.log(ip);
	//var address = 	
}