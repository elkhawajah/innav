/**
 * View namespace
 */
vw = function Vw(){
	// DOM properties; jQuery objects
	this.canvas = null;
	this.console = null;
	this.map = null;
	this.u = null;;
	// Editing status
	this.isCreatingNode = false;
	this.isNodeVirtual = false;
	this.isCreatingEdge = false;
	this.isFindingPath = false;
	this.isNavigating = false;
	this.isDeleting = false;
	this.isMoving = false;
	// View elements
	this.edges = [];
	this.points = [];
	// Edge editing properties
	this.edge = {'a': null, 'b': null};
	// Click find path
	this.point = {'a': null, 'b': null};
	this.move = {'a': null, 'b': null};
	this.destination = null;	// point for navigation
	// Callbacks
	this.callbacks = null;
};

vw.prototype.clear = function (){
	this.map.clear();
	this.edges = [];
	this.points = [];
};

vw.prototype.init = function ( callbacks ){
	var self = this;
	this.console = $('#console');
	this.canvas = $('#canvas');
	this.canvas.css({
		'background':'url(img/test.png) no-repeat',
		'height':'500px',
		'width':'760px'
	});
	this.canvas.svg();
	this.map = this.canvas.svg('get');
	this.u = document.getElementById("user");
	this.callbacks = callbacks;
	this.canvas.on('click', function (event){
		if (self.isCreatingNode){
			var p = {'coords':[event.pageX-10, event.pageY-10]};
			if (self.isNodeVirtual){
				p.type = dm.Node.TYPE_VIRTUAL;
			} else {
				p.type = dm.Node.TYPE_PHYSICAL;
				p.pid = self.points.length;
			}
			if (!self.isDrawn(p)){
				self.callbacks.newPoint( p );
			}
		} else if (self.isMoving){
			if (self.move.a !== null && self.move.b == null){
				self.move.b = {'coords':[event.pageX-10, event.pageY-10]};
				self.callbacks.updatePoint( self.move.a, self.move.b );
				self.move.a = null; self.move.b = null;
			}
		}
	});
	var consoleHint = 'Modes: v - Virtual; p - Physical; e - Edge; f - Find; x - Delete; m - Move; n - Navigate; l - Locate; c - Turn off all modes<br>WASD to move; QR to turn<br>'
	this.console.html(consoleHint);
	$(document).keypress( function (event){
		self.console.html(consoleHint);
		$('circle[fill="red"]').remove();
		$('line[stroke="red"]').remove();
		self.isCreatingNode = false;
		self.isNodeVirtual = false;
		self.isCreatingEdge = false;
		self.isFindingPath = false;
		self.isNavigating = false;
		self.isDeleting = false;
		self.isMoving = false;
		switch(event.which){
			case 101: 	// e
				self.isCreatingEdge = true;
				self.console.html(self.console.html() + 'Now in Edge mode.');
				break;
			case 118: 	// v
				self.isCreatingNode = true;
				self.isNodeVirtual = true;
				self.console.html(self.console.html() + 'Now in Virtual mode.');
				break;
			case 102: 	// f
				self.isFindingPath = true;
				self.console.html(self.console.html() + 'Now in Find mode.');
				break;
			case 99: 	// c
				self.console.html(self.console.html() + 'All modes are OFF.');
				break;
			case 120: 	// x
				self.isDeleting = true;
				self.console.html(self.console.html() + 'Now in DELETE mode.');
				break;
			case 109: 	// m
				self.isMoving = true;
				self.console.html(self.console.html() + 'Now in Move mode.');
				break;
			case 112: 	// p
				self.isCreatingNode = true;
				self.console.html(self.console.html() + 'Now in Physical mode.');
				break;
			case 110: 	// n
				self.isNavigating = true;
				self.console.html(self.console.html() + 'Now in Navigate mode.');
				break;
			case 108: 	// l
				self.callbacks.loc();
				break;
			case 119: 	// w
				self.u.style.top = (parseInt(self.u.style.top) - 3) + 'px';
				break;
			case 115: 	// s
				self.u.style.top = (parseInt(self.u.style.top) + 3) + 'px';
				break;
			case 97: 	// a
				self.u.style.left = (parseInt(self.u.style.left) - 3) + 'px';
				break;
			case 100: 	// d
				self.u.style.left = (parseInt(self.u.style.left) + 3) + 'px';
				break;
			case 113: 	// q
				var matrix = self.u.style.transform;
					angle = null;
				if(matrix !== 'none') {
					var values = matrix.split('(')[1].split(')')[0].split(',');
					var a = values[0];
					var b = values[1];
					angle = Math.round(Math.atan2(b, a) * (180/Math.PI));
				} else { angle = 0; }
				self.u.style.transform = 'rotate('+(angle-5)+'deg)';
				break;
			case 114: 	// r
				var matrix = self.u.style.transform;
					angle = null;
				if(matrix !== 'none') {
					var values = matrix.split('(')[1].split(')')[0].split(',');
					var a = values[0];
					var b = values[1];
					angle = Math.round(Math.atan2(b, a) * (180/Math.PI));
				} else { angle = 0; }
				self.u.style.transform = 'rotate('+(angle+5)+'deg)';
				break;
			default:
				self.console.html(self.console.html() + 'Invalid key.');
				break;
		}
	});
};

