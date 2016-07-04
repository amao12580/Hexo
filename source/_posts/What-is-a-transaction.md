---
title: 当我们谈事务时，我们在谈什么？
date: 2016年6月1日13:03:33
tags:
    - Transaction
    - Spring
    - MVCC
    - WAL
    - RedoLog
    - UndoLog
    - RelayLog
    - Checkpoint
    - Redis
    - Gossip
    - Replication
categories:
    - Summary
description: 以MySQL数据库系统为例，数据被按页（16K）存储在磁盘中，如何组织数据的存储格式，由存储引擎来定义。在数据被插入或修改时，为了提高TPS，规避磁盘写入缓慢的问题，MySQL会将新数据页缓冲到内存（Insert Buffer），达到一定时间，或者积累的数据达到一定量级后，会由Master Thread刷入磁盘，同时清空缓冲区（CheckPoint机制）。在数据需要读取时，先从磁盘按页读取，如果有配置缓冲池，这些取出的数据还会在内存中留一个副本（FIX），只要数据不进行修改，下次读取时就会冲缓冲池命中了，大大加快了访问速度。
---

## 写在前面

写这篇文章的初衷是记录和总结关于事务的方方面面，还记得以前在面试高工时，被问到数据库事务的实现原理是什么？答了读写锁和表锁，以及myisam和innodb引擎在事务隔离级别的差异。当时面试官不是很满意，自然那家公司最终也没有谈成。面试完了，这个问题却一直萦绕在脑海中挥之不去，经过自己对存储引擎知识的补全，才知道原来事务是这样的妙不可言。如果读者需要对数据库事务进行系统的学习，我推荐一本书[《MySQL技术内幕  InnoDB存储引擎 第2版》](https://www.amazon.cn/MySQL%E6%8A%80%E6%9C%AF%E5%86%85%E5%B9%95-InnoDB%E5%AD%98%E5%82%A8%E5%BC%95%E6%93%8E-%E5%A7%9C%E6%89%BF%E5%B0%A7/dp/B00ETOV48K/ref=sr_1_1?s=digital-text&ie=UTF8&qid=1465707176&sr=1-1&keywords=MySQL%E6%8A%80%E6%9C%AF%E5%86%85%E5%B9%95%EF%BC%9AInnoDB%E5%AD%98%E5%82%A8%E5%BC%95%E6%93%8E)。

讨论传统关系型数据库内的事务，以及如何与NoSQL领域结合进行事务化。

## 什么是事务？

数据库事务（简称：事务）是数据库管理系统执行过程中的一个逻辑单位，由一个有限的数据库操作序列构成。这是使用Google Search以“事务”为关键字查找时，第一条是wikipedia给出的描述。通俗地讲，事务就是通过一系列操作来完成一件事情，在进行这些操作的过程中，要么这些操作完全执行，要么这些操作全不执行，不存在中间状态，事务分为事务执行阶段和事务提交阶段。

### 与文件系统的差异

以MySQL数据库系统为例，数据被按页（16K）存储在磁盘中，如何组织数据的存储格式，由存储引擎来定义。在数据被插入或修改时，为了提高TPS，规避磁盘写入缓慢的问题，MySQL会将新数据页缓冲到内存（Insert Buffer），达到一定时间，或者积累的数据达到一定量级后，会由Master Thread刷入磁盘，同时清空缓冲区（CheckPoint机制）。在数据需要读取时，先从磁盘按页读取，如果有配置缓冲池，这些取出的数据还会在内存中留一个副本（FIX），只要数据不进行修改，下次读取时就会冲缓冲池命中了，大大加快了访问速度。

一般存储引擎都是采用 btree 或者 lsm tree 来实现索引，但是索引的最小单位不是 K/V 记录对象，而是数据页，数据页的组织关系实现就是存储引擎的数据组织方式。

传统数据库引擎大都是设计一个磁盘和内存完全一样的数据组织方式,这个结构是固定的空间大小（innodb 的 page 是 16KB）,访问它必须遵守严格的 The FIX Rules 规则：1.
修改一个 page 需要获得该页的 x-latch lock，2.访问一个 page 需要获得该页的 s-latch lock 或者 x-latch lock。3.持有该 page 的 latch 直到修改或者访问该页的操作完成 latch unlock。

看到这里，我们不经有疑问，在内存与磁盘上，读、写、组织数据，这不是文件系统在干的事情吗？的确，在NTFS、Ext4等文件系统中，这些功能都是被支持的。数据库系统是基于文件系统（Base-on-disk）的，按照不同文件系统(包括不同的操作系统内存分配算法)，在底层调用了不同的API进行数据的读、写、组织。但它最重要的特性是事务的支持，允许有限个的数据库操作进行逻辑单元化，解决文件系统访问无状态的问题。同时也是由于事务一致性的支持，数据库系统相较于文件系统的性能普遍是下降的，隔离级别的支持越高（更强的一致性），性能下降越是厉害。

## 本地事务

不同的数据库系统有不同的事务行为。有些数据库系统根本不支持事务。有些数据库系统支持事务，但是不支持双向提交（2PC）协议。这类事务被称为支持本地事务。有些数据库系统既支持本地事务，又支持 2PC。这类事务被称为支持分布式事务，或者全局事务。全局事务也被称为 XA 事务，因为它们包含 XAResource接口。

### ACID

一般说到事务，就会想到它的特性— ACID，那么什么是 ACID 呢？我们先用一个现实中的例子来说明：AB 两同学在同一家银行ZSBANK的账号都有 1,000 块钱，A 通过ZSBANK银行转账向 B 转了 100 块钱，这个事务分为两个操作,即从 A 同学账号扣除 100，向 B 同学账号增加 100。

对于应用层程序的同一个线程X来说，逻辑伪码如下：

```
//定义转账金额
double transferAmount=100.00;

//1.开始事务

//2.检查A同学账户余额是否大于100元
double balanceForA=select account.balance from account where uid=A;
if(transferAmount>balanceForA){
    return new ErrorResult(100,"账户余额不足.");
}

//3.将A同学账户扣款100元
int deductRet=update account set balance=balance-transferAmount where uid=A and balance >=transferAmount;
if(deductRet==1){
    LogHelper.info("account A deduct "+transferAmount+" success.");
}else{
    return new ErrorResult(200,"账户扣款失败.");
}

//4.将B同学账户增加100元
int deductRet=update account set balance=balance+transferAmount where uid=B;
if(deductRet==1){
    LogHelper.info("account B add "+transferAmount+" success.");
}else{
    return new ErrorResult(300,"账户增加余额失败.");
}

//5.提交事务

//6.如果遭遇数据库异常(SQLException)，回滚事务

//7.返回处理结果
```

那在没有事务的情况下会发生什么呢？在步骤1中，同时有2个线程X、Y，线程X先执行查询，发现余额充足，可以扣款，还没有进行步骤2时，Y此时将款项先扣除了，导致X线程的步骤2失败。其他的，在执行的任一阶段，都有可能遭遇不可抗力因素，比如，执行完步骤2，还未执行步骤3时，适逢操作系统crash或断电、存储介质失败等情况，此时没有事务的一致性保证，在系统恢复时将无法回滚，导致数据不一致。

Lost update：
两个事务都同时更新一行数据，但是第二个事务却中途失败退出，导致对数据的两个修改都失效了。

Dirty Reads：
一个事务开始读取了某行数据，但是另外一个事务已经更新了此数据但没有能够及时提交。这是相当危险的，因为很可能所有的操作都被回滚。

Non-repeatable Reads：
一个事务对同一行数据重复读取两次，但是却得到了不同的结果。

Second lost updates problem：
无法重复读取的特例。有两个并发事务同时读取同一行数据，然后其中一个对它进行修改提交，而另一个也进行了修改提交。这就会造成第一次写操作失效。

Phantom Reads：
事务在操作过程中进行两次查询，第二次查询的结果包含了第一次查询中未出现的数据（这里并不要求两次查询的SQL语句相同）。这是因为在两次查询过程中有另外一个事务插入数据造成的。

#### 原子性（Atomicity）

不可拆分，组成事务的系列操作是一个整体，要么全执行，要么不执行，不允许部分执行。通过上面例子就是从 A 同学扣除钱和向 B 同学增加 100 是一起发生的，不可能出现扣除了 A 的钱，但没增加 B 的钱的情况。

#### 一致性（Consistency）

一致性指的是语义上的一致性，即业务逻辑层面的一致。在事务开始之前和事务结束以后，数据库的完整性和状态没有被破坏，而在事务执行阶段，一致性是会被破坏的。这个怎么理解呢？就是 A、B 两人在转账钱的总和是 2,000，转账后两人的总和也必须是 2,000。不会因为这次转账事务破坏这个状态。如果帐户A上的钱减少了，而帐户B上的钱却没有增加(如在执行步骤3时失败)，那么我们认为此时数据处于不一致的状态。

在事务处理的ACID属性中，一致性是最基本的属性，其它的三个属性都为了保证一致性而存在的。MySQL数据库innodb的事务，是通过redo log（innodb log)，undo log，锁机制，来维护这个一致性的。

