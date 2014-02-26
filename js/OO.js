oo = {};

oo.inherit = function ( targetFn, originFn ) {
	if ( targetFn.prototype instanceof originFn ) {
		throw new Error( 'Target already inherits from origin' );
	}
	var targetConstructor = targetFn.prototype.constructor;
	targetFn.prototype = Object.create( originFn.prototype, {
		// Restore constructor property of targetFn
		constructor: {
			value: targetConstructor,
			enumerable: false,
			writable: true,
			configurable: true
		}
	} );
};

oo.clone = function ( origin ) {
	var key, r;
	r = Object.create( origin.constructor.prototype );
	for ( key in origin ) {
		if ( origin.hasOwnProperty( key ) ) {
			r[key] = origin[key];
		}
	}
	return r;
};