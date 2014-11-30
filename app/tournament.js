
// Modules
var assert = require('assert');
var async = require('async');
var Spark = require('primus').Spark;
var Ring = require('./ring').Ring;
var User = require('./user').User;
var JuryPresident = require('./jury-president').JuryPresident;
var CornerJudge = require('./corner-judge').CornerJudge;


/**
 * Tournament; the root of the application.
 * @param {String} id
 * @param {Primus} primus
 * @param {Object} db - the NeDB datastores
 * @param {Function} log
 * @param {Object} data - if provided, used to restore an existing tournament
 * 		  {Array}  data.ringIds
 * 		  {Array}  data.users
 */
function Tournament(id, primus, db, log) {
	assert(primus, "argument 'primus' must be provided");
	assert(typeof db === 'object', "argument 'db' must be an object");
	assert(db.tournaments && db.rings && db.matches, 
		   "object 'db' must contain three datastores: 'tournaments', 'rings' and 'matches'");
	assert(typeof log === 'function', "argument 'log' must be a function");
	
	this.id = id;
	this.primus = primus;
	this.db = db;
	
	this.log = log;
	this._log = log.bind(this, 'tournament');
	
	this.rings = [];
	this.users = {};
	
	// Bind socket events
	primus.on('connection', this._onConnection.bind(this));
	primus.on('disconnection', this._onDisconnection.bind(this));
}


