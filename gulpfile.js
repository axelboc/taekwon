'use strict';

// Load environment variables (later used by envify) 
require('dotenv').config({ path: 'config/.env' });

// Dependencies
var gulp = require('gulp');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var babelify = require('babelify');
var envify = require('envify');
var cache = require('gulp-cached');
var eslint = require('gulp-eslint');
var nodemon = require('gulp-nodemon');
var uglify = require('gulp-uglify');
var minify = require('gulp-minify-css');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var path = require('path');
var del = require('del');


// Clients
var CLIENTS = ['corner-judge', 'jury-president'];

// Globs
var GLOBS = {
	js: '**/*.js',
	jsx: '**/*.jsx',
	njk: '**/*.njk'
};

// Sets of paths
var SETS = {
	lint: [
		'app.js',
		'gulpfile.js',
		path.join('app', GLOBS.js),
		path.join('tests', GLOBS.js)
	],
	client: [
		path.join('config/.env'),
		path.join('config/config.json'),
		path.join('clients/shared', GLOBS.js),
		path.join('clients/shared', GLOBS.jsx)
	]
};

// Determine the arguments with which to start the server
var args = process.argv.indexOf('--force') !== -1 ? ['--force'] : [];


/**
 * Clear the datastores.
 */
gulp.task('reset', function () {
	del('data/**');
});

/**
 * Lint all scripts.
 * Use gulp-cached to re-lint only files that have changed.
 */
gulp.task('scripts:lint', function() {
	return gulp.src(SETS.lint)
		.pipe(cache('scrips:lint'))
		.pipe(eslint())
		.pipe(eslint.format())
});

/**
 * Build a client script with Browserify.
 * Register one task per client.
 */
CLIENTS.forEach(function (client) {
	gulp.task(client + ':js', function () {
		return browserify({
				entries: path.join('clients', client, 'index.jsx'),
				debug: true,
				extensions: ['.js', '.jsx']
			})
			.transform(babelify.configure({ ignore: [/node_modules/, /vendor/] }))
			.transform(envify)
			.bundle()
			.on('error', gutil.log)
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
			'config'
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
			path.join('clients', client, GLOBS.jsx)
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

gulp.task('default', ['build', 'server', 'watch']);

gulp.task('build', CLIENTS.reduce(function (arr, client) {
	arr.push(client + ':css', client + ':js');
	return arr;
}, ['scripts:lint']));

