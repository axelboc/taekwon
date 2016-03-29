// Dependencies
var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var es = require('event-stream');
var path = require('path');

// Clients
var CLIENTS = [
  'corner-judge',
  'jury-president'
 ];

// Globs
var GLOBS = {
	css: '**/*.css',
	js: '**/*.js'
};


/**
 * ============
 *  MAIN TASKS
 * ============
 */

gulp.task('build', ['build:js']);
gulp.task('watch', ['watch:js']);


/**
 * ===========
 *  SUB-TASKS
 * ===========
 */

/**
 * Bundle client scripts for production.
 * Includes JSX transformation, transpilation from ES6 to ES5, and minification.
 */
gulp.task('build:js', function () {
  var streams = CLIENTS.map(function (client) {
    return browserify({ entries: path.join('clients', client, 'index.js') })
      .transform('babelify', { presets: ['es2015', 'react'] })
      .plugin('minifyify', { map: false })
			.bundle()
			.on('error', gutil.log)
			.pipe(source(client + '.js'))
			.on('error', gutil.log)
			.pipe(gulp.dest('public/js'));
  });
  
  return es.merge.apply(null, streams);
});

/**
 * Watch and bundle client scripts for development.
 * Includes hot module reloading, sourcemaps, JSX transformation, and transpilation from ES6 to ES5.
 */
gulp.task('watch:js', function () {
  var streams = CLIENTS.map(function (client, index) {
    // Create bundler
    var bundler = browserify({
        entries: path.join('clients', client, 'index.js'),
        cache: {}, packageCache: {},
        debug: true
      })
      .transform('babelify', {
        presets: ['es2015', 'react'],
        plugins: [['react-transform', {
          transforms: [{
            transform: 'livereactload/babel-transform',
            imports: ['react']
          }]
        }]]
      })
      .plugin('livereactload', { port: 4474 + index })
      .plugin('watchify');
    
    // Bundling function
    function rebundle() {
      return bundler.bundle()
        .on('error', gutil.log)
        .pipe(source(client + '.js'))
        .pipe(gulp.dest('public/js'));
    }
    
    // Rebundle on update
    bundler.on('update', function() {
      rebundle().on('end', function () {
        gutil.log('Rebundled!');
      });
    });
    
    // Bundle once
    return rebundle();
  });
  
  return es.merge.apply(null, streams);
});
