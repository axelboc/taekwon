
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Match = require('./match').Match;

var Ring = function (id) {
	EventEmitter.call(this);
	
	this.id = id;
};

Ring.prototype.newMatch = function newMatch () {
	this.match = new Match();
};


util.inherits(Ring, EventEmitter);
exports.Ring = Ring;