vw.prototype.newPoint = function ( p, highlight ){
	var color = 'black', self = this;
	var attr = {};
	if (p.type == dm.Node.TYPE_VIRTUAL){
		color = 'blue';
		attr = {fill:color, 'type':p.type};
	} else if (p.type == dm.Node.TYPE_PHYSICAL){
		attr = {fill:color, 'type':p.type, 'pid':p.pid};
	} else if (p.type == dm.Node.TYPE_USER){
		color = 'grey';
		attr = {fill:color, 'type':p.type};
	}
	if (highlight){
		color = 'red';
	}
	if (!this.isDrawn(p) || highlight){
		if (!highlight){
			this.points.push(p);
		}
		var c = $( this.map.circle(p.coords[0], p.coords[1], 10, attr) );
		c.on('click', function(event){
			if (self.isDeleting){
				self.callbacks.delPoint( p );
			} else if (self.isCreatingEdge){
				if (self.edge.a == null){
					self.edge.a = p;
				} else if (self.edge.b == null){
					self.edge.b = p;
					self.callbacks.newEdge( self.edge.a, self.edge.b );
					// Clean up
					self.edge.a = null; self.edge.b = null;
				}
			} else if (self.isFindingPath){
				if (self.point.a == null){
					$('circle[fill="red"]').remove();
					$('line[stroke="red"]').remove();
					self.point.a = p;
				} else if (self.point.b == null){
					self.point.b = p;
					// Find nearest beacons
					self.callbacks.nav(self.point.a, self.point.b);
					// Clean up
					self.point.a = null; self.point.b = null;
				}
			} else if (self.isMoving){
				if (self.move.a == null){
					self.move.a = p;
					event.stopPropagation();
				}
			} else if (self.isNavigating){
				self.destination = p;
				self.callbacks.navU(self.destination);
			}
		});
	}
};

vw.prototype.newEdge = function ( p1, p2, highlight ){
	var color = 'black', self = this;
	if (p1.type == dm.Node.TYPE_VIRTUAL || p2.type == dm.Node.TYPE_VIRTUAL){
		color = 'blue';
	} else if (p1.type == dm.Node.TYPE_USER || p2.type == dm.Node.TYPE_USER){
		color = 'grey';
	}
	if (highlight){
		color = 'red';
	}
	if (!this.isDrawn(p1, p2) || highlight){
		if (!highlight){
			this.edges.push([p1, p2]);
		}
		var e = $( this.map.line(p1.coords[0], p1.coords[1], p2.coords[0], p2.coords[1], {stroke:color,strokeWidth:5}) );
		e.on('click', function(event){
			if (self.isDeleting){
				self.callbacks.delEdge( p1, p2 );
			}
		});
	}
};

vw.prototype.isDrawn = function ( p1, p2 ){
	if (p2 == undefined){	// Check point
		for (var i = 0; i < this.points.length; i++){
			if (this.points[i] == p1){
				return true;
			}
		}
		return false;
	} else {	// Check edge
		for (var i = 0; i < this.edges.length; i++){
			if ( (this.edges[i][0] == p1 && this.edges[i][1] == p2)
				|| (this.edges[i][0] == p2 && this.edges[i][1] == p1) ){
				return true;
			}
		}
		return false;
	}
};