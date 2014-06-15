
// Handlebars helpers
var hbsHelpers = {
	
	// Do something n times - {{#times n}}...{{/times}}
	times: function (n, block) {
		var accum = '';
		for(var i = 0; i < n; i += 1)
			accum += block.fn(i);
		return accum;
	},
	
	// Convert number to time string (m:ss) - {{numToTime d}}
	numToTime: function (num) {
		console.log(num);
		var min = Math.floor(num);
		console.log(min);
		var sec = 60 * (num - min);
		console.log(sec);
		console.log(min + ":" + (sec < 10 ? "0" : "") + sec);
		return min + ":" + (sec < 10 ? "0" : "") + sec;
	}
	
}

module.exports = hbsHelpers;