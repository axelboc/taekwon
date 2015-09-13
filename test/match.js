
var expect = require('chai').expect;

var fs = require('fs');
var path = require('path');

var log = require('../app/lib/log');
var Match = require('../app/match').Match;
var Competitors = require('../app/enum/competitors');


describe('Match', function () {
	
	var match;
	
	before(function () {
		// Initialise the logger (log file will be deleted in `after` hook)
		log.init('testing');
		
		// Initialise a match
		match = new Match('match', {}, { state: 'idle' });
	});
	
	describe('_computeOverallWinner', function () {
		
		it('should give Hong winner', function () {
			expect(match._computeOverallWinner(1, 0, 0)).to.equal(Competitors.HONG);
			expect(match._computeOverallWinner(1, 0, 1)).to.equal(Competitors.HONG);
			expect(match._computeOverallWinner(2, 1, 0)).to.equal(Competitors.HONG);
			expect(match._computeOverallWinner(2, 1, 1)).to.equal(Competitors.HONG);
		});
		
		it('should give Chong winner', function () {
			expect(match._computeOverallWinner(0, 2, 0)).to.equal(Competitors.CHONG);
			expect(match._computeOverallWinner(0, 2, 2)).to.equal(Competitors.CHONG);
			expect(match._computeOverallWinner(1, 3, 0)).to.equal(Competitors.CHONG);
			expect(match._computeOverallWinner(1, 2, 1)).to.equal(Competitors.CHONG);
		});
		
		it('should give draw when competitors have the same number of wins', function () {
			expect(match._computeOverallWinner(1, 1, 0)).to.be.null;
			expect(match._computeOverallWinner(1, 1, 1)).to.be.null;
			expect(match._computeOverallWinner(2, 2, 0)).to.be.null;
			expect(match._computeOverallWinner(2, 2, 1)).to.be.null;
		});
		
		it('should give draw when number of draws is greater than number of wins of any competitor', function () {
			expect(match._computeOverallWinner(0, 0, 1)).to.be.null;
			expect(match._computeOverallWinner(1, 0, 2)).to.be.null;
			expect(match._computeOverallWinner(1, 1, 2)).to.be.null;
			expect(match._computeOverallWinner(0, 1, 3)).to.be.null;
		});
		
	});
	
	after(function () {
		// Delete log file
		fs.unlinkSync(path.join(__dirname, '../data/logs/testing.db'));
	});
	
});
