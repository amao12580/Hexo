---
title: 开源贡献 - 升级Solr中文分词器 mmseg4j-solr
date: 2016年7月25日12:47:50
tags:
    - Solr
    - Mmseg4j-solr
    - Open-Source-Contribution
categories:
    - Record
description: Google关于mmseg4j-solr对solr版本的兼容情况，发现mmseg4j-solr还停留在对5.3版本的支持，没人维护了，那我们自食其力，看能否解决？最终还是成功完成，看来改源码，也没有很难嘛！持续几个问题解决后，我们也得到了兼容性的jar包，实验在测试环境可以用！考虑到很多人也需要版本升级，本着取之于开源，反哺开源，则不竭的精神。对源repo提交了pull request。
---

## 写在前面
最近因为团队职责变动，接手了Solr的维护工作。仔细比对各个环境的使用版本才发现，都是使用的5.3，查了一下这个就快发布一年了。为什么不用最新版的6.1呢？有点忍不住技痒了，整一下升级到6.1的方案吧！


## 简单介绍Solr

Apache Solr (读音: SOLer) 是一个开源的搜索服务器。Solr 使用 Java 语言开发，主要基于 HTTP 和 Apache Lucene 实现。Apache Solr 中存储的资源是以 Document 为对象进行存储的。每个文档由一系列的 Field 构成，每个 Field 表示资源的一个属性。Solr 中的每个 Document 需要有能唯一标识其自身的属性，默认情况下这个属性的名字是 id，在 Schema 配置文件中使用：id进行描述。 Solr是一个高性能，采用Java开发，基于Lucene的全文搜索服务器。文档通过Http利用XML加到一个搜索集合中。查询该集合也是通过 http收到一个XML/JSON响应来实现。它的主要特性包括：高效、灵活的缓存功能，垂直搜索功能，高亮显示搜索结果，通过索引复制来提高可用性，提 供一套强大Data Schema来定义字段，类型和设置文本分析，提供基于Web的管理界面等。

## 什么是mmseg4j-solr？

