---
title: Nginx与Docker容器系列 - 2.在生产环境的实践
date: 2016-04-28 12:45:59
tags:
    - Nginx
    - Keepalived
    - Docker
    - MicroKernel
    - Patch
    - Failover
categories:
    - Record
description: 介绍Nginx自身的设计思想，解决如何进行动静分离、负载均衡，还有软件热升级方案的应用。以及解答如何更好的在Docker容器中使用Nginx，对Nginx  Active-Standby应用模式的思考.
---

# 前言
本文中的配置文件，已经整理到了GitHub：[https://github.com/amao12580/docker](https://github.com/amao12580/docker)

本文假设读者对Nginx、Docker已经有了比较深入的了解，并掌握了docker-compose工具的使用。

## 高性能
Nginx是一款面向性能设计的HTTP服务器，相较于Apache、lighttpd具有占有内存少，稳定性高等优势。与旧版本（<=2.2）的Apache不同，nginx不采用每客户机一线程的设计模型，而是充分使用异步逻辑，削减了上下文调度开销，所以并发服务能力更强。整体采用模块化设计，有丰富的模块库和第三方模块库，配置灵活。 在Linux操作系统下，nginx使用epoll事件模型，得益于此，nginx在Linux操作系统下效率相当高。同时Nginx在OpenBSD或FreeBSD操作系统上采用类似于epoll的高效事件模型kqueue。nginx同时是一个高性能的 HTTP 和 反向代理 服务器，也是一个 IMAP/POP3/SMTP 代理服务器。Nginx 已经因为它的稳定性、丰富的功能集、示例配置文件和低系统资源的消耗而闻名了。

## 可扩展
Nginx属于典型的微内核设计，其内核非常简洁和优雅，同时具有非常高的可扩展性。

Nginx是纯C语言的实现，其可扩展性在于其模块化的设计。目前，Nginx已经有很多的第三方模块，大大扩展了自身的功能。nginx_lua_module可以将Lua语言嵌入到Nginx配置中，从而利用Lua极大增强了Nginx本身的编程能力，甚至可以不用配合其它脚本语言（如PHP或Python等），只靠Nginx本身就可以实现复杂业务的处理。

* --with-http_realip_module        #获取真实IP模块
* --with-http_sub_module           #修改原始请求URI模块
* --with-http_flv_module           #对flv流媒体播放提供支持
* --with-http_dav_module           #启用对[WebDav协议](https://idoseek.com/1800)的支持
* --with-http_gzip_static_module   #开启GZIP压缩，可以直接压缩html等静态资源。*.gz
* --with-http_stub_status_module   #提供对nginx自身状态的监控功能
* --with-http_addition_module      #过滤器模块， 在response数据的前/后添加文本
* --with-pcre=                     #正则表达式解析支持，支持Rewrite重写规则
* --with-openssl=                  #(part 1) HTTPS访问支持，需同时配合公钥和CA证书
* --with-http_ssl_module           #(part 2) HTTPS访问支持，需同时配合公钥和CA证书
* --with-zlib=                     #gzip模块需要 zlib 库
* --add-module=/patch/nginx_upstream_check_module   #对后端服务器提供主动健康检查，自动failover

这些模块，都是基于nginx源码编译安装并显式配置，才会生效，这要求我们的docker FROM镜像，需要支持C编译器环境。

### 相关内容
OpenResty 的目标是让你的Web服务直接跑在 Nginx 服务内部，充分利用 Nginx 的非阻塞 I/O 模型，不仅仅对 HTTP 客户端请求,甚至于对远程后端诸如 MySQL、PostgreSQL、Memcached 以及 Redis 等都进行一致的高性能响应。

Example:利用OpenResty的可编程特性，结合Redis，实现实时统计网站的PV、UV的功能，非常的简单。

不局限于Redis等,甚至于Kafka也可以，只要SDK提供对Lua语言的支持即可，简直是运维的春天

## 动静分离
动静分离，是指响应内容的动与静，分为动态计算的响应内容与静态不变的响应内容。如订单总数量计算是一个动态的，而网页logo图片是一个静态的。前者一般需要访问应用服务器，由程序来计算，而后者一般只需要nginx自身来处理。

利用nginx提供的静态资源压缩传输、静态资源内存级缓存，我们可以将html文件、css文件、js文件等资源直接放在nginx所在的主机硬盘中，由nginx代理这些文件的get操作。

受nginx代理的静态资源文件，应该具备如下特征：1.文件内容几乎不变化，如注册用户使用协议html，2.文件体积小，减轻压缩时对cpu的波动，以及缓存在内存的资源占用，3.文件属于热访问文件，比如Angular框架下的js文件。

多个nginx节点，可以共享这些静态文件，利用网络磁盘共享技术，甚至可以在部署在多个物理机的nginx节点下进行共享。

我们将可以直接将所有静态资源，按类型，放到文件夹：nginx/html/或nginx/static/下，这是立即生效的，不需要重启nginx。

## 后端版本热升级

### 兼容式热升级

对于nginx后端部署的应用程序，需要进行版本升级时，我们可以这样做。
* 1.前提假定

* 1.1假设应用程序的新版本接口，是100%兼容旧版本的，即任何旧版本客户端在调用旧版本应用程序与新版本应用程序是无区别的，包括请求内容和响应内容。

* 1.2假设nginx.conf中，upstream段，定义了3个tomcat服务器（A\B\C）。此时2个tomcat服务器运行着同一版本（即旧版本）的应用程序。


* 2.升级步骤

* 2.1选择在系统平峰期进行，避免流量冲击。

* 2.2正常关闭A tomcat，在合理配置nginx的前提下，nginx监测到A机crash，此时会将流量转移到B\C。若使用平均流量权重，此时若B\C 2个机器的流量会各升高50%。

* 2.3执行A tomcat的升级。

* 2.4启动A tomcat，nginx监测到A机up，会将流量重新分配，此时各节点的流量恢复正常态。

* 2.5依照以上步骤，再升级B\C节点。


整个过程不需要重启nginx，这意味着对外服务不需要中断。新版本可能存在不稳定，需要回退到旧版本，也是类似与以上步骤执行。

### 非兼容式热升级

非兼容式升级，是指新版本应用程序，对客户端的版本的要求比旧版本应用程序要高。例如客户端版本为1.0，旧版本应用程序为1.5，新版本应用程序为1.6。假定1.6版本对1.0版本的客户端不再提供支持，而1.5版本是可以支持1.0版本的客户端的。
而1.5与1.6版本的客户端访问入口，都在同一个nginx的同一个端口。

* 1.避免同时支持多个版本的客户端，需要有客户端强制升级的方案。

* 2.客户端与应用程序通讯，需要定义一个客户端当前版本号，且该数据需要支持被nginx解析到。

* 3.修改nginx配置，定义2个server节点，每个节点按照不同客户端版本路由到对应的后端应用程序中，即有一个客户端版本与后端应用程序版本的对照表。

* 4.nginx做一下热加载nginx.conf，在下文中有提及。


这种方案对于后端应用程序开发最为友好，只需要有不同分支版本进行并行维护即可，比如tag/V1.5/code、tag/V1.6/code，2个版本公有的bug修复时，需要做一个互相merge.

## 自身热升级

Nginx自身的热升级，是指对Nginx进行模块维护或版本维护。

Nginx主进程在启动完成后会进入等待状态，负责响应各类系统消息，如SIGCHLD、SIGHUP、SIGUSR2等。

* TERM, INT: 立刻退出
* QUIT: 等待工作进程结束后再退出
* KILL: 强制终止进程
* HUP: 重新加载配置文件，使用新的配置启动工作进程，并逐步关闭旧进程。
* USR1: 重新打开日志文件
* USR2: 启动新的主进程，实现热升级
* WINCH: 逐步关闭工作进程

在docker容器内热升级nginx的步骤：
* 1.向主进程发送USR2信号，Nginx会启动一个新版本的master进程和工作进程，和旧版一起处理请求

docker kill --signal="USR2" <nginx container name or id>

* 2.向原Nginx主进程发送WINCH信号，它会逐步关闭旗下的工作进程（主进程不退出），这时所有请求都会由新版Nginx处理

docker kill --signal="WINCH" <nginx container name or id>

* 3.如果这时需要回退，可向原Nginx主进程发送HUP信号，它会重新启动工作进程， 仍使用旧版配置文件 。尔后可以将新版Nginx进程杀死（使用QUIT、TERM、或者KILL）

docker kill --signal="TERM" <nginx container name or id>

## 热加载nginx.conf

我们知道在upstream定义的tomcat节点，是属于文件性配置，如果需要上线新加节点，需要修改nginx.conf，然后需要重启Nginx读取新配置。如何热加载nginx.conf 而不需重启nginx？

docker exec -i -t <nginx container name or id> ./usr/local/nginx/sbin/nginx -s reload

## 高可用方案

使用Keepalived在多个nginx节点之间做互为主备配置，配置略过。

## 负载均衡

对后端tomcat的负载均衡，使用upstream，配置权重和max_fails等参数即可

   # 设定负载均衡方式：RR模式
    upstream  xws  {
        server 192.168.1.188:6080 weight=1 max_fails=5 fail_timeout=10s ;
        server 192.168.1.188:7080 weight=1 max_fails=5 fail_timeout=10s ;
        check interval=3000 rise=2 fall=5 timeout=1000 type=http;
    }

## 对后端的健康管理

使用nginx_upstream_check_module功能增强补丁

配置location,开放后端tomcat的健康状况访问。

http://your maintenance IP and Port/xw_TomcatStatus/

## 自身的运行监控

监控Nginx：http://your maintenance IP and Port/xw_NginxStatus/

## Reference

* 软件架构模式：http://colobu.com/2015/04/08/software-architecture-patterns/

* Nginx简介：http://www.rowkey.me/blog/2014/08/27/nginx-loabbalance/

* OpenResty + Redis 实时计算统计Web服务的UV & PV ：http://www.wtoutiao.com/p/109IT70.html
