'use strict';

// Modules
var assert = require('./assert');
var logger = require('./log').createLogger('db', "DB");
var Datastore = require('nedb');
var MatchStates = require('../enum/match-states');

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
		logger.error('dbError', err.message, { message: err.message });
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
	assert.ok(typeof cb === 'undefined' || typeof cb === 'function',
		   "if provided, `cb` must be a function");

	return function (err, doc) {
		if (isError(err)) { return; }
		if (cb) { cb(doc); }
	};
}


/**
 * DB module.
 */
var DB = {
	
	/**
	 * Look for an open tournament; that is, a tournament that started on the current day.
	 * If multiple tournaments were started on the current day, this function retrieves the latest one.
	 * @param {Number} startOfToday - timestamp of the start of the current day
	 * @param {Function} cb 
	 */
	findOpenTournament: function (startOfToday, cb) {
		assert.integerGt0(startOfToday, 'startOfToday');
		
		// Find the tournaments that stated on the current day, sort them so the latest one comes first,
		// and pick only the latest one.
		tournamentsDb.find({ startDate: { $gte: startOfToday } })
					 .sort({ startDate: -1 })
					 .limit(1)
					 .exec(function (err, docs) {
			assert.ok(docs.length === 0 || docs.length === 1, "`docs` should contain zero or one document");
			// If the array is empty, `undefined` is passed to the callback
			callback(cb)(null, docs[0]);
		});
	},
	
	/**
	 * Find users.
	 * @param {String} tournamentId
	 * @param {Function} cb
	 */
	findUsers: function (tournamentId, cb) {
		assert.string(tournamentId, 'tournamentId');
		
		usersDb.find({ tournamentId: tournamentId }, callback(cb));
	},
	
	/**
	 * Find rings.
	 * @param {String} tournamentId
	 * @param {Function} cb
	 */
	findRings: function (tournamentId, cb) {
		assert.string(tournamentId, 'tournamentId');
		
		ringsDb.find({ tournamentId: tournamentId }, callback(cb));
	},
	
	/**
	 * Find a match in progress (i.e. which hasn't ended yet).
	 * This function should retrieve at most one match, as a ring cannot have more than one match in progress.
	 * @param {String} ringId
	 * @param {Function} cb
	 */
	findMatchInProgress: function (ringId, cb) {
		assert.string(ringId, 'ringId');
		
		matchesDb.find({ ringId: ringId, $not: { 'data.state': MatchStates.MATCH_ENDED } }, function (err, docs) {
			assert.ok(docs.length === 0 || docs.length === 1, "`docs` should contain zero or one document");
			// If the array is empty, `undefined` is passed to the callback
			callback(cb)(null, docs[0]);
		});
	},
	
	/**
	 * Insert a new tournament.
	 * @param {Function} cb
	 */
	insertTournament: function (cb) {
		tournamentsDb.insert({
			startDate: Date.now()
		}, callback(cb));
	},
	
	/**
	 * Insert a new user.
	 * If a user ID is provided, call NeDB's `update` method with the `upsert` option set to `true`. When the server
	 * is restarted with the `--force` argument, the `insert` method can result in an error if a user already exists 
	 * in the database. The `update` method allows updating the user rather than deleting then re-inserting it.
	 * @param {String} tournamentId
	 * @param {String} userId - if falsy, let DB pick an ID, 
	 * @param {String} identity - the user's identity ('juryPresident' or 'cornerJudge')
	 * @param {String} name
	 * @param {Function} cb
	 */
	insertUser: function (tournamentId, userId, identity, name, cb) {
		assert.string(tournamentId, 'tournamentId');
		assert.ok(typeof userId === 'undefined' || typeof userId === 'string' && userId.length > 0,
				  "if provided, `userId` must be a non-empty string");
		assert.string(identity, 'identity');
		assert.ok(identity === 'juryPresident' || identity === 'cornerJudge',
				  "`identity` must be 'juryPresident' or 'cornerJudge'");
		assert.ok(typeof name === 'undefined' || typeof name === 'string' && name.length > 0,
				  "if provided, `name` must be a non-empty string");
		
		// Build user document
		var doc = {
			tournamentId: tournamentId,
			identity: identity
		};
		
		if (identity === 'cornerJudge') {
			doc.name = name;
			doc.authorised = false;
		}
		
		if (userId) {
			// Update user
			doc._id = userId;
			usersDb.update({ _id: userId }, doc, { upsert: true }, function (err) {
				if (isError(err)) { return; }
				if (cb) { cb(doc); }
			});
		} else {
			// Insert user
			usersDb.insert(doc, callback(cb));
		}
	},
	
	/**
	 * Insert new rings.
	 * @param {String} tournamentId
	 * @param {Number} count - the number of rings to insert
	 * @param {Number} slotCount
	 * @param {Object} matchConfig
	 * @param {Function} cb
	 */
	insertRings: function (tournamentId, count, slotCount, matchConfig, cb) {
		assert.string(tournamentId, 'tournamentId');
		assert.integerGte0(count, 'count');
		assert.integerGt0(slotCount, 'slotCount');
		assert.object(matchConfig, 'matchConfig');
		
		var newDocs = [];
		for (var i = 0; i < count; i += 1) {
			newDocs.push({
				tournamentId: tournamentId,
				index: i,
				jpId: null,
				cjIds: [],
				slotCount: slotCount,
				matchConfig: matchConfig
			});
		}
		
		ringsDb.insert(newDocs, callback(cb));
	},
	
	/**
	 * Insert a new match.
	 * @param {String} ringId
	 * @param {Object} config
	 * @param {Function} cb
	 */
	insertMatch: function (ringId, config, cb) {
		assert.string(ringId, 'ringId');
		assert.object(config, 'config');
		
		matchesDb.insert({
			ringId: ringId,
			config: config,
			data: {
				state: MatchStates.ROUND_IDLE
			}
		}, callback(cb));
	},
	
	/**
	 * Set a ring's Jury President ID.
	 * @param {String} ringId
	 * @param {String} jpId
	 * @param {Function} cb
	 */
	setRingJPId: function (ringId, jpId, cb) {
		assert.string(ringId, 'ringId');
		assert.ok(jpId === null || typeof jpId === 'string' && jpId.length > 0, 
				  "`jpId` must be either `null` or a non-empty string");
		
		ringsDb.update({ _id: ringId }, { $set: { jpId: jpId } }, callback(cb));
	},
	
	/**
	 * Set a ring's slot count.
	 * @param {String} ringId
	 * @param {Number} slotCount
	 * @param {Function} cb
	 */
	setRingSlotCount: function (ringId, slotCount, cb) {
		assert.string(ringId, 'ringId');
		assert.integerGt0(slotCount, 'slotCount');
		
		ringsDb.update({ _id: ringId }, { $set: { slotCount: slotCount } }, callback(cb));
	},
	
	/**
	 * Set a ring's default match configuration.
	 * @param {String} ringId
	 * @param {String} itemName
	 * @param {Any} itemValue
	 * @param {Function} cb
	 */
	setRingMatchConfigItem: function (ringId, itemName, itemValue, cb) {
		assert.string(ringId, 'ringId');
		assert.string(itemName, 'itemName');
		
		var data = {};
		data['matchConfig.' + itemName + '.value'] = itemValue;

		ringsDb.update({ _id: ringId }, { $set: data }, callback(cb));
	},
	
	/**
	 * Set a Corner Judges's authorisation state.
	 * @param {String} cjId
	 * @param {Boolean} authorised
	 * @param {Function} cb
	 */
	setCJAuthorised: function (cjId, authorised, cb) {
		assert.string(cjId, 'cjId');
		
		usersDb.update({ _id: cjId }, { $set: { authorised: authorised } }, callback(cb));
	},
	
	/**
	 * Set the current state of a match.
	 * The `data` sub-document is merged rather than replaced.
	 * @param {String} matchId
	 * @param {Object} data
	 * @param {Function} cb
	 */
	setMatchState: function (matchId, data, cb) {
		assert.string(matchId, 'matchId');
		assert.ok(typeof data === 'undefined' || typeof data === 'object',
				  "if provided, `data` must be an object");
		
		// Create the query object from the provided data (use dot notation to merge the data)
		var query = Object.keys(data).reduce(function (q, key) {
			q['data.' + key] = data[key];
			return q;
		}, {});
		
		matchesDb.update({ _id: matchId }, { $set: query }, callback(cb));
	},
	
	/**
	 * Add a Corner Judge ID to a ring.
	 * @param {String} ringId
	 * @param {String} cjId
	 * @param {Function} cb
	 */
	addCJIdToRing: function (ringId, cjId, cb) {
		assert.string(ringId, 'ringId');
		assert.string(cjId, 'cjId');
		
		ringsDb.update({ _id: ringId }, { $addToSet: { cjIds: cjId } }, callback(cb));
	},
	
	/**
	 * Pull a Corner Judge ID from a ring.
	 * @param {String} ringId
	 * @param {String} cjId
	 * @param {Function} cb
	 */
	pullCJIdFromRing: function (ringId, cjId, cb) {
		assert.string(ringId, 'ringId');
		assert.string(cjId, 'cjId');
		
		ringsDb.update({ _id: ringId }, { $pull: { cjIds: cjId } }, callback(cb));
	},
	
	/**
	 * Remove a user.
	 * @param {User} user
	 * @param {Function} cb
	 */
	removeUser: function (user, cb) {
		assert.provided(user, 'user');
		
		usersDb.remove({ _id: user.id }, callback(cb));
	}
	
};

module.exports = DB;
