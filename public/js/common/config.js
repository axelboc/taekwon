
define({
	isProd: false,
	prodUrl: 'http://taekwon.do/',
	devUrl: 'http://taekwon.do/',
	cookieExpires: '12h',
	primusConfig: {
		strategy: ['online', 'disconnect']
	},
	ignoreErrors: [
		1001 // User reloads the page or navigates away
	]
})
