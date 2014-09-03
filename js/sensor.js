sensor = function Sensor(){
	this.readDataInterval = null;
	this.signals = {};	// node PIDs
	this.compass = {	// phone compass
		'readings': []
	};
	this.currentFloor = null;	// TODO read from signal record
	this.u = document.getElementById("user");
	this.k = 4/1225;
	this.a = 12.755;
};

sensor.prototype.start = function (){
	var self = this;
	this.readDataInterval = setInterval(function (){
		self.measure();
	}, 100);
};

sensor.prototype.stop = function (){
	clearInterval(this.readDataInterval);
	this.readDataInterval = null;
};

sensor.prototype.setNodes = function ( nodeArray ){
	this.nodes = nodeArray;
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
	setTimeout(function(){
		if (dataSet.length == 10){
			dataSet.shift();
		}
		dataSet.push(data);
	}, 0);
};

// tmp sensor measurement
sensor.prototype.getCompass = function (){
	if (this.u == undefined){
		return null;
	} else {
		var matrix = this.u.style.webkitTransform,
			angle = null;
		if(matrix !== 'none') {
			var value = matrix.match(/rotate\((.+)deg\)/i);
			angle = parseInt(value[1]);
		} else { angle = 0; }
		// TODO normalize with floor alpha first
		return (angle-90) % 360;	// normalize CSS rotation to xy plane rotation, where 0 degree vector is +x axis, and clockwise is positive
	}
};

sensor.prototype.sig = function( mean ){
	// Energy falloff: alpha / ( 1 + k * distance^2 )
	// Sigma is energy falloff flipped; 0 <= mean <= 70
	// alpha / ( 1 + k * (distance - 70)^2 )
	return this.a/(1+this.k*(mean-70)*(mean-70));
};

// tmp sensor measurement
sensor.prototype.getSignals = function (){
	var r = [],
		// CSS pixel has fixed 96 DPI; so 96 pixels per inch; defined as reference pixel
		// if scale is 1/16 inch per foot, then it's 6 pixels per foot
		// scale unit is px/ft
		scale = 6,	// TODO replace hardcoded scale
		dLimitSqr = Math.pow(32.8 * scale, 2);	// TODO replace hardcoded distance; distance in pixels
	var self = this;
	var randomError = function ( distance ){	// Gaussian random number
		var mu = distance, sigma = self.sig(mu), y;
		// convert to Gaussian distribution
		var x1, x2, w, y1, y2;
		do {
			x1 = 2.0 * Math.random() - 1.0;
			x2 = 2.0 * Math.random() - 1.0;
			w = x1 * x1 + x2 * x2;
		} while ( w >= 1.0 );
		w = Math.sqrt( (-2.0 * Math.log( w ) ) / w );
		y1 = x1 * w;
		y2 = x2 * w;
		var s = Math.random();
		if (s < 0.5){
			y = y1;
		} else {
			y = y2;
		}
		return y * sigma + mu;
	};
	if (this.u == undefined){
		return r;
	} else if (this.nodes.length == 0){
		return r;
	} else {
		var ux = parseInt(this.u.style.left), uy = parseInt(this.u.style.top);
		for (var i = 0; i < this.nodes.length; i++){
			if (this.nodes[i].type == dm.Node.TYPE_PHYSICAL){
				var cx = this.nodes[i].coords[0], cy = this.nodes[i].coords[1],
					ds = Math.pow(ux - cx, 2) + Math.pow(uy - cy, 2);
				if ( ds <= dLimitSqr){
					r.push({
						'PID': this.nodes[i].pid,
						'distance': randomError(Math.sqrt(ds) / scale)	// Normalize pixel distance to physical distance using scale; distance in feet
					});
				}
			}
		}
		return r;
	}
};