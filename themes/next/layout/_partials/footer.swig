<div class="copyright" >
  {% set current = date(Date.now(), "YYYY") %}
  &copy; {% if theme.since and theme.since != current %} {{ theme.since }} - {% endif %}
  <span itemprop="copyrightYear">{{ current }}</span>
  <span class="with-love">
    <i class="fa fa-heart"></i>
  </span>
  <span class="author" itemprop="copyrightHolder">{{ config.author }}</span>
  <span class="post-count">&nbsp全站共{{ totalcount(site) }}字</span>
</div>
<script async="async" src="https://dn-lbstatics.qbox.me/busuanzi/2.3/busuanzi.pure.mini.js"></script>
访问量 <span id="busuanzi_value_site_pv"></span> &nbsp
您是第<span id="busuanzi_value_site_uv"></span>个来到的小伙伴
{% block footer %}{% endblock %}

<script>
var OriginTitile=document.title;
var st;
document.addEventListener('visibilitychange',function(){
if(document.hidden){
  document.title="(つェ⊂)我藏好了哦~";
  clearTimeout(st);
}else{
  document.title='(*´∇｀*)被你发现啦~ '+OriginTitile;
  console.log('show');
  st=setTimeout(function(){
      document.title=OriginTitile;
  },4000);
}
});
</script>