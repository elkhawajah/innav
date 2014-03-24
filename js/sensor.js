sensor = function Sensor(){
	this.readDataInterval = null;
	this.signals = [];	// node PIDs
	this.compass = {	// phone compass
		'readings': [],
		'mean': null
	}
};

sensor.prototype.start = function (){
	this.readDataInterval = setInterval(this.readData, 200);
};

sensor.prototype.readData = function (){
	// Read compass
	var comp = this.getCompass();
	if (comp != null){
		this.pushData( comp, this.compass.readings );
		this.compass.mean = this.calcMean( this.compass.readings );
	}
	// Get all available signal sources
	var signals = this.getSignals();
	if (signals.length != 0){
		// Initialize all signal records to "not updated"
		for (var i = 0; i < this.signals.length; i++){
			this.signals[i].updated = false;
		}
		// For all current sensed signals
		for (var i = 0; i < signals.length; i++){
			var signal = signals[i], update = false;
			// Update current readings if that signal is already in record
			for (var j = 0; j < this.signals.length; j++){
				if (signal.PID == this.signals[j].PID){
					this.pushData( signal.distance, this.signals[j].readings );
					this.signals[j].mean = this.calcMean( this.signals[j].readings );
					this.signals[j].updated = true;
					update = true;
					break;
				}
			}
			// Add this source to record since it's new
			if (!update){
				this.signals.push({
					'PID': signal.PID,
					'readings': [ signal.distance ],
					'mean': null,
					'updated': true
				});
			}
		}
		// Clean up all records that are not updated since last read
		for (var i = 0; i < this.signals.length; i++){
			if (!this.signals[i].updated){
				this.signals.splice(i, 1);
				i--;
			}
		}
	}
};

sensor.prototype.pushData = function ( data, dataSet ){
	if (dataSet.length = 5){
		dataSet.splice(0, 1);
	}
	dataSet.push(data);
};

sensor.prototype.calcMean = function ( dataSet ){
	if (dataSet.length < 5){
		return null;
	} else {
		var a = dataSet;
		// Remove possible outliers
		a.sort(function(a,b){return a-b});
		var q1 = a[1],
			q3 = a[3],
			interQRange = (q3 - q1) * 1.5,
			innerfenceLo = q1 - interQRange,
			innerfenceHi = q3 + interQRange;
		if (a[0] < innerfenceLo){
			a.splice(0, 1);
		}
		if (a[a.length - 1] > innerfenceHi){
			a.splice(-1, 1);
		}
		// Calculate mean value
		var sum = 0;
		for (var i = 0; i < a.length; i++){
			sum += a[i];
		}
		return sum / a.length;
	}
};

sensor.prototype.getCompass = function (){
	var user = $('#user');
	if (user == undefined){
		return null;
	} else {
		var filter = /rotate\((.*)\)deg)/gi;
		var transform = user.css('webkit-transform');
		var match = filter.exec(transform);
		return parseFloat(match[1]);
	}
};

sensor.prototype.getSignals = function (){
	var user = $('#user'),
		r = [],
		dLimitSqr = Math.pow(100, 2),	// TODO replace hardcoded distance
		scale = [10, 1];	// TODO replace hardcoded scale
	if (user == undefined){
		return r;
	} else {
		var ux = parseInt(user.attr('cx')), uy = parseInt(user.attr('cy'));
		$('circle').each(function (){
			var self = $(this);
			if (self.attr('type') == dm.Node.TYPE_PHYSICAL){
				var cx = parseInt(self.attr('cx')), cy = parseInt(self.attr('cy')),
					ds = Math.pow(ux - cx, 2) + Math.pow(uy - cy, 2);
				if ( ds <= dLimitSqr){
					r.push({
						'PID': self.attr('pid'),	// TODO add pid attr to view elements
						'distance': Math.sqrt(ds)	// TODO normalize pixel distance to physical distance using scale
					})
				}
			}
		});
	}
};