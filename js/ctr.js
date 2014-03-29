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
	// n-lateration record
	this.biRecord = null;
	this.biNeedDecision = true;
	// Initialization
	this.init( json );
	// DOM
	this.approx = document.getElementById("approx");
	this.u = document.getElementById("user");
	this.guideUpper = document.getElementById("guideUpper");
	this.guideLower = document.getElementById("guideLower");
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
	return (bx - ax)*(ky - ay) - (-(by - ay)*(kx - ax) );	// extra negation since screen top-left is (0,0)
};

ctr.prototype.calcMean = function ( dataSet ){
	if (dataSet.length < 10){
		return null;
	} else {
		var a = dataSet;
		a.sort(function(a,b){return a-b});
		// Return only median, since it doesn't seem to make a difference
		return (a[4] + a[5]) / 2;
	}
};

ctr.prototype.trilaterate = function (){
	var r = {'x':null, 'y':null}, record = [], scale = 6;
	for (var key in this.sensor.signals) {
		record.push([ key, this.sensor.signals[key] ]);
	}
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
		var	p1 = {'x':intersections.p1x, 'y':intersections.p1y},
			p2 = {'x':intersections.p2x, 'y':intersections.p2y},
			d1 = Math.sqrt( Math.pow(p1.x - cx, 2) + Math.pow(p1.y - cy, 2) ),
			d2 = Math.sqrt( Math.pow(p2.x - cx, 2) + Math.pow(p2.y - cy, 2) ),
			r = Math.abs(d1-dc) > Math.abs(d2-dc) ? p2 : p1,	// pick the one closer to third measurement
			drc = Math.sqrt( Math.pow(r.x - cx, 2) + Math.pow(r.y - cy, 2) ),
			dAvg = ( dc + drc ) / 2,
			m = drc - dAvg;
		// approximate location by taking average with the third measurement
		r.x = r.x + m/drc * (cx-r.x);
		r.y = r.y + m/drc * (cy-r.y);
		this.biNeedDecision = false;
	}
	return r;
};

