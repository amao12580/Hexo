---
title: '常用资源汇总'
date: 2016年3月31日13:01:55
comments: false   #去除多说评论框

---

## Shortcut

术语缩写

### lsof

list of open files

一个列出当前系统打开文件的工具。在Linux环境下，任何事物都是以文件的形式存在，通过文件不仅可以访问常规数据，还可以访问网络连接和硬件。

### grep

global search regular expression(RE) and print out the line

全面搜索正则表达式并把行打印出来)是一种强大的文本搜索工具，它能使用正则表达式搜索文本，并把匹配的行打印出来。

### Redis

remote dictionary server

### AOF

append only log file

顺序记录系统日志

## Linux 技巧

### 1.批量转换文件字符集 GBK--> UTF8

1）查看文件编码
file -i filename

2）递归转换(包括子文件夹)
find default -type d -exec mkdir -p utf/{} \;
find default -type f -exec iconv -f GBK -t UTF-8 {} -o utf/{} \;

这两行命令将default目录下的文件由GBK编码转换为UTF-8编码，目录结构不变，转码后的文件保存在utf/default目录下。

注意：如果原来就是utf-8编码，使用iconv -f GBK -t UTF-8命令转换后，会出现乱码，或截断等各种问题；
一定要保证原文件是不是utf-8编码；

3）使用如下命令把文件编码先查出来：
find default -type f -exec file -i {} \; > /tmp/a
查询是否存在已经是utf-8编码的文件：
grep "charset=utf-8" /tmp/a

用这个将算法学习工程的混合文件编码转换好了，使用maven install再也不报字符集问题了。

### tree

windows和linux都有tree命令，主要功能是创建文件列表，将所有文件以树的形式列出来.

windows下使用：tree /f

/f参数是为了将文件名也打印出来

### Nginx

安全停止nginx的运行 graceful
./nginx -s stop

查看nginx并发进程数
ps -ef | grep nginx | wc -l

查看Web服务器（nginx  apache）的并发请求数及其TCP连接状态：
netstat -n | awk '/^tcp/ {++S[$NF]} END {for(a in S) print a, S[a]}'
LAST_ACK 5 （正在等待处理的请求数）
SYN_RECV 30
ESTABLISHED 1597 （正常数据传输状态）
FIN_WAIT1 51
FIN_WAIT2 504
TIME_WAIT 1057 （处理完毕，等待超时结束的请求数）

服务器cpu数量
grep ^processor /proc/cpuinfo | wc -l


## 文件操作
1.移动所有文件到上级目录
mv * ../

2.删除所有文件
rm -r *

3.解压

1.tar zxvf XXX.tar.gz
2.unzip XXX.zip

4.压缩文件夹
tar -zcvf /usr/local/openresty/nginx.tar.gz /usr/local/openresty/nginx/

## 查看登陆日志

查看ubuntu登陆日志
cat /var/log/auth.log

查看当前已登录的用户
w

查看（登录）用户名称及所启动的进程
who

随时查看系统的历史信息（曾经使用过系统的用户信息）
last

## DNS

linux 设置DNS，等待1分钟即生效
echo "nameserver 8.8.8.8" > /etc/resolv.conf

## 工具

### HTML2Markdown

