---
title: 如何更开心的写博客？
date: 2016年6月17日15:52:04
tags:
    - GitHub
    - Git
    - Windows
    - Powershell
    - Gulp
categories:
    - Tutorial
description: 不知不觉中，在GitHub Pages写博客快有半年了，工作一直比较忙，但还是想在闲暇更新。既想锻炼自己的文字能力，也反向促使自己思考更多，博客愈发繁茂时，读者也多了，这更给了我继续下去的动力。Keep Moving！习惯了利用碎片化的时间来更新blog，但是回头想想，每次发布blog的过程是比较繁琐的。如何解放自己，专注于写文章呢？现在就让我们一起好好利用Powershell脚本吧！

---

# 写在前面

不知不觉中，在GitHub Pages写博客快有半年了，工作一直比较忙，但还是想在闲暇更新。既想锻炼自己的文字能力，也反向促使自己思考更多，博客愈发繁茂时，读者也多了，这更给了我继续下去的动力。Keep Moving！习惯了利用碎片化的时间来更新blog，但是回头想想，每次发布blog的过程是比较繁琐的。如何解放自己，专注于写文章呢？现在就让我们一起好好利用Powershell脚本吧！

最开始主要依靠图形界面进行blog发布，来看看有哪些操作吧！

```
在windows DOS下的步骤是：

1.按下“win”+“R”键

2.在打开的对话框中输入“cmd”

3.在打开的黑窗口中输入：
Microsoft Windows [版本 6.1.7601]
版权所有 (c) 2009 Microsoft Corporation。保留所有权利。

C:\Users\Administrator>D:

D:\>cd GitHub

D:\GitHub>cd Hexo

D:\GitHub\Hexo>hexo g
INFO  Start processing
INFO  Files loaded in 2.14 s
INFO  Generated: atom.xml
INFO  Generated: search.xml
INFO  Generated: sitemap.xml
INFO  Generated: about/index.html
INFO  Generated: tags/index.html
INFO  Generated: categories/index.html
INFO  Generated: post/2016/06/What-is-a-transaction/index.html
.........//都是一些HTML Generated信息，就不贴出了。


INFO  119 files generated in 4.33 s

3.清理不必要的文件：将文件夹D:\GitHub\Hexo\public\vendors删除

4.将D:\GitHub\Hexo\public文件夹拷贝到发布文件夹D:\GitHub\amao12580.github.io

5.使用GitHub For Windows可视化工具进行提交和同步。
```

整个过程大约需要10分钟，因为很多都在图形化界面中操作，感觉效率很低。起初的想法是在DOS下做一个批处理，以下是我之前实际在用的命令。

```
//一整行实在不美观，折行让大家看得舒服点！

cd D:\GitHub\Hexo & hexo clean & hexo g
& rd D:\GitHub\Hexo\public\vendors /S /Q
& gulp
& XCOPY D:\GitHub\Hexo\public\*.* D:\GitHub\amao12580.github.io /Q /D /E /C /Y
& hexo s

```
如你所想，还差了最后向github提交呢？并且还不够自动化，需要手动在DOS触发，这明显不符合极客范啊！

# gulp
Gulp是一个构建系统，它能通过自动执行常见任务，比如编译预处理CSS，压缩JavaScript和刷新浏览器，来改进网站开发的过程。我主要使用gulp来压缩CSS、HTML、javascript、images。加速blog的访问速度，效果还是很好的！在这里贴一下我在用的gulpfile.js，放在D:\GitHub\Hexo目录下就可以了。还是很好使的，直接给压缩了20%体积。

目前访问速度还算可以了，想进一步优化，需要自建VPS，用Nginx合并一些请求（[nginx-http-concat](https://github.com/alibaba/nginx-http-concat) 模块），别忘了Nginx还可以缓存静态资源哦！

```
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
var cache = require('gulp-cache');
//css压缩
var csso = require('gulp-csso');

var root = "./public";
var buildDir = root;
var datas={
    html:[root+"/**/*.html"],
    image:[root+"/**/*.{png,jpg,jpeg,gif,ico}"],
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
        optimizationLevel: 7, //类型：Number  默认：3  取值范围：0-7（优化等级）
        progressive: true, //类型：Boolean 默认：false 无损压缩jpg图片
        interlaced: true, //类型：Boolean 默认：false 隔行扫描gif进行渲染
        multipass: true, //类型：Boolean 默认：false 多次优化svg直到完全优化
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

```

# Powershell

想起了windows 7环境已经支持powershell（增强版DOS！），试想如果有一个ps1脚本可以完成发布blog，再配合windows计划任务，不就可以定时或按用户动作触发了吗？YES，这才是我想要的，不啰嗦，开始干吧！

PS：脚本运行之前，别忘了装一个：Git-2.9.0-64-bit.exe，然后配置好自己的github信息。
```
配置完成后的验证：ssh -T git@github.com
如果提示：Hi *** You've successfully authenticated, but GitHub does not provide shell access. 说明你连接成功了
```

设置PowerShell环境，使能“allow scripts to run”选项，步骤如下：
以管理员的身份运行PowerShell
执行Set-ExecutionPolicy RemoteSigned命令，在对话框中选择Y，如下
```
PS C:\Windows\system32> Set-ExecutionPolicy RemoteSigned
执行策略更改
执行策略可帮助你防止执行不信任的脚本。更改执行策略可能会产生安全风险，如 http://go.microsoft.com/fwlink/?LinkID=135170
中的 about_Execution_Policies 帮助主题所述。是否要更改执行策略?
[Y] 是(Y)  [N] 否(N)  [S] 挂起(S)  [?] 帮助 (默认值为“Y”): Y
PS C:\Windows\system32>
```

Finally，一起来看看我的“syncArticle.ps1”，遇到无数坑（语句块是大坑！），不过还是被我搞定了！

'D:\Program Files\Git\bin\git.exe'是我的Git安装目录。

```
cd D:\GitHub\Hexo
hexo g --silent
Remove-Item D:\GitHub\Hexo\public\vendors\* -recurse
Remove-Item D:\GitHub\Hexo\public\vendors -recurse
gulp --silent
XCOPY D:\GitHub\Hexo\public\*.* D:\GitHub\amao12580.github.io /Q /D /E /C /Y
cd D:\GitHub\amao12580.github.io
& 'D:\Program Files\Git\bin\git.exe' add .
& 'D:\Program Files\Git\bin\git.exe' commit -m "Auto commit by powershell script."
& 'D:\Program Files\Git\bin\git.exe' push -f origin master
exit
```

在windows计划任务管理，我已经配置好，每晚10点，自动发布有更新的blog啦！来看看导出的windows计划任务XML文件吧！

PC-201402281156\Administrator，这是我的主机名和用户名。

```

<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Date>2016-06-15T17:08:16.1670287</Date>
    <Author>PC-201402281156\Administrator</Author>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2016-06-15T22:00:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>PC-201402281156\Administrator</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>true</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT10M</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>powershell</Command>
      <Arguments>D:\GitHub\syncArticle.ps1</Arguments>
      <WorkingDirectory>D:\GitHub</WorkingDirectory>
    </Exec>
  </Actions>
</Task>

```

如下图所示，用户可以手动触发定时任务，来看看运行结果吧！点击历史记录还可以查看每次任务计划的运行情况呢！

![](/img/windowsPlanTask.png)

现在我的blog就可以每晚10点自动发布到github了，终于可以专注于写文章了！