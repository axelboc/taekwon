
define({
	isProd: false,
	prodUrl: 'http://taekwon.do/',
	devUrl: 'http://taekwon.do/',
	cookieExpires: '12h',
	primusConfig: {
		strategy: ['online', 'disconnect']
	},
	errorMessages: {
		// "Can't connect to server" => Session cookie not transmitted
		1002: "Enable cookies and try again"
	}
})
