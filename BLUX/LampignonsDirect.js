var ipBase = script.addStringParameter("IP Base","Base IP for control","200.200.1");
var port = script.addIntParameter("Port","Port to send to",12001);


function sendValuesForObject(object, data, interface)
{
	var outValue = data.values.dimmer.outValue * interface.intensityMax;
	var args = [outValue];


    var useSafety = interface.outputID >= 4;
 	if(useSafety) util.delayThreadMS(1);

	var target = interface.totemID*10+interface.lampignonID;
    if(target == 0) return;

    var targetIP = ipBase.get()+"."+target;

 	local.sendTo(targetIP, port.get(), "/output/power/lamp", [interface.outputID, outValue]);
}