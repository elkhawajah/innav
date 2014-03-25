sensor = function Sensor(){
	this.readDataInterval = null;
	this.signals = [];	// node PIDs
	this.compass = {	// phone compass
		'readings': []
	};
	this.currentFloor = null;	// TODO read from signal record
	this.user = $('#user');
};

sensor.prototype.start = function (){
	var self = this;
	this.readDataInterval = setInterval(function (){
		self.measure();
	}, 200);
};

sensor.prototype.measure = function (){
	// Read compass
	var comp = this.getCompass();
	if (comp != null){
		this.pushData( comp, this.compass.readings );
	}
	// Get all available signal sources
	var measurements = this.getSignals();
	// Clean up all records that are not updated since last read
	for (var key in this.signals){
		if (!this.signals[key].updated){
			delete this.signals[key];
		} else {
			// Initialize all updated signal records to "not updated"
			this.signals[key].updated = false;
		}
	}
	var measurement, updateTarget;
	// For all current sensed signals
	for (var i = 0; i < measurements.length; i++){
		measurement = measurements[i], updateTarget = false;
		// Update current readings if that signal is already in record
		for (var key in this.signals){
			if (measurement.PID == key){
				this.pushData( measurement.distance, this.signals[key].readings );
				this.signals[key].updated = true;
				updateTarget = true;
				break;
			}
		}
		if (!updateTarget){
			this.signals[measurement.PID] = {
				'readings': [ measurement.distance ],
				'updated': true
			};
		}
	}
};

sensor.prototype.pushData = function ( data, dataSet ){
	setTimeout(function (){	// Put this in queue so the array changes exactly during each measure() call, not at some random point
		if (dataSet.length == 5){
			dataSet.shift();
		}
		dataSet.push(data);
	}, 0);
};

// tmp sensor measurement
sensor.prototype.getCompass = function (){
	if (this.user == undefined){
		return null;
	} else {
		var matrix = this.user.css('-webkit-transform'),
			angle = null;
		if(matrix !== 'none') {
			var values = matrix.split('(')[1].split(')')[0].split(',');
			var a = values[0];
			var b = values[1];
			angle = Math.round(Math.atan2(b, a) * (180/Math.PI));
		} else { angle = 0; }
		return angle;
	}
};

// tmp sensor measurement
sensor.prototype.getSignals = function (){
	var r = [],
		// CSS pixel has fixed 96 DPI; so 96 pixels per inch; defined as reference pixel
		// if scale is 1/16 inch per foot, then it's 6 pixels per foot
		// scale unit is px/ft
		scale = 6,	// TODO replace hardcoded scale
		dLimitSqr = Math.pow(50 * scale, 2);	// TODO replace hardcoded distance; distance in pixels
	var randomError = function ( distance ){
		var s = Math.random();
		if (s < 0.5){
			s = -1;
		} else {
			s = 1;
		}
		var range = 0;
		if (distance >= 32){
			range = 10;
		} else if (distance < 32 && distance >= 3.2){
			range = 6.5;
		} else if (distance < 3.2){
			range = 0.5;
		}
		return s * Math.random() * 0.5;
	}
	if (this.user == undefined){
		return r;
	} else {
		var ux = parseInt(this.user.css('left')), uy = parseInt(this.user.css('top')),
			nodes = $('circle');
		for (var i = 0; i < nodes.length; i++){
			var self = $(nodes[i]);
			if (self.attr('type') == dm.Node.TYPE_PHYSICAL){
				var cx = parseInt(self.attr('cx')), cy = parseInt(self.attr('cy')),
					ds = Math.pow(ux - cx, 2) + Math.pow(uy - cy, 2);
				if ( ds <= dLimitSqr){
					r.push({
						'PID': self.attr('pid'),
						'distance': Math.sqrt(ds) / scale + randomError(ds)	// Normalize pixel distance to physical distance using scale; distance in feet
					});
				}
			}
		}
		return r;
	}
};