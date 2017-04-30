'use strict';

// Load environment variables (later used by envify) 
require('dotenv').config({ path: 'config/.env' });

// Dependencies
var gulp = require('gulp');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var nunjucksify = require('nunjucksify');
var envify = require('envify');
var cache = require('gulp-cached');
var jshint = require('gulp-jshint');
var nodemon = require('gulp-nodemon');
var uglify = require('gulp-uglify');
var minify = require('gulp-minify-css');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var path = require('path');
var del = require('del');
var exec = require('child_process').exec;


// Dependencies required for building the Primus client library
var Primus = require('primus');
var Emit = require('primus-emit');
var EventEmitter = require('events');


// Clients
var CLIENTS = ['corner-judge', 'jury-president'];

// Globs
var GLOBS = {
	css: '**/*.css',
	js: '**/*.js',
	njk: '**/*.njk',
};

// Sets of paths
var SETS = {
	lint: [
		'app.js',
		'gulpfile.js',
		path.join('app', GLOBS.js),
		path.join('clients', GLOBS.js),
		('!' + path.join('clients', 'vendor', GLOBS.js)),
		path.join('tests', GLOBS.js)
	],
	client: [
		path.join('config/.env'),
		path.join('config/config.json'),
		path.join('clients/shared', GLOBS.js),
		path.join('templates/precompiled', GLOBS.njk)
	]
};

// Determine the arguments with which to start the server
var args = process.argv.indexOf('--force') !== -1 ? ['--force'] : [];


/**
 * Clear the datastores.
 */
gulp.task('reset', function () {
	return del('data/**');
});

/**
 * Lint all scripts.
 * Use gulp-cached to re-lint only files that have changed.
 */
gulp.task('scripts:lint', function() {
	return gulp.src(SETS.lint)
		.pipe(cache('scripts:lint'))
		.pipe(jshint({
			lookup: false, devel: true, browser: true, node: true,
			bitwise: true, curly: true, eqeqeq: true, funcscope: true, 
			latedef: 'nofunc', nocomma: true, undef: true, unused: false
		}))
		.pipe(jshint.reporter('default'));
});

/**
 * Generate the Primus client library.
 */
gulp.task('primus', function () {
	var server = new EventEmitter();

	// Instanciate Primus and configure its plugins (must match steps performed in `app/tournament.js`)
  var primus = new Primus(server, { transformer: 'sockjs' });
	primus.plugin('emit', Emit);
	primus.remove('primus.js');

	// Save the library
  primus.save('clients/vendor/primus.js');
});

/**
 * Build a client script with Browserify.
 * Register one task per client.
 */
CLIENTS.forEach(function (client) {
	gulp.task(client + ':js', function () {
		return browserify({
				entries: path.join('clients', client, 'root.js'),
				debug: true
			})
			.transform(envify)
			.transform(nunjucksify, { extension: '.njk' })
			.bundle()
			.pipe(source(client + '.js'))
			.pipe(buffer())
			.pipe(sourcemaps.init({ loadMaps: true }))
			.pipe(uglify())
			.on('error', gutil.log)
			.pipe(sourcemaps.write('./'))
			.pipe(gulp.dest('public/js'));
	});
});

/**
 * Build a client stylesheet.
 * Register one task per client.
 */
CLIENTS.forEach(function (client) {
	gulp.task(client + ':css', function () {
		return gulp.src([
				'styles/main.css',
				'styles/' + client + '.css'
			])
			.pipe(concat(client + '.css'))
			.pipe(sourcemaps.init({ loadMaps: true }))
			.pipe(minify())
			.on('error', gutil.log)
			.pipe(sourcemaps.write('./'))
			.pipe(gulp.dest('public/css'));
	});
});

/**
 * Start the development server.
 * Reload when the relevant files have changed.
 */
gulp.task('server', ['build'], function () {
	nodemon({
		script: 'app.js',
		args: args,
		watch: [
			'app',
			'app.js',
			'config/.env',
			'config/config.json'
		]
	});
});

/**
 * Watch for changes.
 */
gulp.task('watch', ['server'], function () {
	// Watch and rebuild each client's scritps
	CLIENTS.forEach(function (client) {
		gulp.watch(SETS.client.concat([
			path.join('clients', client, GLOBS.js),
		]), [client + ':js']);
		
		gulp.watch([
			'styles/main.css',
			'styles/' + client + '.css'
		], [client + ':css']);
	});
	
	// Lint any changed JS files
	gulp.watch(SETS.lint, ['scripts:lint']);
});


/**
 * ============
 *  MAIN TASKS
 * ============
 */

gulp.task('default', ['build', 'scripts:lint', 'server', 'watch']);

gulp.task('build', CLIENTS.reduce(function (arr, client) {
	arr.push(client + ':css', client + ':js');
	return arr;
}, []));


/**
 * Set static IP for network adapter.
 */
gulp.task('ip:set', function () {
	var cmd = 'netsh interface ip set address "' + process.env.NETWORK_ADAPTER + '" static ' +
		process.env.TAEKWON_SERVER_IP + ' ' + process.env.DNS_SERVER_MASK + ' ' + process.env.DNS_SERVER_IP;
	exec(cmd, execCb);
});

/**
 * Reset network adapter to DHCP.
 */
gulp.task('ip:reset', function () {
	var cmd = 'netsh interface ip set address "' + process.env.NETWORK_ADAPTER + '" dhcp ';
	exec(cmd, execCb);
});

function execCb(err, stdout, stderr) {
	if (err) console.log(err);
	if (stdout) console.log(stdout);
	if (stderr) console.log(stderr);
}
