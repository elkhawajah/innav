/**
 * Constructor
 */
dm.Node = function dmNode( json ){
	dm.call(this);
	// Graph properties; A* search
	this.gid = json.GID;	// Graph node ID
	this.coords = [parseFloat(json.Coords[0]), parseFloat(json.Coords[1])];	// x, y;
	this.vectors = json.Vectors == undefined ? [] : json.Vectors;	// Adjacency list; initialize to string IDs (GID), then convert to dm.Node
	// f, g, h in A* heuristic pathfinding; f = g + h; g = past cost *squared*, h = future cost *squared*
	this.f = 0;
	this.g = 0;
	this.h = 0;
	this.parent = null;	// Backward linking for reconstructing path

	// Node properties
	this.type = json.Type;	// Node type
	this.pid = json.PID;	// Hardware ID
	this.floor = json.Floor;	// Bottom-up linking; initialize to a string IDs, then convert to dm.Floor

	// Human-friendly information
	this.placeName = json.PlaceName;	// Name of the place
	this.relatives = json.Relatives;	// Related people's names
	this.misc = json.Misc;	// All other information; Node tag, events, etc.

	// Optional node properties
	this.uid = json.UID;	// User ID
	this.userName = json.UserName;
	this.userAlpha = json.userAlpha == undefined ? 0 : json.userAlpha;
};

oo.inherit( dm.Node, dm );

dm.Node.prototype.getJSON = function (){
	var v = [];
	for (var i = 0; i < this.vectors.length; i++){
		v.push(this.vectors[i].gid);
	}
	return {
		'GID': this.gid,
		'Coords': [this.coords[0], this.coords[1]],
		'Vectors': v,
		'Type': this.type,
		'PID': this.pid,
		'Floor': this.floor.id,
		'PlaceName': this.placeName,
		'Relatives': this.relatives,
		'Misc': this.misc,
		'UID': this.uid,
		'UserName': this.userName
	};
};

dm.Node.prototype.isNeighbor = function ( node ){
	for (var i = 0; i < this.vectors.length; i++){
		if (this.vectors[i] == node){
			return true;
		}
	}
	return false;
};

dm.Node.prototype.match = function ( key ){
	if ( key.test(this.placeName)
			|| key.test(this.relatives)
			|| key.test(this.misc) ){
		return true;
	} else {
		return false;
	}
};

dm.Node.TYPE_PHYSICAL = "PHYSICAL_NODE";
dm.Node.TYPE_VIRTUAL = "VIRTUAL_NODE";
dm.Node.TYPE_USER = "USER_NODE";
dm.Node.DEFAULT_TAGS = ["Office","Laboratory","Classroom","Lecture","Theater","Emergency","Elevation","Restroom"];
dm.Node.SPECIAL_TAG_EMERGENCY = "Emergency";
dm.Node.SPECIAL_TAG_ELEVATION = "Elevation";
dm.Node.SPECIAL_TAG_RESTROOM = "Restroom";