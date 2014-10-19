'use strict';

var Ring = require('../app/ring').Ring;
var CornerJudge = require('../app/corner-judge').CornerJudge;
var JuryPresident = require('../app/jury-president').JuryPresident;

describe('Ring', function () {
	
	describe('#getState', function () {
		it('should return Ring\'s state', function () {
			var ring = new Ring(null, 0);
			expect(ring.getState()).to.deep.equal({
				index: 0,
				number: 1,
				open: false
			});
		});
	});
	
	describe('#open', function () {
		it("should only accept a JuryPresident object as argument (jp)", function () {
			var ring = new Ring(null, 0);
			var func = ring.open.bind(ring, {});
			expect(func).to.throw(/argument 'jp' must be a valid JuryPresident object/);
		});
		
		it("should throw if Ring is already open (already has a JP)", function () {
			var ring = new Ring(null, 0);
			ring.juryPresident = {};
			var func = ring.open.bind(ring, sinon.createStubInstance(JuryPresident));
			expect(func).to.throw(/ring is already open/);
		});
		
		it("should open Ring", function () {
			var ring = new Ring(null, 0);
			ring._stateChanged = sinon.spy();
			ring.open(sinon.createStubInstance(JuryPresident));
			expect(ring.getState().open).to.be.true;
		});
		
		it("should request state changed event to be broadcasted", function () {
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
		
		it("should close Ring", function () {
			var ring = new Ring(null, 0);
			ring.juryPresident = {};
			ring._stateChanged = sinon.spy();
			ring.close();
			expect(ring.getState().open).to.be.false;
		});
		
		it("should request state changed event to be broadcasted", function () {
			var ring = new Ring(null, 0);
			ring.juryPresident = {};
			var _stateChanged = sinon.spy();
			ring._stateChanged = _stateChanged;
			ring.close();
			expect(_stateChanged.called).to.be.true;
		});
		
		it("should remove all CJs from Ring", function () {
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
	
	describe('#_getCornerJudgeById', function () {
		it("should only accept a string as argument (id)", function () {
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
		
		it("should return CJ", function () {
			var ring = new Ring(null, 0);
			ring.cornerJudges = [{ id: 'foo' }, { id: 'bar' }];
			var cj = ring._getCornerJudgeById('bar');
			expect(cj.id).to.equal('bar');
		});
	});
	
	describe('#addCJ', function () {
		it("should only accept a CornerJudge object as argument (cj)", function () {
			var ring = new Ring(null, 0);
			var func = ring.addCJ.bind(ring, null);
			expect(func).to.throw(/argument 'cj' must be a valid CornerJudge object/);
		});
		
		it("should throw if Ring doesn't have a JP", function () {
			var ring = new Ring(null, 0);
			var cj = sinon.createStubInstance(CornerJudge);
			var func = ring.addCJ.bind(ring, cj);
			expect(func).to.throw(/ring must have Jury President/);
		});
		
		it("should add CJ to Ring", function () {
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
	
	describe('#removeCJ', function () {
		it("should only accept a string or CornerJudge object as first argument (cj)", function () {
			var ring = new Ring(null, 0);
			var func = ring.removeCJ.bind(ring, null);
			expect(func).to.throw(/argument 'cj' must be a string or a valid CornerJudge object/);
		});
		
		it("should only accept a string as second argument (message)", function () {
			var ring = new Ring(null, 0);
			var func = ring.removeCJ.bind(ring, 'foo', null);
			expect(func).to.throw(/argument 'message' must be a string/);
		});
		
		it("should throw if CJ is not in Ring", function () {
			var ring = new Ring(null, 0);
			var func = ring.removeCJ.bind(ring, sinon.createStubInstance(CornerJudge), '');
			expect(func).to.throw(/Corner Judge is not in the ring/);
		});
		
		it("should remove CJ from Ring (by reference)", function () {
			var ring = new Ring(null, 0);
			var cj = sinon.createStubInstance(CornerJudge);
			cj.id = 'foo';
			cj.ringLeft = function () {};
			ring.cornerJudges = [cj];
			ring.removeCJ(cj, '');
			expect(ring.cornerJudges).to.have.length(0);
		});
		
		it("should remove CJ from Ring (by ID)", function () {
			var ring = new Ring(null, 0);
			ring.cornerJudges = [{
				id: 'foo',
				ringLeft: function () {}
			}];
			ring.removeCJ('foo', '');
			expect(ring.cornerJudges).to.have.length(0);
		});
		
		it("should notify CJ who has been removed", function () {
			var ring = new Ring(null, 0);
			var ringLeft = sinon.spy();
			ring.cornerJudges = [{
				id: 'foo',
				ringLeft: ringLeft
			}];
			ring.removeCJ('foo', '');
			expect(ringLeft.called).to.be.true;
		});
	});
	
	describe('#enableScoring', function () {
		it("should only accept a boolean as argument (enable)", function () {
			var ring = new Ring(null, 0);
			var func = ring.enableScoring.bind(ring, 1);
			expect(func).to.throw(/argument 'enable' must be a boolean/);
		});
		
		it("should enable scoring", function () {
			var ring = new Ring(null, 0);
			ring.enableScoring(true);
			expect(ring.scoringEnabled).to.be.true;
		});
		
		it("should notify CJs that scoring state has changed", function () {
			var ring = new Ring(null, 0);
			var cj = { scoringStateChanged: sinon.spy() };
			ring.cornerJudges = [cj];
			ring.enableScoring(true);
			expect(cj.scoringStateChanged.called).to.be.true;
		});
	});
	
	describe('#cjAuthorised', function () {
		it("should only accept a string as argument (id)", function () {
			var ring = new Ring(null, 0);
			var func = ring.cjAuthorised.bind(ring, 1);
			expect(func).to.throw(/argument 'id' must be a string/);
		});
		
		it("should notify CJ who has been authorised", function () {
			var ring = new Ring(null, 0);
			var cj = { ringJoined: sinon.spy() };
			ring._getCornerJudgeById = sinon.stub().returns(cj);
			ring.juryPresident = {};
			ring.cornerJudges = [cj];
			ring.cjAuthorised('');
			expect(cj.ringJoined.called).to.be.true;
		});
	});
	
	describe('#cjScored', function () {
		it("should only accept a CornerJudge object as first argument (cj)", function () {
			var ring = new Ring(null, 0);
			var func = ring.cjScored.bind(ring, null);
			expect(func).to.throw(/argument 'cj' must be a valid CornerJudge object/);
		});
		
		it("should only accept a function as third argument (callback)", function () {
			var ring = new Ring(null, 0);
			var cj = sinon.createStubInstance(CornerJudge);
			var func = ring.cjScored.bind(ring, cj, {}, null);
			expect(func).to.throw(/argument 'callback' must be a function/);
		});
		
		it("should throw if Ring doesn't have a JP", function () {
			var ring = new Ring(null, 0);
			var cj = sinon.createStubInstance(CornerJudge);
			var func = ring.cjScored.bind(ring, cj, {}, function () {});
			expect(func).to.throw(/ring must have Jury President/);
		});
		
		it("should notify JP", function () {
			var ring = new Ring(null, 0);
			var cjScored = sinon.spy();
			ring.juryPresident = { cjScored: cjScored };
			ring.cjScored(sinon.createStubInstance(CornerJudge), {}, function () {});
			expect(cjScored.called).to.be.true;
		});
		
		it("should confirm back to CJ that score has been processed", function () {
			var ring = new Ring(null, 0);
			var callback = sinon.spy();
			ring.juryPresident = { cjScored: function () {} };
			ring.cjScored(sinon.createStubInstance(CornerJudge), {}, callback);
			expect(callback.called).to.be.true;
		});
	});
	
	describe('#cjExited', function () {
		it("should only accept a CornerJudge object as argument (cj)", function () {
			var ring = new Ring(null, 0);
			var func = ring.cjExited.bind(ring, null);
			expect(func).to.throw(/argument 'cj' must be a valid CornerJudge object/);
		});
		
		it("should throw if Ring doesn't have a JP", function () {
			var ring = new Ring(null, 0);
			var cj = sinon.createStubInstance(CornerJudge);
			var func = ring.cjExited.bind(ring, sinon.createStubInstance(CornerJudge));
			expect(func).to.throw(/ring must have Jury President/);
		});
		
		it("should remove CJ from Ring", function () {
			var ring = new Ring(null, 0);
			ring.removeCJ = sinon.spy();
			ring.juryPresident = { cjExited: function () {} };
			ring.cjExited(sinon.createStubInstance(CornerJudge));
			expect(ring.removeCJ.called).to.be.true;
		});
		
		it("should notify JP", function () {
			var ring = new Ring(null, 0);
			var cjExited = sinon.spy();
			ring.removeCJ = function () {};
			ring.juryPresident = { cjExited: cjExited };
			ring.cjExited(sinon.createStubInstance(CornerJudge));
			expect(cjExited.called).to.be.true;
		});
		
	});
});
