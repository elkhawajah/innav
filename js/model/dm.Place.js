/**
 * Constructor
 * @param {string} id Place ID
 */
dm.Place = function dmPlace( json ){
	dm.call(this);
	this.id = json.id;
	this.coords = [json.coords[0], json.coords[1], 1];	// x, y, w
	// Bottom-up linking
	this.vectors = json.Vectors;	// reverse adjacency list; initialized to array of string ids
	this.floor = json.Floor;	// initialized to string id; jump linking
	// Place human-friendly properties
	this.name = "";
	this.type = "";
	this.people = "";
	this.misc = "";
};

oo.inherit( dm.Place, dm );

/**
 * Find if this place is a response to the query
 * @param  {RegExp} key Regular expression of the string query
 * @return {boolean}     Whether this place is a match or not
 */
dm.Place.prototype.match = function ( key ){
	if ( key.test(this.name)
			|| key.test(this.type)
			|| key.test(this.people)
			|| key.test(this.misc) ){
		return true;
	} else {
		return false;
	}
};

/**
 * Find nearest beacon to this place
 * @return {dm.Beacon} Beacon (as start point)
 */
dm.Place.prototype.getNearestBeacon = function (){
	var idx, distance = Number.POSITIVE_INFINITY;
	for (var i = 0; i < this.vectors.length; i++){
		var b = this.vectors[i],
			d = Math.pow(this.coords[0] - b.coords[0], 2) + Math.pow(this.coords[1] - b.coords[1], 2);
		if (d < distance){
			distance = d;
			idx = i;
		}
	}
	return this.vectors[idx];
};

dm.Place.DEFAULT_TYPES = ["Office","Laboratory","Classroom","Lecture","Theater","Emergency","Elevation","Restroom"];
dm.Place.SPECIAL_EMERGENCY = "Emergency";
dm.Place.SPECIAL_ELEVATION = "Elevation";
dm.Place.SPECIAL_RESTROOM = "Restroom";