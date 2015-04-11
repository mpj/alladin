var gulp = require('gulp');
var babel = require('gulp-babel');
var fs = require('fs');
var exec = require('child_process').exec;
var watch = require('gulp-watch');
var mocha = require('gulp-mocha');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var plumber = require('gulp-plumber');

gulp.task('compile', function() {
  return gulp
    .src('src/**/*.js')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(babel({ stage: 0 }))
    .pipe(sourcemaps.write('.'))
    .on("error", function (err) { console.log("Error : " + err.message); this.emit('end') })
    .pipe(gulp.dest('build'));
})


gulp.task('mocha', ['compile'], function () {
    return gulp.src(['build/unit-test.js'], {read: false})
        .pipe(mocha({reporter: 'spec'}));
});


gulp.task('mocha-mongo', ['compile'], function () {
    return gulp.src(['build/mongo-test.js'], {read: false})
        .pipe(mocha({reporter: 'spec'}));
});



gulp.task('watch', function () {
  watch(['*.js'], function () {
    gulp.start('mocha');
  });
  gulp.start('mocha');
});

gulp.task('watch-mongo', function () {
  watch(['*.js'], function () {
    gulp.start('mocha-mongo');
  });
  gulp.start('mocha-mongo');
});
