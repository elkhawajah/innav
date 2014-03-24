/**
 * Constructor
 * @param {string} id   Building ID
 * @param {string} name Building name
 */
dm.Building = function dmBuilding( json ){
	dm.call(this);
	this.id = json.id;
	this.name = json.name;
	this.uid = json.UID;
};

oo.inherit( dm.Building, dm );

dm.Building.prototype.getJSON = function (){
	return {
		'name':this.name,
		'id':this.id,
		'UID':this.uid
	};
};