/**
 * Controller namespace
 */
ctr = function Ctr( json ){
	this.view = new vw();
	this.model = new dm();
	this.sensor = new sensor();
	this.path = null;	// array of nodes
	this.callbacks = {
		"context": this,
		"nav": this.nav,
		"navU": this.navUser,
		"newPoint": this.onPointCreate,
		"newEdge": this.onEdgeCreate,
		"delPoint": this.onPointDelete,
		"delEdge": this.onEdgeDelete,
		"updatePoint": this.onPointUpdate,
		"loc": this.loc,
		"pauseSensor": this.pauseSensor,
		"resumeSensor": this.resumeSensor
	};
	this.user = null;
	// Update user location after calibration
	this.userUpdateInterval = null;
	// Initialization
	this.init( json );
	this.approx = document.getElementById("approx");
};

ctr.prototype.init = function ( json ){
	this.model.init( json );
	this.view.init( this.callbacks );
	this.showGraph();
	this.sensor.setNodes( this.model.model.nodes );
	this.sensor.start();
}

/**
 * Find shortest path to a destination; A* pathfinding
 * @param  {dm.Node} from Starting point
 * @param  {dm.Node} to   Destination
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
	if (from.floor == to.floor){	// TODO compare current floor to to.floor
		this.path = this.findPath( from, to );
	} else {	// On separate floors; find elevation instead
		// Find nearest elevation
		var elev = this.model.findPlaces(dm.Place.SPECIAL_TAG_ELEVATION, from.floor);
		var paths = [];
		for (var i = 0; i < elev.length; i++){
			paths.push( this.findPath( from, elev[i] ) );
		}
		if (paths.length == 1){
			this.path = paths[0];
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
};

ctr.prototype.showGraph = function (){
	this.view.clear();
	for (var i = 0; i < this.model.model.nodes.length; i++){
		// TODO check floor
		var n = this.model.model.nodes[i];
		this.view.newPoint( n );
		for (var j = 0; j < n.vectors.length; j++){
			var v = n.vectors[j];
			this.view.newEdge( n, v );
		}
	}
};

ctr.prototype.getJSON = function (){
	return this.model.getJSON();
};

// by mouse location
// param: not dm.Node
ctr.prototype.findNodeByViewCoord = function ( p ){
	for (var i = 0; i < this.model.model.nodes.length; i++){
		var n = this.model.model.nodes[i];
		if (p.coords[0] == n.coords[0] && p.coords[1] == n.coords[1]){
			return this.model.model.nodes[i];
		}
	}
	return null;
};

ctr.prototype.ccIntersect = function ( a, b, ra, rb ){
	var ax = a.coords[0], ay = a.coords[1],
		bx = b.coords[0], by = b.coords[1],
		d = Math.sqrt( Math.pow(bx - ax, 2) + Math.pow(by - ay, 2) ),
		m, h, kx, ky, x1, x2, y1, y2;
	if (ra + rb < d){	// circles are separate; make it 1 intersection
		var delta = (d - ra - rb) / 2;
		ra += delta; rb += delta;
		m = ra;
		h = 0;
	} else if (d < Math.abs(ra-rb)){	// one circle is contained; make it 1 intersection
		var delta = ( Math.abs(ra - rb) - d ) / 2;
		if (ra < rb){
			ra += delta; rb -= delta;
		} else {
			ra -= delta; rb += delta;
		}
		m = ra;
		h = 0;
	} else {	// normal intersections
		m = (ra*ra - rb*rb + d*d) / (2*d),
		h = Math.sqrt( ra*ra - m*m );
	}
	kx = ax + m/d * (bx-ax),
	ky = ay + m/d * (by-ay);
	x1 = kx + h * (by-ay) / d, y1 = ky - h * (bx-ax) / d,
	x2 = kx - h * (by-ay) / d, y2 = ky + h * (bx-ax) / d;
	return {
		'p1x': x1,
		'p1y': y1,
		'p2x': x2,
		'p2y': y2
	};
};

ctr.prototype.determinant = function ( a, b, k ){
	var ax = a.coords[0], ay = a.coords[1],
		bx = b.coords[0], by = b.coords[1],
		kx = k.coords[0], ky = k.coords[1];
	return ((bx - ax)*(ky - ay) - (by - ay)*(kx - ax));
};

ctr.prototype.bilaterate = function (){
	// Update user alpha
	this.user.userAlpha = this.calcMean(this.sensor.compass.readings);
	this.approx.style.webkitTransform = 'rotate('+this.user.userAlpha+'deg)';
};

ctr.prototype.unilaterate = function (){
	// Update user alpha
	this.user.userAlpha = this.calcMean(this.sensor.compass.readings);
	this.approx.style.webkitTransform = 'rotate('+this.user.userAlpha+'deg)';
};

ctr.prototype.calcMean = function ( dataSet ){
	if (dataSet.length < 10){
		return null;
	} else {
		var a = dataSet;
		a.sort(function(a,b){return a-b});
		// Return only median, since it doesn't seem to make a difference
		return (a[4] + a[5]) / 2;
		/*
		// Remove possible outliers
		var q1 = ( a[2] + a[3] ) / 2,
			q3 = ( a[6] + a[7] ) / 2,
			interQRange = (q3 - q1) * 1.5,
			innerfenceLo = q1 - interQRange,
			innerfenceHi = q3 + interQRange;
		a = a.slice(2, 8);
		if (a[0] < innerfenceLo){
			a.splice(0, 1);
		}
		if (a[-1] > innerfenceHi){
			a.splice(-1, 1);
		}
		// Calculate mean value
		var sum = 0;
		for (var i = 0; i < a.length; i++){
			sum += a[i];
		}
		return sum / a.length;
		*/
	}
};

