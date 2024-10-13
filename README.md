生成表结构sql
```sql
CREATE TABLE cookies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    cookie TEXT NOT NULL,
    password TEXT NOT NULL
);
```
