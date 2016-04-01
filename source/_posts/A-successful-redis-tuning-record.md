---
title: 记一次redis成功调优的过程
date: 2016-03-23 16:09:12
tags:
    - Redis
    - Hash
    - Sharding
    - Twemproxy
categories:
    - Record
description: "在最后一步提到RDB定期存盘，解决方案存在问题，强行关闭，会导致redis中的数据存在丢失风险，在这里建议有条件的，配置redis为1主1从，Master不进行任何形式的存盘，而Slave配置RDB和AOF方式的存盘，双保险。应用只连接Master即可。"
---

## 我们怎么使用Redis？
公司目前主力开发的产品，是一个典型的平台电商型产品，包含了平台运营方、商家、消费者等角色。

公司提供电商平台，同时负责系统维护和系统保障；商家与公司进行签约后，入驻平台，将商品投放到平台进行展示；平台依据商家签约信息，进行商品与消费者之间的兴趣推荐，消费者通过商品与商家达成消费订单后，平台按单依据签约与商家抽取利润。商家发现日订单分析有了提升后，可能会与平台达成更多的合作。从而演变出了良好的商业发展模式。

平台电商型产品中，非常满足80/20法则(又称为:[帕雷托法则](https://zh.wikipedia.org/wiki/%E5%B8%95%E9%9B%B7%E6%89%98%E6%B3%95%E5%88%99)),查询的业务量远远多于写入的业务量，为了提高[TPS](http://www.ha97.com/5095.html)，降低对数据库的访问。我们也采取常规的做法，选用redis进行缓存常用业务数据。其中典型的就有：1.图片的信息、2.登录后的用户信息、3.全局超时锁、4.验证码。

关于redis的技术选型，其实在我参与产品开发之前就已经完成了，在这个产品里也作为缓存层在使用。产品目前还在雏形孵化阶段，没有考虑太多关于分布式以及高可用的方案，对redis的使用很粗糙，在团队内可能熟悉redis的Developer不多，或者说有空又有耐心还熟悉redis的Developer没有吧？后来与PM的沟通后得知确实如此！

### 缓存图片信息
目前有很多业务在使用该缓存：商品的图片编辑，商家店面形象的图文自我介绍，用户针对订单的图文评价.

这一部分的数据，在产品启动时(没有黑科技，就是在web.xml，自定义listener。)，读取Mysql中的File表，load进redis，数据量约120W条，没有做任何的分库分表处理。

File表的结构如下：
```
CREATE TABLE `file` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '图片ID',
  `uid` int(11) DEFAULT NULL COMMENT '上传用户Id',
  `crc32` char(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'crc32校验和',
  `url` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '对外访问的URL',
  `path` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '存储的相对路径',
  `filename` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '文件名字',
  `size` int(11) DEFAULT NULL COMMENT '图片大小(单位byte)',
  `ext` char(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '图片后缀',
  `is_image` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否是图片，0为不是，1为是',
  `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `storage_type` tinyint(4) NOT NULL DEFAULT '0' COMMENT '图片存储介质，0为fileSystem，1阿里云,2表示ppw老数据',
  PRIMARY KEY (`id`),
  UNIQUE KEY `filename` (`filename`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1146617 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件信息表';
```


有意思的是，每次产品启动时，读取到的所有File表记录，进行for循环，每一次循环中，访问一次redis。而在产品关闭时，删除redis的key，从而清除缓存？如果数据量愈来愈多，不就像做过山车一样，启动时加载全量数据，使用量飚的很高，关闭时删除全量缓存，使用量逐渐落回低谷(redis有[内存释放机制](http://wangneng-168.iteye.com/blog/2100379))。对于内存型中间件产品，这样的使用会带来很多的不可靠性。

启动时加载数据到redis时的处理过程,部分为伪码：
```
File表对应的实体类：
public class File{//与数据库字段名完全的一致
    private int id;
    private int uid;
    private String crc32;
    private String url;
    private String path;
    private String filename;
    private int size;
    private String ext;
    private int is_image;
    private Timestamp create_time;
    private int storage_type;

    //忽略 getter\setter
}


//调用Dao层访问Mysql数据库，取回File表的所有记录，每条记录包含所有字段。
List<File> files=this.fileDao.getAll();


//读取File表的SQL：SELECT * FROM FILE;

for(int i=0;i<files.size();i++){
    this.cacheDao.setOneFileToRedis(files.get(i).getId(),files.get(i).getUrl());//调用Dao层访问Redis，将数据存入redis
    //WTF?只需要2个字段，然而取回了所有字段？而且不能批量存入redis?
}


cacheDao的实现
private final static String PHOTO_CACHE_KEY="photos";
public void setOneFileToRedis(int id,String url){
    this.jedis.hset(PHOTO_CACHE_KEY, id.toString(), url);//1.使用[Hash数据结构](https://redis.readthedocs.org/en/2.4/hash.html)。2.没有设置key有效期，即永久有效。
}

public String getOneFileInRedis(int id){
    return this.jedis.hget(PHOTO_CACHE_KEY, id.toString());
}
```

这样图片信息缓存的结构看起来是这样:
![photos在redis的数据结构示例](/img/photos在redis的数据结构示例.png)
实际的情况下，size远大于1000，上文说了约在120w左右，我的这个redis可视化工具(redisclient-win32.x86.2.0)无法获取size这样大的key，报SocketTimeOutException。猜测是向redis获取大key时，无法在一个socket包中写入，造成通讯失败。

以上cacheDao的实现中，没有提供一次批量获取所需的多个图片信息，例如“public Map<Integer,String> getBatchFileInRedis(int[] ids)”，甚至在cache interface中都没有提供这样的接口定义。

这样导致在上层逻辑中，出现大量一次性代码。因为调用不集中，给重构带来很大麻烦。
```
这是分页获取商品列表的伪代码实现

与数据库product表对应的实体类
public class Product{
    private int id;
    private String name;
    private long price;
    private int photoId;

    //忽略 getter\setter
}

真实的返回到app端的对象
public class ProductFull{
    private int id;
    private String name;
    private long price;
    private int photoId;
    private String photoUrl;

    //忽略 getter\setter
}
public List<ProductFull> findProductByPage(int pageSize,int pageNo){
    List<Product> products=this.productDao.findByPage(int pageSize,int pageNo);//调用Dao层访问Mysql
    List<ProductFull> results=new ArrayList<>(products.size());
    for(Product product:products){
        ProductFull pf=new ProductFull();
        pf.setId(product.getId());//其他的属性值都是类似的拷贝，或借助Apache-Common beanUtils组件进行拷贝。


        String url=this.cacheDao.getOneFileInRedis(product.getPhotoId());//每一个循环项都访问了redis
        pf.setPhotoUrl(url);
        results.add(pf);
    }
    return results;
}

如果每个商品分页是10条，最坏情况下，需要访问1次Mysql+访问10次redis。非常严重的是，每个分页条数的大小由app端决定，服务端不限制，WTF?
```

### 缓存登录后的用户信息
在这个产品面向消费者以及商家，都推出了不同的APP。互联网APP为了提高用户体验，以及降低用户登录登出频次(用户的登录/登出操作，对服务器是比较大的开销)，都会对一次登陆成功的用户，默认在一段时间不需要再次登录。即服务器分配Token给APP本地保存，同时服务器保存Token，设置该Token在一段时间不活动后自动失效，APP后续与服务器的通信中，都需要提交该Token鉴权。这是很常规的做法，短时间有效，而且是非关键性小数据，一次写入多次读取，对于服务器来说，没有比memcached或redis更合适的选择了，那为什么没有选择memcached？我个人的猜测是memcached更适合做Object Store Server，而且很重要的redis的[扩容与容灾机制](http://www.cnblogs.com/EE-NovRain/p/3268476.html)较好。

用户的第一次登录，服务端进行参数解析，鉴权后，就需要写入2次redis。
用户的登出接口中，直接是删除当前会话的redis记录。

第一次：写入本次登入的Token与用户信息的关联
```
登录成功后，从DB或Cache层获取用户数据，构造用户数据JSON
String userLoginSuccessInfo="{"uid":12321,"name":"张三","sex":0,"avatar_id":345643}";

cacheDao的实现
private final static String SESSION_CACHE_KEY="session:";
public void setOneLoginSuccessToRedis(String token,String userLoginSuccessInfo){
    this.jedis.setex(SESSION_CACHE_KEY+token, 30*24*60*60, userLoginSuccessInfo);//1.使用String数据结构。2.设置key有效期30天。
}

public String getOneLoginSuccessInRedis(String token){
    return this.jedis.get(SESSION_CACHE_KEY+token);
}

这个以"session:"开头的key里，并没有实现从uid如何获取token值？
这会引发的问题：一个用户的多次登录，会生成多个以"session:"开头的key，没有覆盖之前登录的token。造成内存空间的浪费，以及不安全。正确的做法在下文会提到。
```

第二次：写入本次登入的用户id与24小时内的积分获取信息。

有一个需求定义用户在登录后可以获取积分，但在24小时内的登录只算一次。

那在服务器端的是实现是，用户第一次登录成功后，在redis写入一个与该用户相关的key，并设置24小时后失效，然后再增加积分。用户在24小时内进行第二次登录，先读取redis是否有相关的key，使用exist命令，如果已经有了，就不增加积分了。

```
登录成功后，从DB或Cache层获取用户数据，构造用户与积分业务数据JSON
int uid=158263;

cacheDao的实现
private final static String USER_ACTIVITY_CACHE_KEY="daily_activity_";
public void setOneUserWithActivityToRedis(int uid){
    this.jedis.setex(USER_ACTIVITY_CACHE_KEY+uid, 24*60*60, "");//1.使用String数据结构。2.设置key有效期24h。3.value部分为空字符串？
}

public boolean checkOneUserWithActivityToRedis(int uid){
    this.jedis.exists(USER_ACTIVITY_CACHE_KEY+uid);
}

```
这部分的业务属于典型案例，浪费内存空间。
第一个问题，不应该使用长前缀，每个key都需要set进内存，长前缀意味着空间占用，以及效率低下。
第二个问题，这不是明显可以使用[sorted set数据结构](https://redis.readthedocs.org/en/2.4/sorted_set.html)?，还可以省掉一次exists检查。

虽然redis的TPS很高，但是我们依旧要避免滥用。

## 这次的问题的描述？
测试MM提出在性能测试环境中，有一些API在并发数到250~300时，出现很多报错。
```
redis的相关错误
Could not get a resource from the pool
```
典型报错的接口有
* 分页获取商品列表
* 用户登录

应用中配置redis连接池上限值是1000，而在redis server端配置maxClients=10000;区区这点并发，就耗尽redis连接池资源了？绝不可能，问题还在更远的地方等着我.

性能测试环境配置
```
硬件配置
操作系统    Linux Ubuntu 14.04.4 LTS
CPU个数   4
CPU时钟频率 2.6G
内存  4G
有无外部存储  云端存储

软件配置
docker  1.9.1
mysql   5.6
jdk 1.8.0_72
solr    5.3.0
redis   3.0.5
```
## 如何一步步的解决问题？
在描述问题产生背景时，其实也提到了很多不合理的地方，但*存在即合理*，处在现在的困境，一定有当时的无奈。现在我们一起来总结一下问题所在。
### 对缓存图片的处理存在的问题
* 产品初始化时全量塞入redis/产品停止运行是全量卸掉
* 产品初始化时塞入redis时，没有做批量操作
* 对批量获取图片信息不支持，在接口层面就已经没有定义，对于可预见的需求没有进行考虑，这是架构设计的缺陷。
* 引申：大量的数据，放在一个key里，会出现问题，需要进行水平切分。

#### 方案
1.图片的Id数据在File表采用了*自增长*的方式生成，不会出现重复，并且有顺序。我们可以利用这一点，在产品初始化时，在Mysql数据库File表只查找2个字段：id/url。程序处理时，先写入reids一个key，使用Hash数据结构，isInitIng:photos-true，标明到正在初始化，其他产品节点不需要重复初始化。使用hmset的方式，一次性将多个键值对存入到redis。完成后，修改isInitIng:photos-false。当有了新图片时，先在Mysql数据库File表进行保存，得到这个图片的Id以及url，使用hset加入该图片到redis。如果需要修改某一张图片的url，也可以用hset。这样在产品停止运行时，是不需要删除redis关于图片的数据的。

2.cache层加入新接口，支持批量获取图片信息
```
private final static String PHOTO_CACHE_KEY="photos";
public void setFileToRedis(Map<Integer,String> photos){
    this.jedis.hmset(PHOTO_CACHE_KEY, photos);
}

public Map<Integer,String> getBatchFileInRedis(int[] ids){
    return this.jedis.hmget(PHOTO_CACHE_KEY, coverArrayToString(ids));
}

private static String[] coverArrayToString(int[] ids){
    String[] results=new String[ids.length];
    for (int i = 0; i < ids.length; i++) {
        results[i]=ids[i]+"";
    }
    return results;
}
```
对之前循环调用的上层代码进行修改，改为调用批量获取接口。

3.对于单个key承载大量的数据的情况，方案是对key下的values hash key进行分割，使用一定的算法将块状的数据均匀分布在多个key里。给一个[参考链接](http://blog.nosqlfan.com/html/3379.html)。

### 对缓存用户登录的处理存在的问题
* session的存储不合理，每次登陆都会生成一个key值
* 对USER_ACTIVITY_CACHE_KEY在value部分的数据结构不合理，应采用Sorted Set
* 对USER_ACTIVITY_CACHE_KEY的命名不合适，过长导致空间浪费和效率低下
* 因采用错误数据结构，USER_ACTIVITY_CACHE_KEY需要进行多一次的exists判断。

#### 方案
session的存储不合理的解决，通过新的key(uid:token)来反向标记uid与token的关系，2个key的超时时间保持一致，例如
```
uid:158742-token001
```
在写入SESSION_CACHE_KEY时，同时写入到redis，为保证2次写入的原子性，需要使用[redis的事务](https://redis.readthedocs.org/en/2.4/transaction.html)。如果支持用户的多设备在线，只需要将key(uid:token)更改为Sorted Set结构。因为不存在资源的争夺，这个事务几乎不会失败。在用户登出时，删除掉当前会话信息以及用户关联的会话信息(同样是使用redis事务)。
```
cacheDao的实现
private final static String SESSION_CACHE_KEY="session:";
private final static String USER_TOKEN_CACHE_KEY="uid:";
public void setOneLoginSuccessToRedis(int uid,String token,String userLoginSuccessInfo){
    long expireTime=30*24*60*60;
    Transaction tx = this.jedis.multi();
    tx.setex(SESSION_CACHE_KEY+token, expireTime, userLoginSuccessInfo);//1.使用String数据结构。2.设置key有效期30天。
    tx.setex(USER_TOKEN_CACHE_KEY+uid, expireTime, token);//1.使用String数据结构。2.设置key有效期30天。
    List<Object> results = tx.exec();
}
```
public
按照以上的方案进行重构后，性能得到显著提升，按理论来说稳定性会有提高，因为不具备稳定性测试的条件，没法比较。
## 遇到了一些问题
1.redis一次批量hmset过多时报错
hmset操作时，对于一次传入参数数量上限有要求。这取决于你的网络环境下，socket一次写入的字节数上限。
```
public String hmset(final String key, final Map<String, String> hash);
```
在我本机的环境下(应用与redis都在本机，不同端口，redis以默认配置运行)，Map<String, String> hash的size大于5w左右就会报错。
```
redis.clients.jedis.exceptions.JedisConnectionException: java.net.SocketException: Software caused connection abort: socket write error
    at redis.clients.jedis.Protocol.sendCommand(Protocol.java:98)
    at redis.clients.jedis.Protocol.sendCommand(Protocol.java:78)
    at redis.clients.jedis.Connection.sendCommand(Connection.java:101)
    at redis.clients.jedis.BinaryClient.hmset(BinaryClient.java:246)
    at redis.clients.jedis.Client.hmset(Client.java:171)
    at redis.clients.jedis.Jedis.hmset(Jedis.java:652)
```
在这种情况下，必需要将大Map切分成一块块的Map，循环调用hmset
```
final static int maxEveryTurn=5000;//定义每次最多批量塞入redis的key数量
    /**
     * 批量存储到redis的key数量太多，必需切分成小块存储
     */
    private static void setTooManyToJedis(Jedis jedis, Map<String, String> map) {
        int size=map.size();
        int pieceNum=size/maxEveryTurn;
        if(size>(pieceNum*maxEveryTurn)){
            pieceNum+=1;
        }
        Iterator<Map.Entry<String, String>> iterator = map.entrySet().iterator();
        List<Map<String, String>> list=new ArrayList<>(pieceNum);
        for (int i=0;i<pieceNum;i++){
            list.add(new HashMap<>(maxEveryTurn));
        }
        while (iterator.hasNext()) {
            Map.Entry<String, String> entry = iterator.next();
            String key = entry.getKey();
            int hashCode = Math.abs(String.valueOf(key).hashCode());
            int index=hashCode % pieceNum;
            list.get(index).put(key, map.get(key));
        }
        map.clear();
        for (Map<String, String> pieceMap:list){
            setToJedis(jedis, pieceMap);
        }
        list.clear();
    }
```
2.持续写redis时遇到rdb问题
在完成以上方案的改进后，测试人员的用户登录这个接口在进行性能回归测试时，使用gatling配置250个工作线程进行并发，一共完成50w的用户登录后就算是结束，再根据生成的测试报告分析。
刚开始每次压到20多w的用户登录时，就会报错，redis连接池无连接了。分析代码是配置了testOnBorrow:true，这个配置会在获取到连接后检查该连接的有效性，如果无效就丢弃，即在连接池删掉一个连接。而此时redis因为问题无法执行用户端的任何命令，所以所有连接都被当做无效连接被丢弃？直到连接池空了。
```
在redis命令行执行
set test 12321
返回错误：
(error) MISCONF Redis is configured to save RDB snapshots, but is currently not able to persist on disk. Commands that may modify the data set are disabled. Please check Redis logs for details about the error.
```

这是因为默认的redis配置是以[RDB的方式](http://shanks.leanote.com/post/Untitled-55ca439338f41148cd000759-22)进行定期存盘，而存盘时，会拒绝所有外部命令的写入(存盘失败后也会拒绝写入)。因为目前在redis的数据都处于可丢，解决方式也相当的粗暴。
```
1.保证redis处于运行状态，查询系统6379端口的监听情况
2.顺序执行以下命令行，遇到错误请终止
docker exec -it test_redis_1 /bin/bash
cd usr/local/bin
./redis-cli.sh
config set stop-writes-on-bgsave-error no
config set save ""
quit
exit
```
执行完以后，重启应用，再压测，呵呵，bug关闭。
## 总结
1.在最后一步提到RDB定期存盘，解决方案存在问题，强行关闭，会导致redis中的数据存在丢失风险，在这里建议有条件的，配置redis为1主1从，Master不进行任何形式的存盘，而Slave配置RDB和AOF方式的存盘，双保险。应用只连接Master即可。。注意Slave与Master第一次进行同步时会使用全量复制，对资源会有比较大的消耗，尽量选择在业务平峰期进行。
引申阅读，Master在这里成为了单点，为了Master的高可用，还有进一步的方案，1个Master下挂2个Slave，其中1个Slave(称为A)负责2种方式的存盘，另一个Slave(称为B)作为Master的热备，在Master故障后，参与到投票，成为新的Master，而B节点切换到A，接受A的增量同步。注意自动failover时，外部需要关闭写入命令。完成failover后，使用ip映射切换，使应用层重新恢复使用，相应的，应用层需要做到一定的容错性。实际生产中，不会要求应用层去做容错性措施，会有各种中间件(twemproxy)自动处理。

2.以上业务中对[redis的16个数据库](https://www.ttlsa.com/redis/redis-database/)没有使用好，可以按业务将数据存储到不同数据库，隔离影响。

### 常用命令合集
调试过程中，由于可视化工具对redis支持的不够好，使用了很多redis的命令行，现在我们总结一下吧！
由于docker的风行，好处多多，我们在测试环境、线上环境也使用了docker/docker-compose
#### docker
```
docker-compose ps          //查看yml文件中所有容器的运行情况
docker-compose up -d xw    //将yml文件中容器名称定义为xw的容器，以后台运行的方式运行起来，如果是tomcat镜像，会调用tomcat的startup.sh.
docker-compose stop xw     //将yml文件中容器名称定义为xw的容器停止，如果是tomcat镜像，会调用tomcat的shutdown.sh
docker-compose stop        //查看yml文件中所有容器进行停止
docker-compose rm xw       //移除xw镜像
docker-compose build xw    //对xw进行镜像构建
```
#### ./redis-cli.sh/info
```
F:\Redis> ./redis-cli
127.0.0.1:6379> info
# Server
redis_version:3.0.501
redis_git_sha1:00000000
redis_git_dirty:0
redis_build_id:ba05b51e58eb9205
redis_mode:standalone
os:Windows
arch_bits:64
multiplexing_api:WinSock_IOCP
process_id:1552
run_id:d3f2efa1c6cf26c7cf9246c2fcaca89b8e109439
tcp_port:6379
uptime_in_seconds:462095
uptime_in_days:5
hz:10
lru_clock:16404129
config_file:F:\Redis\redis.windows.conf

# Clients
connected_clients:1
client_longest_output_list:0
client_biggest_input_buf:0
blocked_clients:0

# Memory
used_memory:842704
used_memory_human:822.95K
used_memory_rss:804920
used_memory_peak:374731600
used_memory_peak_human:357.37M
used_memory_lua:36864
mem_fragmentation_ratio:0.96
mem_allocator:jemalloc-3.6.0

# Persistence
loading:0
rdb_changes_since_last_save:0
rdb_bgsave_in_progress:0
rdb_last_save_time:1459242952
rdb_last_bgsave_status:ok
rdb_last_bgsave_time_sec:1
rdb_current_bgsave_time_sec:-1
aof_enabled:0
aof_rewrite_in_progress:0
aof_rewrite_scheduled:0
aof_last_rewrite_time_sec:-1
aof_current_rewrite_time_sec:-1
aof_last_bgrewrite_status:ok
aof_last_write_status:ok

# Stats
total_connections_received:1010
total_commands_processed:49859
instantaneous_ops_per_sec:0
total_net_input_bytes:1822381802
total_net_output_bytes:3650427
instantaneous_input_kbps:0.00
instantaneous_output_kbps:0.00
rejected_connections:0
sync_full:0
sync_partial_ok:0
sync_partial_err:0
expired_keys:1073
evicted_keys:0
keyspace_hits:20782
keyspace_misses:738
pubsub_channels:0
pubsub_patterns:0
latest_fork_usec:388023
migrate_cached_sockets:0

# Replication
role:master
connected_slaves:0
master_repl_offset:0
repl_backlog_active:0
repl_backlog_size:1048576
repl_backlog_first_byte_offset:0
repl_backlog_histlen:0

# CPU
used_cpu_sys:9.45
used_cpu_user:38.25
used_cpu_sys_children:0.00
used_cpu_user_children:0.00

# Cluster
cluster_enabled:0

# Keyspace
db0:keys=1,expires=0,avg_ttl=0
```
#### set/get
```
127.0.0.1:6379> set test 123456
OK
127.0.0.1:6379> get test
"123456"
```
#### hset/hmset/hget/hmget
```
127.0.0.1:6379> hset testHash key1 value11
(integer) 1
127.0.0.1:6379> hget testHash
(error) ERR wrong number of arguments for 'hget' command
127.0.0.1:6379> hget testHash key1
"value11"
127.0.0.1:6379>

127.0.0.1:6379> hset testHash key1 value11 key2 value22
(error) ERR wrong number of arguments for 'hset' command
127.0.0.1:6379> hmset testHash key1 value11 key2 value22
OK
127.0.0.1:6379> hmget testHash key1 key2
1) "value11"
2) "value22"
```
#### hlen/keys
```
127.0.0.1:6379> len test
(error) ERR unknown command 'len'
127.0.0.1:6379> hlen testHash
(integer) 2
127.0.0.1:6379> keys test
1) "test"
127.0.0.1:6379> keys testHash
1) "testHash"
127.0.0.1:6379> keys *
1) "testHash"
2) "test"
3) "message-queue-sms"
```
#### config set/get
```
127.0.0.1:6379> config get *
  1) "dbfilename"
  2) "dump.rdb"
  3) "requirepass"
  4) ""
  5) "masterauth"
  6) ""
  7) "unixsocket"
  8) ""
  9) "logfile"
 10) ""
 11) "pidfile"
 12) "/var/run/redis.pid"
 13) "maxmemory"
 14) "512000000"
 15) "maxmemory-samples"
 16) "5"
 17) "timeout"
 18) "0"
 19) "tcp-keepalive"
 20) "0"
 21) "auto-aof-rewrite-percentage"
 22) "100"
 23) "auto-aof-rewrite-min-size"
 24) "67108864"
 25) "hash-max-ziplist-entries"
 26) "512"
 27) "hash-max-ziplist-value"
 28) "64"
 29) "list-max-ziplist-entries"
 30) "512"
 31) "list-max-ziplist-value"
 32) "64"
 33) "set-max-intset-entries"
 34) "512"
 35) "zset-max-ziplist-entries"
 36) "128"
 37) "zset-max-ziplist-value"
 38) "64"
 39) "hll-sparse-max-bytes"
 40) "3000"
 41) "lua-time-limit"
 42) "5000"
 43) "slowlog-log-slower-than"
 44) "10000"
 45) "latency-monitor-threshold"
 46) "0"
 47) "slowlog-max-len"
 48) "128"
 49) "port"
 50) "6379"
 51) "tcp-backlog"
 52) "511"
 53) "databases"
 54) "16"
 55) "repl-ping-slave-period"
 56) "10"
 57) "repl-timeout"
 58) "60"
 59) "repl-backlog-size"
 60) "1048576"
 61) "repl-backlog-ttl"
 62) "3600"
 63) "maxclients"
 64) "10000"
 65) "watchdog-period"
 66) "0"
 67) "slave-priority"
 68) "100"
 69) "min-slaves-to-write"
 70) "0"
 71) "min-slaves-max-lag"
 72) "10"
 73) "hz"
 74) "10"
 75) "cluster-node-timeout"
 76) "15000"
 77) "cluster-migration-barrier"
 78) "1"
 79) "cluster-slave-validity-factor"
 80) "10"
 81) "repl-diskless-sync-delay"
 82) "5"
 83) "cluster-require-full-coverage"
 84) "yes"
 85) "no-appendfsync-on-rewrite"
 86) "no"
 87) "slave-serve-stale-data"
 88) "yes"
 89) "slave-read-only"
 90) "yes"
 91) "stop-writes-on-bgsave-error"
 92) "yes"
 93) "daemonize"
 94) "no"
 95) "rdbcompression"
 96) "yes"
 97) "rdbchecksum"
 98) "yes"
 99) "activerehashing"
