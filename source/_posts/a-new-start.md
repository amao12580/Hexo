---
title: '从零开始Blogging with Hexo教程'
date: 2016年3月21日11:16:03
tags:
    - GitHub
    - Hexo
    - Jacman
    - Markdown
categories:
    - Tutorial
description: 刚开始折腾时，经常出现改了很多配置，一运行就报错了，但是无法定位是哪些配置的改动导致的？幸好我用Sublime Text 3修改的，有历史记录，这点真是太赞了！Hexo配置好后，最好做一次网盘私密备份，以免主机故障丢失。而且有了备份，在家或在公司，都可以愉快的写blog啦！
---

# 写在前面 #

　　转眼间3月份也即将过去了，在接受了众多的理论输入以及实践之后，决定要将一些值得分享的事情记录下来，一方面是避免自己重复的掉坑，另一方面也希望通过blog的方式锻炼自己的文字能力。输入+沉淀+输出，形成自我知识攫取过程的闭环。

　　下面记录从零开始的Blogging with Hexo的搭建过程，有一些简单的问题，在文末也会给出答案。

## 1.你将要做什么？
　　跟我一起在GiHub上搭建免费无限流量博客，不限速，有版本追溯管理。sadly，免费的背后是低层次的服务。搭建的博客服务器在国外，国内访问的速度没法保障，后文会给出一定的解决方案。内容的维护只能以静态Html的方式发布，意味着没有数据库，因此带来了幂等性，没有各种Web攻击，算作是一件好事？

　　搭建过程中需要的技术：GitHub的使用、安装NodeJS、安装Hexo及系列插件、安装及配置Jacman主题、新文章的发布、Markdown的持续提高。
### 1.1国内blog平台的现状
国内的技术blog平台主要有：cnblogs、51cto、iteye、oschina、infoq等；排名没分先后，纯属个人想法。相信以上blogs，作为技术人，大家一定不陌生。平台型的blog，对个人的有利有弊，优势在于：免去软硬件维护管理的麻烦、不用担心流量和各种安全问题、；劣势也比较明显：内容版权、变现很困难、内容受限、内容面临下线风险

