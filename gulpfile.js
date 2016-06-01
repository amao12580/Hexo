var gulp = require('gulp');
//html压缩
var minifyHtml = require("gulp-minify-html");
//js压缩
var jsmin = require('gulp-jsmin');
//文件重命名
var rename = require('gulp-rename');
//图片压缩png/jpg/gif
var imagemin = require('gulp-imagemin');
//png压缩
var pngquant = require('imagemin-pngquant');
//css压缩
var csso = require('gulp-csso');
var root = "./public";
var buildDir = root;
var datas={
    html:[root+"/**/*.html"],
    image:[root+"/**/*.png"],
    css:[root+"/**/*.css"],
    js:[root+"/**/*.js",'!*min.js']
}
// 压缩html
gulp.task('minifyHtml', function () {
    gulp.src(datas.html)
    .pipe(minifyHtml().on('error', function(e){
            console.log(e);
         }))
    .pipe(gulp.dest(buildDir));
});
// png图片压缩
gulp.task("imagemin",function(){
    gulp.src(datas.image)
    .pipe(imagemin({
        progressive:true,
        svgoPlugins:[{removeViewBox:false}],
        use:[pngquant()] //压缩率64%
    }).on('error', function(e){
            console.log(e);
         }))
    .pipe(gulp.dest(buildDir));
});
// js压缩
gulp.task("jsmin",function(){
    gulp.src(datas.js)
    .pipe(jsmin().on('error', function(e){
         console.log(e);
    }))
    //.pipe(rename({suffix:'.min'}))
    .pipe(gulp.dest(buildDir));
});
// css压缩
gulp.task("cssmin",function(){
    gulp.src(datas.css)
    .pipe(csso().on('error', function(e){
        console.log(e);
     }))
    .pipe(gulp.dest(buildDir));
});
gulp.task("default",["minifyHtml","imagemin","jsmin","cssmin"]);