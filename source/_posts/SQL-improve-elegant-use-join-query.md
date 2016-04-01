---
title: 'SQL查询提高篇：捋清连接查询的那些事儿'
date: 2016-03-21 12:25:10
tags:
    - Tech
    - SQL
    - Elegant
categories: Learning
description: 有时为了得到完整的结果，我们需要从两个或更多的表中获取结果。我们就需要执行 join。
---
数据库中的表可通过键将彼此联系起来。主键（Primary Key）是一个列，在这个列中的每一行的值都是唯一的。在表中，每个主键的值都是唯一的。这样做的目的是在不重复每个表中的所有数据的情况下，把表间的数据交叉捆绑在一起。

而在两个表之间建立关联关系，是不要求任何一个表的关联列(column)是主键的，这个关联列可以是任何类型的列，但是要求，两个表的关联列可以做关联关系的条件计算，为避免转换影响效率，两个关联列最好保持类型、长度一致。

为方便说明，定义以下2张表：
```
用户信息表
CREATE TABLE `user` (
  `uid` int(11) NOT NULL COMMENT '用户id',
  `name` varchar(10) DEFAULT NULL COMMENT '姓名',
  `sex` tinyint(1) DEFAULT NULL COMMENT '性别',
  `age` tinyint(2) DEFAULT NULL COMMENT '年龄',
  `mobile` varchar(11) DEFAULT NULL COMMENT '手机号码',
  `password` varchar(64) NOT NULL COMMENT '密码',
  `register_time` datetime NOT NULL COMMENT '注册时间',
  PRIMARY KEY (`uid`),
  UNIQUE KEY `index_mobile` (`mobile`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `user` VALUES ('100', '张三', '1', '28', '13547521456', 'ASDAWQ@!#SDF@#$%XCF', '2016-03-30 17:47:51');
INSERT INTO `user` VALUES ('101', '李四', '2', '35', '17025856329', '234ASD@#$@#$AFSDFRT', '2016-03-30 17:48:34');
INSERT INTO `user` VALUES ('102', '王五', '1', '48', '15925874536', '#$%SDFSDR@#$%@#$#@', '2016-03-30 17:53:49');

订单信息表
CREATE TABLE `order` (
  `order_id` int(11) NOT NULL COMMENT '订单编号',
  `uid` int(11) DEFAULT NULL COMMENT '用户Id',
  `amout` mediumtext NOT NULL COMMENT '订单金额(单位为分)',
  `status` tinyint(2) DEFAULT NULL COMMENT '订单状态',
  `order_time` datetime DEFAULT NULL COMMENT '订单时间',
  PRIMARY KEY (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `order` VALUES ('200', '100', '5899', '0', '2016-03-30 17:54:20');
INSERT INTO `order` VALUES ('201', '100', '6799', '0', '2016-03-30 17:54:38');
INSERT INTO `order` VALUES ('202', '101', '12699', '0', '2016-03-30 17:55:01');
```
数据库现在2张表的数据看起来是这样：
user表

| uid        | name           | sex  | age | mobile | password | register_time |
| ------------- |:-------------:| -----:|-----:|-----:|-----:|-----:|
|100| 张三|  1  | 28|  13547521456| password | 2016-03-30 17:47:51 |
|101 |李四 | 2 |  35 | 17025856329 | password | 2016-03-30 17:48:34 |
|102| 王五  |1|   48  |15925874536 | password  | 2016-03-30 17:53:49 |

order表

| order_id        | uid           | amout  | status | order_time |
| ------------- |:-------------:| -----:|-----:|-----:|-----:|
|200| 100 | 5899|    0 |  2016-03-30 17:54:20|
|201 | 100 | 6799 |   0  | 2016-03-30 17:54:38|
|202 | 101 | 12699 |  0   | 2016-03-30 17:55:01|

## 练习题

查询所有用户的订单信息，订单信息不能为空，要求返回的字段有：用户姓名、手机号码、订单号、订单状态、订单金额。

### left join VS right join
规律：

* A表 left join B表；则返回A表的所有符合条件(on条件、where条件)的记录。A表的字段不会为null，而B表没有对应记录时,字段值返回null。
* B表 left join A表；则返回B表的所有符合条件(on条件、where条件)的记录。B表的字段不会为null，而A表没有对应记录时,字段值返回null。

* A表 left join B表 等价于 B表 right join A表.
* A表 right join B表 等价于 B表 left join A表.

正确的SQL语句：
```
SELECT `user`.`name`,`user`.mobile,`order`.order_id,`order`.`status`,`order`.amout
 FROM `user` RIGHT JOIN `order` ON `user`.uid=`order`.uid

等价于

SELECT `user`.`name`,`user`.mobile,`order`.order_id,`order`.`status`,`order`.amout
 FROM `order` LEFT JOIN `user` ON `user`.uid=`order`.uid
```
结果集是：

| name        | mobile           | order_id  |status|amout|
| ------------- |:-------------:| -----:|-----:|-----:|
|张三|  13547521456| 200| 0   |5899|
|张三 | 13547521456 |201 |0  | 6799|
|李四  |17025856329 |202 |0 |  12699|

