


# 项目介绍

是一款可以多人/多设备/多浏览器之间共享cookie的插件  


## 使用步骤

1. 先下载浏览器插件到本地
2. 浏览器打开开发者模式
3. 加载插件给予权限
4. cloudflare创建D1数据库
5. 执行sql生成表结构
```sql
CREATE TABLE cookies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    cookie TEXT NOT NULL,
    password TEXT NOT NULL
);
```
7. 下载worker.js部署到cloudflare的worker
8. 绑定D1到worker,变量名称为ckdb
9. 替换浏览器插件中的ck.bhb.us.kg为你的域名
10. 可以强制读取域名下所有cookie并上传(忽略cookie属性)
11. 替换cookie前会清空域名下所有旧cookie
12. 增加删除当前页所有cookie功能(导入无效时使用)
## 图片展示

![第一张图片](https://github.com/BsaLee/cookie_share/blob/main/123.png)
![第二张图片](https://github.com/BsaLee/cookie_share/blob/main/456.png)
