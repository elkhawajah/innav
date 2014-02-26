/**
 * Data model namespace
 *
 * Data relationship; top-down
 * User
 * - Building
 *   - Floor
 *     - Beacon
 *       - Place
 *       - Vector (adjacency list)
 *
 * Data model structure (bottom-up, flattened structure)
 * Beacon
 *    - Floor; ref
 *    - Building; ref
 *    - Place; ref
 *    - Vector (adjacency list)
 * Floor
 * Building
 * Place
 */
dm = function Dm(){
	this.model = {
		"building":null,
		"floors":[],
		"beacons":[],
		"places":[]
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
	var tmp = this.model.places;
	for (var i = 0; i < tmp.length; i++){
		if (tmp[i].match(regexKey)){
			if (floor == undefined || tmp[i].floor == floor){	// Either no floor preference or on a certain floor
				places.push(tmp[i]);
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

dm.prototype.findBeaconById = function ( id ){
	for (var i = 0; i < this.model.beacons.length; i++){
		if (this.model.beacons[i].id == id){
			return this.model.beacons[i];
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
	var beacons = json.Beacons;
	for (var i = 0; i < beacons.length; i++){
		var b = new dm.Beacon(beacons[i]),
			mf = this.findFloorById(b.floor);
		// Vertical linking
		if (mf != null){
			b.floor = mf;	// Replace string id with object
		} else {
			throw new Error('Cannot find floor ID '+b.floor+' of beacon '+b.id);
		}
		this.model.beacons.push( b );
	}
	// Places
	var places = json.Places;
	for (var i = 0; i < places.length; i++){
		var p = new dm.Place(places[i]),
			mb = null, mf = null;
		// Vertical linking
		for (var j = 0; j < p.vectors.length; j++){
			mb = this.findBeaconById(p.vectors[j]);
			if (mb != null){
				p.vectors[j] = mb;	// Replace string id with object
			} else {
				throw new Error('Cannot find beacon ID '+p.vectors[j]+' of place '+p.id);
			}
		}
		mf = this.findFloorById(p.floor);
		if (mf != null){
			p.floor = mf;	// Replace string id with object
		} else {
			throw new Error('Cannot find floor ID '+b.floor+' of place '+p.id);
		}
		this.model.places.push( p );
	}
	// Horizontal linking
	for (var i = 0; i < this.model.beacons.length; i++){
		var b = this.model.beacons[i], mb = null;
		for (var j = 0; j < b.vectors.length; j++){
			mb = this.findBeaconById(b.vectors[j]);
			if (mb != null){
				b.vectors[j] = mb;
			} else {
				throw new Error('Cannot find beacon ID '+b.vectors[j]+' of vectors of beacon '+b.id);
			}
		}
	}
};

dm.prototype.getJSON = function (){
	var json = {
		"Building":null,
		"Floors":[],
		"Beacons":[],
		"Places":[]
	}
	json.Building = this.model.building.getJSON();
	for (var i = 0; i < this.model.floors.length; i++){
		json.Floors.push(this.model.floors[i].getJSON());
	}
	for (var i = 0; i < this.model.beacons.length; i++){
		json.Beacons.push(this.model.beacons[i].getJSON());
	}
	for (var i = 0; i < this.model.places.length; i++){
		json.Places.push(this.model.places[i].getJSON());
	}
	return json;
};