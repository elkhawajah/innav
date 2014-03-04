/**
 * Controller namespace
 */
ctr = function Ctr( json ){
	this.view = new vw();
	this.model = new dm();
	this.path = null;	// array of nodes
	this.localPath = null;	// a single Place node; nav within a single beacon
	this.callbacks = {
		"context": this,
		"nav": this.nav,
		"newPoint": this.onPointCreate,
		"newEdge": this.onEdgeCreate,
		"delPoint": this.onPointDelete,
		"delEdge": this.onEdgeDelete,
		"updatePoint": this.onPointUpdate
	};
	// this.currentFloor = null;
	// this.alpha = this.currentFloor.alpha
	/*
	this.userVector = {
		"beacon": null,
		"alpha": null
	}
	*/
	// Initialization
	this.init( json );
};

ctr.prototype.init = function ( json ){
	this.model.init( json );
	this.view.init( this.callbacks );
	this.showGraph();
}

/**
 * Find shortest path to a destination; A* pathfinding
 * @param  {dm.Beacon} from Starting point
 * @param  {dm.Beacon} to   Destination
 */
ctr.prototype.findPath = function ( from, to ){
	closedset = [];	// The set of nodes already evaluated.
	openset = [from];	// The set of nodes to be evaluated, initially containing the start node
	path = [];

	if (from == to){
		return [from];
	}
	var h = function ( from, to ){	// Heuristic function
		// x^2 + y^2
		return Math.pow(to.coords[0] - from.coords[0], 2) + Math.pow(to.coords[1] - from.coords[1], 2);
	};
	var leastF = function (){	// Find node in open set with least f value
		var f = Number.POSITIVE_INFINITY, idx = -1;
		for (var i = 0; i < openset.length; i++){
			if (openset[i].f < f){
				f = openset[i].f;
				idx = i;
			}
		}
		return idx;
	};
	var inClosedSet = function ( node ){	// Check if node is already examined
		for (var i = 0; i < closedset.length; i++){
			if (closedset[i] == node){
				return true;
			}
		}
		return false;
	};
	var rebuildPath = function ( from, to ){	// Rebuild path based on last node returned
		current = to;
		while (current != from){
			path.push(current);
			current = current.parent;
		}
		path.push(current);	// start node
	};
	// While there still are nodes to check
	while (openset.length != 0){
		// find the node with the least f in the open set, remove it from the open set
		var i = leastF(),
			n = openset[i];
		openset.splice(i, 1);
		// for every of its children
		for (i = 0; i < n.vectors.length; i++){
			var child = n.vectors[i];
			if (!inClosedSet(child)){	// if not previously examined
				// set where we came from
				child.parent = n;
				// n.g + distance *squared* between child & n
				child.g = n.g + h( child, n );
				// distance *squared* between goal & child
				child.h = h( child, to );
				child.f = child.g + child.h;
				// if child is the goal, stop the search & build the graph
				if (child == to){
					rebuildPath( from, child );
					return path.reverse();
				}
				// Else add child to open set for futher examination
				openset.push(child);
			}
		}
		// push n to the closed list
		closedset.push(n);
	}
	return null;	// failure
};

/**
 * Compare several paths to various destinations and find the shortest
 * @param  {Array} paths Array of paths to compare
 * @return {Array}       The shortest path among all paths
 */
ctr.prototype.comparePaths = function ( paths ){
	var path, distance = Number.POSITIVE_INFINITY;
	for (var i = 0; i < paths.length; i++){
		// last node's f value is the total distance
		// distance in form d1^2 + d2^2 + ... + dn^2
		if (paths[i][paths[i].length-1].f < distance){
			distance = paths[i][paths[i].length-1].f;
			path = paths[i];
		}
	}
	return path;
};

/**
 * Create navigation to user destination
 */