ctr.prototype.bilaterate = function (){
	// Find user alpha
	var uAlpha = this.calcMean(this.sensor.compass.readings);
	var record = [], scale = 6;
	for (var key in this.sensor.signals) {
		record.push([ key, this.sensor.signals[key] ]);
	}
	if (this.biNeedDecision){	// no user location yet
		var a = this.model.findNodeByPid(record[0][0]),
			b = this.model.findNodeByPid(record[1][0]),
			da = this.calcMean(record[0][1].readings) * scale,
			db = this.calcMean(record[1][1].readings) * scale,
			ax = a.coords[0], ay = a.coords[1], bx = b.coords[0], by = b.coords[1],
			d = Math.sqrt( Math.pow(bx-ax, 2) + Math.pow(by-ay, 2) ),
			vectorAlpha = Math.asin( (by - ay) / d ) * 180 / Math.PI;
		var intersections = this.ccIntersect( a, b, da, db );
		var	p1 = {'coords':[intersections.p1x, intersections.p1y]},
			p2 = {'coords':[intersections.p2x, intersections.p2y]};
		if (this.determinant(a,b,p1) == 0){	// only 1 intersection
			return {'x':p1.coords[0],'y':p1.coords[1]};
		} else {
			if (this.biRecord == null){	// no previous 2-intersections record
				// point them to the left of vector AB
				theta = vectorAlpha - 90;
				delta = theta - uAlpha;
				if (Math.abs(delta) > 15){
					var s = delta > 0 ? "CLOCKWISE" : "COUNTER-CLOCKWISE";
					console.log("Please turn " + Math.round(delta) + " degrees " + s + " and walk a few steps.");
				} else {
					this.biRecord = {
						'a':a, 'b':b,
						'da':da, 'db':db
					};
				}
			} else {
				//  if they are moving left, and:
					// a) if they are leaving the vector, point on the left is the user's location;
					// b) if they are approaching the vector, point on the right is the user's location
				var changed = false,
					aO = this.biRecord.a, bO = this.biRecord.b,
					daO = this.biRecord.da, dbO = this.biRecord.db,
					deltaA = da - daO, deltaB = db - dbO;
				// Analyze the new measurements
				changed = (Math.abs(deltaA) >= 2.5 * scale) || (Math.abs(deltaB) >= 2.5 * scale); // change is more than one step
				if (changed){
					console.log("OK");
					// recalculate intersections to take the extra few steps into account
					intersections = this.ccIntersect( a, b, da, db );
					p1 = {'coords':[intersections.p1x, intersections.p1y]};
					p2 = {'coords':[intersections.p2x, intersections.p2y]};
					var pL = this.determinant(a,b,p1) > 0 ? p1 : p2,
						pR = this.determinant(a,b,p1) < 0 ? p1 : p2;
					if (deltaA > 0 && deltaB > 0){	// leaving
						this.biNeedDecision = false;
						return {'x':pL.coords[0],'y':pL.coords[1]};
					} else if (deltaA < 0 && deltaB < 0){	// approaching
						this.biNeedDecision = false;
						return {'x':pR.coords[0],'y':pR.coords[1]};
					} else {
						return {'x':pL.coords[0],'y':pL.coords[1]};	// arbitrarily return a point so it's not null
					}
				} else {
					console.log("Please walk a few more steps");
				}
			}
			return {'x':p1.coords[0],'y':p1.coords[1]};	// arbitrarily return a point so it's not null
		}
	} else {	// only needs to transform user location
		var a = this.model.findNodeByPid(record[0][0]),
			b = this.model.findNodeByPid(record[1][0]),
			da = this.calcMean(record[0][1].readings) * scale,
			db = this.calcMean(record[1][1].readings) * scale,
			u = [Math.cos(uAlpha * Math.PI / 180), Math.sin(uAlpha * Math.PI / 180)];
		// find the two new intersectoins given the two new signal sources
		var intersections = this.ccIntersect( a, b, da, db ),
			p1 = [intersections.p1x, intersections.p1y],
			p2 = [intersections.p2x, intersections.p2y],
			// find the point that's closer to the user vector
			Up1 = [p1[0]-this.user.coords[0], p1[1]-this.user.coords[1]],
			Up2 = [p2[0]-this.user.coords[0], p2[1]-this.user.coords[1]],
			m_p1 = Math.sqrt(Up1[0]*Up1[0]+Up1[1]*Up1[1]),
			m_p2 = Math.sqrt(Up2[0]*Up2[0]+Up2[1]*Up2[1]),
			dotProduct1Sign = ( Up1[0]*u[0] + Up1[1]*u[1] ) >= 0,
			dotProduct2Sign = ( Up2[0]*u[0] + Up2[1]*u[1] ) >= 0;
		if (dotProduct1Sign == dotProduct2Sign){	// two points on the same direction, return the closer one
			if (m_p1 < m_p2){ return {'x':p1[0],'y':p1[1]};
				} else { return {'x':p2[0],'y':p2[1]}; }
		} else {	// different direction, return the one with same direction
			if (dotProduct1Sign){ return {'x':p1[0],'y':p1[1]};
				} else { return {'x':p2[0],'y':p2[1]}; }
		}
	}
};

ctr.prototype.calibrate = function (){
	var scale = 6;	// TODO replace hardcoded scale
	var lastSeen = this.user;
	var json = {
		'GID': -1,
		'Coords': [0, 0],
		'Vectors': [],
		'Type': dm.Node.TYPE_USER,
		'UID': 1,
		'UserName': "",
		'userAlpha': 0
	},
	r = null;
	var size = Object.keys(this.sensor.signals).length;
	if (size >= 3){
		r = this.trilaterate();
	} else if (size == 2){
		r = this.bilaterate();
	} else if (size <= 1){
		console.log("WARNING: Not enough signal sources.");
	}
	if (r != null){
		json.userAlpha = this.calcMean(this.sensor.compass.readings);
		json.Coords[0] = r.x; json.Coords[1] = r.y;
		var newNode = new dm.Node( json );
		this.user = newNode;
		this.approx.style.webkitTransform = 'rotate('+(this.user.userAlpha+90)+'deg)';
		this.approx.style.left = this.user.coords[0] + 'px';
		this.approx.style.top = this.user.coords[1] + 'px';
	} else {
		console.log("WARNING: Unable to determine location.");
	}
};