ctr.prototype.calibrate = function (){
	var scale = 6;	// TODO replace hardcoded scale
	this.userUpdateInterval = null;
	var json = {
		'GID': -1,
		'Coords': [0, 0],
		'Vectors': [],
		'Type': dm.Node.TYPE_USER,
		'UID': 1,
		'UserName': "",
		'userAlpha': 0
	},
	r = [];
	var record = [];
	for (var key in this.sensor.signals) {
		record.push([ key, this.sensor.signals[key] ]);
	}
	if (record.length >= 3){
		var a = this.model.findNodeByPid(record[0][0]),
			b = this.model.findNodeByPid(record[1][0]),
			c = this.model.findNodeByPid(record[2][0]),
			da = this.calcMean(record[0][1].readings) * scale,
			db = this.calcMean(record[1][1].readings) * scale,
			dc = this.calcMean(record[2][1].readings) * scale,
			cx = c.coords[0], cy = c.coords[1];
		if ( this.determinant(a, b, c) == 0 ){	// three nodes are colinear
			r = this.bilaterate();
		} else {
			var intersections = this.ccIntersect( a, b, da, db );
			var	p1 = [intersections.p1x, intersections.p1y],
				p2 = [intersections.p2x, intersections.p2y],
				d1 = Math.sqrt( Math.pow(p1[0] - cx, 2) + Math.pow(p1[1] - cy, 2) ),
				d2 = Math.sqrt( Math.pow(p2[0] - cx, 2) + Math.pow(p2[1] - cy, 2) ),
				r = Math.abs(d1-dc) > Math.abs(d2-dc) ? p2 : p1,
				drc = Math.sqrt( Math.pow(r[0] - cx, 2) + Math.pow(r[1] - cy, 2) ),
				dAvg = ( dc + drc ) / 2,
				m = drc - dAvg;
			r[0] = r[0] + m/drc * (cx-r[0]);
			r[1] = r[1] + m/drc * (cy-r[1]);
		}
	} else if (record.length == 2){
		r = this.bilaterate();
	} else if (record.length == 1){
		r = this.unilaterate();
	}
	if (record.length == 0){
		return null;
	} else {
		json.Coords[0] = r[0]; json.Coords[1] = r[1];
		return json;
	}
};

ctr.prototype.updateUser = function (){
	var size = Object.keys(this.sensor.signals).length,
		lastSeen = this.user;
	// Update user alpha
	this.user.userAlpha = this.calcMean(this.sensor.compass.readings);
	this.approx.style.webkitTransform = 'rotate('+this.user.userAlpha+'deg)';
	this.approx.style.left = this.user.coords[0] + 'px';
	this.approx.style.top = this.user.coords[1] + 'px';
	if (size >= 3){
		newNode = new dm.Node( this.calibrate() );
	} else {
		newNode = null;
	}
	var nx = newNode.coords[0], ny = newNode.coords[1], ox = lastSeen.coords[0], oy = lastSeen.coords[1];
	if (Math.pow(nx-ox, 2) + Math.pow(ny-oy, 2) >= 6.25){	// ignore distance change within 1 step, 2.5 feet
		this.user = newNode;
	}
};

