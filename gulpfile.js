'use strict';

// Dependencies
var gulp = require('gulp');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var nunjucksify = require('nunjucksify');
var envify = require('envify');
var cache = require('gulp-cached');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var nodemon = require('gulp-nodemon');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');
var path = require('path');
var del = require('del');

// Load environment variables (later used by envify) 
require('dotenv').config({ path: 'config/.env' });

// Clients
var clients = ['corner-judge', 'jury-president'];

// Default tasks (client tasks are added to the default tasks further down)
var defaultTasks = ['scripts:lint', 'server', 'watch'];

// Globs
var globs = {
	js: '**/*.js',
	njk: '**/*.njk',
};

// Path sets
var sets = {
	lint: [
		'app.js',
		'gulpfile.js',
		path.join('app', globs.js),
		path.join('clients', globs.js),
		path.join('tests', globs.js)
	],
	client: [
		path.join('config/.env'),
		path.join('clients/shared', globs.js),
		path.join('clients/templates', globs.njk)
	]
};


/**
 * Task to clear the datastores.
 */
gulp.task('reset', function () {
	del('app/data/**');
});

// Initialise a build task for each client
clients.forEach(function (client) {
	var task = 'scripts:' + client;
	defaultTasks.unshift(task);
	
	/**
	 * Task to build a client script with Browserify.
	 */
	gulp.task(task, function () {
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
 * Task to lint all scripts.
 * Use gulp-cached to re-lint only files that have changed.
 */
gulp.task('scripts:lint', function() {
	return gulp.src(sets.lint)
		.pipe(cache('scripts:lint'))
		.pipe(jshint({
			"lookup": false, "devel": true, "browser": true, "node": true,
			"bitwise": true, "curly": true, "eqeqeq": true, "funcscope": true, 
			"latedef": "nofunc", "nocomma": true, "undef": true, "unused": false
		}))
		.pipe(jshint.reporter('default'));
});

/**
 * Task to start the server.
 * Reload when the relevant files have changed.
 */
gulp.task('server', function () {
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
 * Task to run Mocha tests.
 */
gulp.task('test', function () {
	return gulp.src(path.join('tests', globs.js))
		.pipe(mocha());
});

/**
 * Task to watch for changes.
 */
gulp.task('watch', function () {
	// Watch and rebuild each client's scritps
	clients.forEach(function (client) {
		gulp.watch(sets.client.concat([
			path.join('clients', client, globs.js),
		]), ['scripts:' + client]);
	});
	
	// Lint any changed JS files
	gulp.watch(sets.lint, ['scripts:lint']);
});

/**
 * Default task.
 */
gulp.task('default', defaultTasks);
