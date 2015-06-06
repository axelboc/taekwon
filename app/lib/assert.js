
// Logger
var logger = require('./log')('assert');

// Import Node's core `assert` module, then extend it.
var assert = require('assert');

// Monkey patch `assert.ok` function to skip assertion in production and add functionality.
// Store reference to original function
var _ok = assert.ok;

/**
 * Monkey patch `assert.ok` method.
 * @param {Mixed} val
 * @param {String} message
 */
assert.ok = function (val, message) {
	if (!val) {
		// Log error
		logger.error(message);
		
		// Forward to original `assert.ok` method in development
		if (process.env.NODE_ENV === 'development') {
			_ok(val, message);
		}
	}	
};

/**
 * Assert that a value is provided.
 * This is used for asserting mandatory arguments, when no other assertion function fits the bill.
 * @param {Mixed} val
 * @param {String} name
 */
assert.provided = function (val, name) {
	assert.ok(val, "`" + name + "` must be provided");
};

/**
 * Assert that a value is a string.
 * @param {Mixed} val
 * @param {String} name
 * @param {Boolean} canBeEmpty - optional; pass `true` if the value can be an empty string
 */
assert.string = function (val, name, canBeEmpty) {
	assert.ok(typeof val === 'string' && (canBeEmpty || val.length > 0),
			  "`" + name + "` must be a" + (!canBeEmpty ? " non-empty" : "") + " string");
};

/**
 * Assert that a value is a boolean.
 * @param {Mixed} val
 * @param {String} name
 */
assert.boolean = function (val, name) {
	assert.ok(typeof val === 'boolean', "`" + name + "` must be a boolean");
};

/**
 * Assert that a value is an integer.
 * @param {Mixed} val
 * @param {String} name
 */
assert.integer = function (val, name) {
	assert.ok(typeof val === 'number' && val % 1 === 0, "`" + name + "` must be an integer");
};

/**
 * Assert that a value is an integer strictly greater than 0.
 * @param {Mixed} val
 * @param {String} name
 */
assert.integerGt0 = function (val, name) {
	assert.ok(typeof val === 'number' && val >= 0 && val % 1 === 0, 
		   "`" + name + "` must be a positive integer");
};

/**
 * Assert that a value is a positive integer (i.e. greater than or equal to 0).
 * @param {Mixed} val
 * @param {String} name
 */
assert.integerGte0 = function (val, name) {
	assert.ok(typeof val === 'number' && val >= 0 && val % 1 === 0, 
		   "`" + name + "` must be a positive integer");
};

/**
 * Assert that a value is a function.
 * @param {Mixed} val
 * @param {String} name
 */
assert.function = function (val, name) {
	assert.ok(typeof val === 'function', "`" + name + "` must be a function");
};

/**
 * Assert that a value is an object.
 * @param {Mixed} val
 * @param {String} name
 */
assert.object = function (val, name) {
	assert.ok(typeof val === 'object' && val, "`" + name + "` must be an object");
};

/**
 * Assert that a value is an array.
 * @param {Mixed} val
 * @param {String} name
 */
assert.array = function (val, name) {
	assert.ok(Array.isArray(val), "`" + name + "` must be an array");
};

/**
 * Assert that a value is an instance of the given constructor.
 * @param {Mixed} val
 * @param {String} name
 * @param {Function} constr
 * @param {String} constrName
 */
assert.instanceOf = function (val, name, constr, constrName) {
	assert.ok(val instanceof constr, "`" + name + "` must be a valid " + constrName + " object");
};

module.exports = assert;
