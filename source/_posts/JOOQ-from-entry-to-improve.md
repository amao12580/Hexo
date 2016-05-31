---
title: JOOQ 3.8.2 使用 教程：从入门到提高
date: 2016年3月31日14:00:22
tags:
    - JOOQ
    - SQL
    - ARM
    - ORM
    - Transaction
categories:
    - Learning
description: JOOQ (Java Object Oriented Querying) 作为ORM框架，其原理是：在DAO层使用Java语言编写SQL语句，在Intellij IDEA的辅助下，复杂SQL的维护变得很容易。通过内部SQL Builder转换成数据库可执行的SQL文本，使用数据库驱动，提交SQL到RDBMS执行，接受处理结果，转换为POJO，返回到应用层。
---

## 写在前面

2016年后换了一家公司干，后台ORM框架用的JOOQ，完全陌生的东西。干这一行越久，越觉得有更多有趣的新事物需要去探索。想起小说[《火星救援》](https://book.douban.com/subject/26586492/)，Mark侥幸在火星风暴中幸存后，一步步将自己救出困境，遇到的难题或大或小，皆有优雅解决之法。一切看似偶然蹊跷，其实与Mark的长期知识储备分不开。所谓艺多不压身，应该在有限的时间里，得到更多成长，以期待机会来时不辜负。

下文中的学习示例代码，已经整理完毕：

* 原味基础学习：[https://github.com/amao12580/JOOQ](https://github.com/amao12580/JOOQ)

* 与Spring深度整合：[https://github.com/amao12580/JOOQ-With-Spring](https://github.com/amao12580/JOOQ-With-Spring)

## 什么是JOOQ？
[JOOQ](http://www.jooq.org/)，全称Java Object Oriented Querying，即面向Java对象查询。它是[Data Geekery](http://www.datageekery.com/)公司研发的DA方案(Data Access Layer)，主要解决两个问题：

1. Hibernate的抽象使得我们离SQL太远，对SQL的掌控力度弱
2. JDBC又过于嘈杂，需要干的事情太多

JOOQ希望干的就是在上述两者中寻找一个最佳的平衡。它依据数据库中的表生成DA相关的代码，开发者将生成的代码引入项目中即可使用。

有好几个版本

* OpenSource
* Express
* Professional
* Enterprise

OpenSource版本针对开源数据库，已经够用了。其它的几个版本针对非开源数据库，差异在于不同的后续支持。

想了解各版本的更多区别，跟我一起看吧。

* http://www.jooq.org/legal/licensing

* http://www.jooq.org/download/

JOOQ作为ORM框架，其原理是：在DAO层使用Java语言编写SQL语句，在Intellij IDEA的辅助下，复杂SQL的维护变得很容易。通过内部SQL Builder转换成数据库可执行的SQL文本，使用数据库驱动，提交SQL到RDBMS执行，接受处理结果，转换为POJO，返回到应用层。

它与Hibernate不同，不依赖使用字符串变量在Java代码中拼接SQL语句。在复杂SQL语句中，与变量的组合拼接时，SQL被割裂成多个部分，失去了宝贵的可读性，这简直是噩梦。而且Hibernate饱受诟病的连接查询配置复杂以及HQL语法的问题，在JOOQ中不复存在。

它与Mybatis不同，不依赖繁琐分散的XML进行SQL预定义。代码与SQL语句的分离，初衷是为了解决SQL嵌入代码时带来不直观的复杂性，但是分离的代价是维护工作倍增以及类型转换问题，经常遭遇到应用层代码变更，而XML定义未同步变更，IDE几乎无法解决。又或者开发人员改动一个XML文件，却意外影响多处上层代码，而这个问题很难避免。

更进一步的，JOOQ提供原生的类型安全转换，以及POJO维护，免去大量一次性代码的编写。当然，你也可以使用Eclipse[代码生成插件](http://my.oschina.net/lujianing/blog/200135)解决这个问题，但是如果ORM能自动解决(结合Maven Plugin)，为什么拒绝呢？

使用这种DAO模式，可以通过类的方式来进行数据库访问了。而且对SQL控制粒度加大的同时，维护工作并没有因此倍增，这对于开发人员是更好的解决方案，也是未来的趋势。

```
使用JOOQ进行2张表内连接查询示例

// Typesafely execute the SQL statement directly with jOOQ
Result<Record3<String, String, String>> result =
create.select(BOOK.TITLE, AUTHOR.FIRST_NAME, AUTHOR.LAST_NAME)
    .from(BOOK)
    .join(AUTHOR)
    .on(BOOK.AUTHOR_ID.equal(AUTHOR.ID))
    .where(BOOK.PUBLISHED_IN.equal(1948))
    .fetch();
```

### VS 主流ORM框架
* [JOOQ vs. Hibernate: When to Choose Which](http://blog.jooq.org/2015/03/24/jooq-vs-hibernate-when-to-choose-which/)
* [SQL Templating with jOOQ or MyBatis](http://blog.jooq.org/2013/07/13/sql-templating-with-jooq-or-mybatis/)
### 优势和局限性

优势

* JOOQ 高效的合并了复杂SQL、[类型安全](http://blog.jooq.org/2015/05/26/type-safe-queries-for-jpas-native-query-api/)、[源码生成](#Code-Generation)、Active Records、存储过程以及高级数据类型的 Java 类库。支持DB2, Derby, Ingres, H2, HSQLDB, MySQL, Oracle, Postgres, SQLite, SQL Server, Sybase。

局限性

* 开发人员需要转换思维，接受新事物，May be better？

## 入门篇
### With MySQL
```
<!--MySQL JDBC driver, 数据库迁移等情况下需要. -->
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <version>5.1.36</version>
</dependency>
```
### Code Generation

```
<!--数据库schema代码生成器 -->
<dependency>
    <groupId>org.jooq</groupId>
    <artifactId>jooq-codegen</artifactId>
    <version>3.8.2</version>
</dependency>

<!--数据库代码生成的插件 -->
<plugin>
    <!-- Specify the maven code generator plugin -->
    <groupId>org.jooq</groupId>
    <artifactId>jooq-codegen-maven</artifactId>
    <version>3.8.2</version>
    <!-- The plugin should hook into the generate goal -->
    <executions>
        <execution>
            <goals>
                <goal>generate</goal>
            </goals>
        </execution>
    </executions>
    <configuration>
        <!-- JDBC connection parameters -->
        <jdbc>
            <driver>com.mysql.jdbc.Driver</driver>
            <url>${db.url}</url>
            <user>${db.username}</user>
            <password>${db.password}</password>
        </jdbc>
        <!-- Generator parameters -->
        <generator>
            <database>
                <name>org.jooq.util.mysql.MySQLDatabase</name>
                <includes>.*</includes>
                <inputSchema>${db.schema}</inputSchema>
                <forcedTypes>
                    <forcedType>
                        <name>BOOLEAN</name>
                        <expression>.*\.HANDMADE</expression>
                        <types>.*</types>
                    </forcedType>
                </forcedTypes>
            </database>
            <target>
                <packageName>com.study.jooq.common.generated</packageName>
                <directory>src/main/java</directory>
            </target>
        </generator>
    </configuration>
</plugin>
```
### With Flyway

Flyway 是独立于数据库的应用、管理并跟踪数据库变更的数据库版本管理工具。

[Flyway， 数据库Schema管理利器](http://www.cnblogs.com/huang0925/p/4409506.html)

在pom.xml的配置
```
<properties>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>

    <!--防止maven改动IDE的language level -->
    <maven.compiler.source>1.8</maven.compiler.source>
    <maven.compiler.target>1.8</maven.compiler.target>

    <!--数据库迁移所用的参数 -->
    <db.url>jdbc:mysql://localhost:3306</db.url>
    <db.username>root</db.username>
    <db.password>********</db.password>
    <db.schema>study</db.schema>
</properties>

<!--数据库迁移, 同步的插件 -->
<plugin>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-maven-plugin</artifactId>
    <version>3.0</version>
    <!-- Note that we're executing the Flyway plugin in the "generate-sources" phase -->
    <executions>
        <execution>
            <phase>generate-sources</phase>
            <goals>
                <goal>migrate</goal>
            </goals>
        </execution>
    </executions>
    <!-- Note that we need to prefix the db/migration path with filesystem:
    to prevent Flyway from looking for our migration scripts only on the classpath -->
    <configuration>
        <url>${db.url}</url>
        <user>${db.username}</user>
        <password>${db.password}</password>
        <encoding>${project.build.sourceEncoding}</encoding>
        <schemas>
            <schema>${db.schema}</schema>
        </schemas>
        <locations>
            <location>filesystem:src/main/resources/db/migration</location>
        </locations>
    </configuration>
</plugin>
```
在工程：src/main/resources/db/migration目录下，没有目录文件夹时需要先创建文件夹。放入数据库初始化SQL脚本：V1__init_database.sql。注意在maven中配置的db.schema=study，表明需要使用的数据库名称是study，study需要事先不存在。

执行maven -clean、maven -install成功后，发现数据库有了新的数据库study，并且该数据库有了order、user、schema_version三张表，user、order是我们在脚本中定义需要生成的表，而schema_version是flyway生成的，维护数据库版本升级时的信息。对应的在代码中，生成了三个POJO。

代码生成示例：
![IDEA使用JOOQ自动生成代码](/img/jooq-flyway.png)

### With HikariCp
HikariCP号称是现在性能最好的JDBC连接池组件，具体的性能到底如何，我也没有仔细的测试过，不过从它现在的发展来看，其可能确实如它宣传的那样其性能高过目前所有的连接池组件。之前对连接池的记忆一直都是C3P0、DBCP、BoneCP，这三者中BoneCP的性能是最好的，C3P0的性能在现在来说确实是非常差的了，好像C3P0很久都没有更新了，所以我们应该杜绝在项目中使用C3P0，至于是否要使用HikariCP，我觉得可以尝试。HikariCP毕竟是才出来不久，其性能到底如何，也需要实践的检验，若是担心新东西有坑，我推荐使用BoneCP。Spring现在也集成了HikariCP，所以我觉得很有尝试它的必要。前不久我在项目中使用了HikariCP，也没出现什么问题，运行比较稳定。

HikariCP在github上的地址：[https://github.com/brettwooldridge/HikariCP](https://github.com/brettwooldridge/HikariCP)

[为什么HikariCP被号称为性能最好的Java数据库连接池，如何配置使用?](http://blog.csdn.net/clementad/article/details/46928621)


```
<!--JDBC连接池 -->
<dependency>
    <groupId>com.zaxxer</groupId>
    <artifactId>HikariCP</artifactId>
    <version>2.4.0</version>
</dependency>
```
### 简单的CRUD
为保持example的干净与轻便，不使用Spring进行ORM层的管理，我采用[ARM](http://www.oschina.net/question/12_10706)的方式来管理SQL链接，在try with resource块结束后自动释放SQL链接。

有需要与Spring进行整合的，Follow这篇文章吧！[Using JOOQ with Spring and Apache DBCP](http://www.jooq.org/doc/3.7/manual/getting-started/tutorials/jooq-with-spring/)

同时我也将JOOQ与Spring 4、Spring-MVC进行了整合，代码地址：[https://github.com/amao12580/JOOQ-With-Spring](https://github.com/amao12580/JOOQ-With-Spring)，使用Spring Transaction进行事务管理。

```
try(ScopedContext scopedContext=new ScopedContext()){//try with resource
    DSLContext create=scopedContext.getDSLContext();
    int uid =180;

    //add
    UserRecord userRecord=create.newRecord(USER);
    userRecord.setAge((byte) 18);
    userRecord.setMobile("15985236985");
    userRecord.setName("赵六");
    userRecord.setUid(uid);
    userRecord.setSex((byte) 1);
    userRecord.setPassword(String.valueOf(System.nanoTime()));
    userRecord.setRegisterTime(new Timestamp(System.currentTimeMillis()));
    int insertRet=userRecord.insert();//执行insert sql
    //userRecord.store();//可能会执行insert，也有可能执行update，文档说明的很清晰
    //userRecord.refresh();//从数据库重新加载该记录
    log.info("insertRet:{}", insertRet);

    //index
    int createIndexRet=create.createIndex("user_index_mobile_unique")
            .on(USER, USER.MOBILE)
            .execute();//为手机号码字段创建唯一索引
    int dropIndexRet=create.dropIndex("user_index_mobile_unique")
            .on(USER)
            .execute();//删除索引
    log.info("dropIndexRet:{},createIndexRet:{}", dropIndexRet, createIndexRet);

    //select
    Record record=create.select(USER.NAME,USER.UID)
            .from(USER)
            .where(USER.MOBILE.eq("15985236985"))
            .limit(1)
            .fetchOne();
    log.info("姓名:{}，uid:{}", record.getValue(USER.NAME), record.getValue(USER.UID));

    Result<UserRecord> userRecords=create.selectFrom(USER)
            .where(USER.SEX.eq((byte) 1).and(USER.MOBILE.like("159%")))
            .orderBy(USER.MOBILE.asc()).limit(0, 20).fetch();

    for (UserRecord ur:userRecords){
        log.info("mobile:{},uid:{},registerTime:{}", ur.getMobile(), ur.getUid(), ur.getRegisterTime().getTime());
    }

    //delete
    int deleteRecordRet=create.deleteFrom(USER).where(USER.UID.eq(uid)).execute();
    log.info("deleteRecordRet:{}", deleteRecordRet);
}

日志打印信息：
21:01:20.009 INFO  com.zaxxer.hikari.HikariDataSource 72 <init> - Hikari pool HikariPool-0 is starting.
21:01:20.561 INFO  org.jooq.tools.JooqLogger 331 info -

@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@  @@        @@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@        @@@@@@@@@@
@@@@@@@@@@@@@@@@  @@  @@    @@@@@@@@@@
@@@@@@@@@@  @@@@  @@  @@    @@@@@@@@@@
@@@@@@@@@@        @@        @@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@        @@        @@@@@@@@@@
@@@@@@@@@@    @@  @@  @@@@  @@@@@@@@@@
@@@@@@@@@@    @@  @@  @@@@  @@@@@@@@@@
@@@@@@@@@@        @@  @  @  @@@@@@@@@@
@@@@@@@@@@        @@        @@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@  @@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@  Thank you for using jOOQ 3.8.2

21:01:20.593 INFO  com.study.jooq.model.Example 42 base - insertRet:1
21:01:21.197 INFO  com.study.jooq.model.Example 51 base - dropIndexRet:0,createIndexRet:0
21:01:21.278 INFO  com.study.jooq.model.Example 59 base - 姓名:赵六，uid:180
21:01:21.282 INFO  com.study.jooq.model.Example 66 base - mobile:15925874536,uid:102,registerTime:1459331629000
21:01:21.282 INFO  com.study.jooq.model.Example 66 base - mobile:15985236985,uid:180,registerTime:1459429281000
21:01:21.285 INFO  com.study.jooq.model.Example 71 base - deleteRecordRet:1
21:01:21.285 INFO  com.zaxxer.hikari.pool.HikariPool 242 shutdown - Hikari pool HikariPool-0 is shutting down.
21:01:21.331 INFO  com.zaxxer.hikari.util.ConcurrentBag 197 add - ConcurrentBag has been closed, ignoring add()
```
## 进阶篇

### 事务

JOOQ目前并不支持类似Spring的声明式事务管理，暂时只支持由自身API提供的编程式事务管理。有关声明式事务管理与编程式事务管理的区别，请Follow：[编程式事务与声明式事务](http://blog.csdn.net/u012228718/article/details/42750119#t1)。但JOOQ作者Lukas Eder明确表示在未来的3.9版本中，会提供解决方案。

* [http://www.jooq.org/doc/3.8/manual/sql-execution/transaction-management/](http://www.jooq.org/doc/3.8/manual/sql-execution/transaction-management/)

* [https://github.com/jOOQ/jOOQ/issues/4836](https://github.com/jOOQ/jOOQ/issues/4836)

```
try(ScopedContext scopedContext=new ScopedContext()){//try with resource
    DSLContext create=scopedContext.getDSLContext();
    final int[] uid = new int[1];

    //transaction

    create.transaction(configuration -> {
        //add
        UserRecord userRecord=create.newRecord(USER);
        userRecord.setAge((byte) 18);
        userRecord.setMobile("18525874539");
        userRecord.setName("赵六");
        userRecord.setSex((byte) 1);
        userRecord.setPassword(String.valueOf(System.nanoTime()));
        userRecord.setRegisterTime(new Timestamp(System.currentTimeMillis()));
        int insertUserRet=userRecord.insert();//执行insert sql
        uid[0] =userRecord.getUid();
        log.info("insertUserRet:{}", insertUserRet);
        //add
        OrderRecord orderRecord=create.newRecord(ORDER);
        orderRecord.setUid(userRecord.getUid());
        orderRecord.setAmout(25000l);
        orderRecord.setOrderId(new BigDecimal(System.nanoTime()).intValue());
        orderRecord.setOrderTime(new Timestamp(System.currentTimeMillis()));
        orderRecord.setStatus((byte)0);
        int insertOrderRet=orderRecord.insert();//执行insert sql
        log.info("insertOrderRet:{}", insertOrderRet);
    });
}

12:51:14.724 INFO  com.study.jooq.model.Example 90 lambda$advance$0 - insertUserRet:1
12:51:14.743 INFO  com.study.jooq.model.Example 99 lambda$advance$0 - insertOrderRet:1
```
### 连接查询
在处理复杂SQL时，JOOQ的思路是由Java代码以[链式编程](http://www.jianshu.com/p/540711c1a507)的方式来解决可读性的问题。

下文中的查询语句，等价于：
select `study`.`user`.`mobile`, `study`.`user`.`name`, `study`.`user`.`age`, `study`.`order`.`order_id`, `study`.`order`.`amout`, `study`.`order`.`order_time`
    from `study`.`user` left outer join `study`.`order`
    on `study`.`user`.`uid` = `study`.`order`.`uid`
    where (`study`.`user`.`uid` = ? and `study`.`order`.`amout` >= ?)
    limit ?
可以发现SQL语句与代码保持了很高的相似性，可读性几乎没有损失。

其他的特性：group by与having、union、union all也都是在api级别支持的。
```
try(ScopedContext scopedContext=new ScopedContext()){//try with resource
    DSLContext create=scopedContext.getDSLContext();
    int uid=15874523;

    //join select

    Result<Record6<String,String,Byte,Integer,Long,Timestamp>> results=create
            .select(USER.MOBILE,USER.NAME,USER.AGE,ORDER.ORDER_ID,ORDER.AMOUT,ORDER.ORDER_TIME)
            .from(USER).leftOuterJoin(ORDER)
            .on(USER.UID.eq(ORDER.UID))
            .where(USER.UID.eq(uid[0]).and(ORDER.AMOUT.ge(100l)))
            .limit(0,10).fetch();
    for (Record6<String,String,Byte,Integer,Long,Timestamp> record:results){
        log.info("姓名:{}，手机号码:{}，年龄:{}，订单号:{}，订单金额:{}，订单时间:{}",
                record.getValue(USER.NAME),record.getValue(USER.MOBILE),record.getValue(USER.AGE),
                record.getValue(ORDER.ORDER_ID),record.getValue(ORDER.AMOUT),
                record.getValue(ORDER.ORDER_TIME));
    }
}

12:51:14.898 INFO  com.study.jooq.model.Example 110 advance - 姓名:赵六，手机号码:18525874539，年龄:18，订单号:-1725080559，订单金额:25000，订单时间:1459486275000
```
### 批处理
```
//batchInsert
try(ScopedContext scopedContext=new ScopedContext()){//try with resource
    DSLContext create=scopedContext.getDSLContext();
    List<UserRecord> list=new ArrayList<>();

     //batchInsert
    UserRecord userRecord=create.newRecord(USER);
    userRecord.setAge((byte) 18);
    userRecord.setMobile("17058963215");
    userRecord.setName("赵六");
    userRecord.setSex((byte) 1);
    userRecord.setPassword(String.valueOf(System.nanoTime()));
    userRecord.setRegisterTime(new Timestamp(System.currentTimeMillis()));
    list.add(userRecord);

    UserRecord userRecord2=create.newRecord(USER);
    userRecord2.setAge((byte) 29);
    userRecord2.setMobile("17058963216");
    userRecord2.setName("马七");
    userRecord2.setSex((byte) 1);
    userRecord2.setPassword(String.valueOf(System.nanoTime()));
    userRecord2.setRegisterTime(new Timestamp(System.currentTimeMillis()));
    list.add(userRecord2);
    //使用batchInsert时，无法获取SQL语句
    int insertRetArr[]=create.batchInsert(list).execute();//返回值是一个int数组，长度与输入的集合size有关。

    log.info("insertRetArr:{}", Arrays.toString(insertRetArr));//数组每个元素为1时，执行成功
    //使用batchInsert时，无法获取数据自增长的主键值
    log.info("userRecord:uid:{}", userRecord.getUid());
    log.info("userRecord2:uid:{}", userRecord2.getUid());

    userRecord.refresh();
    userRecord2.refresh();
    log.info("userRecord:uid:{}", userRecord.getUid());
    log.info("userRecord2:uid:{}", userRecord2.getUid());

    //batchUpdate
    userRecord.setAge((byte) 38);
    userRecord2.setAge((byte) 78);
    list.clear();
    list.add(userRecord);
    list.add(userRecord2);
    //使用batchUpdate时，无法获取SQL语句
    int updateRetArr[]=create.batchUpdate(list).execute();//返回值是一个int数组，长度与输入的集合size有关。
    log.info("updateRetArr:{}", Arrays.toString(updateRetArr));//数组每个元素为1时，执行成功

    //batchDelete
    //使用batchDelete时，无法获取SQL语句
    int deleteRetArr[]=create.batchDelete(list).execute();//返回值是一个int数组，长度与输入的集合size有关。
    log.info("deleteRetArr:{}", Arrays.toString(deleteRetArr));//数组每个元素为1时，执行成功
}

15:06:46.281 INFO  com.study.jooq.model.Example 163 batch - insertRetArr:[1, 1]
15:06:46.281 INFO  com.study.jooq.model.Example 165 batch - userRecord:uid:null
15:06:46.281 INFO  com.study.jooq.model.Example 166 batch - userRecord2:uid:null
15:06:46.287 INFO  com.study.jooq.model.Example 176 batch - updateRetArr:[0, 0]
15:06:46.291 INFO  com.study.jooq.model.Example 182 batch - deleteRetArr:[0, 0]
```
### 函数
JOOQ没有提供API对函数进行显式的支持，这意味着不能通过JOOQ进行函数的create/execute/drop。但是JOOQ支持直接执行拼接好的字符串SQL语句，这为我们进行函数execute提供了可行性。实际使用中，使用ORM层对数据库函数进行create/drop的需求几乎不存在。
```
1. 先在Mysql中添加自定义函数，你也可以使用Flyway的方式来做，在migration文件夹下加一个V2 sql文件。重新执行maven -install即可生效，实际上我更推荐使用这种方式来进行数据库历史SQL执行管理。

USE study;
DROP FUNCTION IF EXISTS formatDate;

DELIMITER //
CREATE FUNCTION formatDate(fdate datetime)
RETURNS VARCHAR(255)
RETURN date_format(fdate,'%Y年%m月%d日%h时%i分%s秒');
//
DELIMITER ;

SELECT formatDate(NOW()) AS '时间';

2. 使用JOOQ进行函数execute
try(ScopedContext scopedContext=new ScopedContext()){//try with resource
    DSLContext create=scopedContext.getDSLContext();
    //formatDate是我们在mysql里自定义的函数
    Result<Record> results=create.fetch("SELECT formatDate(NOW()) AS '时间';");
    for (Record record:results){
        log.info("执行结果:{}",record.getValue(0));
    }
}

15:54:28.815 INFO  com.study.jooq.model.Example 199 function - 执行结果:2016年04月01日03时54分28秒
```
### 存储过程
存储过程同函数一样，没有进行显式的create/drop支持。
```
1. 先在Mysql中添加存储过程
USE study;
DROP PROCEDURE IF EXISTS getAllUid;

DELIMITER //
CREATE PROCEDURE getAllUid()
BEGIN
  SELECT uid FROM user;
END//
DELIMITER ;

CALL getAllUid();

2. 使用JOOQ进行存储过程execute
try(ScopedContext scopedContext=new ScopedContext()){//try with resource
    DSLContext create=scopedContext.getDSLContext();
    //getAllUid是我们在mysql里定义的存储过程
    Result<Record> results=create.fetch("CALL getAllUid()");
    for (Record record:results){
        log.info("执行结果:{}",record.getValue(0));
    }
}

16:08:19.333 INFO  com.study.jooq.model.Example 211 procedure - 执行结果:100
16:08:19.333 INFO  com.study.jooq.model.Example 211 procedure - 执行结果:102
16:08:19.334 INFO  com.study.jooq.model.Example 211 procedure - 执行结果:101
```
### 视图
通过代码构建视图后，JOOQ不能自动生成视图对应的实体类，需要手工做一次maven -install。以下示例中会生成类文件：Userwithorder.java
```
try(ScopedContext scopedContext=new ScopedContext()){//try with resource
    DSLContext create=scopedContext.getDSLContext();
    //创建视图

    //定义视图名称为：userwithorder
    CreateViewFinalStep step=create.createView("userwithorder",USER.UID.getName(),USER.NAME.getName(),ORDER.ORDER_ID.getName(),ORDER.STATUS.getName(),ORDER.AMOUT.getName())
            .as(
                    create.select(USER.UID, USER.NAME, ORDER.ORDER_ID, ORDER.STATUS, ORDER.AMOUT)
                            .from(USER)
                            .leftOuterJoin(ORDER)
                            .on(USER.UID.eq(ORDER.UID))
            );
    log.info("SQL:{}",step.getSQL());
    int ret=step.execute();
    log.info("创建视图,执行结果:{}",ret);

    //查询视图
    Result<Record3<Integer,String,Integer>> results=create.select(USERWITHORDER.UID,USERWITHORDER.NAME,USERWITHORDER.ORDER_ID)
            .from(USERWITHORDER).where(USERWITHORDER.AMOUT.ge(200l)).fetch();
    for (Record3<Integer,String,Integer> record:results){
        log.info("uid:{}，姓名:{}，订单号:{}",
                record.getValue(USERWITHORDER.UID),record.getValue(USERWITHORDER.NAME),record.getValue(USERWITHORDER.ORDER_ID));
    }
    //删除视图
    int dropRet=create.dropView("userwithorder").execute();
    log.info("删除视图,执行结果:{}",dropRet);
}


16:54:10.597 INFO  com.study.jooq.model.Example 231 view - SQL:create view `userwithorder`(`uid`, `name`, `order_id`, `status`, `amout`) as select `study`.`user`.`uid`, `study`.`user`.`name`, `study`.`order`.`order_id`, `study`.`order`.`status`, `study`.`order`.`amout` from `study`.`user` left outer join `study`.`order` on `study`.`user`.`uid` = `study`.`order`.`uid`
16:54:10.712 INFO  com.study.jooq.model.Example 233 view - 创建视图,执行结果:0
16:54:10.760 INFO  com.study.jooq.model.Example 239 view - uid:100，姓名:张三，订单号:200
16:54:10.761 INFO  com.study.jooq.model.Example 239 view - uid:100，姓名:张三，订单号:201
16:54:10.761 INFO  com.study.jooq.model.Example 239 view - uid:101，姓名:李四，订单号:202
16:54:10.765 INFO  com.study.jooq.model.Example 244 view - 删除视图,执行结果:0
```

### 运算符

有时候可能需要在SQL中，对字段(或字段之间)进行加减乘除等运算操作。

```
需求示例，在箱子规格表(不重复)中，找出前十条，按照箱子的容积的最大值(int 11)与最小值(int 11)范围，与给定值(528)进行比较排序，找出最接近的十条。
select * from box
    where min_size<=528 and max_size>=528
    order by ((min_size+max_size)/2)-528 asc
    limit 0,10;

使用JOOQ完全可以满足这样的要求
try(ScopedContext scopedContext=new ScopedContext()){//try with resource
    DSLContext create=scopedContext.getDSLContext();
    int conditionSize=528;
    int pageNo=1;
    int pageSize=10;

    SortField sortFieldBySize = ((((BOX.MAX_SIZE.add(BOX.MIN_SIZE)).divide(2)).
    minus(conditionSize)).asc();

    Result result=create.selectFrom(BOX).
    where(BOX.MIN_SIZE.lessOrEqual(conditionSize)).
    and(BOX.MAX_SIZE.greaterOrEqual(conditionSize)).
    orderBy(sortFieldBySize).
    limit((pageNo-1) * pageSize, pageSize).
    fetch();
}
```

## 高级篇
这部分面向于对JOOQ保持更多热情的读者，谈到JOOQ的高阶特性，这些特性在企业级开发中往往会用的很多，但对于个人开发者可能就没那么重要了。因此个人开发者可以选择性的阅读。

推荐企业在大面积应用JOOQ之前详细阅读这部分的内容，以更好的在生产环境稳定使用。

### 重复使用Statement

数据库系统对SQL语句的处理一般会经过如下过程。

- 1.查询解析器（Query parser）：用于检查查询是否合法
- 2.查询重写器（Query rewriter）：用于预优化查询
- 3.查询优化器（Query optimizer）：用于优化查询
- 4.查询执行器（Query executor）：用于编译和执行查询

PreparedStatement是java.sql包下面的一个接口，用来执行SQL语句查询，通过调用connection.preparedStatement(sql)方法可以获得PreparedStatment对象。数据库系统会对sql语句进行预编译处理（如果JDBC驱动支持的话），预处理语句将被预先编译好，这条预编译的sql查询语句能在将来的查询中重用，这样一来，它比Statement对象生成的查询速度更快。

对比以上4条处理过程，复用的PreparedStatement对象，将直接跳过3.5步（最后一步的编译部分也跳过啦），直接被数据库执行，对于复杂并且高频率执行的SQL，这将极大的提高TPS！

在JDBC中如何做？

```
// 获取PreparedStatement对象，此时数据库已经将String类型的SQL预编译过了。
try (PreparedStatement stmt = connection.prepareStatement("SELECT 1 FROM DUAL")) {

    // 第一次使用，获取结果集
    try (ResultSet rs1 = stmt.executeQuery()) { ... }

    // 不关闭，再次使用，获取结果集（此时结果集可能发生了变化）
    try (ResultSet rs2 = stmt.executeQuery()) { ... }
}
```

在JOOQ中如何做？

```
//重复使用Statement
try (ScopedContext scopedContext = new ScopedContext()) {//try with resource
    DSLContext create = scopedContext.getDSLContext();

    // 创建一个被配置保持打开的Statement
    try (ResultQuery<Record1<Integer>> query = create.selectOne().keepStatement(true)) {
        Result<Record1<Integer>> result1 = query.fetch(); // This will lazily create a new PreparedStatement
        log.info("result1:" + result1.toString());
        Result<Record1<Integer>> result2 = query.fetch(); // This will reuse the previous PreparedStatement
        log.info("result2:" + result2.toString());
    }
}

```

### [draft] With Ehcache

未完成。

讨论JOOQ与Ehcache等进程级别缓存模块的集成，引申地，会谈到中间件级别的数据库缓存，如：Redis。

### [draft] 钩子函数：DefaultRecordListener 如何使用？

未完成。

讨论JOOQ重要特性：DefaultRecordListener(简称Listener)。

Listener的应用场景，数据库操作完成后同步回调。

示例需求：简书网站，完成MySQL插入或更新文章后，需要在搜索接口(Solr)中半实时的查询到最新文章。

分析：强一致性需求，在MySQL和搜索引擎同时操作成功，才算一个事务成功。

使用JOOQ获取MySQL数据库链接时，注册Listener，指向更新Solr的业务逻辑。

### [draft] 更快的分页(seek)

未完成。

Seek方法本来就没有跳过OFFSET之前的记录，它跳过的是所有以前获取到的最后一条记录之前的记录。考虑一下谷歌的翻页。从实用角度看的话，你几乎不可能准确地跳过100'000行记录。

## 小技巧
### 获取SQL语句
JOOQ允许在执行(fetch*、excute)前的SQL构建阶段，获取任一阶段的文本SQL语句。
```
//2张表完成左外连接构建阶段后的Step
SelectForUpdateStep sfus=create
        .select(USER.MOBILE, USER.NAME, USER.AGE, ORDER.ORDER_ID, ORDER.AMOUT, ORDER.ORDER_TIME)
        .from(USER).leftOuterJoin(ORDER)
        .on(USER.UID.eq(ORDER.UID));

//2张表查询语句构建结束后的Step
SelectForUpdateStep sfus1=create
        .select(USER.MOBILE,USER.NAME,USER.AGE,ORDER.ORDER_ID,ORDER.AMOUT,ORDER.ORDER_TIME)
        .from(USER).leftOuterJoin(ORDER)
        .on(USER.UID.eq(ORDER.UID))
        .where(USER.UID.eq(uid[0]).and(ORDER.AMOUT.ge(100l)))
        .limit(0, 10);
log.info("s:" + sfus.getSQL());
log.info("s1:" + sfus.getSQL());

14:23:05.305 INFO  com.study.jooq.model.Example 123 advance - s:select `study`.`user`.`mobile`, `study`.`user`.`name`, `study`.`user`.`age`, `study`.`order`.`order_id`, `study`.`order`.`amout`, `study`.`order`.`order_time` from `study`.`user` left outer join `study`.`order` on `study`.`user`.`uid` = `study`.`order`.`uid`

14:23:05.306 INFO  com.study.jooq.model.Example 124 advance - s1:select `study`.`user`.`mobile`, `study`.`user`.`name`, `study`.`user`.`age`, `study`.`order`.`order_id`, `study`.`order`.`amout`, `study`.`order`.`order_time` from `study`.`user` left outer join `study`.`order` on `study`.`user`.`uid` = `study`.`order`.`uid
```
## Some else
### JPA与JDBC有什么区别？

- JDBC：Java Data Base Connectivity，java数据库连接，用于直接调用SQL 命令，也就是用于执行SQL语句的Java API，是面向数据库的。
- JPA：Java Persistence API，Java持久性API，用来操作实体对象，持久性提供了很多实现，编程人员只需要编写实体类，实体类中的主要信息为实体与数据库中表、字段、主键的对应，可以免除编写繁琐的SQL。

### JOOQ与JDBC的详细区别

- [Comparison between jOOQ and JDBC](http://www.jooq.org/doc/3.8/manual/sql-execution/comparison-with-jdbc/)

## Reference

- [如果有人问你数据库的原理，叫他看这篇文章](http://blog.jobbole.com/100349/)