---
title: MySQL集锦 - IN 真会导致全表扫描吗？
date: 2016年7月4日14:57:19
tags:
    - MySQL
    - SQL
categories: CodeReview
description: 起始发布的文章是针对SQL server数据库的47条优化建议，已经太过久远，这些优化技巧是否还完全适用现今的数据库呢？更别提是否还适用于MySQL数据库了。我猜想是哪位“DBA大牛”应付交差，东抄一段西抄一段放上网，哪想到会有人当了真，更惨的是还完全信了。还真是：尽信书，不如无书。干我们这行，获取信息很容易，但甄别信息很难，希望大家引以为戒。
---

# 写在前面

项目版本迭代慢了下来，有了段空闲时间，就对近些阶段的代码进行Code review，主要还是保持设计正确性和提高易维护性吧。

# 有意思的代码
由于积累了数个里程碑，review的工作量还挺大，我们分工协作，我这块主要看推荐模块，发现了几段有意思的代码，贴出来看看吧。

```
Result<Record1<Integer>> ids = create.select(SITING_OPPORTUNITY_DISTRICT.OPPORTUNITY_ID).
        from(SITING_OPPORTUNITY_DISTRICT).
        where(SITING_OPPORTUNITY_DISTRICT.DISTRICT_ID.like(districtId + "%")).
        groupBy(SITING_OPPORTUNITY_DISTRICT.OPPORTUNITY_ID).
        fetch();
Set<Integer> opportunityIds = new HashSet<>(ids.size());
for (Record1<Integer> r : ids) {
    opportunityIds.add(r.getValue(SITING_OPPORTUNITY_DISTRICT.OPPORTUNITY_ID));
}
if (opportunityIds.size() == 1) {
    condition = condition.and(SITING_OPPORTUNITY.OPPORTUNITY_ID.eq(getSetFirstElement(opportunityIds)));
} else {
    condition = condition.and(SITING_OPPORTUNITY.OPPORTUNITY_ID.in(opportunityIds));
}

```

这段代码的大意是：在MySQL数据库，表SITING_OPPORTUNITY_DISTRICT中，查询符合DISTRICT_ID字段条件的不重复OPPORTUNITY_ID字段，将这些字段放到一个集合。为描述方便，这个集合下文用ids代替。

1.如果ids的大小等于一，则拼上了一个SQL where条件，使用equal过滤ids中的第一个元素值，我们称这个SQL为A。

```
SQL A template

SELECT * FROM SITING_OPPORTUNITY WHERE OPPORTUNITY_ID=?;
```

2.如果ids的大小大于一，则拼上了一个SQL where条件，使用in过滤ids中的所有元素值，我们称这个SQL为B。

```
SQL B template

SELECT * FROM SITING_OPPORTUNITY WHERE OPPORTUNITY_ID in(?,?,?,?,?...);
```

# 存疑

项目中，类似这样的写法大概有10多处，都是按照集合大小来动态build SQL语句。ids的大小是跟用户的个性化数据有关的，统计了一下，超过70%的用户数据，ids大小是小于等于一的，所以这样调整代码的目的是为了降低全表扫描的概率？问了一下，得到确定的答复！但是SITING_OPPORTUNITY表在数据库结构设计评审时，已经加上了UNIQUE索引，为什么还需要这样写代码呢？难道MySQL强大的SQL优化器不能自动来完成？非得要在应用层来做？

```
目标表SITING_OPPORTUNITY结构示意：

CREATE TABLE `siting_opportunity` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `opportunity_id` int(11) NOT NULL DEFAULT '0' COMMENT '商机ID',
  `industry_id` int(11) NOT NULL DEFAULT '0' COMMENT '行业id',
  `min_area` int(11) NOT NULL DEFAULT '0' COMMENT '最小面积',
  `max_area` int(11) NOT NULL DEFAULT '0' COMMENT '最大面积',
  `min_rent` bigint(15) NOT NULL DEFAULT '0' COMMENT '最小租金',
  `max_rent` bigint(15) NOT NULL DEFAULT '0' COMMENT '最大租金',
  `is_deal` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否成交。0=未成交；1=已成交',
  `slogan` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '广告语',
  PRIMARY KEY (`id`),
  UNIQUE KEY `opportunity_id` (`opportunity_id`),
  KEY `fk_sitingOpportunity_industry` (`industry_id`),
  CONSTRAINT `fk_sitingOpportunity_industry` FOREIGN KEY (`industry_id`) REFERENCES `industry` (`code`) ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='选址商机表';

```

