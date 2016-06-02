---
title: Nginx与Docker容器系列 - 1.进行编译安装
date: 2016-04-27 10:47:59
tags:
    - Nginx
    - Alpine
    - Docker
    - Centos
    - Patch
categories:
    - Record
description: Docker容器的出现，为应用运行环境一致性带来了很好的解决方案。同时也带来了远比虚拟机更好的体验，提供资源隔离(Linux namespace)和资源分配(Linux control group)的功能、应用可扩展性的功能，但是更加轻量级的运行。为了解决多容器的依赖性和互相调用，提供了docker-compose等工具进行容器编排。
---
# 前言

Docker容器的出现，为应用运行环境一致性带来了很好的解决方案。同时也带来了远比虚拟机更好的体验，提供资源隔离(Linux namespace)和资源分配(Linux control group)的功能、应用可扩展性的功能，但是更加轻量级的运行。为了解决多容器的依赖性和互相调用，提供了docker-compose等工具进行容器编排。

我们项目中，对docker的使用非常深入，在线上环境和线下的测试环境、开发环境，都使用了docker作为运行时环境一致性支持。由于linux的发行版本和内核版本的不同组合，在没有docker之前，DevOps很难为不同的运行环境编写统一的软件安装维护的脚本，几乎只能借助虚拟机来达到这一目的，虚拟机的笨重和可调度性差，扩容与缩容也无法做到快速有效，已经被逐渐淘汰。

Nginx，性能已经毋庸置疑，但在docker hub上的nginx镜像，并不适合我们，没有对安全进行加固，更多的没有加入重要的功能增加，比如主动式地对后端Tomcat进行健康检查并自动failover，这个动能对HA的非常重要的，因此我们选择了在docker环境下，对官方nginx源码进行编译，并打上补丁，以符合实际生产环境的使用。