ctr.prototype.navUser2 = function ( to ){
	var atDest = false;	// at destination
	// Clean up edge between user and node
	this.user.vectors = [];
	// Find nearest node
	ds = Number.POSITIVE_INFINITY;
	node = null;
	for (var i = 0; i < this.model.model.nodes.length; i++){
		var n = this.model.model.nodes[i];
		dsp = Math.pow(this.user.coords[0] - n.coords[0], 2) + Math.pow(this.user.coords[1] - n.coords[1], 2);
		if ( dsp < ds && dsp >= 9){	// outside 3 feet
			ds = dsp;
			node = n;
		}
	}
	if (node != null){
		if (!this.user.isNeighbor(node)){
			this.user.vectors.push(node);
		}
	} else {
		throw new Error("Cannot find nearest node for user.");
	}
	// Path finding
	from = this.user;
	to = this.findNodeByViewCoord(to);
	this.path = this.findPath( from, to );
	if (this.path == null){
		throw new Error("No path found");
	}
	if (this.path.length == 2){	// 1 user node, 1 other node
		var a = this.path[0], b = this.path[1];
		dsp = Math.pow(a.coords[0] - b.coords[0]) + Math.pow(a.coords[1] - b.coords[1]);
		if (dsp <= 6.25){	// within 2.5 feet
			atDest = true;
			clearInterval(this.userUpdateInterval);
			this.userUpdateInterval = null;
		}
	}
	if (atDest){
		console.log("You are arrived!");
	}
}

// Callback; tmp
// param: not dm.Node
// TODO replace with floor-checking method
ctr.prototype.nav = function ( from, to ){
	var self = this.context;
	from = self.findNodeByViewCoord(from);
	to = self.findNodeByViewCoord(to);
	self.path = self.findPath( from, to );
	if (self.path == null){
		throw new Error("No path found");
	}
	self.showNav();
};

ctr.prototype.loc = function ( from, to ){
	this.context.calibrate();
};

// TODO replace with floor-checking method
ctr.prototype.navUser = function ( to, cxt ){
	var self = this.context;
	if (self.user == null){
		self.user = new dm.Node(self.calibrate());
	}

	self.approx.style.left = self.user.coords[0] + 'px';
	self.approx.style.top = self.user.coords[1] + 'px';

	self.navUser2( to );
	self.userUpdateInterval = setInterval(function (){
		self.updateUser();
		self.navUser2( to );
	}, 1200);
};

// param: not dm.Node
ctr.prototype.onPointCreate = function ( p ){
	var self = this.context,
		nlist = self.model.model.nodes,
		json = {
			'GID': null,
			'Coords': [p.coords[0],p.coords[1]],
			'Vectors': [],
			'Type': p.type,
			'Floor': self.model.model.floors[0]	// TODO: current floor
		};
	if (nlist.length === 0){
		json.GID = '0';
	} else {
		json.GID = nlist.length.toString();
	}
	if (p.type == dm.Node.TYPE_PHYSICAL){
		json.PID = p.pid;
	}
	nlist.push( new dm.Node( json ) );
	self.view.newPoint( p );
};

// param: not dm.Node
ctr.prototype.onEdgeCreate = function ( p1, p2 ){
	var self = this.context;
	if ( p1 == p2 ){
		console.log("Warning: No edges created - duplicate vertices");
		return;
	}
	p1 = self.findNodeByViewCoord(p1);
	p2 = self.findNodeByViewCoord(p2);
	if (!p1.isNeighbor(p2)){
		p1.vectors.push(p2);
		p2.vectors.push(p1);
		self.view.newEdge( p1, p2 );
	} else {
		console.log("Warning: No edges created - duplicate edge");
	}
};

// param: not dm.Node
ctr.prototype.onPointDelete = function ( p ){
	var self = this.context;
	var nlist = self.model.model.nodes;
	p1 = self.findNodeByViewCoord(p);
	var v = p1.vectors;
	// Clean up edges
	for (var i = 0; i < v.length; i++){
		var p2 = v[i];
		for (var j = 0; j < p2.vectors.length; j++){
			if (p2.vectors[j] == p1){
				p2.vectors.splice(j, 1);
				break;
			}
		}
	}
	// Delete node
	for (var i = 0; i < nlist.length; i++){
		if (nlist[i] == p1){
			nlist.splice(i, 1);
			break;
		}
	}
	self.showGraph();
};

// param: not dm.Node
ctr.prototype.onEdgeDelete = function ( p1, p2 ){
	var self = this.context;
	p1 = self.findNodeByViewCoord(p1);
	p2 = self.findNodeByViewCoord(p2);
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
	self.showGraph();
};

// param: not dm.Node
ctr.prototype.onPointUpdate = function ( p1, p2 ){
	var self = this.context;
	p1 = self.findNodeByViewCoord(p1);
	p1.coords[0] = p2.coords[0];
	p1.coords[1] = p2.coords[1];
	self.showGraph();
};