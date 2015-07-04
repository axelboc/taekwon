'use strict';

// Dependencies
var pkg = require('./package.json');
var gulp = require('gulp');
var browserify = require('browserify');
var hbsfy = require('hbsfy');
var cache = require('gulp-cached');
var jshint = require('gulp-jshint');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var path = require('path');

// Path configurations
var p = {
	jsGlob: '**/*.js',
	cssGlob: '**/*.css',
	app: 'app',
	clients: {
		dir: 'clients',
		jp: 'jury-president',
		cj: 'corner-judge',
		shared: 'shared',
		root: 'root.js',
	},
	clientsDest: 'public/js',
	styles: 'styles',
	tests: 'tests'
};

/**
 * Build a client script.
 */
function buildClientScript(folder) {
	return browserify({
			entries: path.join(p.clients.dir, folder, p.clients.root),
			noParse: ['fastclick', 'tiny-cookie'],
			debug: true
		})
		.transform(hbsfy)
		.bundle()
		.pipe(source(folder + '.js'))
		.pipe(buffer())
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(uglify())
		.on('error', gutil.log)
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest(p.clientsDest));
}

/**
 * Build Jury President client script with Browserify.
 */
gulp.task('scripts:jp', function () {
	return buildClientScript('jury-president');
});

/**
 * Build Corner Judge client script with Browserify.
 */
gulp.task('scripts:cj', function () {
	return buildClientScript('corner-judge');
});

/**
 * Lint all scripts.
 * Use gulp-cached to re-lint only files that have changed.
 */
gulp.task('scripts:lint', function() {
	return gulp.src([
			'app.js',
			'gulpfile.js',
			path.join(p.app, p.jsGlob),
			path.join(p.clients.dir, p.jsGlob),
			path.join(p.tests, p.jsGlob)
		])
		.pipe(cache('scripts:lint'))
		.pipe(jshint(pkg.jshintConfig))
		.pipe(jshint.reporter('default'));
});

/**
 * Re-run tasks when files change.
 */
gulp.task('watch', function () {
	//gulp.watch('templates/*.tmpl.html', ['build']);
});

/**
 * Default task.
 * Run with `gulp`.
 */
gulp.task('default', ['scripts:jp', 'scripts:cj', 'scripts:lint', 'watch']);
