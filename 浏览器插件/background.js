chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "shareCookie",
        title: "共享 Cookie",
        contexts: ["all"]  // 在所有上下文中显示
    });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "shareCookie") {
        // 获取当前标签页的域名和标题
        const domain = new URL(tab.url).hostname;
        const title = tab.title;

        // 获取该域名的所有 Cookie
        chrome.cookies.getAll({ url: `https://${domain}` }, (cookies) => {
            if (chrome.runtime.lastError) {
                console.error("Error fetching cookies:", chrome.runtime.lastError);
                return;
            }

            const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

            // 从存储中获取密码
            chrome.storage.local.get(['savedPassword'], function(result) {
                const password = result.savedPassword; // 获取保存的密码

                // 发送到你的 API
                fetch("https://ck.bhb.us.kg/insert-cookie", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        domain: domain,   // 直接使用原始域名
                        title: title,     // 直接使用原始标题
                        cookie: cookieString,   // 直接使用原始 Cookie
                        password: password        // 明文传递密码
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log("Cookie shared successfully!");
                    } else {
                        console.error("Error sharing cookie:", data.error);
                    }
                })
                .catch(error => {
                    console.error("Error:", error);
                });
            });
        });
    }
});