mmseg4j 用 Chih-Hao Tsai 的 [MMSeg 算法](http://technology.chtsai.org/mmseg/ )实现的中文分词器，并实现 lucene 的 analyzer 和 solr 的TokenizerFactory 以方便在Lucene和Solr中使用。

2、MMSeg 算法有两种分词方法：Simple和Complex，都是基于正向最大匹配。Complex 加了四个规则过虑。官方说：词语的正确识别率达到了 98.41%。mmseg4j 已经实现了这两种分词算法。 * 1.5版的分词速度simple算法是 1100kb/s左右、complex算法是 700kb/s左右，（测试机：AMD athlon 64 2800+ 1G内存 xp）。 * 1.6版在complex基础上实现了最多分词(max-word)。“很好听” -> "很好|好听"; “中华人民共和国” -> "中华|华人|共和|国"; “中国人民银行” -> "中国|人民|银行"。 * 1.7-beta 版, 目前 complex 1200kb/s左右, simple 1900kb/s左右, 但内存开销了50M左右. 上几个版都是在10M左右. * 1.8 后,增加 CutLetterDigitFilter过虑器，切分“字母和数”混在一起的过虑器。

## 升级方案

### 尝试强制升级

首先尝试直接强制升级。下载6.1版的zip，解压后，将5.3版本的核心配置文件、lib包拷贝并覆盖过来，启动时大量报错了：


lib包主要是:

* mmseg4j-core-1.10.0.jar
* mmseg4j-solr-2.3.0.jar
* pinyin4j-2.5.jar
* pinyinFilter-0.2.jar

![](/img/solr-libs.png)

```

启动solr时报错

cd /solr/bin
solr start -m 1g -f

2016-07-25 05:03:45.776 WARN  (coreLoadExecutor-6-thread-1) [   ] o.a.s.s.FieldTypePluginLoader TokenFilterFactory is using deprecated 5.3.0 emulation. You should at some point declare and reindex to at least 6.0, because 5.x emulation is deprecated and will be removed in 7.0
2016-07-25 05:03:45.783 ERROR (coreLoadExecutor-6-thread-2) [   ] o.a.s.c.CoreContainer Error creating core [opportunity]: org.apache.solr.core.SolrResourceLoader.getInstanceDir()Ljava/lang/String;
java.lang.NoSuchMethodError: org.apache.solr.core.SolrResourceLoader.getInstanceDir()Ljava/lang/String;
    at com.chenlb.mmseg4j.solr.Utils.getDict(Utils.java:18)
    at com.chenlb.mmseg4j.solr.MMSegTokenizerFactory.inform(MMSegTokenizerFactory.java:65)
    at org.apache.solr.core.SolrResourceLoader.inform(SolrResourceLoader.java:699)
    at org.apache.solr.schema.IndexSchema.<init>(IndexSchema.java:184)
    at org.apache.solr.schema.IndexSchemaFactory.create(IndexSchemaFactory.java:56)
    at org.apache.solr.schema.IndexSchemaFactory.buildIndexSchema(IndexSchemaFactory.java:75)
    at org.apache.solr.core.ConfigSetService.createIndexSchema(ConfigSetService.java:108)
    at org.apache.solr.core.ConfigSetService.getConfig(ConfigSetService.java:79)
    at org.apache.solr.core.CoreContainer.create(CoreContainer.java:810)
    at org.apache.solr.core.CoreContainer.lambda$load$0(CoreContainer.java:466)
    at java.util.concurrent.FutureTask.run(FutureTask.java:266)
    at org.apache.solr.common.util.ExecutorUtil$MDCAwareThreadPoolExecutor.lambda$execute$22(ExecutorUtil.java:229)
    at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1142)
    at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:617)
    at java.lang.Thread.run(Thread.java:745)

```

看样子是mmseg4j-solr.jar包中，文件com.chenlb.mmseg4j.solr.Utils.java，第18行有方法调用错误，猜测可能是因为API变动，导致版本不兼容。

Google一些关于mmseg4j-solr对solr版本的兼容情况，发现mmseg4j-solr还停留在对5.3版本的支持，没人维护了，那我们自食其力，看能否解决？

好在[mmseg4j-solr已经在GitHub开放了源码](https://github.com/chenlb/mmseg4j-solr/blob/master/README.md(https://github.com/chenlb/mmseg4j-solr/blob/master/README.md)，开始干吧！

### 改源码进行兼容

首先fork源码，clone到本机，对文件com.chenlb.mmseg4j.solr.Utils.java，第18行修改，这一行果然报Compile error。这就完了吗？试试package一下吧！maven install过程中，执行MMSegTokenizerFactoryTest case也报错了。

```

Tests run: 1, Failures: 0, Errors: 1, Skipped: 0, Time elapsed: 10.921 sec <<< FAILURE! - in com.chenlb.mmseg4j.solr.MMSegTokenizerFactoryTest
com.chenlb.mmseg4j.solr.MMSegTokenizerFactoryTest  Time elapsed: 10.905 sec  <<< ERROR!
java.lang.RuntimeException: org.apache.solr.common.SolrException: Solr no longer supports forceful unlocking via the 'unlockOnStartup' option.  This is no longer necessary for the default lockType except in situations where it would be dangerous and should not be done.  For other lockTypes and/or directoryFactory options it may also be dangerous and users must resolve problematic locks manually.
    at com.chenlb.mmseg4j.solr.MMSegTokenizerFactoryTest.beforeClass(MMSegTokenizerFactoryTest.java:33)
Caused by: org.apache.solr.common.SolrException: Solr no longer supports forceful unlocking via the 'unlockOnStartup' option.  This is no longer necessary for the default lockType except in situations where it would be dangerous and should not be done.  For other lockTypes and/or directoryFactory options it may also be dangerous and users must resolve problematic locks manually.
    at com.chenlb.mmseg4j.solr.MMSegTokenizerFactoryTest.beforeClass(MMSegTokenizerFactoryTest.java:33)


Results :

Tests in error:
  MMSegTokenizerFactoryTest.beforeClass:33->SolrTestCaseJ4.initCore:443->SolrTestCaseJ4.initCore:436->SolrTestCaseJ4.initCore:594->SolrTestCaseJ4.createCore:601 ? Runtime

Tests run: 6, Failures: 0, Errors: 1, Skipped: 0

[INFO] ------------------------------------------------------------------------
[INFO] BUILD FAILURE
[INFO] ------------------------------------------------------------------------
[INFO] Total time: 17.375 s
[INFO] Finished at: 2016-07-25T13:18:43+08:00
[INFO] Final Memory: 32M/218M
[INFO] ------------------------------------------------------------------------
[ERROR] Failed to execute goal org.apache.maven.plugins:maven-surefire-plugin:2.19.1:test (default-test) on project mmseg4j-solr: There are test failures.
[ERROR]
[ERROR] Please refer to D:\GitHub\mmseg4j-solr\target\surefire-reports for the individual test results.
[ERROR] -> [Help 1]
[ERROR]
[ERROR] To see the full stack trace of the errors, re-run Maven with the -e switch.
[ERROR] Re-run Maven using the -X switch to enable full debug logging.
[ERROR]
[ERROR] For more information about the errors and possible solutions, please read the following articles:
[ERROR] [Help 1] http://cwiki.apache.org/confluence/display/MAVEN/MojoFailureException

```

看样子是unlockOnStartup选项不再受支持，需要移除，我们移除一下试试吧，找到该选项位于Test Resource包下的文件solrconfig.xml中，删掉了。再尝试install！还是报错！

```

Tests run: 1, Failures: 0, Errors: 1, Skipped: 0, Time elapsed: 3.586 sec <<< FAILURE! - in com.chenlb.mmseg4j.solr.MMSegTokenizerFactoryTest
test_mmseg4j(com.chenlb.mmseg4j.solr.MMSegTokenizerFactoryTest)  Time elapsed: 0.012 sec  <<< ERROR!
org.apache.solr.common.SolrException: SolrCore 'mmseg4j_core' is not available due to init failure: Error loading class 'org.apache.solr.handler.admin.AdminHandlers'
    at com.chenlb.mmseg4j.solr.MMSegTokenizerFactoryTest.getDictionaryByFieldType(MMSegTokenizerFactoryTest.java:37)
    at com.chenlb.mmseg4j.solr.MMSegTokenizerFactoryTest.test_mmseg4j(MMSegTokenizerFactoryTest.java:79)
Caused by: org.apache.solr.common.SolrException: Error loading class 'org.apache.solr.handler.admin.AdminHandlers'
Caused by: org.apache.solr.common.SolrException: Error loading class 'org.apache.solr.handler.admin.AdminHandlers'
Caused by: java.lang.ClassNotFoundException: org.apache.solr.handler.admin.AdminHandlers


Results :

Tests in error:
  MMSegTokenizerFactoryTest.test_mmseg4j:79->getDictionaryByFieldType:37 ? Solr ...

Tests run: 6, Failures: 0, Errors: 1, Skipped: 0

[INFO] ------------------------------------------------------------------------
[INFO] BUILD FAILURE
[INFO] ------------------------------------------------------------------------
[INFO] Total time: 6.131 s
[INFO] Finished at: 2016-07-25T13:20:50+08:00
[INFO] Final Memory: 23M/226M
[INFO] ------------------------------------------------------------------------
[ERROR] Failed to execute goal org.apache.maven.plugins:maven-surefire-plugin:2.19.1:test (default-test) on project mmseg4j-solr: There are test failures.
[ERROR]
[ERROR] Please refer to D:\GitHub\mmseg4j-solr\target\surefire-reports for the individual test results.
[ERROR] -> [Help 1]
[ERROR]
[ERROR] To see the full stack trace of the errors, re-run Maven with the -e switch.
[ERROR] Re-run Maven using the -X switch to enable full debug logging.
[ERROR]
[ERROR] For more information about the errors and possible solutions, please read the following articles:
[ERROR] [Help 1] http://cwiki.apache.org/confluence/display/MAVEN/MojoFailureException

```

看样子是org.apache.solr.handler.admin.AdminHandlers无法加载，该配置位于solrconfig.xml。google发现该api已经换了，与5.3版不再兼容。找了一份6.1的basic solrconfig.xml进行替换，再试着install就成功啦！

## PR
看来改源码，也没有很难嘛！持续几个问题解决后，我们也得到了兼容性的jar包，实验在测试环境可以用！考虑到很多人也需要版本升级，本着取之于开源，反哺开源，则不竭的精神。对源repo提交了pull request。PR地址：[https://github.com/chenlb/mmseg4j-solr/pull/26](https://github.com/chenlb/mmseg4j-solr/pull/26)。

该PR还没有merger到master，如果等不及请下载我提供的：[mmseg4j-solr-2.3.2.jar](/file/mmseg4j-solr-2.3.2.rar)