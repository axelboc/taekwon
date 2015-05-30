
define([
	'../../common/helpers'

], function (Helpers) {
	
	function AuthorisationView(io) {
		this.io = io;
		this.root = document.getElementById('authorisation');
	}
	
	return AuthorisationView;
	
});
