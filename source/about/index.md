---
#title: '成亮_技术经理_简历'
date: 2016年3月21日16:59:51
---

# 联系方式

- 手机/微信：(+86) 186-7297-8279

- Email：<stevenchengmask@gmail.com>

---

# 个人信息


 - <a target="_blank" href="http://amao12580.github.io/file/成亮_技术经理_简历.pdf">下载简历</a>

 - 成亮

 - 1991 / 5年经验

 - 博客：<a target="_blank" href="https://amao12580.github.io/">https://amao12580.github.io/</a>

 - GitHub：<a target="_blank" href="https://github.com/amao12580/">https://github.com/amao12580/</a>

 - 期望职位：技术经理

 - 期望薪资：税前月薪35k

 - 期望城市：深圳

---

# 工作经历

## 深圳市铺铺旺电子商务有限公司 (2016年3月 - 至今)

### 小旺项目

* <a target="_blank" href="http://android.myapp.com/myapp/detail.htm?apkName=com.xw.customer">Android版</a>

* <a target="_blank" href="https://itunes.apple.com/cn/app/pu-pu-wang-xin-ban/id1063622628?mt=8">iOS版</a>


担任高级软件开发工程师、系统架构师，主导团队完成APP后台整体架构的持续改造升级。在对系统可维护性、高性能、高可靠性、高可扩展方面进行改善的同时，团队还完成了里程碑7、8、9等业务开发需求。对平台的改造升级还使团队的开发、部署效率得到提高，免去了以往的加班延期。

在代码架构方面，定期(每周>2次)code review，进行问题分析(gatling、findbugs、checkstyle)并推动系统重构，对复用代码收敛的同时，引入新技术(lombok)，清理掉了超过20%代码，同时对代码注释和规范性进行提高，提高了代码的可维护性，对错误使用SQL的代码进行优化，有20+个接口因此降低RT，最多的竟降低了45%；引入接口版本号机制，配合强制更新策略，使接口维护成本可控。

在部署架构方面，针对业务需求，进行高可用、高可扩展方面的加强，引入mysql主从架构，重写涉及大量计算的功能(系统推荐)，分配到只读节点进行计算，升级redis为集群模式(codis)，并因此规范cache层的调用，对key进行hash分桶存储。使用nginx，结合flyway，解决线上平台不停机升级的问题，nginx同时还解决了HTTPS、访问控(limit\_req\_zone)、负载均衡、Auto failover(<a target="_blank" href="http://amao12580.github.io/post/2016/04/Nginx-with-docker-part-two/#可扩展">nginx\_upstream\_check\_module</a>)、动静分离的问题。

在平台的安全方面，各业务安全需求不一。对重要性的信息，改进通讯协议，进行加密传输。比如用户登录、修改密码业务中，使用HTTPS通道。在商品上架时，使用一次性AES密钥，结合RSA公钥进行数据加密。

在环境一致性方面，对于各个(线上、测试、开发)环境的一致性问题，采用docker，结合docker-compose容器编排工具，我们在各个环境的解决方案都能得到统一，大大减少了部署工作。

---

# 开源项目

## 维护
- <a target="_blank" href="https://github.com/amao12580/RSSReader">RSSReader</a> : 个人rss源管理和新文章推送，分为pc端和android端。

- <a target="_blank" href="https://github.com/amao12580/JOOQ-With-Spring">JOOQ-With-Spring</a> : 推动spring与jooq的深入集成，并梳理了良好的分层架构。

## 贡献

<a target="_blank" href="https://github.com/dangdangdotcom/elastic-job/blob/master/README.md">Elastic-Job</a>

- <a target="_blank" href="https://github.com/dangdangdotcom/elastic-job/issues/6">[Improvement] 校对作业服务器与注册中心时间误差</a>：对基础组件进行改良，已被采纳。

- <a target="_blank" href="https://github.com/dangdangdotcom/elastic-job/issues/1">[Bug] 复杂网络环境下IP地址获取不准确的问题</a>：提出并修复第一个Bug，已被采纳。

# 技术文章

- Nginx专题研究总结：<a target="_blank" href="http://amao12580.github.io/post/2016/04/Nginx-with-docker-part-two/">Nginx与Docker容器系列 <02:在生产环境的实践></a>

- JOOQ专题研究总结：<a target="_blank" href="http://amao12580.github.io/post/2016/04/JOOQ-from-entry-to-improve/">JOOQ 3.6.1 使用总结：从入门到提高</a>

# 技能清单


以下均为我熟练使用的技能

- 编程语言：Java
- DI框架：Spring
- MVC框架：Spring-MVC/Blade
- ORM框架：MyBatis/JOOQ
- 数据库：MySQL/Redis/MongoDB
- 消息队列：ActiveMQ
- 搜索引擎：Solr
- 版本管理：SVN/Git
- 代码构建管理：Maven
- 代码质量管理：FindBugs/Checkstyle/Sonar
- 文档管理：MediaWiki/Markdown
- 持续集成：Jenkins
- 缺陷跟踪管理：JIRA
- 单元测试：JUnit
- 功能测试：Postman/Fiddler
- 性能测试：Gatling/Jvisualvm
- 容器服务：Docker/Docker Compose/Docker Swarm
- 开发环境：Linux/IntelliJ IDEA/Eclipse/MyEclipse
- 服务器：Nginx/Tomcat
- 负载均衡：Keepalived/HAProxy

---

# 致谢
感谢您花时间阅读我的简历，期待能有机会和您共事。
