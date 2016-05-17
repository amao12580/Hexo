---
title: Nginx与Tomcat 8在Docker环境的反向代理配置过程
date: 2016-04-08 14:49:32
tags:
    - Nginx
    - Tomcat
    - Docker
    - SSL
    - Load balance
categories:
    - Record
description: 在Nginx配置时，针对不同的使用环境，配置的参数有很多不同。迫在眉睫的，我们需要先对线上的API服务系统进行反向代理与负载均衡配置。API服务系统是面向手机APP的接口系统，使用HTTP Restful+json进行数据通讯。
---
# 需要做什么？
最近接到的任务是:在Docker环境下，Nginx与Tomcat的反向代理与负载均衡配置。先拿出可行性方案，以便在业务量突发时，在线上环境实施。典型的技术预研，打有准备仗。同时还提出了安全需求，在配置上，需要有安全加固。

在Nginx配置时，针对不同的使用环境，配置的参数有很多不同。迫在眉睫的，我们需要先对线上的API服务系统进行反向代理与负载均衡配置。API服务系统是面向手机APP的接口系统，使用HTTP Restful+json进行数据通讯。

我们在局域网环境下，有2台机器在软硬件配置方面，与线上的API服务系统类似。这2台机器的局域网IP分别是：192.168.1.158(简称为：158机器)、192.168.1.188(简称为：188机器)。由于188机器正在做压力测试，而且近期需要持续的对所有接口进行压力测试，没有办法空闲出来做实验。所以在实验之初我使用了158机器的普通账号进行，很快就因为权限不足，遭遇了很多莫名其妙的问题，而且158的使用量比较多，主要作为功能测试的机器。

随后与PM沟通，延后了188机器的压力测试计划，拿到了权限比较高的账号，但还不是root账户。下面会说到如何在普通账户下，使用root账户执行shell命令。

# Docker with Tomcat
为了模拟线上真实环境，我们在188机器上搭建了docker环境。docker是借助Linux container(简称LXC)技术的轻量级可移植运行时环境，这意味着在docker中完成的软件运行时环境搭建后，可以移植到任意一台支持docker运行的机器上，功能上不会有任何的丢失。这有点像Java开发中的JVM，都是解决在不同环境下软件运行的问题。docker更多的提供了资源共享和资源隔离的机制，容器之间本身是隔离互不干扰的，但提供配置允许不同容器之间交换数据，开放对外端口；同时可以限制某个容器对宿主机的资源占用，如cpu、内存、io等等。

