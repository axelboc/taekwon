
// Import Node's core `assert` module, then extend it.
var assert = require('assert');

// Monkey patch `assert.ok` function to skip assertion in production and add functionality.
// Store reference to original function
var _ok = assert.ok;

/**
 * Monkey patch.
 * In development only, assert that a value is truthy.
 * @param {Mixed} val
 * @param {String} message
 */
assert.ok = function (val, message) {
	if (process.env.NODE_ENV === 'development') {
		message = message || 
		_ok(val, message);
	}
};

/**
 * Assert that a value is provided.
 * This is used for asserting mandatory arguments, when no other assertion function fits the bill.
 * @param {Mixed} val
 * @param {String} name
 */
assert.provided = function provided(val, name) {
	assert.ok(val, "`" + name + "` must be provided");
};

/**
 * Assert that a value is a string.
 * @param {Mixed} val
 * @param {String} name
 * @param {Boolean} canBeEmpty - optional; pass `true` if the value can be an empty string
 */
assert.string = function object(val, name, canBeEmpty) {
	assert.ok(typeof val === 'string' && (canBeEmpty || val.length > 0),
			  "`" + name + "` must be a" + (!canBeEmpty ? " non-empty" : "") + " string");
};

/**
 * Assert that a value is a boolean.
 * @param {Mixed} val
 * @param {String} name
 */
assert.boolean = function object(val, name) {
	assert.ok(typeof val === 'boolean', "`" + name + "` must be a boolean");
};

/**
 * Assert that a value is an integer strictly greater than 0.
 * @param {Mixed} val
 * @param {String} name
 */
assert.integerGt0 = function positiveInteger(val, name) {
	assert.ok(typeof val === 'number' && val >= 0 && val % 1 === 0, 
		   "`" + name + "` must be a positive integer");
};

/**
 * Assert that a value is a positive integer (i.e. greater than or equal to 0).
 * @param {Mixed} val
 * @param {String} name
 */
assert.integerGte0 = function positiveInteger(val, name) {
	assert.ok(typeof val === 'number' && val >= 0 && val % 1 === 0, 
		   "`" + name + "` must be a positive integer");
};

/**
 * Assert that a value is a function.
 * @param {Mixed} val
 * @param {String} name
 */
assert.function = function object(val, name) {
	assert.ok(typeof val === 'function', "`" + name + "` must be a function");
};

/**
 * Assert that a value is an object.
 * @param {Mixed} val
 * @param {String} name
 */
assert.object = function object(val, name) {
	assert.ok(typeof val === 'object', "`" + name + "` must be an object");
};

/**
 * Assert that a value is an array.
 * @param {Mixed} val
 * @param {String} name
 */
assert.array = function object(val, name) {
	assert.ok(Array.isArray(val), "`" + name + "` must be an array");
};

/**
 * Assert that a value is an instance of the given constructor.
 * @param {Mixed} val
 * @param {String} name
 * @param {Function} constr
 * @param {String} constrName
 */
assert.instanceOf = function instanceOf(val, name, constr, constrName) {
	assert.ok(val instanceof constr, "`" + name + "` must be a valid " + constrName + " object");
};

module.exports = assert;
