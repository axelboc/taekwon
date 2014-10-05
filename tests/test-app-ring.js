
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
	
	describe('#addCJ', function () {
		it("should throw if not passed a valid CornerJudge object", function () {
			var ring = new Ring(null, 0);
			expect(ring.addCJ.bind(ring, {})).to.throw(/argument 'cornerJudge' must be a valid CornerJudge object/);
		});
		
		it("should throw if Ring doesn't have a JP", function () {
			var ring = new Ring(null, 0);
			var cj = sinon.createStubInstance(CornerJudge);
			expect(ring.addCJ.bind(ring, cj)).to.throw(/ring must have Jury President/);
		});
	});
});