引用[阮一峰先生的总结](http://www.ruanyifeng.com/blog/2012/08/blogging_with_jekyll.html)：

1. 第一阶段，刚接触Blog，觉得很新鲜，试着选择一个免费空间来写。
2. 第二阶段，发现免费空间限制太多，就自己购买域名和空间，搭建独立博客。
3. 第三阶段，觉得独立博客的管理太麻烦，最好在保留控制权的前提下，让别人来管，自己只负责写文章。

即技术人对于blog的核心需求是：发布文章、维护文章、随时控制、免去其他管理，也就是输出可控的文章。

### 1.2如何选择适合自己的blog平台
国内的blog平台少有让人长期安心逗留的，各种内容审查政策的强压，大环境的逐利性等因素，促使少有blog平台保持良心的同时持续改进其平台，在此不多言。
我们希望发出的文章，可以进入一个技术人大都汇聚的环境中，以提高影响力。这样的环境可以是个人blog、blogs平台、微信平台等等。如果你有足够的影响力，也希望在作者与读者之间建立交流通道，常见的就是文章的评论回复功能了，其他的也有读者QQ群等社区型交流方式。引申的说，对于不怀好意的评论者，还需要一个评论审核的功能，甚至禁止评论，这都能在下文中得到解决。

### 1.3为什么是Hexo？
我们怎么评价Hexo？

知乎：[jekyll vs Hexo](https://www.zhihu.com/question/19996679)
## 2.如何做？
### 2.1安装和配置NodeJS
1. 确认你的配置是windows 7，虽然没有限制一定要windows，但是本教程基于windows。![我的系统环境](/img/计算机软硬件配置.png)。

2. [安装NodeJS](http://www.runoob.com/nodejs/nodejs-install-setup.html)
我的安装完成目录：

![](/img/NodeJS安装完成.png)

3. [解决npm安装模块慢或失败的问题](http://www.cnblogs.com/enix/p/3635343.html)
```
npm config set registry="http://registry.npmjs.org"//设置npm源地址
```
确认你的npm配置：

![](/img/npm配置信息.png)

### 2.2获取GitHub账号
GitHub账号和GitHub Pages 一般都应该有吧，已有的请自动无视这一部分。
### 2.2yourname.github.io
* 首先注册一个『GitHub』帐号，已有的默认默认请忽略
* 建立与你用户名对应的仓库，仓库名必须为『your_user_name.github.com』

### 2.3安装和配置windows GitHub客户端
不建议在[GitHub官网](https://desktop.github.com/)下载最新客户端，官网下载的客户端大小不到1MB，在本地运行还需要链接Amazon下载具体的安装包，因为国内网络环境，经常下载到一半就断掉.

我个人试了各种方法不得解，最后找到了离线安装版：已存入百度云：链接：http://pan.baidu.com/s/1eRmoG6Y 密码：3vus

因为版本控制工具比较耗系统资源，请尽量安装在非系统所在盘，尽量选择剩余容量大的盘。
安装完成后，得到2个桌面图标：GitHub、Git Shell。前者是可视化版，后者是命令行版。

我选择使用GitHub,打开后进行GitHub账号登录，第一次登录成功后，绑定邮箱会收到新邮件：[GitHub] A new public key was added to your account

点击左上角“+”号，选择clone，选择自己的yourname.github.io。
在下一步中选择存放文件夹，我的选择是：
![](/img/github目录.png)

简单的使用windows GitHub客户端

```
在对话框顶部有“No uncommitted changes”和“History”，点击后可以进行切换。
在版本库所在的文件夹有了文件变化后，这里会有变化“28 uncommitted changes”和“History”，28是指的未提交的更改数量。
填写Summary和Description后，可以进行本地提交：Commit to master。
此时若还想提交到远程GitHub服务器，点击右上角“Sync”按钮进行同步。
```

### 2.4安装和配置Hexo

安装和初始化Hexo
```
$ cd /d/
$ mkdir hexo
$ cd hexo
$ npm install -g hexo
$ hexo init
$ hexo g # 或者hexo generate
$ hexo s # 或者hexo server，可以在http://localhost:4000/查看
```
![](/img/hexo安装目录.png)

安装
```
$ hexo clean
$ git clone https://github.com/wuchong/jacman.git themes/jacman
```
![](/img/jacman主题安装目录.png)


常用命令
```
hexo n "我的博客" == hexo new "我的博客" #新建文章
hexo p == hexo publish
hexo g == hexo generate#生成
hexo s == hexo server #启动服务预览
hexo d == hexo deploy#部署
```

部署文章到github.io
```
hexo clean
hexo g
拷贝Hexo文件夹下的public文件夹里的所有文件
粘贴到yourname.github.io所在磁盘目录中，我的目录是：D:\GitHub\amao12580.github.io
使用GitHub客户端进行提交到远程服务器
打开yourname.github.io网址即可看到效果啦！
```

### 2.5为什么是Jacman?

参见评价[Jacman基于Pacman修改的Hexo主题](http://wsgzao.github.io/post/hexo-jacman/)

### 2.6私人定制
在这里贴出我修改过的一些文件，很多修改都给出了备注。

Hexo主配置文件：D:\GitHub\Hexo\\_config.yml
```
# Hexo Configuration
## Docs: https://hexo.io/docs/configuration.html
## Source: https://github.com/hexojs/hexo/

# Site
title: Cat's Blog
subtitle: 一饮一啄，莫非前定.
#为了更便于搜索引擎爬到，添加了网站的keywords
keywords: cat's,chengliang,amao12580,blog,developers
description: Follw the https://xuanwo.org/2015/03/26/hexo-intor/
author: Steven Cheng
language: zh-CN
timezone:

# URL
## If your site is put in a subdirectory, set url as 'http://yoursite.com/child' and root as '/child/'
url: http://amao12580.github.io
root: /
permalink: post/:year/:month/:title/
permalink_defaults:

# Directory
source_dir: source
public_dir: public
tag_dir: tags
about_dir: about
archive_dir: archives
category_dir: categories
code_dir: downloads/code
i18n_dir: :lang
skip_render:
  - README.md
  - 404.html

# Writing
new_post_name: :title.md # File name of new posts
default_layout: post
titlecase: false # Transform title into titlecase
external_link: true # Open external links in new tab
filename_case: 0
render_drafts: false
post_asset_folder: false
relative_link: false
future: true
highlight:
  enable: true
  line_number: true
  auto_detect: false
  tab_replace:

# Category & Tag
default_category: uncategorized
category_map:
tag_map:

# Date / Time format
## Hexo uses Moment.js to parse and display date
## You can customize the date format as defined in
## http://momentjs.com/docs/#/displaying/format/
date_format: YYYY-MM-DD
time_format: HH:mm:ss
datetime_format: YYYY-MM-DD HH:mm:ss.SSS

# Pagination
## Set per_page to 0 to disable pagination
per_page: 10
pagination_dir: page

# Extensions
## Plugins: https://hexo.io/plugins/
## Themes: https://hexo.io/themes/
theme: jacman
stylus:
  compress: true

# Deployment
## Docs: https://hexo.io/docs/deployment.html
deploy:
  type:


# Others
index_generator:
  per_page: 5 ##首页默认10篇文章标题 如果值为0不分页

archive_generator:
    per_page: 0 ##归档页面默认10篇文章标题
    yearly: true  ##生成年视图
    monthly: true ##生成月视图

tag_generator:
    per_page: 0 ##标签分类页面默认10篇文章

category_generator:
    per_page: 0 ###分类页面默认10篇文章

feed:
    type: atom ##feed类型 atom或者rss2
    path: atom.xml ##feed路径
    limit: 20  ##feed文章最小数量

#访问zipperary/sitemap.xml即可看到站点地图。不过，sitemap的初衷是给搜索引擎看的，为了提高搜索引擎对自己站点的收录效果，我们最好手动到google和百度等搜索引擎提交sitemap.xml。
#sitemap
sitemap:
  - path: sitemap.xml

baidusitemap:
 - path: baidusitemap.xml
```

Jacman主题的主配置文件：D:\GitHub\Hexo\themes\jacman\ _config.yml
```
##### Menu
menu:
  主页 | Home: /
  索引 | Index: /index
  归档 | Archives: /archives
  简介 | About: /about
## you can create `tags` and `categories` folders in `../source`.
## And create a `index.md` file in each of them.
## set `front-matter`as
## layout: tags (or categories)
## title: tags (or categories)
## ---

#### Widgets
widgets:
- github-card
- category
- tag
- links
- douban
- rss
- weibo
  ## provide eight widgets:github-card,category,tag,rss,archive,tagcloud,links,weibo



#### RSS
rss: /atom.xml ## RSS address.

#### Image
imglogo:
  enable: true             ## display image logo true/false.
  src: img/logo.png        ## `.svg` and `.png` are recommended,please put image into the theme folder `/jacman/source/img`.
favicon: img/favicon.ico   ## size:32px*32px,`.ico` is recommended,please put image into the theme folder `/jacman/source/img`.
apple_icon: img/jacman.jpg ## size:114px*114px,please put image into the theme folder `/jacman/source/img`.
author_img: img/author.jpg ## size:220px*220px.display author avatar picture.if don't want to display,please don't set this.
banner_img: #img/banner.jpg ## size:1920px*200px+. Banner Picture
### Theme Color
theme_color:
    theme: '#2ca6cb'    ##the defaut theme color is blue

# 代码高亮主题
# available: default | night
highlight_theme: night

#### index post is expanding or not
index:
  expand: false           ## default is unexpanding,so you can only see the short description of each post.
  excerpt_link: Read More

close_aside: true  #close sidebar in post page if true
mathjax: true      #enable mathjax if true

### Creative Commons License Support, see http://creativecommons.org/
### you can choose: by , by-nc , by-nc-nd , by-nc-sa , by-nd , by-sa , zero
creative_commons: none

#### Author information
author:
  intro_line1:  "Hello ,I'm steven. This is my blog on GitHub."    ## your introduction on the bottom of the page
  intro_line2:  "Whenever you feel like criticizing any one, just remember that all the people in this world haven’t had the advantages that you’ve had."  ## the 2nd line
  intro_line3: "每当你觉得想要批评什么人的时候，你切要记着，这个世界上的人并非都具备你禀有的条件。《了不起的盖茨比》"
  weibo: 3201133445     ## e.g. wuchong1014 or 2176287895 for http://weibo.com/2176287895
  weibo_verifier: b3593ceb    ## e.g. b3593ceb Your weibo-show widget verifier ,if you use weibo-show it is needed.
  tsina:      ## e.g. 2176287895  Your weibo ID,It will be used in share button.
  douban:     ## e.g. wuchong1014 or your id for https://www.douban.com/people/wuchong1014
  zhihu:      ## e.g. jark  for http://www.zhihu.com/people/jark
  email : chengliangchengliang888@gmail.com     ## e.g. imjark@gmail.com
  twitter:    ## e.g. jarkwu for https://twitter.com/jarkwu
  github: amao12580     ## e.g. wuchong for https://github.com/wuchong
  facebook:   ## e.g. imjark for https://facebook.com/imjark
  linkedin:   ## e.g. wuchong1014 for https://www.linkedin.com/in/wuchong1014
  google_plus:    ## e.g. "111190881341800841449" for https://plus.google.com/u/0/111190881341800841449, the "" is needed!
  stackoverflow:  ## e.g. 3222790 for http://stackoverflow.com/users/3222790/jark
## if you set them, the corresponding  share button will show on the footer

#### Toc
toc:
  article: true   ## show contents in article.
  aside: true     ## show contents in aside.
## you can set both of the value to true of neither of them.
## if you don't want display contents in a specified post,you can modify `front-matter` and add `toc: false`.

#### Links
links:
  码农圈: https://coderq.com,一个面向程序员交流分享的新一代社区
  Jark's Blog: http://wuchong.me
  GitHub: https://github.com/amao12580



#### Comment
duoshuo_shortname: amao12580   ## e.g. wuchong   your duoshuo short name.
disqus_shortname:     ## e.g. wuchong   your disqus short name.

#### Share button
jiathis:
  enable: false ## if you use jiathis as your share tool,the built-in share tool won't be display.
  id:    ## e.g. 1889330 your jiathis ID.
  tsina: ## e.g. 2176287895 Your weibo id,It will be used in share button.

#### Analytics
google_analytics:
  enable: true
  id: UA-75497011-1        ## e.g. UA-46321946-2 your google analytics ID.
  site: http://amao12580.github.io      ## e.g. wuchong.me your google analytics site or set the value as auto.
## You MUST upgrade to Universal Analytics first!
## https://developers.google.com/analytics/devguides/collection/upgrade/?hl=zh_CN
baidu_tongji:
  enable: true
  sitecode: e6d1f421bbc9962127a50488f9ed37d1 ## e.g. e6d1f421bbc9962127a50488f9ed37d1 your baidu tongji site code
cnzz_tongji:
  enable: false
  siteid:    ## e.g. 1253575964 your cnzz tongji site id
ibruce_tongji: # 不蒜子计数
  enable: true

#### Miscellaneous
ShowCustomFont: true  ## you can change custom font in `variable.styl` and `font.styl` which in the theme folder `/jacman/source/css`.
fancybox: true        ## if you use gallery post or want use fancybox please set the value to true.
totop: true           ## if you want to scroll to top in every post set the value to true


#### Custom Search
google_cse:
  enable: false
  cx:   ## e.g. 018294693190868310296:abnhpuysycw your Custom Search ID.
## https://www.google.com/cse/
## To enable the custom search You must create a "search" folder in '/source' and a "index.md" file
## set the 'front-matter' as
## layout: search
## title: search
## ---
baidu_search:     ## http://zn.baidu.com/
  enable: false
  id:   ## e.g. "783281470518440642"  for your baidu search id
  site: http://zhannei.baidu.com/cse/search  ## your can change to your site instead of the default site

tinysou_search:     ## http://tinysou.com/
  enable: false
  id:  ## e.g. "4ac092ad8d749fdc6293" for your tiny search id
```

Jacman主题布局配置文件：D:\GitHub\Hexo\themes\jacman\layout\layout.ejs

```
<% if (page.layout=='post' || page.layout=='photo'){ %>
 <%- partial('_partial/head') %>
  <body>
    <header>
      <%- partial('_partial/header') %>
    </header>
    <div id="container">
      <%- body %>
      <%- partial('_partial/sidebar',{item: page,table: true}) %>
    </div>
    <footer><%- partial('_partial/footer') %></footer>
    <%- partial('_partial/after_footer') %>
  </body>
</html>
<% } else if(page.layout=='page'){ %>
  <% if(page.source.match(/\.md$/)){ %>
    <%- partial('_partial/head') %>
      <body>
        <header>
          <%- partial('_partial/header') %>
        </header>
        <div id="container">
          <%- body %>
        </div>
        <footer><%- partial('_partial/footer') %></footer>
        <%- partial('_partial/after_footer') %>
      </body>
     </html>
     <% }else{ %>
    <%- page.content %>
  <% } %>
<% } else if(page.layout=='search'){ %>
<%- partial('_partial/head') %>
    <body>
      <header>
        <%- partial('_partial/header') %>
      </header>
      <div id="container">
        <%- partial('_partial/search')%>
      </div>
      <footer><%- partial('_partial/footer') %></footer>
      <%- partial('_partial/after_footer') %>
    </body>
   </html>
<% } else if(page.layout=='tags'){ %>
 <%- partial('_partial/head') %>
    <body>
      <header>
        <%- partial('_partial/header') %>
      </header>
      <div id="container">
          <%- partial('_partial/tags')%>
      </div>
      <footer><%- partial('_partial/footer') %></footer>
      <%- partial('_partial/after_footer') %>
    </body>
   </html>
<% } else if(page.layout=='categories'){ %>
 <%- partial('_partial/head') %>
    <body>
      <header>
        <%- partial('_partial/header') %>
      </header>
      <div id="container">
          <%- partial('_partial/categories')%>
      </div>
      <footer><%- partial('_partial/footer') %></footer>
      <%- partial('_partial/after_footer') %>
    </body>
   </html>
<% } else if(page.category!=null||page.tag!=null||page.archive!=null) { %>
  <%- partial('_partial/head') %>
    <body>
      <header>
        <%- partial('_partial/header') %>
      </header>
      <div id="container">
        <%- body %>
      </div>
      <footer><%- partial('_partial/footer') %></footer>
      <%- partial('_partial/after_footer') %>
    </body>
   </html>
<% } else { %>
 <%- partial('_partial/head') %>
  <body>
    <header>
      <%- partial('_partial/header') %>
    </header>
    <div id="container">
      <%- body %>
      <%- partial('_partial/sidebar',{item: page,table: false}) %>
    </div>
    <footer><%- partial('_partial/footer') %></footer>
    <%- partial('_partial/after_footer') %>
    <a href="https://github.com/amao12580"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://camo.githubusercontent.com/38ef81f8aca64bb9a64448d0d70f1308ef5341ab/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f6461726b626c75655f3132313632312e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_right_darkblue_121621.png"></a>
  </body>
 </html>
<% } %>
```
Jacman主题页面尾部配置文件：D:\GitHub\Hexo\themes\jacman\layout\\_partial\footer.ejs
```
<div id="footer" >
    <% if(theme.author_img){ %>
    <div class="line">
        <span></span>
        <div class="author"></div>
    </div>
    <%; } %>
    <% if(theme.author.intro_line1 || theme.author.intro_line2){ %>
    <section class="info">
        <p> <%= theme.author.intro_line1 %> <br/>
            <%= theme.author.intro_line2 %></p>
    </section>
     <%; } %>
    <div class="social-font" class="clearfix">
        <% if(theme.author.weibo){ %>
        <a href="http://weibo.com/<%= theme.author.weibo %>" target="_blank" class="icon-weibo" title="微博"></a>
        <%; } %>
        <% if(theme.author.github){ %>
        <a href="https://github.com/<%=theme.author.github %>" target="_blank" class="icon-github" title="github"></a>
        <%; } %>
        <% if(theme.author.stackoverflow){ %>
        <a href="http://stackoverflow.com/users/<%=theme.author.stackoverflow %>" target="_blank" class="icon-stack-overflow" title="stackoverflow"></a>
        <%; } %>
        <% if(theme.author.twitter){ %>
        <a href="https://twitter.com/<%=theme.author.twitter %>" target="_blank" class="icon-twitter" title="twitter"></a>
        <%; } %>
        <% if(theme.author.facebook){ %>
        <a href="https://www.facebook.com/<%=theme.author.facebook %>" target="_blank" class="icon-facebook" title="facebook"></a>
        <%; } %>
        <% if(theme.author.linkedin){ %>
        <a href="https://www.linkedin.com/in/<%=theme.author.linkedin %>" target="_blank" class="icon-linkedin" title="linkedin"></a>
        <%; } %>
        <% if(theme.author.douban){ %>
        <a href="https://www.douban.com/people/<%=theme.author.douban %>" target="_blank" class="icon-douban" title="豆瓣"></a>
        <%; } %>
        <% if(theme.author.zhihu){ %>
        <a href="http://www.zhihu.com/people/<%=theme.author.zhihu %>" target="_blank" class="icon-zhihu" title="知乎"></a>
        <%; } %>
        <% if(theme.author.google_plus){ %>
        <a href="https://plus.google.com/<%=theme.author.google_plus %>?rel=author" target="_blank" class="icon-google_plus" title="Google+"></a>
        <%; } %>
        <% if(theme.author.email){ %>
        <a href="mailto:<%=theme.author.email %>" target="_blank" class="icon-email" title="Email Me"></a>
        <%; } %>
    </div>
            <%  Array.prototype.S=String.fromCharCode(2);
              Array.prototype.in_array=function(e){ var r=new RegExp(this.S+e+this.S); return (r.test(this.S+this.join(this.S)+this.S)); };
                var cc = new Array('by','by-nc','by-nc-nd','by-nc-sa','by-nd','by-sa','zero'); %>
        <% if (cc.in_array(theme.creative_commons) ) { %>
                <div class="cc-license">
          <a href="http://creativecommons.org/licenses/<%= theme.creative_commons %>/4.0" class="cc-opacity" target="_blank">
            <img src="<%- config.root %>img/cc-<%= theme.creative_commons %>.svg" alt="Creative Commons" />
          </a>
        </div>
    <%; } %>

        <p class="copyright">
        © <%= new Date().getFullYear() %>
        <% if (config.author) { %>
        <a href="<%= config.root %>about" target="_blank" title="<%= config.author %>"><%= config.author %></a>
        <%; } else { %>
        <a href="<%= config.url %>" title="<%= config.title %>"><%= config.title %></a>
        <%; } %>

        <!-- 不蒜子统计 -->
<% if (theme.ibruce_tongji.enable){ %>
<script async src="https://dn-lbstatics.qbox.me/busuanzi/2.3/busuanzi.pure.mini.js"></script>
<span id="busuanzi_container_site_pv" style='display:none'>
本站总访问量<span id="busuanzi_value_site_pv"></span>,本站访客数<span id="busuanzi_value_site_uv"></span>，本文总阅读量<span id="busuanzi_value_page_pv"></span>
</span>
<%; } %>
        </p>
</div>

```

### 2.7备份的重要性
刚开始折腾时，经常出现改了很多配置，一运行就报错了，但是无法定位是哪些配置的改动导致的？
幸好我用Sublime Text 3修改的，有历史记录，这点真是太赞了！给你要的[链接](http://pan.baidu.com/s/1pLnDKW7)，密码：3ook

Hexo配置好后，最好做一次网盘私密备份，以免主机故障丢失。而且有了备份，在家或在公司，都可以愉快的写blog啦！

## 3.可能遇到的问题及答案
1.hexo系列命令无法执行：
```
D:\GitHub> hexo c
Usage: hexo <command>

Commands:
  help     Get help on a command.
  init     Create a new Hexo folder.
  version  Display version information.

Global Options:
  --config  Specify config file instead of using _config.yml
  --cwd     Specify the CWD
  --debug   Display all verbose messages in the terminal
  --draft   Display draft posts
  --safe    Disable all plugins and scripts
  --silent  Hide output on console

For more help, you can use 'hexo help [command]' for the detailed information
or you can check the docs: http://hexo.io/docs/
```

解决：请切换目录到Hexo安装目录后再执行。这是因为Hexo没有全局环境配置的问题。
```
 cd .\Hexo
```
2.关于404页面的处理
搜索很多关于404页面的资料，都是把配置好的404.html，每次在hexo g命令后手工放在hexo的public目录下。这样子有个缺点，每次都需要手工操作一次，这对于程序员来说是极其不人道的，我想到一个点子：
```
将404.html文件放在hexo的source目录下
在hexod的全局配置文件:_config.yml，配置skip_render
skip_render:
  - README.md
  - 404.htm
```

3.如何在文章中插入图片？
```
在Hexo的source文件夹下，建一个文件夹“img”
将想要插入到文章的图片，放到img文件夹下，图片最好是png格式，文件小而且不变形
使用示例：![图片的名字](/img/图片001.png)
```

4.如何在文章中插入代码段？
将需要显示为代码段的内容，用\`\`\`前后包裹住
![](/img/代码段.png)

显示的效果是：
```
代码段1
代码段2
```