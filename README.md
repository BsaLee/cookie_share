1.先下载浏览器插件到本地
2.浏览器打开开发者模式
3.加载插件给予权限
4.cloudflare创建D1数据库
5.执行sql生成表结构
```sql
CREATE TABLE cookies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    cookie TEXT NOT NULL,
    password TEXT NOT NULL
);
```
6.下载worker.js部署到cloudflare的worker
7.绑定D1到worker,变量名称为ckdb
8.替换浏览器插件中的ck.bhb.us.kg为你的域名