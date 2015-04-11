var gulp = require('gulp');
var babel = require('gulp-babel');
var fs = require('fs');
var exec = require('child_process').exec;
var watch = require('gulp-watch');
var mocha = require('gulp-mocha');

gulp.task('compile', function() {
  return gulp
    .src('unit-test.js')
    .pipe(babel({ stage: 0 }))
    .on("error", function (err) { console.log("Error : " + err.message); this.emit('end') })
    .pipe(gulp.dest('build/'));
})


gulp.task('mocha', ['compile'], function () {
    return gulp.src('build/unit-test.js', {read: false})
        .pipe(mocha({reporter: 'nyan'}));
});



gulp.task('watch', function () {
  watch(['*.js'], function () {
    gulp.start('mocha');
  });
});