Tournament.prototype = {
	
	/**
	 * New socket connection.
	 * @param {Spark} spark
	 */
	_onConnection: function (spark) {
		assert(spark, "argument 'spark' must be provided");
		
		var request = spark.request;
		assert(request, "spark.request is null or undefined");

		var sessionId = request.sessionId;
		assert(sessionId, "session ID is invalid (cookies not transmitted)");
		assert(typeof sessionId === 'string', "session ID must be a string");

		// Look for an existing user with this session ID
		var user = this.users[sessionId];
		
		if (!user) {
			// Request identification from new user
			this._log('debug', "New user with ID=" + sessionId);
			this._waitForId(spark, sessionId);
		} else {
			// If existing user, check whether its previous spark is still open
			this._log('debug', "Existing user with ID=" + sessionId);
			if (user.spark && user.spark.readyState === Spark.OPEN) {
				// Inform client that a session conflict has been detected
				this._log('debug', "> Session conflict detected");
				spark.emit('wsError', {
					reason: "Session already open"
				});
				spark.end();
			} else {
				// Ask user to confirm its identity
				this._log('debug', "> Confirming identity...");
				this._confirmIdentity(spark, sessionId, user);
			}
		}
	},
	
	/**
	 * Socket disconnection.
	 * @param {Spark} spark
	 */
	_onDisconnection: function (spark) {
		assert(spark, "argument 'spark' must be provided");
		
		var request = spark.request;
		assert(request, "spark.request is null or undefined");
		
		var sessionId = request.sessionId;
		assert(sessionId, "session ID is invalid (cookies not transmitted)");
		assert(typeof sessionId === 'string', "session ID must be a string");
		
		// Look for the user with this session ID
		var user = this.users[sessionId];

		// If the user exists (has been successfully identified), notify it of the disconnection
		if (user) {
			this._log('debug', "User with ID=" + sessionId + " disconnected.");
			user.disconnected();
		}
	},
	
	/**
	 * Request and wait for user identification.
	 * @param {Spark} spark
	 * @param {String} sessionId
	 */
	_waitForId: function (spark, sessionId) {
		assert(spark, "argument 'spark' must be provided");
		assert(typeof sessionId === 'string', "argument 'sessionId' must be a string");
		
		// Listen for identification
		['juryPresident', 'cornerJudge'].forEach(function (evt) {
			spark.on(evt, this._onId.bind(this, spark, sessionId, evt));
		}, this);

		// Inform user that we're waiting for an identification
		this._log('debug', "> Waiting for identification...");
		spark.emit('waitingForId');
	},

	/**
	 * Identification received.
	 * @param {Spark} spark
	 * @param {String} sessionId
	 * @param {String} identity - 'cornerJudge' or 'juryPresident'
	 * @param {Object} data
	 * 		  {String} data.password - the master password
	 */
	_onId: function (spark, sessionId, identity, data) {
		assert(spark, "argument 'spark' must be provided");
		assert(typeof sessionId === 'string', "argument 'sessionId' must be a string");
		
		// If another user has logged in with the same sessionID since the 'waitingForId' 
		// notification was sent, inform client that a session conflict has been detected
		if (this.users[sessionId]) {
			this._log('debug', "> Session conflict detected");
			spark.emit('wsError', {
				reason: "Session already open"
			});
			spark.end();
			return;
		}
		
		assert(typeof identity === 'string', "argument 'identity' must be a string");
		assert(typeof data === 'object' && data, "argument 'data' must be an object");
		
		var user;
		var userDoc = {
			_id: sessionId,
			identity: identity
		};
		
		switch (identity) {
			case 'juryPresident':
				// Check password
				assert(typeof process.env.MASTER_PWD === 'string', "'data.password' must be a string");
				if (data.password === process.env.MASTER_PWD) {
					// Initialise Jury President
					user = new JuryPresident(this, this.primus, spark, sessionId);
				}
				break;
			case 'cornerJudge':
				// Check name
				assert(typeof data.name === 'string', "'data.name' must be a string");
				if (data.name.length > 0) {
					// Initialise Corner Judge
					user = new CornerJudge(this, this.primus, spark, sessionId, data.name);
					userDoc.name = data.name;
				}
				break;
			default:
				assert(false, "argument 'identity' must be 'cornerJudge' or 'juryPresident'");
		}
		
		if (user) {
			// Store user
			this.users[sessionId] = user;
			
			// Notify client of success
			this._log('debug', "> " + identity + " identified");
			spark.emit('idSuccess');
			
			// Send ring states right away
			spark.emit('ringStates', this.getRingStates());
			
			// Save user to database
			this.db.users.insert(userDoc, function (err, newDoc) {
				this.db.cb(err);
				if (newDoc) {
					this.db.tournaments.update({ _id: this.id }, { $addToSet: { userIds: sessionId } },
											   function (err) {
						this.db.cb(err);
						this._log('newUser', userDoc);
					}.bind(this));
				}
			}.bind(this));
		} else {
			// Notify client of failure
			this._log('debug', "> " + identity + " identified but rejected");
			spark.emit('idFail');
		}
	},
		
	/**
	 * Ask a user to confirm its identity.
	 * @param {Spark} spark
	 * @param {String} sessionId
	 * @param {User} user
	 */
	_confirmIdentity: function (spark, sessionId, user) {
		assert(spark, "argument 'spark' must be provided");
		assert(typeof sessionId === 'string', "argument 'sessionId' must be a string");
		assert(user instanceof User, "argument 'user' must be a valid User object");
		
		// Listen for identity confirmation
		spark.on('identityConfirmation', this._onIdentityConfirmation.bind(this, spark, sessionId, user));
		
		// Send identity confirmation request
		this._log('debug', "> Waiting for identity confirmation...");
		spark.emit('confirmIdentity');
	},
	
	/**
	 * Identity confirmation received.
	 * @param {Spark} spark
	 * @param {String} sessionId
	 * @param {User} user
	 * @param {Object} data
	 * 		  {String} data.identity - the user's identity ('juryPresident' or 'cornerJudge')
	 */
	_onIdentityConfirmation: function (spark, sessionId, user, data) {
		assert(spark, "argument 'spark' must be provided");
		assert(typeof sessionId === 'string', "argument 'sessionId' must be a string");
		assert(user instanceof User, "argument 'user' must be a valid User object");
		assert(this.users[sessionId] === user, "user has already switched role");
		assert(typeof data === 'object' && data, "argument 'data' must be an object");
		assert(typeof data.identity === 'string', "'data.identity' must be a string");
		assert(data.identity === 'juryPresident' || data.identity === 'cornerJudge',
			   "identity must be either 'juryPresident' or 'cornerJudge'");
		
		// Check whether user is switching role
		var isJP = data.identity === 'juryPresident';
		if (isJP && user instanceof JuryPresident || !isJP && user instanceof CornerJudge) {
			// Not switching; restore session
			this._log('debug', "> Identity confirmed: " + data.identity + ". Restoring session...");
			user.restoreSession(spark);
		} else {
			// Switching; remove user from system and request identification from new user
			this._log('debug', "> User has changed identity. Starting new identification process...");
			user.exit();
			delete this.users[sessionId];
			this._waitForId(spark, sessionId);
		}
	},
	
	/**
	 * Retore the tournament's users.
	 * @param {Array} ids
	 * @param {Function} cb - a function called when the restoration is complete
	 */
	restoreUsers: function (ids, cb) {
		assert(Array.isArray(ids), "argument 'ids' must be an array");
		assert(typeof cb === 'function', "argument 'cb' must be a function");
		
		async.each(ids, function (id, cb) {
			// Find the ring with the given ID in the database
			this.db.users.findOne({ _id: id }, function (err, doc) {
				this.db.cb(err);
				
				// If the user was found, restore it
				if (doc) {
					var user;
					switch(doc.identity) {
						case 'juryPresident':
							// Initialise Jury President
							user = new JuryPresident(this, this.primus, null, id);
							break;
						case 'cornerJudge':
							// Initialise Corner Judge
							user = new CornerJudge(this, this.primus, null, id, doc.name);
							user.authorised = !!doc.authorised;
							user.connected = false;
							break;
					}

					// Add the user to the tournament
					this.users[user.id] = user;
					this._log('debug', "User restored (" + doc.identity + ", ID=" + user.id + ")");
				} else {
					this._log('error', "User missing from database (ID=" + id + ")");
				}
				
				cb();
			}.bind(this));
		}.bind(this), cb);
	},
	
	/**
	 * Initialise the tournament's rings.
	 * @param {Number} count - the number of rings, as an integer greater than 0
	 * @param {Function} cb - a function called when the initialisation is complete
	 */
	initialiseRings: function (count, cb) {
		assert(typeof count === 'number' && count > 0 && count % 1 === 0, 
			   "argument 'count' must be an integer greater than 0");
		assert(typeof cb === 'function', "argument 'cb' must be a function");
		
		// Retrieve the number of corner judge slots per ring
		var slotCount = parseInt(process.env.CJS_PER_RING, 10);
		assert(!isNaN(slotCount) && slotCount > 0,
			   "environment configuration `CJS_PER_RING` must be a positive integer");
		
		// Initialise the ring documents that will be stored in the database
		var ringDocs = [];
		for (var i = 0; i < count; i += 1) {
			ringDocs.push({
				index: i,
				jpId: null,
				cjIds: [],
				slotCount: slotCount
			});
		}
		
		// Insert the ring documents in the database
		this.db.rings.insert(ringDocs, function (err, newDocs) {
			this.db.cb(err);
			if (newDocs) {
				// If all documents were added successfully to the database, initialise the rings
				var ids = [];
				newDocs.forEach(function (doc) {
					ids.push(doc._id);
					this.rings.push(new Ring(this, doc._id, doc.index, slotCount));
				}, this);
				
				// Store the ring IDs in the database
				this.db.tournaments.update({ _id: this.id }, { $set: { ringIds: ids } }, cb);
				
				this._log('debug', "Rings initialised (IDs=" + ids + ")");
			}
		}.bind(this));
	},
	
	/**
	 * Restore the tournament's rings.
	 * @param {Array} - an array of ring IDs to restore
	 * @param {Function} cb - a function called when the restoration is complete
	 */
	restoreRings: function (ids, cb) {
		assert(Array.isArray(ids), "argument 'ids' must be an array");
		assert(typeof cb === 'function', "argument 'cb' must be a function");
		
		async.each(ids, function (id, cb) {
			// Find the ring with the given ID in the database
			this.db.rings.findOne({ _id: id }, function (err, doc) {
				this.db.cb(err);
				
				if (doc) {
					// If the ring was found, restore it
					var ring = new Ring(this, doc._id, doc.index, doc.slotCount);
					this.rings[doc.index] = ring;
	
					// Restore the ring's Jury President
					if (doc.jpId) {
						var jp = this.users[doc.jpId];
						if (jp) {
							ring.juryPresident = jp;
							jp.ring = ring;
						}
						
					}
					
					// Restore the ring's Corner Judges
					if (doc.cjIds) {
						doc.cjIds.forEach(function (id) {
							var cj = this.users[id];
							if (cj) {
								ring.cornerJudges.push(this.users[id]);
								cj.ring = ring;
							}
						});
					}
					
					this._log('debug', "Ring restored (ID=" + id + ")");
				} else {
					this._log('error', "Ring missing from database (ID=" + id + ")");
				}
				
				cb();
			}.bind(this));
		}.bind(this), cb);
	},
	
	/**
	 * Get ring at given index.
	 * @param {Number} index - the index of the ring, as a positive integer
	 * @return {Ring}
	 */
	getRing: function (index) {
		assert(typeof index === 'number' && index >= 0 && index % 1 === 0, 
			   "argument 'index' must be a positive integer");
		
		var ring = this.rings[index];
		assert(ring, "no ring at index=" + index);
		
		return ring;
	},
	
	/**
	 * Build and return an array of the rings' states.
	 * @return {Array}
	 */
	getRingStates: function () {
		return this.rings.reduce(function (arr, ring) {
			arr.push(ring.getState());
			return arr;
		}, []);
	},
	
	/**
	 * Broadcast to all users that the state of a ring (open/closed) has changed.
	 * @param {Ring} ring
	 */
	ringStateChanged: function (ring) {
		assert(ring instanceof Ring, "argument 'ring' must be a valid Ring object");
		
		// Retrieve the state of the ring
		var state = ring.getState();
		
		this.primus.forEach(function (spark) {
			spark.emit('ringStateChanged', state);
		}.bind(this));
	},
	
	/**
	 * The authorisation state of a Corner Judge has changed.
	 * @param {CornerJudge} cj
	 */
	cjAuthorisationStateChanged: function (cj) {
		assert(typeof cj === 'string' || cj instanceof CornerJudge, 
			   "argument 'cj' must be a string or a valid CornerJudge object");
		
		// Update the database
		this.db.users.update({ _id: cj.id }, { $set: { authorised: cj.authorised } }, this.db.cb);
	}
	
};


exports.Tournament = Tournament;
