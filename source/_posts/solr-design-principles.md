---
title: Solr实战 - 生产环境的设计原则
date: 2016年9月20日9:57:29
tags:
    - Solr
    - Design
categories:
    - Summary
description: 产生超级Core问题是错误地定位Solr，Solr在信息检索领域是高效的，如多维度检索、关键词建议、关键词高亮、关键词补全、关键词纠错、更多相关、同义词、近义词、多义词、停用词、保护词、语义转换、空间搜索等等，但在复杂关系型查询以及强事务处理方面不如传统数据库，如MySQL！不应该将复杂join query交给solr来处理，这也侧面验证专业的工具解决特定领域的问题。除了在关键词方面的处理能力，Solr还对分维度权重、部分匹配、相关度等高度复杂需求可以轻松应对，但是搜索领域目前还存在的难题，Solr也无法解决，需要凭借外部辅助系统，例如：自动发现新词、识别流行词、歧义消除、搜索预测等等。目前都是通过NLP辅以海量语料库预处理，结合HDFS等平台海量计算发现。我们在设计Core时，应理清需求，思考方案与Solr的契合度，保持KISS原则，尽可能的避免超级 Core。
---

# 写在前面
中午追番（大力推荐【[寄生兽](https://movie.douban.com/subject/25774052/)】）没睡觉，现在有点困，洗了把脸，思路恢复清晰了。这篇文章经过数天的腹稿终于要发出来，早上来公司草拟了提纲就先搁置了，没想着一口气写完，但下午想到blog是[自动up to date的](http://amao12580.github.io/post/2016/06/How-to-better-write-the-blog/)，不能给个提纲就完事啊！读者的感受在哪里？太不负责了！！！

自从接盘离职同事的代码，一直在做搜索引擎(Solr)方面的工作，都忙成狗了，各个业务线都有搜索的需求，零零碎碎20多个接口吧！维护的过程，看着十多年经验的同事写的代码，有褒有贬，自己也学到了一些小技巧，最最最主要的，对搜索引擎不再陌生，在工作中应用、调优没有问题了。

代码维护是艰难的事，维护shit般的代码是想死的事！如果从头到尾按照统一的规范来构建搜索业务，也许没这么多后续痛苦，看着没有编码规范和零注释的代码，经过数位同事的修改，变得一片浑浊，想理清却已找不到人，只能自己加班看，梳理思路，同时还得整理重构方案！体会到团队的规范性在后期节省了多少维护成本，然而这个收益在前期是看不到或容易被忽视的的，并且在工期和人力的压迫下，是最容易被leader妥协的点！不加规范的代码和设计就像脱缰的野马一样，早期不仔细调教，后面再想驯服就难上加难，也就是技术债务吧！接盘是个苦差事，希望大家谨慎，努力不给后人留坑吧！

![](/img/rough-and-tumble.jpg)

# Core设计原则

## 理解Core

在Client操作Solr时，通过HTTP RESTful接口完成request-response，使用Core指明操作范围，Core还是RESTful中最后一级资源路径。

Client常用的操作有5种：index、delete、query、optimize，含义同字面意义（自描述）。还有不常用的操作：create、rename、unload、reload、swap、ping、commit、rollback、flush。其中index、delete、query、optimize、rename、unload、reload、swap需要指定Core才可以操作，delete和optimize、flush有些特殊，可以不指定Core，默认对所有Core执行。而create、rename、unload、reload、swap仅在Solr-Admin页面(http ://your solr ip:8983/)上提供，在SolrJ客户端(面向Java语言)无法直接使用，不过可以使用HTTPClient组装HTTP报文模拟操作！

何不将Core想象成MySQL中的Table？在MySQL中，对Table进行CURD操作时，不是也要加上table name吗？create table "test"... 、alter table "test" ... 、select * from "test"...、delete from "test"...大多数的sql需要指定表名，但也有例外：show process list、show variables like 'character '、show innodb engine status;等等。除了在查询时，solr的Core与MySQL的表有相同的功能（事实上Solr的查询远比MySQL的查询强大）。Solr就像是个操作系统，安装在操作系统中的软件就是Core，每个Core有自身的配置文件及数据。在磁盘的角度看，Core是一个文件夹，比如我在线上有名为user和order的2个Core，在Solr的工作目录(%SolrHome%/server/solr)下，有类似的文件目录：

![](/img/Solr-core-dir-desc.jpg)
可以看到Solr依靠文件夹管理索引文件和日志文件，我们将在后文中说明这些文件的作用和相对路径配置！


## 设计Core
既然Core与Table类似，那我们是不是按照传统在MySQL的思路，按照业务功能，拆分出符合三范式的Table呢？例如在MySQL中有user和order两张表。按照这种思路，我们也在Solr建立两个核心user、order，数据一一对应即可？

值得注意的是，Solr对多核心join提供非常有限的支持。

1.仅支持最多2个Core进行join query（formIndex=user toIndex=order）
2.仅支持对formIndex中的Core field进行filter query以及response，这是打折的inner join
3.两个core都在一个solr instance上

这些限制意味着什么呢？在一次query中，2个核心之间的交互度很低。为了更方便的讲清楚这个问题，以及考虑下文，我们假设现在的user和order核心的结构定义文件（schema.xml）的内容如下:

```
user与order是1:N的关系，即：一个用户拥有多个订单，一个订单只从属一个用户
```

```
user/conf/schema.xml

<?xml version="1.0" encoding="utf-8"?>

<schema name="user" version="1.5">
  <field name="_version_" type="long"/>
  <uniqueKey>Id</uniqueKey>
  <!-- 用户唯一编号 -->
  <field name="Id" type="int" required="true"/>
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
  <field name="_version_" type="long"/>
  <uniqueKey>Id</uniqueKey>
  <!-- 订单唯一编号 -->
  <field name="Id" type="long" required="true"/>
  <!-- 0=微信订单；1=唯品会订单 -->
  <field name="type" type="int" required="true"/>
  <!-- 订单概览 -->
  <field name="title" type="simplChinese"/>
  <!-- 订单备注 -->
  <field name="remark" type="simplChinese"/>
  <!-- 下单用户Id -->
  <field name="uId" type="int" required="true"/>
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
## 超级Core
假设有需求功能："查询有已付款订单的用户昵称和用户Id"，类似的SQL：SELECT u.Id,u.nickname FROM user u INNER JOIN order o ON u.Id=o.uId WHERE o.status=1;[这样简单的查询需求是可以完成的](/post/2016/09/solr-design-principles/#研究Join-query)，但对于复杂需求，例如"查询在今天活跃过的用户和这些用户在今天的最新一笔有效微信订单，要求订单金额不能低于5元，需要打印用户和订单基本信息"，这种就无法满足了！如果必须要复杂join query，常规思路是加新Core，如userAndOrder，主体信息为user和order，因为1:N的关系，需要新加自定义联合主键Id，在index阶段，以用户和订单两个角度来维护数据。在单个用户角度，删除该用户的所有数据（deleteByQuery("uId:1000")），重新查询订单信息，index多条。在单个订单角度，删除一条数据（deleteByQuery("orderId:5000")），查询所属用户，index一条。为了减少冗余，原有的user Core和order Core都可以不保留。方案的不足之处在于数据冗余，这将造成超级Core现象。比如还有一个product Core（商品信息），order与product是N:M的关系，按这种思路，难道还是聚合吗？考虑一种极限情况：假设user数据有十万，order数据有一千万，product数据有一亿，平均1个用户有100个订单，每个订单有50个商品，这样3表聚合userAndOrderAndProduct Core数据量在50亿左右，平均每个user的信息被重复了50万次！冗余带来的去重问题同样严重，result set进行distinct、groupBy、facet的代价将会极其高昂！

由于user、order、product的关系可以视为单方向，即order一定从属于user，product从属于order。改进的做法是将user的所有order视为一个[child document set](https://cwiki.apache.org/confluence/dosearchsite.action?where=solr&spaceSearch=true&queryString=child+document)处理，以此类推，有3层递进关系，此时的问题是product会存在冗余问题，相较于full-mix方案冗余度降低！

## 定位Solr
产生超级Core问题是错误地定位Solr，Solr在信息检索领域是高效的，如多维度检索、关键词建议、关键词高亮、关键词补全、关键词纠错、更多相关、同义词、近义词、多义词、停用词、保护词、语义转换、空间搜索等等，但在复杂关系型查询以及强事务处理方面不如传统数据库，如MySQL！不应该将复杂join query交给solr来处理，这也侧面验证专业的工具解决特定领域的问题。除了在关键词方面的处理能力，Solr还对分维度权重、部分匹配、相关度等高度复杂需求可以轻松应对，但是搜索领域目前还存在的难题，Solr也无法解决，需要凭借外部辅助系统，例如：自动发现新词、识别流行词、歧义消除、搜索预测等等。目前都是通过NLP辅以海量语料库预处理，结合HDFS等平台海量计算发现。


我们在设计Core时，应理清需求，思考方案与Solr的契合度，保持KISS原则，尽可能的避免超级 Core。

# 字段设计原则
字段的含义与MySQL具备类似性，如：name、type、requireed、default。

Solr为了自身的索引高效与内存控制，还加上了很多属性：

* required：是否为必须字段，默认为false，是否必需，对应MySQL NOT NULL

* default：index时字段未填，使用这个默认值，常见的应用如：sequence number

* multiValued：是否为多值，字段可以是List，但泛型收主type控制，多个值只能是同一种类型，默认值是false

* indexed：是否索引，参与到query计算的字段必需设置为true，默认值是true

* stored：是否保留原始数据，如果字段需要在query时使用原始值，则需要设置为true，默认值是true

* docValues：[针对大数据量复杂计算加速](https://cwiki.apache.org/confluence/display/solr/DocValues)，使用document-to-value数据结构，例如：需要聚合的字段，包括sort，agg，group，facet等、需要提供函数查询的字段、需要高亮的字段、自定义评分的字段。

这些是常用属性，更多的信息参阅官方wiki：[https://cwiki.apache.org/confluence/display/solr/Defining+Fields](https://cwiki.apache.org/confluence/display/solr/Defining+Fields)

## 字段的分类
1.按照结构分类：field、copyField、dynamicField
```
copyField

需要将一个或多个字段的数据汇总到多个字段时用到。典型的作为默认搜索时设计。新闻类index应用中，client不指定qf参数时，默认从title、author、catalog、content字段中综合检索。source和destination都支持通配符，maxChars，int类型参数，用于配置复制字符数的上限。注意：如果dest由多个source构成，就需要将其指定为multiValued。
<copyField source="*t" dest="content" maxChars="30000" />


dynamicField

动态字段（Dynamic fields）允许 solr 索引没有在 schema 中明确定义的字段。这个在忘记定义一些字段时很有用。动态字段可以让系统更灵活，通用性更强。它主要用作扩展备用，因为添加Field需要重建索引，而这可能是一个漫长的过程（而且没法使用增量更新索引），建议设计之初，多备一些dynamicField。

Solr在Field list中没法match到query指定的field时，会尝试从dynamicField list中match，如果没有配置dynamicField则跳过。
<dynamicField name="*_i" type="sint" indexed="true" stored="true"/>

```
2.按照计算进行分类：keyword、filter、sort、function、join query
```
1. keyword
查询字段

//标题、副标题、区域、商圈、号码、其他号码
query.set("qf", "title", "slogan", "expectDistrictName", "expectTradeAreaName", "mobile", "otherContact");

2. filter
过滤字段

query.addFilterQuery("maxRent:[* TO 100]");

3. sort
排序字段

List<SolrQuery.SortClause> sorts = new ArrayList<>();
sorts.add(SolrQuery.SortClause.desc("hasCharged"));
sorts.add(SolrQuery.SortClause.desc("updateTime"));
query.setSorts(sorts);

4. function & boost function
函数、评分、权重

query.addSort("if(isCertificated,1,0)", SolrQuery.ORDER.desc);
query.addSort("hasSalesinProduct", SolrQuery.ORDER.desc);
query.addSort("map(geodist(),0,5,5,map(geodist(),5.00000000001,20,4,map(geodist(),20.000001,50,3,map(geodist(),50.00000000001,100,2,map(geodist(),100.00000000001,100000,1,0)))))", SolrQuery.ORDER.desc);


5. join query
Core 联接查询，field用于联接条件

{!join from=uId to=Id fromIndex=order toIndex=user}status:1

```

## 字段的命名规范
一般来说命名规范的目的是：前期降低开发成本，后期减少维护成本。在前期可以省去（在某些场景下甚至不用）编写各式说明文档，keep focus on业务开发、技术攻坚；在后期在维护工作转手时，降低交接成本、理解成本。

与程序开发规范一致，在solr中，我们只需要对命名保持标准统一和易于理解，能做到简短有力就更好了。

* 可读性
避开毫无意义的命名：i,j

* 无二义性
避免歧义，如：缩写往往会产生多义的问题，一个缩写词可能在不同人理解时，引发语义上不一致([KTX 09年建设事故](https://zh.wikipedia.org/wiki/%E9%9F%93%E5%9C%8B%E9%AB%98%E9%80%9F%E9%90%B5%E9%81%93#.E8.BB.BC.E4.BA.8B))。

* 统一
统一大小写，混合时推荐使用：小驼峰式。统一特殊字符使用规范，如慎用"*"（与dynamicField冲突），保持高效。

* 简洁性
在能说明用途的前提下，保持尽可能短。

* 使用常用词
降低理解成本（思维惯性）。这也是约定大于配置的一种表现吗？

## 字段的存储结构
Index document时，solr首先对field(取决于analyzer配置)进行分词，创建index库和document库。所谓的分词是指：将字符文本按照一定的规则分成若干个单词。

### Index库
lucene的倒排索引存储结构为：词项的字符串+词项的文档频率+记录词项的频率信息+记录词项的位置信息+跳跃偏移量。

### Document库
lucene词典中词的顺序是按照英文字母的顺序排列的，这样就可以采用压缩存储：假设有term，termagancy，termagant，termina四个词。每个字母需要1byte的空间，常规存储一共需要35byte。而压缩存储之后为："term4agancy8t4inal"，一共需要22byte。通过DRY原则，节省大量的空间，这一点与[Huffman编码](https://github.com/amao12580/algorithm/blob/master/src/main/java/tree/huffman/HuffmanTree.java)思想一致。

## Additional field
在实际使用中，为了满足QPS要求，将不参与计算的字段进行数据冗余，以便更快速的响应接口。实际上就是cache一部分信息在solr，避免发起RPC从外部源获取，减少进程上下文切换和网络往返时间。

典型场景是：图片审核，按照用户是否有头像过滤，response头像URL。常见的设计，在user Core中，有字段：id（int型），用户编号、hasHeadPhoto（boolean型），标识用户是否有头像。另一字段headPhotoURL(String型)，头像URI。此时headPhotoURL就是我们说的Additional field。在cache等基础设施不完善时，常这样处理。随着业务的复杂，Additional field不加以限制，会使用的越来越广泛，以至于后续的schema.xml中，参与计算的field反而占少数了。冗余URL这种可预估长度并且低频率变化的field还好理解，我还见过将用户个人说明（simplChinese：Text）进行冗余的，这完全不能接受了，拖累了所有涉及document的RT以及index rebuild。建议在前期基础设施不完善时，可以适量的加入Additional field（技术债务），但请务必在后续完善后，留出重构时间fix，并安排技术沟通会，讨论这种妥协方案的改进办法。

## Mix core
单个Core为了兼容多个业务场景使用，将不同类别的业务数据混合塞入。不同的业务场景之间同时存在重叠和交叉的情况（不存在业务重叠是不需要放到一起的）。为了达到数据兼容，程序在index和query两个阶段都需要进行compatible。这样的Core我们称之为Mix core。

* field级别，有字段只对特定业务才会用到（垂直冗余）
对不同类型的Client提供不同级别的Query

* row级别，有些数据记录对特定业务才会用到（水平冗余）
数据聚合类应用中，对所有结果进行计算：top N、sort、groupBy

由于Solr高效检索的前提是将index文件load到内存进行计算，为了说明row数据量以及field分布与index大小的关系（间接分析memory以及disk的占用关系），统计了一份仿真环境的数据分布，供参考：

```
一些说明：
1.未计算dynamicField分布，实际项目中仅用作版本过渡，没有长期使用。
2.index大小和tlog大小是指相应dir所有文件大小之和。
3.不存在未commit的数据。
4."field分布"，这一列中，"6：TrieIntField；"，表示存在6个solr.TrieIntField类型的字段。
5.仅一个solr节点（singleton node模式），不启用cloud，也意味着没有replica。
6.所有类型的field的length均不超过256位，多数在11位以内。
```

![仿真环境的数据分布](/img/Solr-core-field-analysis.jpg)

从中不难发现：最为常用的是整形，1个普通row约占用1 KB的空间，由于需要在数据量增长时，不线性降低solr查询性能。我们需要保持：混合核心重叠部分的field和row处于大比例，仅仅将极少数用作业务兼容！

# SolrIndexSearcher
Solr查询的核心类就是SolrIndexSearcher，在同一时刻只由当前的SolrIndexSearcher供上层的handler使用（当切换SolrIndexSearcher时可能会有两个同时提供服务），而各种Cache是依附于SolrIndexSearcher的，SolrIndexSearcher在则Cache生，SolrIndexSearcher亡则被clear（solrIndexSearcher.close()）。
在solr4.0之后，有2种commit，hard commit、soft commit。Hard commit操作会触发SolrIndexSearcher切换，而close操作隐含flush AND commit，也会触发。

AutoCommit，Commit操作也可以按条件自动完成（hard commit），maxDocs：按未commit的最大文档数量，event watch机制；maxTime：按上一次未commit距离现在的时间，定时器。同样提供API，手工commit，这样性能比较差，平均每次commit 600ms；
AutoCommit 参考：[http://wiki.apache.org/solr/SolrConfigXml](http://wiki.apache.org/solr/SolrConfigXml)，solrconfig.xml配置：
```
  <updateHandler class="solr.DirectUpdateHandler2">
    <updateLog>
      <str name="dir">${solr.ulog.dir:}</str>
      <int name="numVersionBuckets">${solr.ulog.numVersionBuckets:65536}</int>
    </updateLog>
    <autoCommit>
      <maxTime>${solr.autoCommit.maxTime:15000}</maxTime>
      <openSearcher>false</openSearcher>
    </autoCommit>
    <autoSoftCommit>
      <maxTime>${solr.autoSoftCommit.maxTime:1000}</maxTime>
    </autoSoftCommit>

    <!--
       <listener event="postCommit" class="solr.RunExecutableListener">
         <str name="exe">solr/bin/snapshooter</str>
         <str name="dir">.</str>
         <bool name="wait">true</bool>
         <arr name="args"> <str>arg1</str> <str>arg2</str> </arr>
         <arr name="env"> <str>MYVAR=val1</str> </arr>
       </listener>
      -->
  </updateHandler>
```
Hard commit时，除了向Directory对象提交索引变化(new tlog)，SolrIndexSearcher需要重新建立。commit提交后，index文件flush到硬盘（flush：从内存刷回磁盘保存：fsync），并触发listener，建立new SolrIndexSearcher(新的insexReader，从硬盘中load index)，这样后续的Query使用new SolrIndexSearcher。建议不要频繁修改document，特别是要避免大批量reload，影响RT稳定和服务中断。

Hard commit时，如果有配置auto-warm（autowarmCount=？），则会对new SolrIndexSearcher swap一定数量的old SolrIndexSearcher index文件；而soft commit是在NRT（Near Real Time）实时搜索中提出的(如log、analysis)，不会flush到disk，也可以使得document被搜索到，代价比hard commit要小的多；对实时性要求比较高的场景下，可以做soft commit操作，不过还是要定时hard commit，确保索引持久化到disk。遭遇突发性故障时（机器断电），未flush到disk的数据可能会丢失，在updatelog开启时（updatelog是Solr的概念，在Lucene并没有出现）,solr启动时会进行recover check，尽可能的恢复数据。

# Cache机制
如果把Schema定义为Solr的Model的话，那么Solrconfig.xml就是Solr的Configuration，它定义Solr如果处理索引、高亮、搜索等很多请求，同时还配置cache策略。

solrconfig.xml
```
1.指定索引文件的存储路径
<dataDir>${solr.data.dir:./solr/data}</dataDir>

2.缓存配置

Solr在Lucene之上开发了很多Cache功能，目前提供的Cache类型有：
<!-- 1.filterCache -->
<filterCache class="solr.FastLRUCache"
     size="512"
     initialSize="512"
     autowarmCount="0"/>

<!-- 2.queryResultCache -->
<queryResultCache class="solr.LRUCache"
      size="512"
      initialSize="512"
      autowarmCount="0"/>

<!-- 3.documentCache -->
<documentCache class="solr.LRUCache"
       size="512"
       initialSize="512"
       autowarmCount="0"/>

<!-- 4.自定义缓存策略针对数据块交换 -->
<cache name="perSegFilter"
       class="solr.search.LRUCache"
       size="10"
       initialSize="0"
       autowarmCount="10"
       regenerator="solr.NoOpRegenerator" />

<!-- 5.fieldValueCache -->
<fieldValueCache class="solr.FastLRUCache"
    size="512"
    autowarmCount="128"
    showItems="32" />

// 是否能使用到filtercache关键配置
<useFilterForSortedQuery>true</useFilterForSortedQuery>

// queryresult的结果集控制
 <queryResultWindowSize>20</queryResultWindowSize>

// 是否启用懒加载field
<enableLazyFieldLoading>true</enableLazyFieldLoading>

```
## LRU VS FastLRU
Solr提供了两种SolrCache接口实现类：solr.search.LRUCache和solr.search.FastLRUCache。FastLRUCache是1.4版本中引入的，其速度在普遍意义上要比LRUCache更快些。

LRUCache可配置参数：
1）size：cache中可保存的最大的项数，默认是1024。
2）initialSize：cache初始化时的大小，默认是1024。

3）autowarmCount：当系统启动时（firstSearcher）或切换SolrIndexSearcher时，可以对新生成的SolrIndexSearcher做autowarm（预热）处理。autowarmCount表示从旧的SolrIndexSearcher中取多少项来在新的SolrIndexSearcher中被重新生成，如何重新生成由CacheRegenerator实现。

查看Solr源码可以发现，在实现上，LRUCache直接使用LinkedHashMap来缓存数据，由initialSize来限定cache的大小，淘汰策略也是使用LinkedHashMap的内置的LRU方式，读写操作都是对map的全局锁，所以并发性效果方面稍差。

filterCache和fieldValueCache使用FastLRUCache实现，FastLRUCache内部使用了ConcurrentLRUCache来缓存数据，它是个加了LRU淘汰策略的ConcurrentHashMap，所以其并发性要好很多，这也是多数Java版Cache的极典型实现。

## filterCache

filterCache中存储了无序的lucene document Id集合，即FilterCache存储了一些无序的文档id，这些Id并不是我们在schema.xml里配置的unique key，而是solr内部的一个文档标识。filterCache存储了filter queries(“fq”参数)得到的document Id集合结果。Solr中的query参数有两种，即q和fq。如果fq存在，Solr是先查询fq（因为fq可以多个，所以多个fq查询是个取结果交集的过程（Map-reduce模型）)，之后将fq结果和q结果取并。在这一过程中，filterCache就是key为单个fq（类型为Query），value为document Id集合（类型为DocSet）的cache。从后面的分析你将会看到对于fq为range query来说，filterCache将表现出其更有价值的一面。

## queryResultCache
顾名思义，queryResultCache是对查询结果的缓存（SolrIndexSearcher中的cache缓存的都是document Id set），这个结果就是针对查询条件的完全有序的结果。因为查询参数是有start和rows的，所以某个QueryResultKey可能命中了cache，但start和rows却不在cache的document Id set范围内。当然，document Id set是越大命中的概率越大，但这也会很浪费内存，这就需要个参数：queryResultWindowSize来指定document Id set的大小。

## documentCache
documentCache用来保存"doc_Id,document"键值对(正排索引)。如果使用documentCache，就尽可能开大些，至少要大过max_results * max_concurrent_queries，否则因为cache的淘汰，一次请求期间还需要重新获取document一次。也要注意document中存储的字段的多少，避免大量的内存消耗。


# 数据维护原则
在类ELK准实时日志分析方案中，各节点的logs被聚合到Solr中存储，在内存积累一定批次后，触发hard commit持久化到disk，在disk积累到一定量后进行转移（或直接删除），不涉及到update业务。而在类LBS（Location-Based Service）应用中，经纬度和用户信息被定时上传到database存储，然后sync到Solr，document可能被频繁update。提交document到Solr索引后，那修改documents的策略是什么呢？最简单的，Solr提供full-replace的方式进行更新，如果配置为覆盖旧版本在，则先按照uniqueKey找到old document并标记为删除，让后add new document，这主要是lucene是按照“delete-add”的模式来维护数据。另外，Solr支持document按field局部更新。

## Atomic Updates
局部更新允许修改一个或多个field，而不必重新索引整个document。在multiValued类型的field中，它甚至允许按正则表达式局部更新value，以便加速Solr对index的索引处理，减轻QPS波动。

![](/img/solr-atomic-updates.jpg)

## Optimistic Concurrency Control
[乐观并发控制(OCC)，或称乐观锁](https://www.google.com.hk/url?sa=t&rct=j&q=&esrc=s&source=web&cd=2&cad=rja&uact=8&ved=0ahUKEwi3qqHH3qzPAhUJs48KHYRaBPQQFggpMAE&url=https%3A%2F%2Fzh.wikipedia.org%2Fzh-cn%2F%25E4%25B9%2590%25E8%25A7%2582%25E5%25B9%25B6%25E5%258F%2591%25E6%258E%25A7%25E5%2588%25B6&usg=AFQjCNHJ4Y6Fpckt8rQxpRc5NSC_CHQtIA)。它是一种多数NoSQL数据库具备的特性，它允许client基于version number按条件并发update same document，为了防止ABA问题，Solr使用字段"\_version\_"来控制document版本，为了可比较，被设置为数值型，默认情况下，这个字段被定义在schema.xml。client在提交document时，不需要提供\_version\_的值，它在document每次发生变化时，被Solr自动修改，修改的值全局唯一。

```
<field name="_version_" type="long"/>
```
在默认配置下，"\_version\_"配置为"indexed=true"，对于某些操作系统来说，海量的document，FieldCache增加需要消耗太多内存。由于该字段不参与计算，可以关闭index，将"\_version\_"定义为DocValues。
```
<field name="_version_" type="long" indexed="false" stored="true" required="true" docValues="true"/>
```
## Field Storage
如果field想要使用atomic update功能，在schema.xml中，除了copyField的destinations需要配置为“stored='false'”之外，目标field必需配置为“stored='true'”。在copyField中，Solr会index所有的source fields最新值。如果copyField的destinations配置为“stored='true'”，如果同时修改source fields和destination field的值，那destination field就会看起来像被source fields修改的值覆盖一样。

## 小结
document被修改后相应的documentCache、fieldCache被clear，被删除后filterCache、queryResultCache、fieldCache需要update。应该谨慎对待update操作，尽可能少的发起hard commit操作，减少solrIndexSearcher rebuild。对少量field更新采取atomic update的方式进行，对于大量field更新采取full-replace策略。

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

# 使用总结
## 命令行启动
```
F:\solr\bin>solr start -m 1g -f
```
## 清空index
```
curl http://<host>:<port>/<solr_base>/update?commit=true -d '<delete><query>*:*</query></delete>'
```
## Core 别名
在文件/core.properties中，定义name字段，既可作为别名。同时还可以设置使用的solrconfig.xml路径，以达到多Core共用同一份solrconfig.xml的目的，schema.xml也是类似的设置。

dataDir可以配置Core数据目录，以达到程序与数据分离的效果，方便备份和容灾。
```
#我的Core文件夹名是：order，设置别名为myOrder。在client中就可以使用myOrder来调用我的Core
name=myOrder
config=solrconfig.xml
schema=schema.xml
dataDir=data
```
## 查询技巧
1.只查询字段orderStatus值在1到3的数据
方案1.orderStatus可以是int、string类型
```
q=*:*&fq={!frange l=1 u=3}orderStatus
```
方案2.orderStatus确定是整数
```
q=*:*&fq=orderStatus:[1 TO 3]
```


# 研究Join query
附上研究Join query的实战代码
```
//测试用的Solr环境为：
// solr 6.1
// jetty容器
//启动参数：solr start -m 1g -f
//windows 7 X64
//solrj maven: <groupId>org.apache.solr</groupId> <artifactId>solr-solrj</artifactId> <version>5.3.0</version>
//<luceneMatchVersion>6.1.0</luceneMatchVersion>

String solrHostName = "http://127.0.0.1:8983/solr/";
SolrClient userClient = new HttpSolrClient(solrHostName + "user");
SolrClient orderClient = new HttpSolrClient(solrHostName + "order");

List<SolrInputDocument> userDocuments = new ArrayList<>();
System.out.println("添加用户“张三”");
SolrInputDocument userDocument = new SolrInputDocument();
userDocument.addField("Id", 1000);//用户唯一编号
userDocument.addField("type", 0);//0=普通用户；1=VIP用户
userDocument.addField("nickname", "张三");//昵称
userDocument.addField("status", 0);//0=失效；1=有效
userDocument.addField("updateTime", System.currentTimeMillis());//账户最后一次活动时间
userDocuments.add(userDocument);
System.out.println("添加用户“李四”");
SolrInputDocument userDocument2 = new SolrInputDocument();
userDocument2.addField("Id", 2000);//用户唯一编号
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
orderDocument.addField("Id", 3000);//订单唯一编号
orderDocument.addField("type", 0);//0=微信订单；1=唯品会订单
orderDocument.addField("title", "张三的订单：商品001、商品002");//订单概览
orderDocument.addField("remark", "我是备注...");//订单备注
orderDocument.addField("uId", 1000);//下单用户Id
orderDocument.addField("status", 0);//0=创建；1=付款；2=付款超时
orderDocument.addField("amount", 188);//金额、以分为单位
orderDocument.addField("updateTime", System.currentTimeMillis() + 2);//订单最后一次更新时间
orderDocuments.add(orderDocument);
SolrInputDocument orderDocument2 = new SolrInputDocument();
orderDocument2.addField("Id", 4000);//订单唯一编号
orderDocument2.addField("type", 1);//0=微信订单；1=唯品会订单
orderDocument2.addField("title", "张三的订单：商品041、商品082");//订单概览
orderDocument2.addField("remark", "我是备注..*******.");//订单备注
orderDocument2.addField("uId", 1000);//下单用户Id
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
//类似的SQL：SELECT u.Id,u.nickname FROM user u INNER JOIN order o ON u.Id=o.uId WHERE o.status=1;

SolrQuery query = new SolrQuery();
query.addField("Id");
query.addField("nickname");
query.setQuery("*:*");
//status:1作为filter是必需的，不填会报错
//*Index与当前client相同时可省略
//query.addFilterQuery("{!join from=uId to=Id fromIndex=order toIndex=user}status:1");
query.addFilterQuery("{!join from=uId to=Id fromIndex=order}status:1");
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
query params:fl=Id%2Cnickname&q=*%3A*&fq=%7B%21join+from%3DuId+to%3DId+fromIndex%3Dorder%7Dstatus%3A1
result size:1
查询有已付款订单的用户昵称和用户Id result:[{"Id":1000,"nickname":"张三"}]
```

# Reference

* [Solr join query wiki](https://cwiki.apache.org/confluence/display/solr/Other+Parsers#OtherParsers-JoinQueryParser)
* [Solr cache分析](http://josh-persistence.iteye.com/blog/2247289)
* [Solr API 分析](http://blog.csdn.net/yangbutao/article/details/9179347)
* [Solr dataStructure 分析](http://aoyouzi.iteye.com/blog/2291913)
* [Solr update index 策略](https://cwiki.apache.org/confluence/display/solr/Updating+Parts+of+Documents#UpdatingPartsofDocuments-AtomicUpdates)