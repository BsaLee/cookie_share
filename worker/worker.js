export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const DB = env.ckdb;

        if (!DB) {
            return new Response('Database not configured', { status: 500 });
        }

        // 处理 CORS
        const headers = {
            'Access-Control-Allow-Origin': '*', // 允许所有网站跨域
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers,
            });
        }

        try {
            // 插入 Cookie
            if (request.method === 'POST' && url.pathname === '/insert-cookie') {
                const { domain, title, cookie, password } = await request.json();

                // 直接使用接收到的明文数据，无需解码
                await DB.prepare('INSERT INTO cookies (domain, title, cookie, password) VALUES (?, ?, ?, ?)')
                    .bind(domain, title, cookie, password)
                    .run();

                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers,
                });
            }

            // 获取 Cookies
            if (request.method === 'POST' && url.pathname === '/get-cookies') {
                const { password } = await request.json();
                console.log("Received password:", password);  // 日志记录接收到的密码

                // 查询数据库中 password 匹配的数据
                const result = await DB.prepare('SELECT * FROM cookies WHERE password = ?')
                    .bind(password)
                    .all();

                console.log("Query result:", result);  // 日志记录查询结果

                // 返回结果，如果没有找到，返回空数组
                return new Response(JSON.stringify(result), {
                    status: 200,
                    headers,
                });
            }
        } catch (error) {
            console.error('Worker Error:', error);
            return new Response(`Failed to process request: ${error.message}`, {
                status: 500,
                headers,
            });
        }

        return new Response('Not Found', {
            status: 404,
            headers,
        });
    },
};
