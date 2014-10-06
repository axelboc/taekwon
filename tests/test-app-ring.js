'use strict';

var Ring = require('../app/ring').Ring;
var CornerJudge = require('../app/corner-judge').CornerJudge;

describe('Ring', function () {
	
	describe('#getState', function () {
		it('should return state of new ring', function () {
			var ring = new Ring(null, 0);
			expect(ring.getState()).to.deep.equal({
				index: 0,
				number: 1,
				open: false
			});
		});
	});
	
	describe('#_getCornerJudgeById', function () {
		it("should only accept an identifer of type string", function () {
			var ring = new Ring(null, 0);
			var func = ring._getCornerJudgeById.bind(ring, 1);
			expect(func).to.throw(/argument 'id' must be a string/);
		});
		
		it("should throw if no CJ is found", function () {
			var ring = new Ring(null, 0);
			var func = ring._getCornerJudgeById.bind(ring, 'foo');
			expect(func).to.throw(/no Corner Judge with ID=foo in ring #1/);
		});
		
		it("should throw if more than one CJ is found", function () {
			var ring = new Ring(null, 0);
			var cj = { id: 'foo' };
			ring.cornerJudges = [cj, cj];
			var func = ring._getCornerJudgeById.bind(ring, 'foo');
			expect(func).to.throw(/2 Corner Judges share the same ID=foo in ring #1/);
		});
		
		it("should return CJ with given ID", function () {
			var ring = new Ring(null, 0);
			ring.cornerJudges = [{ id: 'foo' }, { id: 'bar' }];
			var cj = ring._getCornerJudgeById('bar');
			expect(cj.id).to.equal('bar');
		});
	});
	
	describe('#addCJ', function () {
		it("should only accept a valid CornerJudge instance", function () {
			var ring = new Ring(null, 0);
			var func = ring.addCJ.bind(ring, null);
			expect(func).to.throw(/argument 'cornerJudge' must be a valid CornerJudge object/);
		});
		
		it("should throw if Ring doesn't have a JP", function () {
			var ring = new Ring(null, 0);
			var cj = sinon.createStubInstance(CornerJudge);
			var func = ring.addCJ.bind(ring, cj);
			expect(func).to.throw(/ring must have Jury President/);
		});
		
		it("should add CJ to ring", function () {
			var ring = new Ring(null, 0);
			ring.juryPresident = {
				authoriseCJ: function () {}
			};
			ring.addCJ(sinon.createStubInstance(CornerJudge));
			expect(ring.cornerJudges).to.have.length(1);
		});
		
		it("should request authorisation from JP", function () {
			var ring = new Ring(null, 0);
			var authoriseCJ = sinon.spy();
			ring.juryPresident = { authoriseCJ: authoriseCJ };
			ring.addCJ(sinon.createStubInstance(CornerJudge));
			expect(authoriseCJ.called).to.be.true;
		});
	});
	
});