#### 隔离性（Isolation）

多个事务在并发执行时，事务执行的中间状态是其他事务不可访问的。A 转出 100 但事务没有确认提交，这时候银行人员对其账号查询时，看到的应该还是 1,000，不是 900。

#### 持久性（Durability）

事务一旦提交生效，其结果将永久保存，不受任何故障影响。A 转账一但完成，那么 A 就是 900，B 就是 1,100，这个结果将永远保存在银行的数据库中，直到他们下次交易事务的发生。

### 4种Log
4种Log指的是：redo log、undo log、bin log 、relay log

日志在内存里也是有缓存的，这里将其叫做log buffer。磁盘上的日志文件称为log file。log file一般是追加内容，可以认为是顺序写，顺序写的磁盘IO开销要小于随机写。

Undo log记录某数据被修改前的值，可以用来在事务失败时进行rollback；redo log记录某数据块被修改后的值（按页记录），可以用来恢复未写入data file的已成功事务更新的数据。undo log和redo log 都有持久化的要求，两者的共同协作实现了事务持久化要求，不论是否遭遇宕机，数据库实例在启动时都会检查是否存在数据不一致，这与redis启动时检查AOF文件是类似的。

Undo log除了在rollback事务时用到，另外还在MVCC机制中使用，它按页记录了每一个事务版本在开始时需要用到的数据版本，因此同样的数据页，在undo log中可能存在多个版本，因此undo log需要支持随机读（redo log不需要）。在事务提交后，undo log对应的数据页不再有用了，但不会被立即清除，MySQL内部线程架构中，有Purge Thread专门对它进行定时清理。具体触发清理的机制是比较复杂的。

