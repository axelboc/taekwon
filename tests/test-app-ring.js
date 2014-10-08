'use strict';

var Ring = require('../app/ring').Ring;
var CornerJudge = require('../app/corner-judge').CornerJudge;
var JuryPresident = require('../app/jury-president').JuryPresident;

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
	
	describe('#open', function () {
		it("should only accept a valid JuryPresident instance", function () {
			var ring = new Ring(null, 0);
			var func = ring.open.bind(ring, {});
			expect(func).to.throw(/argument 'juryPresident' must be a valid JuryPresident object/);
		});
		
		it("should throw if Ring is already open (already has a Jury President)", function () {
			var ring = new Ring(null, 0);
			ring.juryPresident = {};
			var func = ring.open.bind(ring, sinon.createStubInstance(JuryPresident));
			expect(func).to.throw(/ring is already open/);
		});
		
		it("should open ring", function () {
			var ring = new Ring(null, 0);
			ring._stateChanged = sinon.spy();
			ring.open(sinon.createStubInstance(JuryPresident));
			expect(ring.getState().open).to.be.true;
		});
		
		it("should trigger state changed event", function () {
			var ring = new Ring(null, 0);
			var _stateChanged = sinon.spy();
			ring._stateChanged = _stateChanged;
			ring.open(sinon.createStubInstance(JuryPresident));
			expect(_stateChanged.called).to.be.true;
		});
	});
	
	describe('#close', function () {
		it("should throw if Ring is already closed (doesn't have a Jury President)", function () {
			var ring = new Ring(null, 0);
			expect(ring.close).to.throw(/ring is already closed/);
		});
		
		it("should close ring", function () {
			var ring = new Ring(null, 0);
			ring.juryPresident = {};
			ring._stateChanged = sinon.spy();
			ring.close();
			expect(ring.getState().open).to.be.false;
		});
		
		it("should trigger state changed event", function () {
			var ring = new Ring(null, 0);
			ring.juryPresident = {};
			var _stateChanged = sinon.spy();
			ring._stateChanged = _stateChanged;
			ring.close();
			expect(_stateChanged.called).to.be.true;
		});
		
		it("should remove all Corner Judges from ring", function () {
			var ring = new Ring(null, 0);
			ring.juryPresident = {};
			ring._stateChanged = sinon.spy();
			var removeCJ = sinon.spy();
			ring.removeCJ = removeCJ;
			var cj = {};
			ring.cornerJudges = [cj];
			ring.close();
			expect(removeCJ.calledWith(cj)).to.be.true;
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
