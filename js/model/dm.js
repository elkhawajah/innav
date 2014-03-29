/**
 * Data model namespace
 *
 * Data relationship; top-down
 * User
 * - Building
 *   - Floor
 *     - Node
 *
 * Data model structure (bottom-up, flattened structure)
 * Node
 *    - Floor; ref
 *    - Building; ref
 *    - Vector (adjacency list to other Nodes)
 * Floor
 * Building
 */
dm = function Dm(){
	this.model = {
		"building":null,
		"floors":[],
		"nodes":[]
	}
};

/**
 * Search for place queried
 * @param  {string} key Query string
 * @param {dm.Floor} floor (Optional) Specify which floor to search on
 */
dm.prototype.findPlaces = function ( key, floor ){
	var regexKey = new RegExp(key, "gi");
	places = [];
	for (var i = 0; i < this.model.nodes.length; i++){
		if (this.model.nodes[i].match(regexKey)){
			if (floor == undefined || this.model.nodes[i].floor == floor){	// Either no floor preference or on a certain floor
				places.push(this.model.nodes[i]);
			}
		}
	}
	return places;
};

dm.prototype.findFloorById = function ( id ){
	for (var i = 0; i < this.model.floors.length; i++){
		if (this.model.floors[i].id == id){
			return this.model.floors[i];
		}
	}
	return null;
};

dm.prototype.findNodeById = function ( id ){
	for (var i = 0; i < this.model.nodes.length; i++){
		if (this.model.nodes[i].gid == id){
			return this.model.nodes[i];
		}
	}
	return null;
}

dm.prototype.findNodeByPid = function ( id ){
	for (var i = 0; i < this.model.nodes.length; i++){
		if (this.model.nodes[i].pid == id){
			return this.model.nodes[i];
		}
	}
	return null;
}

/**
 * Generate data model representation of JSON object
 * @param  {[JSON]} json JSON object that contains data to be modelled
 */
dm.prototype.init = function ( json ){
	// *Must* initialize in this order
	// Building
	this.model.building = new dm.Building( json.Building );
	// Floors
	var floors = json.Floors;
	for (var i = 0; i < floors.length; i++){
		var f = new dm.Floor(floors[i]);
		// Vertical linking
		f.building = this.model.building;
		this.model.floors.push( f );
	}
	// Beacons
	var nodes = json.Nodes;
	if (nodes == undefined){
		this.model.nodes = [];
	} else {
		for (var i = 0; i < nodes.length; i++){
			var n = new dm.Node(nodes[i]),
				mf = this.findFloorById(n.floor);
			// Vertical linking
			if (mf != null){
				n.floor = mf;	// Replace string id with object
			} else {
				throw new Error('Cannot find floor ID '+n.floor+' of node '+n.id);
			}
			this.model.nodes.push( n );
		}
		// Horizontal linking
		for (var i = 0; i < this.model.nodes.length; i++){
			var n = this.model.nodes[i], mn = null;
			for (var j = 0; j < n.vectors.length; j++){
				mn = this.findNodeById(n.vectors[j]);
				if (mn != null){
					n.vectors[j] = mn;
				} else {
					throw new Error('Cannot find node ID '+n.vectors[j]+' of vectors of node '+n.id);
				}
			}
		}
	}
};

dm.prototype.getJSON = function (){
	var json = {
		"Building":null,
		"Floors":[],
		"Nodes":[]
	}
	json.Building = this.model.building.getJSON();
	for (var i = 0; i < this.model.floors.length; i++){
		json.Floors.push(this.model.floors[i].getJSON());
	}
	for (var i = 0; i < this.model.nodes.length; i++){
		json.Nodes.push(this.model.nodes[i].getJSON());
	}
	return json;
};