MySQL Innodb引擎采用 WAL（Write-Ahead Log）方式写入redo log，WAL通俗点说就是说在事务所有数据修改提交前，需要先将其对应的操作日志追加写入磁盘文件（AOF：append only file），以便出现意外可以恢复（所以redo log也叫做重放日志）,这样就达到了持久性的要求。此外鼎鼎大名的MongoDB（WiredTiger存储引擎）、SQLite也采用了WAL机制。

Bin log的提出主要是面向于MySQL的Replication架构，在多个MySQL节点间，需要一种机制对节点间的数据进行同步。例如在Master-Slave模式下，Master节点每次对数据库进行一次修改操作（DML SQL），就记录这些SQL语句到Master节点本机的bin log文件中，Slave节点会定期访问Master节点的bin log，并按照上次最后一次读取的position值，读取后续的字节，读取后的字节先放在Slave节点的本地relay log中（AOF），由Slave本机的SQL线程重放到Slave实例，重放时Slave也会记录bin log，至此就完成了同步。Redis也采用了类似的多节点数据增量同步方案，详情请查阅[Gossip算法](http://www.distorage.com/%E5%88%86%E5%B8%83%E5%BC%8F%E7%B3%BB%E7%BB%9F%E6%8A%80%E6%9C%AF%E7%B3%BB%E5%88%97-gossip%E7%AE%97%E6%B3%95/?utm_source=tuicool&utm_medium=referral)。

Master节点也可以触发强制Slave进行一次同步，如果Slave节点下面不再挂其他MySQL节点，Slave节点可以关闭bin log，这依据Master-Slave的配置来决定。

Bin log与redo log的主要不同体现在，redo log只记录由Innodb存储引擎产生的事务重放日志，它是按数据页进行存储的。而bin log记录了所有类型的存储引擎执行的DML SQL语句。最后一点是，redo log总是在事务进行中持续顺序写入磁盘，而bin log只在DML SQL提交后写入一次。如果没有使用事务，执行DML SQL时，bin log file会产生日志，而redo log file无变化。

为了减少日志刷盘造成写IO压力，Innodb对redo log和bin log的刷盘操作做了大量优化，使用组提交（Group commit）的刷盘方式来提高性能，同是使用prepare lock保证redo log和bin log的顺序一致性（prepare_commit_mutex 配置项）。

### Checkpoint机制

Checkpoint是为了定期将db buffer的内容刷新到data file。当遇到内存不足、db buffer已满等情况时，需要将db buffer中的内容/部分内容（特别是脏数据）转储到data file中。在转储时，会记录checkpoint发生的”时刻“。在故障回复时候，只需要redo/undo最近的一次checkpoint之后的操作。

### 逻辑事务 VS 物理事务
在谈逻辑与物理时，经常说到“逻辑删除”/“物理删除”、“逻辑地址”/“物理地址”，那逻辑事务与物理事务又是什么呢？

一般而言，所谓的数据库事务都是针对单个数据库的事务，即单库事务。而跨库事务，顾名思义，是指涉及多个数据库的事务，理论上也必须满足ACID属性。两者最核心的区别在于，单库事务一般是由数据库保证的，俗称物理事务，而跨库事务一般是由应用保证的，俗称逻辑事务。与单库事务相比，跨库事务执行成本高，稳定性差，管理也更复杂，但在某些场景下，尤其是分布式应用环境下，又是不得不使用的技术。

再举个栗子，单库事务好比你从北京飞上海，到东航官网买张票就搞定了，而跨库事务好比北京飞纽约，到上海转机，就得买东航转上航的联票，出票就转由携程保证了。

而在Spring中，事务分为物理事务和逻辑事务；
物理事务：就是底层数据库提供的事务支持，如JDBC或JTA提供的事务；
逻辑事务：是Spring管理的事务，不同于物理事务，逻辑事务提供更丰富的控制，而且如果想得到Spring事务管理的好处，必须使用逻辑事务，因此在Spring中如果没特别强调一般就是逻辑事务；

物理事务和逻辑事务最大差别就在于事务传播行为，事务传播行为用于指定在多个事务方法间调用时，事务是如何在这些方法间传播的

逻辑事务即支持非常低级别的控制，也有高级别解决方案：

#### 低级别解决方案
工具类：使用工具类获取连接（会话）和释放连接（会话），如使用org.springframework.jdbc.datasource包中的ConnectionUtils类来获取和释放具有逻辑事务功能的连接。当然对集成第三方ORM框架也提供了类似的工具类，如对Hibernate提供了SessionFactoryUtils工具类，JPA的EntityManagerFactoryUtils等，其他工具类都是使用类似***Utils命名；

#### 高级别解决方案
模板类：使用Spring提供的模板类，如JdbcTemplate、HibernateTemplate和JpaTemplate模板类等，而这些模板类内部其实是使用了低级别解决方案中的工具类来管理连接或会话；

### 编程式事务 VS 声明式事务
Spring提供两种编程式事务支持：直接使用PlatformTransactionManager实现和使用TransactionTemplate模板类，用于支持逻辑事务管理。
如果采用编程式事务推荐使用TransactionTemplate模板类和高级别解决方案。

### 事务隔离级别

#### 默认隔离级别

##### 不同ORM框架的默认隔离级别

##### 不同DB Proxy的默认隔离级别

##### 不同RDBMS的默认隔离级别

MySQL InnoDB Default：可重复读

Oracle Default：读已提交

不同存储引擎的默认隔离级别

### 事务传播行为

Spring 事务传播行为

#### 默认传播行为

### RDBMS如何权衡事务隔离与高并发读写？

#### MVCC与Free Lock

多线程环境下各种数据结构的实现有了很大的变化，每当我们更新某个数据的时候，我们都要考虑其它线程是否对其进行了修改。最简单的一种方法就是加锁，不过加锁会导致性能低下，而且可能阻塞其他线程。因此，我们引入了非阻塞(non-blocking)的算法 —— 通过CAS（Compare & Set，或是Compare & Swap）操作保证操作的原子性，同时我们还引入了 lock-free 的概念，它指的是一个线程出现问题（如阻塞，失败）但不影响其他线程（从总体看程序仍然是在运行的）

CPU：CAS_ADD

##### 共享锁

##### 排它锁

##### 间隙锁

### 在主从架构下RDBMS如何保证事务？

### 在双主架构下RDBMS如何保证事务？

### 双活数据中心的事务管理

## 分布式事务

### 2PC

### 3PC

### 拜占庭将军问题/两军问题

### 事务解耦

### 事务补偿

### 事务回滚

### 最终资源一致性

### 与nosql

#### MongoDB如何实现事务？
##### 表锁与行锁

#### Redis如何实现事务？
##### 串行化
###### Redis与MVCC实现Free Lock

HBase，couchBase，leveldb

### 阿里DTS

## Reference
- 《MySQL技术内幕：InnoDB存储引擎（第2版）》

- [数据库事务-维基百科](https://zh.wikipedia.org/wiki/%E6%95%B0%E6%8D%AE%E5%BA%93%E4%BA%8B%E5%8A%A1)
- [拜占庭将军问题](https://zh.wikipedia.org/wiki/%E6%8B%9C%E5%8D%A0%E5%BA%AD%E5%B0%86%E5%86%9B%E9%97%AE%E9%A2%98)
- [7-10倍写入性能提升:剖析WiredTiger数据页无锁及压缩黑科技](http://weibo.com/ttarticle/p/show?id=2309403992797932856430)