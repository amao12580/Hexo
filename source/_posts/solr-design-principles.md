---
title: Solr - 生产环境的设计原则
date: 2016年9月20日9:57:29
tags:
    - Solr
categories:
    - Record
description: .
---

# 写在前面
中午追番（大力推荐【[寄生兽](https://movie.douban.com/subject/25774052/)】）没睡觉，现在有点困，洗了把脸，思路恢复清晰了。这篇文章经过数天的腹稿终于要发出来了，早上来公司简单草拟了提纲，没想着一口气写完，但下午想到blog是[自动up的](http://amao12580.github.io/post/2016/06/How-to-better-write-the-blog/)，不能给个提纲就完事啊！读者的感受在哪里？太不负责了！！！

自从接盘了离职同事的代码，一直在做搜索引擎(Solr)方面的工作，都忙成狗了，各个业务线都有搜索的需求，零零落落20多个搜索接口吧！维护的过程，看着十多年工作经验的同事写的代码，有褒有贬，自己也学到了一些小技巧，最最最主要的，对搜索引擎不再陌生了，虽然谈不上完全了解，但是日常工作中应用、调优没有问题了。

代码维护是艰难的事，维护一坨shit一般的代码是想死的事！如果让我从头到尾构建搜索业务，也许没这么多痛苦，看着没有编码规范和零注释的代码，经过数位同事的修改，变得一片浑浊，想理清却已找不到人，只能自己加班看，梳理思路，同时还得整理重构方案！可见团队的规范性在后期节省了多少维护成本，然而这个收益在前期是看不到或容易被忽视的的，并且在工期和人力的压迫下，是最容易被leader妥协的点！不加规范的代码就像脱缰的野马一样，早期不仔细调教，后面再想驯服就难上加难了，这也是技术债务吧！接盘是个苦差事，希望大家谨慎，努力不给后人留坑吧！

![](/img/rough-and-tumble.jpg)

# Core设计原则

在Client操作Solr时，通过HTTP RESTful接口要求Solr索引时，用Core名指明操作范围，Core名还是RESTful中最后一级资源路径。

Client常用的操作有5类：index、delete、query、optimize。不常用的操作还有：create、rename、unload、reload、swap、ping、commit。其中index、delete、query、optimize、rename、unload、reload、swap需要指定Core才可以操作，delete和optimize有些特殊，可以不指定Core，默认对所有Core执行。而create、rename、unload、reload、swap仅在Solr Admin页面(http ://your solr ip:8983/)上提供，在SolrJ客户端(面向Java语言)无法直接使用，不过可以使用HTTPClient模拟操作！

何不将Core想象成MySQL中的Table？在MySQL中，对Table进行CURD操作时，是不是也要加上table name呢？create table "test"... 、alter table "test" ... 、select * from "test"...、delete from "test"...绝大多数的sql都需要指定表名，但也有例外：show process list、show variables like 'character '、show innodb engine status;等等。除了在查询时，solr的Core与MySQL的表有相同的功能（事实上Solr的查询远比MySQL的查询强大），在其他的操作中，Solr没法与MySQL相比，这主要是Solr除了查询，不提供对字段级别的操作API！（我们将在后文中讨论为什么有这个限制）这意味着Solr没法通过API修改字段名、删除字段、重命名字段、添加字段等等，同时也无法对单个row进行部分字段的更新，需要修改单个row，就调用index API给出最新的数据对象，Solr会依据主键Id将历史覆盖，这与memcached是一致的。这意味着主键Id是必须预定义的，且不允许修改！

Solr就像是个操作系统，安装在操作系统中的软件就是Core，每个Core有自身的配置文件及数据。在磁盘的角度看，Core是一个文件夹，比如我在线上有名为user和order的2个Core，在Solr的工作目录(%SolrHome%/server/solr)下，有类似的文件目录：

![](/img/Solr-core-dir-desc.jpg)
可以看到Solr依靠文件夹管理索引文件和日志文件，我们将在后文中说明这些文件的作用和相对路径配置！


既然Core与Table类似，那我们是不是按照传统在MySQL的思路，按照业务功能，拆分出符合三范式的Table呢？值得注意的是，Solr对多核心join提供非常有限的支持。

1.仅支持最多2个Core进行join query（formIndex=user toIndex=order）
2.仅支持对formIndex中的Core field进行filter query以及response，这是打折的inner join
3.两个core都在一个solr instance上

这些限制意味着什么呢？在一次query中，2个核心之间的交互很低。为了更方便的讲清楚这个问题，以及考虑下文，我们假设现在的user和order核心的结构定义文件（schema.xml）的内容如下:

```
user与order是1:N的关系，即：一个用户拥有多个订单，一个订单只从属一个用户
```

```
user/conf/schema.xml

<?xml version="1.0" encoding="utf-8"?>

<schema name="user" version="1.5">
  <!--类型设定中的参数，required/multiValued的默认值是false;indexed/stored的默认值是true-->
  <field name="_version_" type="long"/>
  <uniqueKey>id</uniqueKey>
  <!-- 用户唯一编号 -->
  <field name="id" type="int" required="true"/>
  <!-- 0=普通用户；1=VIP用户 -->
  <field name="type" type="int" required="true"/>
  <!-- 昵称 -->
  <field name="nickname" type="simplChinese"/>
  <!-- 0=失效；1=有效 -->
  <field name="status" type="int" required="true"/>
  <!-- 账户最后一次活动时间 -->
  <field name="updateTime" type="long" required="true"/>

  <fieldType name="string" class="solr.StrField" sortMissingLast="true"/>
  <fieldType name="int" class="solr.TrieIntField" precisionStep="0" positionIncrementGap="0"/>
  <fieldType name="long" class="solr.TrieLongField" precisionStep="0" positionIncrementGap="0"/>

  <fieldType name="simplChinese" class="solr.TextField">
    <analyzer type="index">
      <tokenizer class="com.chenlb.mmseg4j.solr.MMSegTokenizerFactory" mode="max-word" dicPath="../../dic"/>
      <filter class="solr.StopFilterFactory" words="stopwords.txt"/>
    </analyzer>
    <analyzer type="query">
      <tokenizer class="com.chenlb.mmseg4j.solr.MMSegTokenizerFactory" mode="max-word" dicPath="../../dic"/>
      <filter class="solr.StopFilterFactory" words="stopwords.txt"/>
    </analyzer>
  </fieldType>
</schema>
```

```
order/conf/schema.xml

<?xml version="1.0" encoding="utf-8"?>

<schema name="order" version="1.5">
  <!--类型设定中的参数，required/multiValued的默认值是false;indexed/stored的默认值是true-->
  <field name="_version_" type="long"/>
  <uniqueKey>id</uniqueKey>
  <!-- 订单唯一编号 -->
  <field name="id" type="long" required="true"/>
  <!-- 0=微信订单；1=唯品会订单 -->
  <field name="type" type="int" required="true"/>
  <!-- 订单概览 -->
  <field name="title" type="simplChinese"/>
  <!-- 订单备注 -->
  <field name="remark" type="simplChinese"/>
  <!-- 下单用户Id -->
  <field name="uid" type="int" required="true"/>
  <!-- 0=创建；1=付款；2=付款超时 -->
  <field name="status" type="int" required="true"/>
  <!-- 金额、以分为单位 -->
  <field name="amount" type="long" required="true"/>
  <!-- 订单最后一次更新时间 -->
  <field name="updateTime" type="long" required="true"/>

  <fieldType name="string" class="solr.StrField" sortMissingLast="true"/>
  <fieldType name="int" class="solr.TrieIntField" precisionStep="0" positionIncrementGap="0"/>
  <fieldType name="long" class="solr.TrieLongField" precisionStep="0" positionIncrementGap="0"/>

  <fieldType name="simplChinese" class="solr.TextField">
    <analyzer type="index">
      <tokenizer class="com.chenlb.mmseg4j.solr.MMSegTokenizerFactory" mode="max-word" dicPath="../../dic"/>
      <filter class="solr.StopFilterFactory" words="stopwords.txt"/>
    </analyzer>
    <analyzer type="query">
      <tokenizer class="com.chenlb.mmseg4j.solr.MMSegTokenizerFactory" mode="max-word" dicPath="../../dic"/>
      <filter class="solr.StopFilterFactory" words="stopwords.txt"/>
    </analyzer>
  </fieldType>
</schema>

```
Join query "查询有已付款订单的用户昵称和用户Id"，类似的SQL：SELECT u.id,u.nickname FROM user u INNER JOIN order o ON u.id=o.uid WHERE o.status=1;这样简单的查询需求是可以完成的，但对于复杂需求，例如"查询在今天活跃过的用户和这些用户在今天的最新一笔有效微信订单，要求订单金额不能低于5元，需要打印用户和订单基本信息"，这种就无能为力了！

# 字段设计原则
## 字段的分类
结构类：field、multiValued、dynamicField

计算类：keyword、filter、sort、function

## 字段的命名规范
可读性
无二义性
统一   小驼峰
简洁性
常用词

## 字段的存储结构

## 如何权衡缓存字段？（纵向）
1.字段不参与任何计算，仅用作拼装响应结果

solr VS cache

2.缓存字段与参与计算字段的关联性

latestPhotoId  VS photoNumber

3.字段的数量如何影响Solr的效率？

## 如何权衡混合Core？
一个Core为了兼容多个业务场景使用，将不同类别的业务数据塞入。

字段级别，有字段只对特定业务才会用到（纵向）

排除使用这些字段



row级别，有些数据记录对特定业务才会用到（横向）

排除使用这些row


# 数据维护原则
## 局部更新
更新一部分的字段

## Delete and add


# 索引重建原则
减少服务中断时间

C端流量控制




## 单个Solr集群实例
Core要有版本号
opportunity_V1

1.先创建新Core
opportunity_V2

2.额外进程构建V2

3.检查V2构建成功

4.流量切换到V2  或删除(unload)V1后  v2-rename-v1

V2 swap V1

5.确认V1Core不再需要后再销毁
同时运行多版本时，谨慎

## 多个Solr集群

先构建好新集群

流量切换到新集群

旧集群停机

# Auto-warm机制

# 准实时索引机制

VS ElasticSearch

# SolrCould


# 使用总结
Solr使用控制台，可视化管理数据
1.xml
<delete>
<query>
*:*
</query>
</delete>

2.json？




启动solr
F:\solr\bin>solr start -m 1g -f



别名
core.properties

name=shops

name=service
config=solrconfig.xml
schema=schema.xml
dataDir=data





//只查询字段orderStatus值在1到3的数据，orderStatus也可以是string类型 l=abc u=ghi
q=*:*&fq={!frange l=1 u=3}orderStatus

fq=orderStatus:[1 TO 3]   orderStatus只能是整数


# 研究Join query
附上研究Join query的实战代码
```
    //测试用的Solr环境为：
    // solr 6.1
    // jetty容器
    //启动参数：solr start -m 1g -f
    //windows 7 X64
    //solrj maven: <groupId>org.apache.solr</groupId> <artifactId>solr-solrj</artifactId> <version>5.3.0</version>

    String solrHostName = "http://127.0.0.1:8983/solr/";
    SolrClient userClient = new HttpSolrClient(solrHostName + "user");
    SolrClient orderClient = new HttpSolrClient(solrHostName + "order");

    List<SolrInputDocument> userDocuments = new ArrayList<>();
    System.out.println("添加用户“张三”");
    SolrInputDocument userDocument = new SolrInputDocument();
    userDocument.addField("id", 1000);//用户唯一编号
    userDocument.addField("type", 0);//0=普通用户；1=VIP用户
    userDocument.addField("nickname", "张三");//昵称
    userDocument.addField("status", 0);//0=失效；1=有效
    userDocument.addField("updateTime", System.currentTimeMillis());//账户最后一次活动时间
    userDocuments.add(userDocument);
    System.out.println("添加用户“李四”");
    SolrInputDocument userDocument2 = new SolrInputDocument();
    userDocument2.addField("id", 2000);//用户唯一编号
    userDocument2.addField("type", 1);//0=普通用户；1=VIP用户
    userDocument2.addField("nickname", "李四");//昵称
    userDocument2.addField("status", 0);//0=失效；1=有效
    userDocument2.addField("updateTime", System.currentTimeMillis() + 1);//账户最后一次活动时间
    userDocuments.add(userDocument2);
    userClient.add(userDocuments);

    //为"张三"加了2条订单信息
    System.out.println("用户“李四”添加2条订单信息");
    List<SolrInputDocument> orderDocuments = new ArrayList<>();
    SolrInputDocument orderDocument = new SolrInputDocument();
    orderDocument.addField("id", 3000);//订单唯一编号
    orderDocument.addField("type", 0);//0=微信订单；1=唯品会订单
    orderDocument.addField("title", "张三的订单：商品001、商品002");//订单概览
    orderDocument.addField("remark", "我是备注...");//订单备注
    orderDocument.addField("uid", 1000);//下单用户Id
    orderDocument.addField("status", 0);//0=创建；1=付款；2=付款超时
    orderDocument.addField("amount", 188);//金额、以分为单位
    orderDocument.addField("updateTime", System.currentTimeMillis() + 2);//订单最后一次更新时间
    orderDocuments.add(orderDocument);
    SolrInputDocument orderDocument2 = new SolrInputDocument();
    orderDocument2.addField("id", 4000);//订单唯一编号
    orderDocument2.addField("type", 1);//0=微信订单；1=唯品会订单
    orderDocument2.addField("title", "张三的订单：商品041、商品082");//订单概览
    orderDocument2.addField("remark", "我是备注..*******.");//订单备注
    orderDocument2.addField("uid", 1000);//下单用户Id
    orderDocument2.addField("status", 1);//0=创建；1=付款；2=付款超时
    orderDocument2.addField("amount", 9800);//金额、以分为单位
    orderDocument2.addField("updateTime", System.currentTimeMillis() + 3);//订单最后一次更新时间
    orderDocuments.add(orderDocument2);
    orderClient.add(orderDocuments);

    //准实时索引大约需要1s time window
    try {
        TimeUnit.SECONDS.sleep(2);
    } catch (InterruptedException e) {
        e.printStackTrace();
    }
    System.out.println("完成“张三”订单add");
    //查询有已付款订单的用户昵称和用户Id
    //类似的SQL：SELECT u.id,u.nickname FROM user u INNER JOIN order o ON u.id=o.uid WHERE o.status=1;

    SolrQuery query = new SolrQuery();
    query.addField("id");
    query.addField("nickname");
    query.setQuery("*:*");
    //status:1作为filter是必需的，不填会报错
    //*Index与当前client相同时可省略
    //query.addFilterQuery("{!join from=uid to=id fromIndex=order toIndex=user}status:1");
    query.addFilterQuery("{!join from=uid to=id fromIndex=order}status:1");
    System.out.println("query params:" + query.toString());
    SolrDocumentList result = userClient.query(query).getResults();
    System.out.println("result size:" + result.size());
    System.out.println("查询有已付款订单的用户昵称和用户Id result:" + Utils.objectToJsonWithoutException(result));



----------------------------------------------------------------------------

    console：
    添加用户“张三”
    添加用户“李四”
    用户“李四”添加2条订单信息
    完成“张三”订单add
    query params:fl=id%2Cnickname&q=*%3A*&fq=%7B%21join+from%3Duid+to%3Did+fromIndex%3Dorder%7Dstatus%3A1
    result size:1
    查询有已付款订单的用户昵称和用户Id result:[{"id":1000,"nickname":"张三"}]
```


# Reference

* [Solr join query wiki](https://cwiki.apache.org/confluence/display/solr/Other+Parsers#OtherParsers-JoinQueryParser)