为了方便，低成本，我们使用docker hub上的tomcat镜像：tomcat:8-jre8。在后续的实验中，我们需要2个tomcat作为后端应用服务器来处理实际的HTTP请求。
```
FROM tomcat:8-jre8

RUN mkdir /root/downloadAppBase
```
# Nginx VS Tengine
在技术选项时，我们遇到Nginx以及衍生产品Tengine。Nginx是俄罗斯人编写的一款轻量级的Web 服务器/反向代理服务器，它还具备邮件服务器的功能。我们在[Nginx官网](http://nginx.org/en/download.html)上查询发布日志，发现更新的比较频繁。仅在2016年前4月，就出现了2个比较大的版本：1.8.*、1.9.14。Tengine是由淘宝在官方nginx基础之上进行改进的版本，做了很多功能增强，最后一次的版本发布是：2015-12-31：Tengine-2.1.2,此版本仅兼容官方Nginx的1.6.2版本，该版本发布于：2014年9月16日。这也太久了，可能会错过很多官方更新。

# 安装与配置
```
准备工作
cd /home/www/
mkdir nginx
cd nginx/
mkdir nginx
mkdir zlib
mkdir openssl
mkdir pcre

sudo apt-get update

如果没有安装gcc/gcc-c++，请执行：sudo apt-get install build-essential
如果没有安装make，请执行：sudo apt-get install make

Step 1：编译安装Pcre包 (rewrite模块需要 pcre 库)
1.软件位于/software/pcre-8.38.tar.gz
2.拷贝软件到目标机器"/home/www/nginx/pcre/"目录
3.顺序执行以下脚本

cd /home/www/nginx/pcre/
tar -xzvf pcre-8.38.tar.gz
cd pcre-8.38/
./configure
sudo make
#有可能需要输入密码
sudo make install



Step 2：编译安装Zlib (gzip模块需要 zlib 库)
1.软件位于/software/zlib-1.2.8.tar.gz
2.拷贝软件到目标机器"/home/www/nginx/zlib/"目录
3.顺序执行以下脚本

cd /home/www/nginx/zlib/
tar -xzvf zlib-1.2.8.tar.gz
cd zlib-1.2.8/
./configure
sudo make
#有可能需要输入密码
sudo make install

Step 2：编译安装OpenSSL (ssl 功能需要openssl库)
1.软件位于/software/openssl-1.1.0-pre4.tar.gz
2.拷贝软件到目标机器"/home/www/nginx/openssl/"目录
3.顺序执行以下脚本

cd /home/www/nginx/openssl/
tar -xzvf openssl-1.1.0-pre4.tar.gz
cd openssl-1.1.0-pre4/
./config
sudo make
#命令执行时间超过5分钟，耐心等待
sudo make install
#命令执行时间超过5分钟，耐心等待

Step 3：编译安装Nginx
1.软件位于/software/nginx-1.9.14.tar.gz
2.拷贝软件到目标机器"/home/www/nginx/nginx/"目录
3.顺序执行以下脚本

cd /home/www/nginx/nginx/
tar -xzvf nginx-1.9.14.tar.gz
cd nginx-1.9.14/

sed -i -e 's/1.9.14//g' -e 's/nginx\//ERROR/g' -e 's/"NGINX"/"ERROR"/g' src/core/nginx.h

./configure --prefix=/home/www/nginx/nginx --with-http_realip_module --with-http_sub_module --with-http_flv_module --with-http_dav_module --with-http_gzip_static_module --with-http_stub_status_module --with-http_addition_module --with-pcre=/home/www/nginx/pcre/pcre-8.38 --with-openssl=/home/www/nginx/openssl/openssl-1.1.0-pre4 --with-http_ssl_module --with-zlib=/home/www/nginx/zlib/zlib-1.2.8

sudo make
#命令执行时间超过5分钟，耐心等待
sudo make install

Step 4：安装补丁(对应用服务器进行监控)
cd /home/www/nginx/nginx/
mkdir patch
补丁文件位于/software/patch目录，拷贝目录下的所有文件到：/home/www/nginx/nginx/patch/
cd /home/www/nginx/nginx/nginx-1.9.14/src/
patch -p1 < /home/www/nginx/nginx/patch/nginx_upstream_check_module-master/check_1.9.2+.patch
cd ..
./configure --prefix=/home/www/nginx/nginx --with-http_realip_module --with-http_sub_module --with-http_flv_module --with-http_dav_module --with-http_gzip_static_module --with-http_stub_status_module --with-http_addition_module --with-pcre=/home/www/nginx/pcre/pcre-8.38 --with-openssl=/home/www/nginx/openssl/openssl-1.1.0-pre4 --with-http_ssl_module --with-zlib=/home/www/nginx/zlib/zlib-1.2.8 --add-module=/home/www/nginx/nginx/patch/nginx_upstream_check_module-master/
sudo make
#命令执行时间超过5分钟，耐心等待
sudo make install
cd /home/www/nginx/nginx/sbin/
sudo rm -f nginx.old

Step 5：配置
配置文件位于：conf/nginx.conf
将该文件拷贝到：/home/www/nginx/nginx/conf/目录下，遇到文件已存在时，直接覆盖。

确保可以访问到后端tomcat开放的端口，telnet
修改配置文件nginx.conf,“upstream  xws”改为实际的tomcat运行环境

cd /home/www/nginx/nginx/
mkdir ssl
cd ssl
SSL证书文件位于：ssl/www.abcde.com.crt，ssl/www.abcde.com.key
将这2个文件拷贝到/home/www/nginx/nginx/ssl/目录下

Step 6：运行
确保系统的80、443端口处于空闲状态。netstat
确保/home/www/nginx/nginx/logs/目录具备读写权限。
确保/home/www/nginx/nginx/ssl/www.abcde.com.crt具备读权限。
确保/home/www/nginx/nginx/ssl/www.abcde.com.key具备读权限。
确保/home/www/nginx/nginx/sbin/nginx文件具备可执行权限。

cd /home/www/nginx/nginx/sbin/
sudo ./nginx

Step 7：验证
1.pcre包安装的正确性

cd /home/www/nginx/pcre/
./pcre-config --version
有版本号输出则安装成功。

2.openssl包安装的正确性
cd /home/www/nginx/openssl/openssl-1.1.0-pre4/
openssl version –a
有版本号输出则安装成功。

3.nginx包安装的正确性
cd /home/www/nginx/nginx/nginx-1.9.14/objs
./nginx -V
##也可以使用：./nginx -t
有配置详情输出则安装成功。

卸载
1.停止nginx的运行
cd /home/www/nginx/nginx/sbin/
sudo ./nginx -s stop

2.删除文件
cd /home/www/
rm -rf nginx


监控
进入到与nginx部署机器的局域网络
浏览器访问：http://nginx主机的局域网ip/nginxStatus/
```

贴出nginx.cof

```
#你所看到的这个文件，是nginx的工作配置文件，不要轻易改动。

worker_processes  4;
error_log  logs/error.log;
pid        logs/nginx.pid;
worker_rlimit_nofile 65535;

events {
    use epoll;
    worker_connections  65535;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    server_tokens off;
    tcp_nopush on;
    tcp_nodelay on;
    client_body_timeout   10;
    client_header_timeout  30;
    keepalive_timeout     30  30;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    sendfile on;
    send_timeout 10;
    client_body_buffer_size  64K;
    client_header_buffer_size  128k;
    client_max_body_size  10m;
    large_client_header_buffers  4  128k;

  # gzip压缩功能设置
    gzip on;
    gzip_min_length 1k;
    gzip_buffers    4 16k;
    gzip_http_version 1.0;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/javascript application/json application/javascript application/x-javascript application/xml;
    gzip_vary on;

    #设置单个IP在每秒请求数不能超过20次
    limit_req_zone $binary_remote_addr zone=one:20m rate=20r/s;

    #设置单个IP同时连接数
    limit_conn_zone $binary_remote_addr zone=addr:20m;

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

  # 设定负载均衡方式：RR模式
    upstream  xws  {
        server 127.0.0.1:6080 weight=1 max_fails=5 fail_timeout=10s ;
        server 127.0.0.1:7080 weight=1 max_fails=5 fail_timeout=10s ;
        check interval=3000 rise=2 fall=5 timeout=1000 type=http;
    }

  # 虚拟主机配置
    server {
        listen 80 default_server;
        #root   /apps/oaapp;

        listen 443 ssl default_server;
        server_name www.abcde.com;
        ssl_certificate  /home/www/nginx/nginx/ssl/yourCAcrt.crt;
        ssl_certificate_key  /home/www/nginx/nginx/ssl/yourCAkey.key;
        ssl_session_timeout  10m;
        ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
        ssl_ciphers "ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA:ECDHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES128-SHA256:DHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA:ECDHE-RSA-DES-CBC3-SHA:EDH-RSA-DES-CBC3-SHA:AES256-GCM-SHA384:AES128-GCM-SHA256:AES256-SHA256:AES128-SHA256:AES256-SHA:AES128-SHA:DES-CBC3-SHA:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!MD5:!PSK:!RC4";
        ssl_prefer_server_ciphers on;

        charset utf-8;
        access_log  logs/xws.access.log  main;

        if ($request_method !~ ^(GET|HEAD|POST)$) {
            return 404;
        }

        #对所有URL做负载均衡+反向代理
        location / {
            #root   /apps/oaapp;
            #index  index.jsp index.html index.htm;
            proxy_pass http://xws;
            proxy_redirect off;
            # 后端的Web服务器可以通过X-Forwarded-For获取用户真实IP
            proxy_set_header  Host  $host;
            proxy_set_header  X-Real-IP  $remote_addr;
            proxy_set_header  X-Forwarded-For  $proxy_add_x_forwarded_for;
            proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;

            limit_conn addr 2;
            limit_req zone=one burst=5 nodelay;
        }

        #静态文件，nginx自己处理，不去backend请求tomcat
        #location  ~* /download/ {
        #    root /apps/oa/fs;

        #}

        #location ~ .*\.(gif|jpg|jpeg|bmp|png|ico|txt|js|css)$
        #{
        #    root /apps/oaapp;
        #    expires      7d;
        #}

        # 为内网IP开放nginx状态监控
        location /nginxStatus {
            stub_status on;
            access_log off;
            allow 192.168.1.0/24;
            deny all;
        }

        location ~ ^/(WEB-INF)/ {
            deny all;
        }
        #error_page 404              /404.html;
        error_page 500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }

}
```

# 踩到的一些坑

## 400 \x16\x03
同一个server节点，配置：
```
listen 80 default_server;
listen 443 ssl default_server;
```
## 调试Https
如果CA证书签发的域名是：www.abcde.com，为了在线下调试，假设将nginx部署在局域网IP：192.168.1.188，我们可以将本机的hosts文件修改一下，文件位于：C:\Windows\System32\drivers\etc\hosts。加上一行记录：“192.168.1.188 www.abcde.com”，保存后退出。再到本机的cmd命令行输入：ipconfig flushdns，退出cmd。等待几分钟后，在浏览器输入：https://www.abcde.com，即可在局域网调试啦！
## ssl_protocols
如果nginx.conf在定义ssl_protocols时，用了一些比较过时的协议，比如：SSLV3，则会被chrome提示连接不安全。可以参考我的nginx.conf配置，事实上这些过时的协议都有一些可以被利用的漏洞，建议不要使用了。