ctr.prototype.recalibrate = function (){
	clearInterval(this.userUpdateInterval);
	this.user = null;
	this.biRecord = null;
	this.biNeedDecision = true;
	var self = this, to = self.path[-1];
	this.userUpdateInterval = setInterval(function (){
		self.calibrate();
		self.navUser2( to );
	}, 1100);
};

ctr.prototype.navUser2 = function ( to ){
	if (!this.biNeedDecision){
		var scale = 6;
		// Find nearest k node
		var k = 3, neighbors = [], paths = [];
		for (var i = 0; i < this.model.model.nodes.length; i++){
			var n = this.model.model.nodes[i],
				dsp = Math.pow(n.coords[0] - this.user.coords[0], 2) + Math.pow(n.coords[1] - this.user.coords[1], 2);
			neighbors.push([dsp, n]);
		}
		neighbors.sort(function(a,b){return a[0]-b[0]});
		neighbors = neighbors.slice(0, k);
		for (var i = 0; i < k; i++){
			// Clean up edge between user and node
			this.user.vectors = [];
			this.user.vectors.push(neighbors[i][1]);
			// Path finding
			from = this.user;
			to = this.findNodeByViewCoord(to);
			paths.push( this.findPath( from, to ) );
		}
		this.path = this.comparePaths(paths);
		if (this.path == null){
			throw new Error("No path found");
		} else if (this.path.length > 2){
			var a = this.path[0], b = this.path[1],
				dsp = Math.pow(a.coords[0] - b.coords[0], 2) + Math.pow(a.coords[1] - b.coords[1], 2);
			if (dsp <= 6.25*scale*scale){
				this.path.splice(1,1);
			}
		}
		this.guideLower.style.opacity = "1";
		if (this.path.length == 2){	// 1 user node, 1 other node
			var a = this.path[0], b = this.path[1],
			dsp = Math.pow(a.coords[0] - b.coords[0], 2) + Math.pow(a.coords[1] - b.coords[1], 2);
			if (dsp <= 6.25*scale*scale){	// within 2.5 feet
				console.log("You are arrived!");
				this.guideLower.style.opacity = "0";
				this.guideUpper.style.opacity = "0";
				clearInterval(this.userUpdateInterval);
				this.userUpdateInterval = null;
			} else {
				this.guideUpper.style.opacity = "0";
				var ab = [b.coords[0]-a.coords[0], b.coords[1]-a.coords[1]],
					theta = Math.atan2(ab[1], ab[0]) * 180 / Math.PI - this.user.userAlpha;
				this.guideLower.style.webkitTransform = 'rotate('+ theta +'deg)';
			}
		} else {
			var a = this.path[0], b = this.path[1], c = this.path[2],
				ab = [b.coords[0]-a.coords[0], b.coords[1]-a.coords[1]],
				bc = [c.coords[0]-b.coords[0], c.coords[1]-b.coords[1]],
				thetaAB = Math.atan2(ab[1], ab[0]) * 180 / Math.PI - this.user.userAlpha,
				thetaBC = Math.atan2(bc[1], bc[0]) * 180 / Math.PI - this.user.userAlpha;
			if (Math.abs(thetaAB) < 10){
				this.guideUpper.style.opacity = "1";
				this.guideUpper.style.webkitTransform = 'rotate('+ thetaBC +'deg)';
			}
			this.guideLower.style.webkitTransform = 'rotate('+ thetaAB +'deg)';
		}
	} else {
		this.guideLower.style.opacity = "0";
		this.guideUpper.style.opacity = "0";
		console.log("Nothing to display.");
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

// TODO add floor-checking method
ctr.prototype.navUser = function ( to, cxt ){
	var self = this.context;
	self.userUpdateInterval = setInterval(function (){
		self.calibrate();
		self.navUser2( to );
	}, 1100);
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
		return false;
	}
	p1 = self.findNodeByViewCoord(p1);
	p2 = self.findNodeByViewCoord(p2);
	if (!p1.isNeighbor(p2) && !p2.isNeighbor(p1)){
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