本文中的配置文件，已经整理到了GitHub：[https://github.com/amao12580/docker](https://github.com/amao12580/docker)

本文假设读者对Nginx、Docker已经有了比较深入的了解，并掌握了docker-compose工具的使用。

# 安装环境
## 宿主机的情况

### 操作系统和硬件
```
操作系统
root@ubuntu-14:~/docker/test# uname -a
Linux ubuntu-14 4.2.0-35-generic #40~14.04.1-Ubuntu SMP Fri Mar 18 16:37:35 UTC 2016 x86_64 x86_64 x86_64 GNU/Linux

CPU
root@ubuntu-14:~/docker/test# lscpu
Architecture:          x86_64
CPU op-mode(s):        32-bit, 64-bit
Byte Order:            Little Endian
CPU(s):                4
On-line CPU(s) list:   0-3
Thread(s) per core:    1
Core(s) per socket:    4
Socket(s):             1
NUMA node(s):          1
Vendor ID:             GenuineIntel
CPU family:            6
Model:                 58
Stepping:              9
CPU MHz:               1600.125
BogoMIPS:              6385.87
Virtualization:        VT-x
L1d cache:             32K
L1i cache:             32K
L2 cache:              256K
L3 cache:              6144K

Memory
root@ubuntu-14:~/docker/test# free -m
             total       used       free     shared    buffers     cached
Mem:          7881       4751       3130          1        419       3810
-/+ buffers/cache:        520       7360
Swap:         8087          0       8087
```

### docker运行时环境
如果你不知道如何安装docker，请参考我对此的收集：[http://amao12580.github.io/index/](http://amao12580.github.io/index/)
```
root@ubuntu-14:~/docker/test# docker-compose version
docker-compose version 1.7.0, build 0d7bf73
docker-py version: 1.8.0
CPython version: 2.7.9
OpenSSL version: OpenSSL 1.0.1e 11 Feb 2013


root@ubuntu-14:~/docker/test# docker version
Client:
 Version:      1.9.1
 API version:  1.21
 Go version:   go1.4.3
 Git commit:   a34a1d5
 Built:        Fri Nov 20 17:56:04 UTC 2015
 OS/Arch:      linux/amd64

Server:
 Version:      1.9.1
 API version:  1.21
 Go version:   go1.4.3
 Git commit:   a34a1d5
 Built:        Fri Nov 20 17:56:04 UTC 2015
 OS/Arch:      linux/amd64
```

# FROM centos:6.7
我的目录结构看起来是这样：
```
root@ubuntu-14:~# pwd
/root
root@ubuntu-14:~# tree
.
└── docker
    └── test
        ├── docker-compose.yml
        └── nginx
            ├── conf
            │   └── nginx.conf
            ├── Dockerfile
            ├── html
            │   └── test_xw.html
            ├── logs
            │   ├── error.log
            │   ├── nginx.pid
            │   └── xws.access.log
            ├── ssl
            │   ├── www.xw18.cn.crt(已经移除，涉及到机密)
            │   └── www.xw18.cn.key(已经移除，涉及到机密)
            └── static
                ├── apk
                ├── css
                ├── img
                │   └── photo.jpg
                └── js

12 directories, 10 files
```
想要在shell中打印文件目录结构，请安装“tree”：aptitude install -y tree
请确保你的当前用户对这些目录具备必要的权限，下面一起看看docker-compose.yml文件吧。

```
root@ubuntu-14:~/docker/test# cat docker-compose.yml
nginx:
  build: ./nginx
  mem_limit: 4294967296
  cpu_shares: 2
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/conf/nginx.conf:/usr/local/nginx/conf/nginx.conf
    - ./nginx/html:/usr/local/nginx/html
    - ./nginx/static:/usr/local/nginx/static
    - ./nginx/ssl:/usr/local/nginx/ssl
    - ./nginx/logs:/usr/local/nginx/logs:rw
```

是不是看起来很简单呢？因为我们在docker-compose里定义的是服务的运行环境要求，并没有定义如何构建这个服务。

想看如何构建nginx,那一起来看看Dockerfile文件吧，这个文件就是如何一步步的构建服务的，如果有合适的image，你可以在Dockerfile里定义执行任何可以在宿主机环境下执行的命令哦。是不是很magic呢？
```
root@ubuntu-14:~/docker/test/nginx# cat Dockerfile
#定义基础镜像
FROM centos:6.7

#定义nginx版本
ENV NGINX_VERSION 1.9.14

#准备安装环境
RUN yum install -y wget && \
wget -O /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-6.repo  && \
yum clean all  && \
yum makecache && \

#安装依赖组件
rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-* && \
yum install -y epel-release && \
rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-6 && \
yum install -y patch pcre-devel openssl-devel zlib-devel gd-devel tar gcc git supervisor && \

#下载安装包和补丁
mkdir -p /var/run/nginx/ && \
wget -c http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz && \
git clone https://github.com/cuber/ngx_http_google_filter_module.git && \
git clone https://github.com/yaoweibin/ngx_http_substitutions_filter_module.git && \
git clone https://github.com/aperezdc/ngx-fancyindex.git && \
git clone https://github.com/yaoweibin/nginx_upstream_check_module.git && \

#进行编译安装，同时打上补丁
tar xf nginx-${NGINX_VERSION}.tar.gz && \
cd nginx-${NGINX_VERSION} && \
cd src/ && \
#打补丁
patch -p1 < /nginx_upstream_check_module/check_1.9.2+.patch && \
cd .. && \
#去除nginx的对外版本号
sed -i -e 's/${NGINX_VERSION}//g' -e 's/nginx\//ERROR/g' -e 's/"NGINX"/"ERROR"/g' src/core/nginx.h  && \
./configure --prefix=/usr/local/nginx \
--with-pcre \
--with-ipv6 \
--with-http_ssl_module \
--with-http_flv_module \
--with-http_v2_module \
--with-http_realip_module \
--with-http_gzip_static_module \
--with-http_stub_status_module \
--with-http_mp4_module \
--with-http_image_filter_module \
--with-http_addition_module \
--with-http_sub_module  \
--with-http_dav_module  \
--http-client-body-temp-path=/usr/local/nginx/client/ \
--http-proxy-temp-path=/usr/local/nginx/proxy/ \
--http-fastcgi-temp-path=/usr/local/nginx/fcgi/ \
--http-uwsgi-temp-path=/usr/local/nginx/uwsgi \
--http-scgi-temp-path=/usr/local/nginx/scgi \
--add-module=../ngx_http_google_filter_module \
--add-module=../ngx_http_substitutions_filter_module \
--add-module=../ngx-fancyindex \
--add-module=../nginx_upstream_check_module && \
#开始编译
make -j $(awk '/processor/{i++}END{print i}' /proc/cpuinfo) && make install && \
#设置一些工作目录
mkdir -p /usr/local/nginx/cache/ && \
mkdir -p /usr/local/nginx/temp/ && \
rm -rf ../{ngx*,nginx*} && \
yum clean packages

#启动nginx，保留一个前台进程，以免被docker强制退出
CMD ./usr/local/nginx/sbin/nginx && tail -f /usr/local/nginx/logs/error.log
```

是不是感觉内容太多了呢？每一步都有说明的，为了节省磁盘空间，我们将很多命令聚合到了一起。
事实上确实减少了一部分的磁盘占用，我们来看看现在build出来的镜像有多大吧。
```
root@ubuntu-14:~/docker/test# pwd
/root/docker/test
root@ubuntu-14:~/docker/test# ls
docker-compose.yml  nginx

这里开始进行构建、启动并在后台保持运行
root@ubuntu-14:~/docker/test# docker-compose up -d nginx
后面的内容实在是太多了，就不贴出来了。如果你的网络环境很差，这个过程会很漫长。

已经成功运行了，test一下
root@ubuntu-14:~/docker/test# curl http://192.168.2.200/test_xw.html
<html>
<body>
<h2>Hello World! xw.</h2>
<h2>这是测试内容.</h2>
</body>

容器运行后，nginx会处于listener状态，我们来看看images有多大
root@ubuntu-14:~/docker/test# docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             VIRTUAL SIZE
test_nginx          latest              e50ecf326484        2 hours ago         986.3 MB
```

将近1个GB了，虽然说可以使用docker export -gzip 来压缩，并结合docker import命令直接导入，但是这个体积还是太肥大了，不利于轻量化运行和传播，我们来想想办法来减减肥吧。
# FROM alpine:3.3

Alpine Linux，一个只有5M的Docker镜像。

Alpine Linux Docker镜像基于Alpine Linux操作系统，后者是一个面向安全的轻型Linux发行版。不同于通常Linux发行版，Alpine Linux采用了musl libc和busybox以减小系统的体积和运行时资源消耗。在保持瘦身的同时，Alpine Linux还提供了自己的包管理工具apk，可以在其网站上查询，或者直接通过apk命令查询和安装。

Alpine Linux Docker镜像也继承了Alpine Linux发行版的这些优势。相比于其他Docker镜像，它的容量非常小，仅仅只有5M，且拥有非常友好的包管理器。

可以直接使用的DockerFile：

```
#说明：因为我所在的网络环境非常差，所以将很多需要下载的Step单独用RUN定义了，以免每次网络连不上而重复下载。如果你的网络环境OK，可以考虑合并多个RUN,以进一步减少imags的大小

#定义基础镜像
FROM alpine:latest

#定义nginx版本
ENV NGINX_VERSION 1.9.14

#将安装源切换为国内环境(中国科学技术大学)，大大加快了安装速度，同时稳定性也有了保障
ENV MIRROR_URL http://mirrors.ustc.edu.cn/alpine/

ENV MIRROR_URL_BACKUP http://alpine.gliderlabs.com/alpine/

ENV MIRROR_URL_SLOWEST http://dl-cdn.alpinelinux.org/alpine/

#准备安装环境
RUN echo '' > /etc/apk/repositories && \
    echo "${MIRROR_URL}v3.3//main"     >> /etc/apk/repositories && \
    echo "${MIRROR_URL}v3.3//community" >> /etc/apk/repositories && \
    echo '185.31.17.249 github.com' >> /etc/hosts && \
    echo '202.141.160.110 mirrors.ustc.edu.cn' >> /etc/hosts && \
    echo '206.251.255.63 nginx.org' >> /etc/hosts

#安装必要的组件(如果发生  ERROR: Service 'nginx' failed to build: The command '/bin/sh -c apk add... returned a non-zero code: 12。  这是网络问题：请删干净未完成container和images，10分钟后再来一遍)
RUN apk add --no-cache --virtual .build-deps \
    gcc \
    libc-dev \
    make \
    openssl-dev \
    pcre-dev \
    zlib-dev \
    linux-headers \
    curl \
    jemalloc-dev \
    gd-dev \
    git
#下载安装包和补丁
RUN mkdir -p /var/run/nginx/
RUN wget -c http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz
RUN git clone https://github.com/cuber/ngx_http_google_filter_module.git
RUN git clone https://github.com/yaoweibin/ngx_http_substitutions_filter_module.git
RUN git clone https://github.com/aperezdc/ngx-fancyindex.git
RUN git clone https://github.com/yaoweibin/nginx_upstream_check_module.git

#进行编译安装，同时打上补丁
RUN tar -xzvf nginx-${NGINX_VERSION}.tar.gz && \
cd nginx-${NGINX_VERSION} && \
cd src/ && \
#打补丁
patch -p1 < /nginx_upstream_check_module/check_1.9.2+.patch && \
cd .. && \
#去除nginx的对外版本号
sed -i -e 's/${NGINX_VERSION}//g' -e 's/nginx\//ERROR/g' -e 's/"NGINX"/"ERROR"/g' src/core/nginx.h  && \
./configure --prefix=/usr/local/nginx \
--with-pcre \
--with-ipv6 \
--with-http_ssl_module \
--with-http_flv_module \
--with-http_v2_module \
--with-http_realip_module \
--with-http_gzip_static_module \
--with-http_stub_status_module \
--with-http_mp4_module \
--with-http_image_filter_module \
--with-http_addition_module \
--with-http_sub_module  \
--with-http_dav_module  \
--http-client-body-temp-path=/usr/local/nginx/client/ \
--http-proxy-temp-path=/usr/local/nginx/proxy/ \
--http-fastcgi-temp-path=/usr/local/nginx/fcgi/ \
--http-uwsgi-temp-path=/usr/local/nginx/uwsgi \
--http-scgi-temp-path=/usr/local/nginx/scgi \
--add-module=../ngx_http_google_filter_module \
--add-module=../ngx_http_substitutions_filter_module \
--add-module=../ngx-fancyindex \
--add-module=../nginx_upstream_check_module \
--with-ld-opt="-ljemalloc" && \
#开始编译
make -j $(awk '/processor/{i++}END{print i}' /proc/cpuinfo) && make install && \

#设置一些工作目录
mkdir -p /usr/local/nginx/cache/ && \
mkdir -p /usr/local/nginx/temp/ && \
rm -rf ../{ngx*,nginx*}

#启动nginx，保留一个前台进程，以免被docker强制退出
CMD ./usr/local/nginx/sbin/nginx && tail -f /usr/local/nginx/logs/error.log
```

看看我们最后基于alpine的镜像大小是多少？
```
root@ubuntu-14:~/docker/alpine# docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             VIRTUAL SIZE
alpine_nginx        latest              81b30220a198        3 minutes ago       167.3 MB
```

不到200MB，成功瘦身80%。合并一些RUN定义，提及还可以更小的。

我们现在做了2个版本的nginx编译增强镜像，来看看最后的文件目录吧！

```
root@ubuntu-14:~# pwd
/root
root@ubuntu-14:~# tree
.
└── docker
    ├── alpine
    │   ├── docker-compose.yml
    │   └── nginx
    │       ├── conf
    │       │   └── nginx.conf
    │       ├── Dockerfile
    │       ├── html
    │       │   └── test_xw.html
    │       ├── logs
    │       │   ├── error.log
    │       │   ├── nginx.pid
    │       │   └── xws.access.log
    │       ├── ssl
    │       │   ├── www.xw18.cn.crt
    │       │   └── www.xw18.cn.key
    │       └── static
    │           ├── apk
    │           ├── css
    │           ├── img
    │           │   ├── 50.jpg
    │           │   └── photo.jpg
    │           └── js
    └── test
        ├── docker-compose.yml
        └── nginx
            ├── conf
            │   └── nginx.conf
            ├── Dockerfile
            ├── html
            │   └── test_xw.html
            ├── logs
            │   ├── error.log
            │   ├── nginx.pid
            │   └── xws.access.log
            ├── ssl
            │   ├── www.xw18.cn.crt
            │   └── www.xw18.cn.key
            └── static
                ├── apk
                ├── css
                ├── img
                │   ├── 50.jpg
                │   └── photo.jpg
                └── js

23 directories, 22 files
```

参考资料：[http://dockone.io/article/1243?utm_source=tuicool&utm_medium=referral](http://dockone.io/article/1243?utm_source=tuicool&utm_medium=referral)

# 常用命令总结

* docker进入到正在运行的容器内部

docker exec -it test_redis_1 /bin/bash

* 运行一个image_id为195eb90b5349的容器，并命名为shell，然后进入到容器内部

docker run --name shell -i -t 195eb90b5349 /bin/bash

* 运行一个名为alpine的容器，并进入到容器内部

docker run -it alpine /bin/sh

* docker查看本地image

docker images

* 重启docker服务

service docker restart

* 查看所有的容器

docker ps -a

* 删除多个容器

docker rm -v id1 id2

* 删除所有容器

docker rm $(docker ps -a -q)

* 删除多个镜像

dicker rmi id1 id2

* 查询所有未成功build的镜像<none>

docker images -q -f dangling=true

* 删除所有未成功build的镜像<none>

docker rmi $(docker images -q -f dangling=true)