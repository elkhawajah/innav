/**
 * View namespace
 */
vw = function Vw(){
	// DOM properties; jQuery objects
	this.canvas = null;
	this.console = null;
	this.map = null;
	this.pointSwitch = null;
	this.edgeSwitch = null;
	// Editing status
	this.isCreatingPoint = false;
	this.isCreatingEdge = false;
	this.isFindingPath = false;
	this.isDeleting = false;
	this.isMoving = false;
	// View elements
	this.edges = [];
	this.points = [];
	this.places = [];
	// Edge editing properties
	this.edge = {'a': null, 'b': null};
	// Click find path
	this.point = {'a': null, 'b': null};
	this.move = {'a': null, 'b': null};
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
	this.pointSwitch = $('#pointSwitch');
	this.edgeSwitch = $('#edgeSwitch');
	this.callbacks = callbacks;
	this.canvas.on('click', function (event){
		if (self.isCreatingPoint || self.isCreatingPlace){
			var ispl = false;
			if (self.isCreatingPlace){
				ispl = true;
			}
			var p = {'coords':[event.pageX-10, event.pageY-10],'ispl':ispl};
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
	this.console.html('Modes: e - Edge; v - Point; f - Find; d - Delete; m - Move; p - Place; c - Turn off all modes<br>');
	$(document).keypress( function (event){
		self.console.html('Modes: e - Edge; v - Point; f - Find; d - Delete; m - Move; p - Place; c - Turn off all modes<br>');
		$('circle[fill="red"]').remove();
		$('line[stroke="red"]').remove();
		self.isCreatingEdge = false;
		self.isCreatingPoint = false;
		self.isFindingPath = false;
		self.isDeleting = false;
		self.isMoving = false;
		self.isCreatingPlace = false;
		switch(event.which){
			case 101: 	// e
				self.isCreatingEdge = true;
				self.console.html(self.console.html() + 'Now in Edge mode.');
				break;
			case 118: 	// v
				self.isCreatingPoint = true;
				self.console.html(self.console.html() + 'Now in Point mode.');
				break;
			case 102: 	// f
				self.isFindingPath = true;
				self.console.html(self.console.html() + 'Now in Find mode.');
				break;
			case 99: 	// c
				self.console.html(self.console.html() + 'All modes are OFF.');
				break;
			case 100: 	// d
				self.isDeleting = true;
				self.console.html(self.console.html() + 'Now in DELETE mode.');
				break;
			case 109: 	// m
				self.isMoving = true;
				self.console.html(self.console.html() + 'Now in Move mode.');
				break;
			case 112: 	// p
				self.isCreatingPlace = true;
				self.console.html(self.console.html() + 'Now in Place mode.');
				break;
			default:
				self.console.html(self.console.html() + 'Invalid key.');
				break;
		}
	});
};

vw.prototype.newPoint = function ( p, highlight ){
	var color = 'black', self = this;
	if (this.isCreatingPlace || p.ispl){
		color = 'blue';
	}
	if (highlight){
		color = 'red';
	}
	if (!this.isDrawn(p) || highlight){
		if (!highlight){
			this.points.push(p);
		}
		var c = $( this.map.circle(p.coords[0], p.coords[1], 10, {fill:color, 'ispl':p.ispl}) );
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
			}
		});
	}
};

vw.prototype.newEdge = function ( p1, p2, highlight ){
	var color = 'black', self = this;
	if (p1.ispl || p2.ispl){
		color = 'blue';
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
		for (var i = 0; i < this.places.length; i++){
			if (this.places[i] == p1){
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