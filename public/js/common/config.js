
define({
	isProd: true,
	prodUrl: 'http://taekwon.do/',
	devUrl: 'http://localhost/',
	primusConfig: {
		strategy: ['online', 'disconnect']
	},
	errorMessages: {
		// "Can't connect to server" => Session cookie not transmitted
		1002: "Enable cookies and try again";
	}
})
