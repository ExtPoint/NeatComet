var gulp = require('gulp');

var plugins = {
    concat: require('gulp-concat'),
    sourcemaps: require('gulp-sourcemaps'),
    uglify: require('gulp-uglify'),
};

var config = {

    dist: 'dist/',

    serverFiles: [
        './src/lib/Object.js',
        './src/lib/Exception.js',
        './src/lib/**/*Client.js'
    ],

    clientFiles: [
        './src/lib/Object.js',
        './src/lib/Exception.js',
        './src/lib/**/*Server.js'
    ]
};

function process(src, dst, compress) {

    var stream = gulp.src(src);

    stream = stream.pipe(plugins.sourcemaps.init())
        .pipe(plugins.concat(dst));

    if (compress) {
        stream = stream.pipe(plugins.uglify())
    }

    stream
        .pipe(plugins.sourcemaps.write('.'))
        .pipe(gulp.dest(config.dist));
}

gulp.task('build', function () {

    process(config.serverFiles, 'server.js');
    process(config.clientFiles, 'neat-comet-client.js');
    process(config.clientFiles, 'neat-comet-client.min.js', true);
});

gulp.task('default', function () {
    gulp.watch([config.serverFiles, config.clientFiles], ['build']);
});
