var NUM_LOOPERS = 2;
var NUM_TRACKS = 6;
var FADER_MAX = 64;

var longPress = script.addFloatParameter("Long press", "Time to consider a long press", .5, 0, 1);
var retroRec = script.addBoolParameter("Retro Rec Mode", "Toggle Rec & Retro Rec Mode", false);
var muteToggleMode = script.addBoolParameter("Mute Toggle Mode", "Mute or Momentary", true);
var momentaryDefaultVal = script.addBoolParameter("Momentary Default Value", "Default value for momentary mute", true);

var looperTargets = [];
for (var i = 0; i < NUM_LOOPERS; i++) {
	var t = script.addTargetParameter("Looper " + (i + 1), "Looper To Control");
	t.setAttribute('targetType', 'container');
	looperTargets.push(t);
}

var looperIndex = 0;

var looper = null;
var nodeManager = null;

var trackState = {};

var globalActive = false;
var globalQuantiz = false;
var globalVolume = 0;

var longPressTimes = {};

//STATE
var IDLE = 0;
var WILL_RECORD = 1;
var RECORDING = 2;
var FINISH_REC = 3;
var RETRO_REC = 4;
var PLAYING = 5;
var WILL_STOP = 6;
var STOPPED = 7;
var WILL_PLAY = 8;

function init() {
	script.setUpdateRate(20);


	setup();
}



function setup() {

	looper = looperTargets[looperIndex].getTarget();
	if (looper && !nodeManager) nodeManager = looper.getParent();

	if (looper) {
		script.log("setup", looper.niceName);
		trackState = {};
		for (var i = 0; i < NUM_TRACKS; i++) {
			var track = looper.tracks["" + (i + 1)];
			trackState["" + (i + 1)] = { gain: track.gain.get(), active: track.active.get(), state: track.state.get() };
			var ts = trackState["" + (i + 1)];
			sendActive("" + (i + 1), ts.active);
			sendGain("" + (i + 1), ts.gain);
			sendState("" + (i + 1), ts.state);
		}

		globalActive = looper.out.active.get();
		local.sendCC(10, 12, globalActive ? 127 : 0);


		globalQuantiz = looper.recording.quantization.getKey() == "Default";
		local.sendCC(10, 11, globalQuantiz ? 127 : 0);

		globalVolume = looper.out.gain.get();
		local.sendCC(10, 22, globalVolume * FADER_MAX);
	}
}

function update() {
	if (!looper) return;

	var trackCount = Math.min(looper.trackParameters.trackCount.get(), NUM_TRACKS);
	for (var i = 0; i < trackCount; i++) updateTrackFeedback("" + (i + 1));

	if (globalActive != looper.out.active.get()) {
		globalActive = looper.out.active.get();
		local.sendCC(10, 12, globalActive ? 127 : 0);
	}

	if (globalQuantiz != (looper.recording.quantization.getKey() == "Default")) {
		globalQuantiz = looper.recording.quantization.getKey() == "Default";
		local.sendCC(10, 11, globalQuantiz ? 127 : 0);
	}

	if (globalVolume != looper.out.gain.get()) {
		globalVolume = looper.out.gain.get();
		local.sendCC(10, 22, globalVolume * FADER_MAX);

	}

	for (var i in longPressTimes) {
		if (new Date().getTime() / 1000.0 - longPressTimes[i] > longPress.get()) {
			delete longPressTimes[i];
			handleLongPress(i);
		}
	}
}



function updateTrackFeedback(id) {
	var track = looper.tracks[id];
	var state = track.state.get();
	var gain = track.gain.get();
	var active = track.active.get();

	if (trackState[id].state != state) {
		trackState[id].state = state;
		sendState(id, state);
	}

	if (trackState[id].state != IDLE && trackState[id].state != STOPPED) sendState(id, trackState[id].state);

	if (trackState[id].gain != gain) {
		trackState[id].gain = gain;
		sendGain(id, active);
	}

	if (trackState[id].active != active) {
		trackState[id].active = active;
		sendActive(id, active);
	}
}

function sendState(id, state) {
	var val = false;
	switch (state) {
		case IDLE:
			val = 0;
			break;

		case WILL_RECORD:
		case WILL_PLAY:
		case WILL_STOP:
		case FINISH_REC:
		case RETRO_REC:
			val = (root.transport.beatProgression.get() * 4) % 1 < .5 ? 127 : 0;
			break;

		case RECORDING:
			val = root.transport.beatProgression.get() < .5 ? 127 : 0;
			break;

		case PLAYING:
			val = 127;
			break;
	}

	local.sendCC(10, 2 + parseInt(id), val);
}

function sendActive(id, active) {
	local.sendCC(10, 12 + parseInt(id), active ? 127 : 0);
}

function sendGain(id, gain) {
	local.sendCC(10, 22 + parseInt(id), gain * FADER_MAX);
}

function handleLongPress(id) {
	if (id == 2) {
		looper.controls.clearAll.trigger();
	}
}


function interfaceParameterChanged(param) {
	// script.log("interface parameter changed : " + param.name + " > " + param.get()); 
	if (param.is(local.devices)) {
		setup();
	}
}

function scriptParameterChanged(param) {
	if (param.is(looperTargets[looperIndex])) {
		setup();
	}
}

function ccEvent(channel, number, value) {

	if (number < 20) {
		if (value > 0) {
			longPressTimes[number] = new Date().getTime() / 1000.0;
		} else {
			delete longPressTimes[number];
		}
	}

	var trackCount = looper.trackParameters.trackCount.get();

	if (number >= 23 && number <= 23 + trackCount) { //Rotary
		var id = number - 22;
		var track = looper.tracks["" + id];
		var val = value / FADER_MAX;
		trackState[id].gain = val;
		track.gain.set(val);

	} else if (number >= 13 && number <= 13 + trackCount) { //Rangée haut
		var id = number - 12;
		var targetVal = -1;
		if (muteToggleMode.get()) {
			if (value > 0) targetVal = !trackState[id].active;
		} else {
			targetVal = momentaryDefaultVal.get();
			if (value > 0) targetVal = !targetVal;
		}

		if (targetVal != -1) {
			var track = looper.tracks[id];
			trackState[id].active = targetVal;
			track.active.set(targetVal);
		}

		sendActive(id, trackState[id].active);
	} else if (number == 12) { //Bouton Out Active
		globalActive = value > 0;
		looper.out.active.set(globalActive);
	}
	else if (number == 22) { //Bouton Out Active
		globalVolume = value / FADER_MAX;
		looper.out.gain.set(globalVolume);
	}

	else if (number == 0) {
		var tIndex = Math.floor(Math.min(value * NUM_LOOPERS / 127, NUM_LOOPERS - 1));
		if (tIndex != looperIndex) {
			looperIndex = tIndex;
			setup();
		}
	}
	else if (value > 0) { //Rangée du bas en momentary, on vérifie que le press
		if (number == 11) {
			globalQuantiz = !globalQuantiz;
			looper.recording.quantization.set(globalQuantiz > 0 ? "Default" : "Free");
		} else if (number >= 3 && number <= 3 + trackCount) { //Rangée bas
			var id = number - 2;
			var track = looper.tracks[id];
			trackState[id].state = value;
			if (retroRec.get()) track.retroRec.trigger();
			else track.record.trigger();

		} else if (number == 2) {
			looper.controls.clear.trigger();
		} else if (number == 1) {
			if (nodeManager) nodeManager.looperControl.currentLooper.set(looper.niceName);
		}
	}
}