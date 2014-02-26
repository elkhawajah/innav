/**
 * Constructor
 * @param {string} id Beacon ID
 */
dm.Beacon = function dmBeacon( json ){
	dm.call(this);
	this.id = json.id;
	this.vectors = json.Vectors;	// adjacency list
	// For A* search
	this.coords = [json.coords[0], json.coords[1], 1];	// x, y, w;
	// f, g, h; f = g + h; g = past cost *squared*, h = future cost *squared*
	this.f = 0;
	this.g = 0;
	this.h = 0;
	this.parent = null;	// backward linking for reconstructing path
	// Bottom-up linking
	this.floor = json.Floor;	// initialize to a string id
};

oo.inherit( dm.Beacon, dm );

dm.Beacon.prototype.isNeighbor = function ( node ){
	for (var i = 0; i < this.vectors.length; i++){
		if (this.vectors[i] == node){
			return true;
		}
	}
	return false;
};

dm.Beacon.prototype.getJSON = function (){
	var v = [];
	for (var i = 0; i < this.vectors.length; i++){
		v.push(this.vectors[i].id);
	}
	return {
		'id':this.id,
		'coords':[this.coords[0], this.coords[1]],
		'Vectors':v,
		'Floor':this.floor.id
	};
};