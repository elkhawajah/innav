/**
 * Constructor
 * @param {string} id   Building ID
 * @param {string} name Building name
 */
dm.Building = function dmBuilding( json ){
	dm.call(this);
	this.id = json.id;
	this.name = json.name;
	this.user = json.user_id;
};

oo.inherit( dm.Building, dm );