错误的SQL语句：
```
SELECT `user`.`name`,`user`.mobile,`order`.order_id,`order`.`status`,`order`.amout
 FROM `user` LEFT JOIN `order` ON `user`.uid=`order`.uid

等价于

SELECT `user`.`name`,`user`.mobile,`order`.order_id,`order`.`status`,`order`.amout
 FROM `order` RIGHT JOIN `user` ON `user`.uid=`order`.uid
```
结果集是：

| name        | mobile           | order_id  |status|amout|
| ------------- |:-------------:| -----:|-----:|-----:|
|张三 | 13547521456| 200| 0   |5899|
|张三  |13547521456 |201 |0   |6799|
|李四  |17025856329 |202 |0   |12699|
|王五  |15925874536 |null |null| null|

可以看出错误的SQL语句中，查出了没有订单的用户“王五”

### inner join
规律：

* A表 inner join B表；则返回A表和B表同时符合条件(on条件、where条件)的记录。

```
两种写法，后者使用的居多

SELECT `user`.`name`,`user`.mobile,`order`.order_id,`order`.`status`,`order`.amout
 FROM `order` INNER JOIN `user` ON `user`.uid=`order`.uid;

等价于

SELECT `user`.`name`,`user`.mobile,`order`.order_id,`order`.`status`,`order`.amout
 FROM `order`,`user` WHERE `user`.uid=`order`.uid;
```

### left outter join VS right outter join

left join 是left outer join的简写，left join默认是outer属性的。

在某些数据库(如Oracle)中， left join 称为 left outer join；相应的right join 称为 right outter join

### full join
* 在某些数据库中， FULL JOIN 称为 FULL OUTER JOIN。
* 只要其中某个表存在匹配，FULL JOIN 关键字就会返回行，意思是只需要有一个以上的表满足条件即可。
* Oracle 、DB2、SQL Server、PostgreSQL 支持 Full JOIN，但是 MySQL 是不支持的。
```
MySQL使用FULL JOIN报错
[Err] 1054 - Unknown column 'order.uid' in 'on clause'
```
* MySQL可以通过 LEFT JOIN + UNION + RIGHT JOIN 的方式 来实现Full JOIN。
```
select `user`.`name`,`user`.mobile,`order`.order_id,`order`.`status`,`order`.amout
 from `order` left join `user` on `user`.uid=`order`.uid
 union
select `user`.`name`,`user`.mobile,`order`.order_id,`order`.`status`,`order`.amout
 from `order` right join `user` on `user`.uid=`order`.uid;
```
### cross join
除了在FROM子句中使用逗号间隔连接的表外，SQL还支持另一种被称为交叉连接的操作，它们都返回被连接的两个表所有数据行的笛卡尔积，返回到的数据行数等于第一个表中符合查询条件的数据行数乘以第二个表中符合查询条件的数据行数。惟一的不同在于，交叉连接分开列名时，使用CROSS JOIN关键字而不是逗号。

实际上，下面两个表达式是完全等价的。
```
SELECT  *  FROM  table1, table2 WHERE table1.name=table2.name;
SELECT  *  FROM  table1  CROSS JOIN  table2 WHERE table1.name=table2.name;
```
在使用CROSS JOIN关键字交叉连接表时，因为生成的是两个表的笛卡尔积，因而不能使用ON关键字，只能在WHERE子句中定义搜索条件。

事实上，直接使用CROSS JOIN很少得到想要的结果，但是，正如实例所示，作为查询的第一步，DBMS通常在FROM子句中，对连接的表进行CROSS JOIN，然后过滤得到的中间表。
### union,union all
在数据库中，union和union all关键字都是将两个结果集合并为一个，但这两者从使用和效率上来说都有所不同。

union在进行表链接后会筛选掉重复的记录，所以在表链接后会对所产生的结果集进行排序运算，删除重复的记录再返回结果。

如：
 select * from test_union1
   union
 select * from test_union2

这个SQL在运行时先取出两个表的结果，再用排序空间进行排序删除重复的记录，最后返回结果集，如果表数据量大的话可能会导致用磁盘进行排序。而union all只是简单的将两个结果合并后就返回。这样，如果返回的两个结果集中有重复的数据，那么返回的结果集就会包含重复的数据了。从效率上说，union all要比union快很多，所以，如果可以确认合并的两个结果集中不包含重复的数据的话，那么就使用union all，

如下：
select * from test_union1
union all
select * from test_union2

使用 union 组合查询的结果集有两个最基本的规则：
1。所有查询中的列数和列的顺序必须相同。
2。数据类型必须兼容
### Apache Hive连接查询
Hive支持连接查询，但有一些条件必须遵守，比如只支持相等查询，其它查询如不等式查询则不支持，还支持外连接，左半连接查询。另外Hive支持多于两个表以上的连接查询。
* [Hive学习之连接查询](http://blog.csdn.net/skywalker_only/article/details/39205973)
* [Hive JOIN使用详解](http://shiyanjun.cn/archives/588.html)
### 结合explain进行执行分析
* [MySQL EXPLAIN 命令详解学习](http://blog.csdn.net/mchdba/article/details/9190771)