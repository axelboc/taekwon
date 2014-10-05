var chai = require('chai');
var sinon = require('sinon');

chai.config.includeStack = false;
 
global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;
global.sinon = sinon;