100) "yes"
101) "repl-disable-tcp-nodelay"
102) "no"
103) "repl-diskless-sync"
104) "no"
105) "aof-rewrite-incremental-fsync"
106) "yes"
107) "aof-load-truncated"
108) "yes"
109) "appendonly"
110) "no"
111) "dir"
112) "F:\\Redis"
113) "maxmemory-policy"
114) "noeviction"
115) "appendfsync"
116) "everysec"
117) "save"
118) "jd 900 jd 300 jd 60"
119) "loglevel"
120) "verbose"
121) "client-output-buffer-limit"
122) "normal 0 0 0 slave 268435456 67108864 60 pubsub 33554432 8388608 60"
123) "unixsocketperm"
124) "0"
125) "slaveof"
126) ""
127) "notify-keyspace-events"
128) ""
129) "bind"
130) ""
127.0.0.1:6379> config set save ""
OK
```
#### flushdb/flushall
```
127.0.0.1:6379> flushdb
OK
127.0.0.1:6379> flushall
OK
```

## 扩展阅读
* redis删除有序集合部分过期元素：[http://caozm.blog.51cto.com/1118764/1389168](http://caozm.blog.51cto.com/1118764/1389168)
* 节约内存：Instagram的Redis实践：[http://blog.nosqlfan.com/html/3379.html](http://blog.nosqlfan.com/html/3379.html)
* redis持久化机制：[http://shanks.leanote.com/post/Untitled-55ca439338f41148cd000759-22](http://shanks.leanote.com/post/Untitled-55ca439338f41148cd000759-22)
* Redis事务的分析及改进：[https://segmentfault.com/a/1190000002594059](https://segmentfault.com/a/1190000002594059)
* redis 多数据库：[https://www.ttlsa.com/redis/redis-database/](https://www.ttlsa.com/redis/redis-database/)
* 利用Sorted Set数据结构，为元素设置有效期：[http://stackoverflow.com/questions/7577923/redis-possible-to-expire-an-element-in-an-array-or-sorted-set](http://stackoverflow.com/questions/7577923/redis-possible-to-expire-an-element-in-an-array-or-sorted-set)
* redis的Slave选举与优先级：[https://segmentfault.com/a/1190000002685515](https://segmentfault.com/a/1190000002685515)
* 利用代理中间件实现大规模Redis集群：[http://www.imooc.com/article/4343](http://www.imooc.com/article/4343)