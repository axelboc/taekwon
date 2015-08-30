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
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');
var path = require('path');
var del = require('del');


// Clients
var CLIENTS = ['corner-judge', 'jury-president'];

// Globs
var GLOBS = {
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
		path.join('tests', GLOBS.js)
	],
	client: [
		path.join('config/.env'),
		path.join('config/config.json'),
		path.join('clients/shared', GLOBS.js),
		path.join('clients/templates', GLOBS.njk)
	]
};


/**
 * Clear the datastores.
 */
gulp.task('reset', function () {
	del('app/data/**');
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
 * Build a client script with Browserify.
 * Register one task per client.
 */
CLIENTS.forEach(function (client) {
	gulp.task(client, function () {
		return browserify({
				entries: path.join('clients', client, 'root.js'),
				noParse: ['nunjucks', 'fastclick', 'tiny-cookie'],
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
 * Start the development server.
 * Reload when the relevant files have changed.
 */
gulp.task('server', CLIENTS, function () {
	nodemon({
		script: 'app.js',
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
		]), [client]);
	});
	
	// Lint any changed JS files
	gulp.watch(SETS.lint, ['scripts:lint']);
});


/**
 * ============
 *  MAIN TASKS
 * ============
 */
gulp.task('build', CLIENTS.slice(0));
gulp.task('default', ['build', 'scripts:lint', 'server', 'watch']);
