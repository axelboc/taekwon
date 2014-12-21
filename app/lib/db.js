
// Modules
var assert = require('./assert');
var logger = require('./log')('db');
var async = require('async');
var Datastore = require('nedb');

// Load NeDB datastores
var tournamentsDb = new Datastore({
	filename: 'data/tournaments.db',
	autoload: true
});

var usersDb = new Datastore({
	filename: 'data/users.db',
	autoload: true
});

var ringsDb = new Datastore({
	filename: 'data/rings.db',
	autoload: true
});

var matchesDb = new Datastore({
	filename: 'data/matches.db',
	autoload: true
});


/**
 * Check for and log database errors.
 * @param {Object} err
 * @return {Boolean} - `true` if an error was encountered; `false` otherwise
 */
function isError(err) {
	if (err) {
		logger.error(err.message);
		return true;
	}
	return false;
}

/**
 * Callback factory.
 * @param {Function} cb
 * @return {Function}
 */
function callback(cb) {
	assert(typeof cb === 'undefined' || typeof cb === 'function',
		   "if provided, `cb` must be a function");

	return function (err, doc) {
		if (isError(err)) { return; }
		if (cb) { cb(doc); }
	};
}

/**
 * Find documents with the given IDs in the given datastore.
 * @param {Datastore} db
 * @param {Array} ids
 * @param {Function} cb
 */
function findDocsWithIds(db, ids, cb) {
	assert.instanceOf(db, 'db', Datastore, 'Datastore');
	assert.array(ids, 'ids');

	var docs = [];
	async.each(ids, function (id, next) {
		db.findOne({ _id: id }, callback(function (doc) {
			if (doc) {
				docs.push(doc);
			} else {
				// If document is not found, fail silently
				logger.error("Document not found (ID=" + id + ")");
			}
			next();
		}));
	}, cb.bind(null, docs));
}


/**
 * DB module.
 */
var DB = {
	
	/**
	 * Look for an open tournament; that is, a tournament that started on the current day.
	 * @param {Number} startOfToday - timestamp of the start of the current day
	 * @param {Function} cb
	 */
	findOpenTournament: function findOpenTournament(startOfToday, cb) {
		assert.integerGt0(startOfToday, 'startOfToday');
		tournamentsDb.findOne({ startDate: { $gte: startOfToday } }, callback(cb));
	},
	
	/**
	 * Find users with the given IDs.
	 * @param {Array} ids
	 * @param {Function} cb
	 */
	findUsersWithIds: findDocsWithIds.bind(null, usersDb),
	
	/**
	 * Find rings with the given IDs.
	 * @param {Array} ids
	 * @param {Function} cb
	 */
	findRingsWithIds: findDocsWithIds.bind(null, ringsDb),
	
	/**
	 * Insert a new tournament.
	 * @param {Function} cb
	 */
	insertNewTournament: function insertNewTournament(cb) {
		tournamentsDb.insert({
			startDate: Date.now(),
			userIds: [],
			ringIds: []
		}, callback(cb));
	},
	
	/**
	 * Insert a new user.
	 * @param {User} user
	 * @param {String} identity - the user's identity ('juryPresident' or 'cornerJudge')
	 * @param {Function} cb
	 */
	insertNewUser: function insertNewUser(user, identity, cb) {
		assert.provided(user, 'user');
		
		// Build user document
		var doc = {
			_id: user.id,
			identity: identity
		};
		
		if (identity === 'cornerJudge') {
			doc.name = user.name;
			doc.authorised = user.authorised;
		}
		
		// Insert user
		usersDb.insert(doc, callback(cb));
	},
	
	/**
	 * Insert a new ring.
	 * @param {Number} index
	 * @param {Number} slotCount
	 * @param {Function} cb
	 */
	insertNewRing: function insertNewRing(index, slotCount, cb) {
		assert.integerGte0(index, 'index');
		assert.integerGt0(slotCount, 'slotCount');
		
		ringsDb.insert({
			index: index,
			jpId: null,
			cjIds: [],
			slotCount: slotCount
		}, callback(cb));
	},
	
	/**
	 * Add a user to a tournament.
	 * @param {String} tournamentId
	 * @param {String} userId
	 * @param {Function} cb
	 */
	addUserIdToTournament: function addUserIdToTournament(tournamentId, userId, cb) {
		assert.string(tournamentId, 'tournamentId');
		assert.string(userId, 'userId');
		
		tournamentsDb.update({ _id: tournamentId }, { $addToSet: { userIds: userId } }, callback(cb));
	},
	
	/**
	 * Set a tournament's ring IDs.
	 * @param {String} tournamentId
	 * @param {Array} ringIds
	 * @param {Function} cb
	 */
	setTournamentRingIds: function setTournamentRingIds(tournamentId, ringIds, cb) {
		assert.string(tournamentId, 'tournamentId');
		assert.array(ringIds, 'ringIds');
		
		tournamentsDb.update({ _id: tournamentId }, { $set: { ringIds: ringIds } }, callback(cb));
	},
	
	/**
	 * Set a ring's Jury President ID.
	 * @param {String} ringId
	 * @param {String} jpId
	 * @param {Function} cb
	 */
	setRingJpId: function setRingJpId(ringId, jpId, cb) {
		assert.string(ringId, 'ringId');
		assert.string(jpId, 'jpId');
		
		ringsDb.update({ _id: ringId }, { $set: { jpId: jpId } }, callback(cb));
	},
	
	/**
	 * Set a Corner Judges's authorisation state.
	 * @param {CornerJudge} cj
	 * @param {Function} cb
	 */
	setCjAuthorised: function setCjAuthorised(cj, cb) {
		assert.provided(cj, 'cj');
		
		usersDb.update({ _id: cj.id }, { $set: { authorised: cj.authorised } }, callback(cb));
	},
	
	/**
	 * Remove a user.
	 * @param {User} user
	 * @param {Function} cb
	 */
	removeUser: function removeUser(user, cb) {
		assert.provided(user, 'user');
		
		usersDb.remove({ _id: user.id }, callback(cb));
	},
	
	/**
	 * Remove a user from a tournament.
	 * @param {String} tournamentId
	 * @param {String} userId
	 * @param {Function} cb
	 */
	pullUserIdFromTournament: function removeUserIdFromTournament(tournamentId, userId, cb) {
		assert.string(tournamentId, 'tournamentId');
		assert.string(userId, 'userId');
		
		tournamentsDb.update({ _id: tournamentId }, { $pull: { userIds: userId } }, callback(cb));
	}
	
};

module.exports = DB;
