
// Handlebars helpers
var hbsHelpers = {
	
	// Do something n times - {{#times n}}...{{/times}}
	times: function (n, block) {
		var accum = '';
		for(var i = 1; i < n + 1; i += 1)
			accum += block.fn(i);
		return accum;
	},
	
	// Convert number to time string (m:ss) - {{numToTime d}}
	numToTime: function (num) {
		var min = Math.floor(num / 60);
		var sec = num % 60;
		return min + ":" + (sec < 10 ? "0" : "") + sec;
	}
	
}

module.exports = hbsHelpers;