[在线转换：支持table](http://html2markdown.eliyar.biz/)

### domain

检查域名或IP在国内各地的访问速度

http://ping.chinaz.com/

### Google

按照时间倒序

&tbs=qdr:1,sbd:1

例：https://www.google.com.hk/search?q=JOOQ+使用&tbs=qdr:1,sbd:1


## 软件

### Docker

#### 安装
1.Follow：[https://segmentfault.com/a/1190000002485231](https://segmentfault.com/a/1190000002485231)

```
ubuntu下，用以下这种脚本方式安装最方便，来源于sameersbn/docker-gitlab官方说明：

sudo apt-get purge docker.io
curl -s https://get.docker.io/ubuntu/ | sudo sh
sudo apt-get update
sudo apt-get install lxc-docker --fix-missing


一行脚本，安装最新版docker
sudo apt-get update && sudo apt-get -y install curl && curl -fsSL https://get.docker.com/gpg | sudo apt-key add - && curl -fsSL https://get.docker.com/ | sh

### Docker Compose

Compose 项目目前在[ Github ](https://github.com/docker/compose)上进行维护，目前最新版本是 1.2.0。

Compose 定位是“defining and running complex applications with Docker”，前身是[ Fig](http://www.infoq.com/cn/articles/docker-build-development-environment-based-on-fig)，兼容 Fig 的模板文件。
Dockerfile 可以让用户管理一个单独的应用容器；而 Compose 则允许用户在一个模板（YAML 格式）中定义一组相关联的应用容器（被称为一个 project，即项目），例如一个 Web 服务容器再加上后端的数据库服务容器等。

该项目由 Python 编写，实际上调用了 Docker 提供的 API 来实现。

通过Python pip安装。
apt-get install python-pip python-dev
pip install -U docker-compose

```

### VPS 搭建
```
#选用ubuntu 16稳定版 root用户

# 检查linux kernel版本
uname -a

# 更新系统

apt update

# 安装openresty
wget https://openresty.org/download/openresty-1.9.15.1.tar.gz

tar xzvf openresty-1.9.15.1.tar.gz

mv openresty-1.9.15.1 openresty

cd openresty

apt-get install libpcre3 libpcre3-dev

apt-get install openssl libssl-dev

./configure

make

make install

```


## 学习资源

### SQL查询优化总结

1、应尽量避免在 where 子句中使用!=或<>操作符，否则将引擎放弃使用索引而进行全表扫描。

2、对查询进行优化，应尽量避免全表扫描，首先应考虑在 where 及 order by 涉及的列上建立索引。

3、应尽量避免在 where 子句中对字段进行 null 值判断，否则将导致引擎放弃使用索引而进行全表扫描，如：

select id from t where num is null
可以在num上设置默认值0，确保表中num列没有null值，然后这样查询：

select id from t where num=0
4、尽量避免在 where 子句中使用 or 来连接条件，否则将导致引擎放弃使用索引而进行全表扫描，如：

select id from t where num=10 or num=20
可以这样查询：

select id from t where num=10
union all
select id from t where num=20
5、下面的查询也将导致全表扫描：(不能前置百分号)

select id from t where name like ‘%abc%’
若要提高效率，可以考虑全文检索。

6、not in 要慎用，否则会导致全表扫描

in操作在有索引的字段（主键索引或普通索引）时，会使用索引

7、如果在 where 子句中使用参数，也会导致全表扫描。因为SQL只有在运行时才会解析局部变量，但优化程序不能将访问计划的选择推迟到运行时；它必须在编译时进行选择。然 而，如果在编译时建立访问计划，变量的值还是未知的，因而无法作为索引选择的输入项。如下面语句将进行全表扫描：

select id from t where num=@num
可以改为强制查询使用索引：

select id from t with(index(索引名)) where num=@num
8、应尽量避免在 where 子句中对字段进行表达式操作，这将导致引擎放弃使用索引而进行全表扫描。如：

select id from t where num/2=100
应改为:

select id from t where num=100*2
9、应尽量避免在where子句中对字段进行函数操作，这将导致引擎放弃使用索引而进行全表扫描。如：

select id from t where substring(name,1,3)=’abc’–name以abc开头的id
select id from t where datediff(day,createdate,’2005-11-30′)=0–’2005-11-30′生成的id
应改为:

select id from t where name like ‘abc%’
select id from t where createdate>=’2005-11-30′ and createdate<’2005-12-1′
10、不要在 where 子句中的“=”左边进行函数、算术运算或其他表达式运算，否则系统将可能无法正确使用索引。

11、在使用索引字段作为条件时，如果该索引是复合索引，那么必须使用到该索引中的第一个字段作为条件时才能保证系统使用该索引，否则该索引将不会被使 用，并且应尽可能的让字段顺序与索引顺序相一致。

12、不要写一些没有意义的查询，如需要生成一个空表结构：

select col1,col2 into #t from t where 1=0
这类代码不会返回任何结果集，但是会消耗系统资源的，应改成这样：

create table #t(…)
13、很多时候用 exists 代替 in 是一个好的选择：

select num from a where num in(select num from b)
用下面的语句替换：

select num from a where exists(select 1 from b where num=a.num)
14、并不是所有索引对查询都有效，SQL是根据表中数据来进行查询优化的，当索引列有大量数据重复时，SQL查询可能不会去利用索引，如一表中有字段 sex，male、female几乎各一半，那么即使在sex上建了索引也对查询效率起不了作用。

15、索引并不是越多越好，索引固然可以提高相应的 select 的效率，但同时也降低了 insert 及 update 的效率，因为 insert 或 update 时有可能会重建索引，所以怎样建索引需要慎重考虑，视具体情况而定。一个表的索引数最好不要超过6个，若太多则应考虑一些不常使用到的列上建的索引是否有 必要。

16.应尽可能的避免更新 clustered 索引数据列，因为 clustered 索引数据列的顺序就是表记录的物理存储顺序，一旦该列值改变将导致整个表记录的顺序的调整，会耗费相当大的资源。若应用系统需要频繁更新 clustered 索引数据列，那么需要考虑是否应将该索引建为 clustered 索引。

17、尽量使用数字型字段，若只含数值信息的字段尽量不要设计为字符型，这会降低查询和连接的性能，并会增加存储开销。这是因为引擎在处理查询和连接时会 逐个比较字符串中每一个字符，而对于数字型而言只需要比较一次就够了。

18、尽可能的使用 varchar/nvarchar 代替 char/nchar ，因为首先变长字段存储空间小，可以节省存储空间，其次对于查询来说，在一个相对较小的字段内搜索效率显然要高些。

19、任何地方都不要使用 select * from t ，用具体的字段列表代替“*”，不要返回用不到的任何字段。

20、尽量使用表变量来代替临时表。如果表变量包含大量数据，请注意索引非常有限（只有主键索引）。

21、避免频繁创建和删除临时表，以减少系统表资源的消耗。

22、临时表并不是不可使用，适当地使用它们可以使某些例程更有效，例如，当需要重复引用大型表或常用表中的某个数据集时。但是，对于一次性事件，最好使 用导出表。

23、在新建临时表时，如果一次性插入数据量很大，那么可以使用 select into 代替 create table，避免造成大量 log ，以提高速度；如果数据量不大，为了缓和系统表的资源，应先create table，然后insert。

24、如果使用到了临时表，在存储过程的最后务必将所有的临时表显式删除，先 truncate table ，然后 drop table ，这样可以避免系统表的较长时间锁定。

25、尽量避免使用游标，因为游标的效率较差，如果游标操作的数据超过1万行，那么就应该考虑改写。

26、使用基于游标的方法或临时表方法之前，应先寻找基于集的解决方案来解决问题，基于集的方法通常更有效。

27、与临时表一样，游标并不是不可使用。对小型数据集使用 FAST_FORWARD 游标通常要优于其他逐行处理方法，尤其是在必须引用几个表才能获得所需的数据时。在结果集中包括“合计”的例程通常要比使用游标执行的速度快。如果开发时 间允许，基于游标的方法和基于集的方法都可以尝试一下，看哪一种方法的效果更好。

28、在所有的存储过程和触发器的开始处设置 SET NOCOUNT ON ，在结束时设置 SET NOCOUNT OFF 。无需在执行存储过程和触发器的每个语句后向客户端发送 DONE_IN_PROC 消息。

29、尽量避免向客户端返回大数据量，若数据量过大，应该考虑相应需求是否合理。

30、尽量避免大事务操作，提高系统并发能力。

```
实战：验证以上总结。以下SQL段，可以直接放到Navicat中批量执行

//已知在order表，int类型字段uid上，已存在normal类型的索引

CREATE TABLE `order` (
  `order_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '订单编号',
  `uid` int(11) DEFAULT NULL COMMENT '用户Id',
  `amout` bigint(20) NOT NULL COMMENT '订单金额(单位为分)',
  `remark` varchar(50) DEFAULT '' COMMENT '订单备注',
  `status` tinyint(2) DEFAULT NULL COMMENT '订单状态',
  `order_time` datetime DEFAULT NULL COMMENT '订单时间',
  PRIMARY KEY (`order_id`),
  KEY `order_uid_normal_index` (`uid`)
) ENGINE=InnoDB AUTO_INCREMENT=240 DEFAULT CHARSET=utf8;

EXPLAIN select order_id,uid,order_time from `order` where uid=185147;

EXPLAIN select order_id,uid,order_time from `order` where uid !=185147;//不能使用索引

EXPLAIN select order_id,uid,order_time from `order` where uid >185147;

EXPLAIN select order_id,uid,order_time from `order` where uid <185147;

EXPLAIN select order_id,uid,order_time from `order` where uid >175147 and uid <185147;

EXPLAIN select order_id,uid,order_time from `order` where uid <>175147;//不等于符号导致，不能使用索引

EXPLAIN select order_id,uid,order_time from `order` where uid in(185147,185148,185149);//in操作符，不能使用索引

EXPLAIN select order_id,uid,order_time from `order` where uid not in(185147,185148,185149);//not in操作符，不能使用索引

EXPLAIN select order_id,uid,order_time from `order` where uid between 185147 and 185149;

EXPLAIN select order_id,uid,order_time from `order` where uid=185147 or uid=5147;//or操作符导致，不能使用索引

EXPLAIN select order_id,uid,order_time from `order` where uid=185147 UNION all select * from `order` where uid=185148;

EXPLAIN select order_id,uid,order_time from `order` where uid like "%185%";//左%通配符，不能使用索引

EXPLAIN select order_id,uid,order_time from `order` where uid like "185%";//类型转换，不能使用索引。如果int是varchar类型则可以使用索引。

EXPLAIN select order_id,uid,order_time from `order` where uid like "%185";//左%通配符，不能使用索引

EXPLAIN select order_id,uid,order_time from `order` where uid like "185";//类型转换，不能使用索引

EXPLAIN select order_id,uid,order_time from `order` where uid/2=100 ;//谓词字段进行算术操作，不能使用索引

EXPLAIN select order_id,uid,order_time from `order` where substring(uid,1,3)="abc";//谓词字段进行函数操作，不能使用索引

EXPLAIN select DISTINCT uid from `order`;

EXPLAIN select max(uid) from `order`;//返回字段进行函数操作，不能使用索引

```

### 排序算法的特点

| 排序法 | 平均时间 | 最差情形 | 稳定度 | 额外空间 | 备注 |
| ------------- |:-------------:| -----:|-----:|-----:|-----:|
| 冒泡 | O(n<sup>2</sup>) | O(n<sup>2</sup>) | 稳定 | O(1) | n小时较好 |
| 交换 | O(n<sup>2</sup>) | O(n<sup>2</sup>) | 不稳定 | O(1) | n小时较好 |
| 选择 | O(n<sup>2</sup>) | O(n<sup>2</sup>) | 不稳定 | O(1) | n小时较好 |
| 插入 | O(n<sup>2</sup>) | O(n<sup>2</sup>) | 稳定 | O(1) | 大部分已排序时较好 |
| 基数 | O(log<sub>R</sub>B) | O(log<sub>R</sub>B) | 稳定 | O(n) |B是真数(0-9)，R是基数(个十百) |
| Shell | O(nlogn) | O(n<sup>s</sup>) 1<s<2 | 不稳定 | O(1) | s是所选分组 |
| 快速 | O(nlogn) | O(n<sup>2</sup>) | 不稳定 | O(nlogn) | n大时较好 |
| 归并 | O(nlogn) | O(nlogn) | 稳定 | O(1) | n大时较好 |
| 堆 | O(nlogn) | O(nlogn) | 不稳定 | O(1) | n大时较好 |

### MySQL快速导入4个G的SQL文件

```
1.首先假设SQL文件中的目标数据库是DB1
2.先在本机新建一个数据库DB1，设置好字符集:

utf8 -- UTF-8 Unicode
utf8_general_ci

3.确保数据库配置的字符集是utf8.
mysql.ini文件，修改之后最好重启实例
[client]
default-character-set=utf8
[mysql]
default-character-set=utf8
[mysqld]
character_set_server=utf8

4.在DOS下执行

Microsoft Windows [版本 6.1.7601]
版权所有 (c) 2009 Microsoft Corporation。保留所有权利。

C:\Users\Administrator>cd f:
F:\

C:\Users\Administrator>f:

F:\>cd mysql

F:\mysql>cd bin

F:\mysql\bin>mysql <F:\data2\dump.sql  //这一步会执行非常久

4G的文件我执行了1个小时
```

### Hash算法

[一致性hash算法](http://blogread.cn/it/article/7577?f=wb)提出了在动态变化的Cache环境中，判定哈希算法好坏的四个定义：

 1、平衡性(Balance)：平衡性是指哈希的结果能够尽可能分布到所有的缓存中去，这样可以使得所有的缓冲空间都得到利用。

 2、单调性(Monotonicity)：单调性是指如果已经有一些内容通过哈希分派到了相应的缓存中，又有新的缓存加入到系统中。哈希的结果应能够保证原有已分配的内容可以被映射到原有的或者新的缓存中去，而不会被映射到旧的缓存集合中的其他缓冲区。

 3、分散性(Spread)：在分布式环境中，终端有可能看不到所有的缓冲，而是只能看到其中的一部分。当终端希望通过哈希过程将内容映射到缓冲上时，由于不同终端所见的缓冲范围有可能不同，从而导致哈希的结果不一致，最终的结果是相同的内容被不同的终端映射到不同的缓冲区中。这种情况显然是应该避免的，因为它导致相同内容被存储到不同缓冲中去，降低了系统存储的效率。分散性的定义就是上述情况发生的严重程度。好的哈希算法应能够尽量避免不一致的情况发生，也就是尽量降低分散性。

 4、负载(Load)：负载问题实际上是从另一个角度看待分散性问题。既然不同的终端可能将相同的内容映射到不同的缓冲区中，那么对于一个特定的缓冲区而言，也可能被不同的用户映射为不同 的内容。与分散性一样，这种情况也是应当避免的，因此好的哈希算法应能够尽量降低缓冲的负荷。

### ++i vs i++

（1）如果只是看i++和++i，这两个是等价的，都等同于i=i+1，都是变量自身加1。
（2）在一般情况下，它们都是跟赋值联系在一起。
比如：
int a;
a=i++;//将i的值赋值给a，即a=i；然后再执行i=i+1；
也就是【a=i++;】与【a=i; i=i+1;】等价。
a=++i;//将i+1的值赋给a,即a=i+1;然后再执行i=i+1；
也就是【a=++i;】与【a=i+1;i=i+1;】等价。

（3）【总结一下】
①前置++是将自身加1的值赋值给新变量，同时自身也加1；
②后置++是将自身的值赋给新变量，然后才自身加1.

## Referrence

* [美团点评技术团队：MySQL索引原理及慢查询优化](http://tech.meituan.com/mysql-index.html)

* [Docker —— 从入门到实践](https://yeasy.gitbooks.io/docker_practice/content/compose/intro.html)

* [linux-利用iconv批量转换GBK文件到UTF-8编码方法](http://www.51testing.com/html/00/130600-868004.html)