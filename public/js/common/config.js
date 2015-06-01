
define({
	isProd: false,
	prodUrl: 'http://taekwon.do/',
	devUrl: 'http://taekwon.do/',
	primusConfig: {
		strategy: ['online', 'disconnect']
	},
	errorMessages: {
		// "Can't connect to server" => Session cookie not transmitted
		1002: "Enable cookies and try again"
	},
	timeConfigStep: 15
})
