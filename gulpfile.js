var gulp = require('gulp');
//html压缩
var htmlmin = require('gulp-htmlmin');
var htmlclean = require('gulp-htmlclean');
//js压缩
var jsmin = require('gulp-jsmin');
var uglify = require('gulp-uglify');
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
gulp.task('htmlmin', function(){
    var options = {
        removeComments: true,//清除HTML注释
        collapseWhitespace: true,//压缩HTML
        collapseBooleanAttributes: true,//省略布尔属性的值 <input checked="true"/> ==> <input />
        removeEmptyAttributes: true,//删除所有空格作属性值 <input id="" /> ==> <input />
        removeScriptTypeAttributes: true,//删除<script>的type="text/javascript"
        removeStyleLinkTypeAttributes: true,//删除<style>和<link>的type="text/css"
        minifyJS: true,//压缩页面JS
        minifyCSS: true//压缩页面CSS
    };
  gulp.src(datas.html)
  .pipe(htmlclean())
  .pipe(htmlmin(options).on('error', function(e){
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
    .pipe(uglify().on('error', function(e){
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
gulp.task("default",["htmlmin","imagemin","jsmin","cssmin"]);