ctr.prototype.navigate = function ( from, to ){
	// If on same floor
	if (from.floor == to.floor){
		this.path = this.findPath( from, to );
	} else {	// On separate floors; find elevation instead
		// Find nearest elevation
		var elev = this.model.findPlaces(dm.Place.SPECIAL_ELEVATION, from.floor);
		var paths = [];
		for (var i = 0; i < elev.length; i++){
			paths.push( this.findPath( from, elev[i].getNearestBeacon() ) );
		}
		if (paths.length == 1){
			tihs.path = paths[0];
		} else {
			this.path = this.comparePaths(paths);
		}
	}
};

/**
 * Show user the navigation
 */
ctr.prototype.showNav = function (){
	// tmp implementation
	for (var i = 0; i < this.path.length; i++){
		this.view.newPoint( this.path[i], true );
		if (i > 0){
			this.view.newEdge( this.path[i], this.path[i-1], true );
		}
	}
	if (this.localPath !== null){
		this.view.newPoint( this.localPath, true );
		this.view.newEdge( this.path[this.path.length-1], this.localPath, true );
	}
};

ctr.prototype.showGraph = function (){
	this.view.clear();
	for (var i = 0; i < this.model.model.beacons.length; i++){
		// TODO check floor
		var b = this.model.model.beacons[i];
		this.view.newPoint( b );
		for (var j = 0; j < b.vectors.length; j++){
			var v = b.vectors[j];
			this.view.newEdge( b, v );
		}
	}
	for (var i = 0; i < this.model.model.places.length; i++){
		// TODO check floor
		var p = this.model.model.places[i];
		this.view.newPoint( p );
		for (var j = 0; j < p.vectors.length; j++){
			var v = p.vectors[j];
			this.view.newEdge( p, v );
		}
	}
};

/**
 * Determine user vector
 * @param  {Array} beacons Array of nearby beacons
 * @returns {Object} User vector
 */
ctr.prototype.getUserVector = function (){
	return null;
};

ctr.prototype.getJSON = function (){
	return this.model.getJSON();
};

// by mouse location
// param: not dm.Beacon
ctr.prototype.findBeaconByViewCoord = function ( p ){
	for (var i = 0; i < this.model.model.beacons.length; i++){
		var b = this.model.model.beacons[i];
		if (p.coords[0] == b.coords[0] && p.coords[1] == b.coords[1]){
			return this.model.model.beacons[i];
		}
	}
	return null;
};

// by mouse location
// param: not dm.Beacon
ctr.prototype.findPlaceByViewCoord = function ( p ){
	for (var i = 0; i < this.model.model.places.length; i++){
		var b = this.model.model.places[i];
		if (p.coords[0] == b.coords[0] && p.coords[1] == b.coords[1]){
			return this.model.model.places[i];
		}
	}
	return null;
};

// Callback; tmp
// param: not dm.Beacon
ctr.prototype.nav = function ( from, to ){
	var self = this.context;
	self.localPath = null;
	if (from.ispl){
		from = self.findPlaceByViewCoord(from).getNearestBeacon();
	} else {
		from = self.findBeaconByViewCoord(from);
	}
	if (to.ispl){
		to = self.findPlaceByViewCoord(to);
		self.localPath = to;
		to = to.getNearestBeacon();
	} else {
		to = self.findBeaconByViewCoord(to);
	}
	self.path = self.findPath( from, to );
	if (self.path == null){
		throw new Error("No path found");
	}
	self.showNav();
};

// param: not dm.Beacon
ctr.prototype.onPointCreate = function ( p ){
	var self = this.context,
		blist = self.model.model.beacons,
		plist = self.model.model.places,
		json = {
			"id":null,
			"coords":[p.coords[0],p.coords[1]],
			"Vectors":[],
			"Floor":self.model.model.floors[0]	// current floor
		};
	if (!p.ispl){
		if (blist.length === 0){
			json.id = '001';
		} else {
			json.id = blist[blist.length-1].id + 1;
		}
		p = new dm.Beacon( json );
		blist.push( p );
	} else {
		if (plist.length === 0){
			json.id = '001';
		} else {
			json.id = plist[plist.length-1].id + 1;
		}
		p = new dm.Place( json );
		plist.push( p );
	}
	self.view.newPoint( p );
};

