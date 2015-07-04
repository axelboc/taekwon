'use strict';

// Dependencies
var pkg = require('./package.json');
var gulp = require('gulp');
var browserify = require('browserify');
var hbsfy = require('hbsfy');
var cache = require('gulp-cached');
var jshint = require('gulp-jshint');
var nodemon = require('gulp-nodemon');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var path = require('path');

// Clients
var clients = ['corner-judge', 'jury-president'];

// Tasks to be run by default (client tasks are added further down)
var defaultTasks = ['scripts:lint', 'server', 'watch'];

// Globs
var globs = {
	js: '**/*.js',
	hbs: '**/*.hbs',
};

// Sets of paths
var sets = {
	lint: [
		'app.js',
		'gulpfile.js',
		path.join('app', globs.js),
		path.join('clients', globs.js),
		path.join('tests', globs.js)
	],
	client: [
		path.join('config/**'),
		path.join('clients/shared', globs.js),
		path.join('clients/templates', globs.hbs)
	]
};

// Initialise a build task for each client
clients.forEach(function (client) {
	var task = 'scripts:' + client;
	defaultTasks.unshift(task);
	
	/**
	 * Build each client script with Browserify.
	 */
	gulp.task(task, function () {
		return browserify({
				entries: path.join('clients', client, 'root.js'),
				noParse: ['fastclick', 'tiny-cookie'],
				debug: true
			})
			.transform(hbsfy)
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
 * Lint all scripts.
 * Use gulp-cached to re-lint only files that have changed.
 */
gulp.task('scripts:lint', function() {
	return gulp.src(sets.lint)
		.pipe(cache('scripts:lint'))
		.pipe(jshint(pkg.jshintConfig))
		.pipe(jshint.reporter('default'));
});

/**
 * Start the server.
 * Reload when the relevant files have changed.
 */
gulp.task('server', function () {
	nodemon({
		script: 'app.js',
		watch: [
			'app',
			'config/config.env',
			'config/config.json',
			'app.js'
		]
	});
});

/**
 * Watch for changes.
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
 * Register the default tasks.
 */
gulp.task('default', defaultTasks);
