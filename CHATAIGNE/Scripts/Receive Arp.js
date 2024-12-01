
var notePlayed = script.addBoolParameter("Note Played", "Note is Played",false); 									//This will add a trigger (button)


function noteOnEvent(channel, pitch, velocity)
{
//	script.log("Note on received "+channel+", "+pitch+", "+velocity);
notePlayed.set(true);
}

function noteOffEvent(channel, pitch, velocity)
{
//	script.log("Note off received "+channel+", "+pitch+", "+velocity);
notePlayed.set(false);
}

function ccEvent(channel, number, value)
{
//	script.log("ControlChange received "+channel+", "+number+", "+value);
}