# 解谜

我们绝大多数人，对in操作是否会带来全表扫描开销，还停留在MySQL很古老的版本认识上。网上一篇[30条SQL优化军规](http://itindex.net/detail/55421-mysql-sql-%E8%AF%AD%E5%8F%A5)流传甚广，大多数人奉此为神道。

其中有一条这样描述：“5.in 和 not in 也要慎用，否则会导致全表扫描”，但没说为什么这样认为，以及面向的MySQL版本和配置也没有说明。

这句话在Google上查询，至少在2004年7月就已经发布到网上了，起始发布的站点出自[《SQL语句优化原则\_Sql Server\_何问起》](http://hovertree.com/h/bjaf/u935eb54.htm)，整整12年过去了，还有很多圈内知名IT站点在发布同样的文章。

* segmentfault：[《mysql语句优化建议-2016年4月26日发布》](https://segmentfault.com/a/1190000005008401)


* 红黑联盟：[《数据库查询优化方法总结-2016年6月1日发布》](http://www.2cto.com/database/201606/514022.html)

首先，起始发布的文章是针对SQL server数据库的47条优化建议，已经太过久远，这些优化技巧是否还完全适用现今的数据库呢？更别提是否还适用于MySQL数据库了。我猜想是哪位“DBA大牛”应付交差，东抄一段西抄一段放上网，哪想到会有人当了真，更惨的是还完全信了。还真是：尽信书，不如无书。干我们这行，获取信息很容易，但甄别信息很难，希望大家引以为戒。

# 求是
怀抱求是精神，我们一起来实践，看看MySQL对于IN操作符的处理。

下文中用的MySQL版本：5.7.13 windows x64 解压安装版.

```
MySQL配置文件:

[client]
default-character-set=utf8
[mysql]
default-character-set=utf8
[mysqld]
########basic settings########
#skip-grant-tables,默认注释掉。重置root密码时用得上：http://www.apelearn.com/bbs/thread-9205-1-1.html
#skip-grant-tables

skip-ssl
secure-file-priv = NULL
#服务器唯一ID，默认是1，一般取IP最后一段
log-bin=mysql-bin
server-id = 100
port = 3306
user = mysql
bind_address = 127.0.0.1
autocommit = 0
#character_set_server=utf8mb4
character_set_server=utf8
skip_name_resolve = 1
max_connections = 8000
max_connect_errors = 10000
basedir ="F:\mysql/"
datadir ="F:\mysql/data/"
tmpdir ="F:\mysql/temp/"
socket ="F:\mysql/data/mysql.sock"
pid-file="F:\mysql/data/current.pid"
transaction_isolation = READ-COMMITTED
explicit_defaults_for_timestamp = 1
join_buffer_size = 134217728
tmp_table_size = 67108864
max_allowed_packet = 128MB
sql_mode = "STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER"
interactive_timeout = 1800
wait_timeout = 1800
read_buffer_size = 16777216
read_rnd_buffer_size = 33554432
sort_buffer_size = 33554432
########log settings########
log-error="F:\mysql/log/error/error.log"
slow_query_log = ON
slow_query_log_file = "F:\mysql/log/slow/slow.log"
log_queries_not_using_indexes = 1
log_slow_admin_statements = 1
log_slow_slave_statements = 1
log_throttle_queries_not_using_indexes = 10
#保留7天的日志
expire_logs_days = 7
#记录执行时间超过5秒的慢查询
long_query_time = 5
min_examined_row_limit = 100
########replication settings########
master_info_repository = TABLE
relay_log_info_repository = TABLE
log_bin = bin.log
sync_binlog = 1
gtid_mode = on
enforce_gtid_consistency = 1
log_slave_updates
binlog_format = row
relay_log = relay.log
relay_log_recovery = 1
binlog_gtid_simple_recovery = 1
slave_skip_errors = ddl_exist_errors
########innodb settings########
innodb_page_size = 16384
#innodb_buffer_pool_size = 6G
innodb_buffer_pool_instances = 8
innodb_buffer_pool_load_at_startup = 1
innodb_buffer_pool_dump_at_shutdown = 1
innodb_lru_scan_depth = 2000
innodb_lock_wait_timeout = 5
innodb_io_capacity = 4000
innodb_io_capacity_max = 8000
#innodb_flush_method = O_DIRECT
innodb_flush_method=normal
#innodb_file_format = Barracuda
#innodb_file_format_max = Barracuda
innodb_log_group_home_dir = "F:\mysql/log/redolog\"
innodb_undo_directory = "F:\mysql/log/undolog/"
innodb_undo_logs = 128
innodb_undo_tablespaces = 3
innodb_flush_neighbors = 0
#innodb_log_file_size = 4G
innodb_log_file_size = 256MB
innodb_log_buffer_size = 16777216
innodb_purge_threads = 4
innodb_large_prefix = 1
innodb_thread_concurrency = 64
innodb_print_all_deadlocks = 1
innodb_strict_mode = 1
innodb_sort_buffer_size = 67108864
innodb_flush_log_at_trx_commit = 2
########semi sync replication settings########
plugin_dir="F:\mysql/lib/plugin"
plugin_load = "rpl_semi_sync_master=semisync_master.dll;rpl_semi_sync_slave=semisync_slave.dll"
loose_rpl_semi_sync_master_enabled = 1
loose_rpl_semi_sync_slave_enabled = 1
loose_rpl_semi_sync_master_timeout = 5000

[mysqld-5.7]
innodb_buffer_pool_dump_pct = 40
innodb_page_cleaners = 4
innodb_undo_log_truncate = 1
innodb_max_undo_log_size = 2G
innodb_purge_rseg_truncate_frequency = 128
binlog_gtid_simple_recovery=1
log_timestamps=system
#transaction_write_set_extraction=MURMUR32
show_compatibility_56=on

```

先用show index from siting_opportunity;语句查看一下索引情况。

![](/img/showIndexFromSitingOpportunity.png)
由于索引opportunity_id（key_name）是unique类型，可以看到其散列程度（Cardinality）是非常高的，因此该索引是很有效的。相应的该表的记录数是：476772行。

## Unique索引
先看在表SITING_OPPORTUNITY，OPPORTUNITY_ID字段的处理情况。
![](/img/userUniqueIndex.png)
明显的可以看到，MySQL优化器是选择了索引，没有进行全表扫描，而且rows也为7。

## 主键索引
我们知道主键一定是唯一性索引,那情况应该跟上一节差不多？动动手吧！
![](/img/userPrimaryIndex.png)
情况确实跟Unique索引差不多，pass！

## 外键索引
在设置外键时，数据库会同时为这个字段设置一个普通索引，所以外键的设置也应该遵循索引的设置策略。
![](/img/useFKIndex.png)
使用外键字段时，使用in操作符，也使用了索引。


## 普通索引
我们换一个有普通索引，但该字段不是外键的表来验证。
![](/img/userNormalIndex.png)

# 思考

1.在in操作中，集合体积过大时，索引还会生效吗？

2.在嵌套查询中，内层查询使用in，是否会有效率问题？

# 总结
本文中的存储引擎都是innodb，因时间有限，没有对Myisam等其他存储引擎进行类似实验，希望动手能力强的你可以完成！

MySQL在2010年发布5.5版本中，优化器对in操作符可以自动完成优化，应用层不需要再进行画蛇添足啦，当然优化的精神是可嘉的，但在猜测中进行的优化可能与实际背离甚远！

互联网上的信息太过广泛，但这不应该成为我们掉以轻心的借口，抱着存疑求是的精神进行甄别，任何信息只有在我们实践验证后方可全信，用在生产开发上的知识，不容有失！