// param: not dm.Beacon
ctr.prototype.onEdgeCreate = function ( p1, p2 ){
	var self = this.context;
	if ( p1 == p2 ){
		console.log("Warning: No edges created - duplicate vertices");
		return;
	}
	if (p1.ispl && p2.ispl){
		console.log("Warning: No edges created - cannot connect two Place nodes");
	} else if (p1.ispl || p2.ispl){
		pa = p1.ispl ? p1 : p2;	// place
		pb = p1.ispl ? p2 : p1;	// non-place (beacon)
		pa = self.findPlaceByViewCoord(pa);
		pb = self.findBeaconByViewCoord(pb);
		if (!pa.isNeighbor(pb)){
			pa.vectors.push(pb);
			self.view.newEdge( pa, pb );
		} else {
			console.log("Warning: No edges created - duplicate edge");
		}
	} else {
		p1 = self.findBeaconByViewCoord(p1);
		p2 = self.findBeaconByViewCoord(p2);
		if (!p1.isNeighbor(p2)){
			p1.vectors.push(p2);
			p2.vectors.push(p1);
			self.view.newEdge( p1, p2 );
		} else {
			console.log("Warning: No edges created - duplicate edge");
		}
	}
};

// param: not dm.Beacon
ctr.prototype.onPointDelete = function ( p ){
	var self = this.context;
	if (!p.ispl){
		var blist = self.model.model.beacons;
		p1 = self.findBeaconByViewCoord(p);
		var v = p1.vectors;
		for (var i = 0; i < v.length; i++){
			var p2 = v[i];
			for (var j = 0; j < p2.vectors.length; j++){
				if (p2.vectors[j] == p1){
					p2.vectors.splice(j, 1);
					break;
				}
			}
		}
		for (var i = 0; i < blist.length; i++){
			if (blist[i] == p1){
				blist.splice(i, 1);
				break;
			}
		}
	} else {
		var plist = self.model.model.places;
		p = self.findPlaceByViewCoord(p);
		for (var i = 0; i < plist.length; i++){
			if (plist[i] == p){
				plist.splice(i, 1);
				break;
			}
		}
	}
	self.showGraph();
};

// param: not dm.Beacon
ctr.prototype.onEdgeDelete = function ( p1, p2 ){
	var self = this.context;
	if (p1.ispl || p2.ispl){
		pa = p1.ispl ? p1 : p2;	// place
		pb = p1.ispl ? p2 : p1;	// non-place (beacon)
		pa = self.findPlaceByViewCoord(pa);
		pb = self.findBeaconByViewCoord(pb);
		for (var i = 0; i < pa.vectors.length; i++){
			if (pa.vectors[i] == pb){
				pa.vectors.splice(i, 1);
				break;
			}
		}
	} else {
		p1 = self.findBeaconByViewCoord(p1);
		p2 = self.findBeaconByViewCoord(p2);
		for (var i = 0; i < p1.vectors.length; i++){
			if (p1.vectors[i] == p2){
				p1.vectors.splice(i, 1);
				break;
			}
		}
		for (var i = 0; i < p2.vectors.length; i++){
			if (p2.vectors[i] == p1){
				p2.vectors.splice(i, 1);
				break;
			}
		}
	}
	self.showGraph();
};

// param: not dm.Beacon
ctr.prototype.onPointUpdate = function ( p1, p2 ){
	var self = this.context;
	if (p1.ispl){
		p1 = self.findPlaceByViewCoord(p1);
	} else {
		p1 = self.findBeaconByViewCoord(p1);
	}
	p1.coords[0] = p2.coords[0];
	p1.coords[1] = p2.coords[1];
	self.showGraph();
};