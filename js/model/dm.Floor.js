/**
 * Constructor
 * @param {string} id        Floor ID
 * @param {string} name      Floor name
 * @param {float} direction Floor direction that represents real world North; zero angle is East direction on a screen; counter-clockwise
 */
dm.Floor = function dmFloor( json ){
	dm.call(this);
	this.id = json.id;
	this.name = json.name;
	this.alpha = json.alpha;
	// Bottom-up linking
	this.building = null;
};

oo.inherit( dm.Floor, dm );

dm.Floor.DEFAULT_NAMES = ["B1","B2","B3","G","1","2","3","4","5","6","7","8","9"];
dm.Floor.SPECIAL_ENTRY_LEVEL = "G";