// 添加日志，确保 background.js 已加载
console.log("Background script loaded.");

// 检查 chrome.contextMenus API 是否可用
if (!chrome.contextMenus) {
    console.error("chrome.contextMenus API 不可用。");
} else {
    console.log("chrome.contextMenus API 可用。");
}

// 在扩展安装或更新时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed or updated.");
    chrome.contextMenus.create({
        id: "shareCookie",
        title: "共享 Cookie",
        contexts: ["all"]  // 在所有上下文中显示
    });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "shareCookie") {
        console.log("右键菜单 '共享 Cookie' 被点击。");
        try {
            // 获取当前标签页的完整网址
            const fullUrl = tab.url; // 直接使用完整网址
            const title = tab.title;
            console.log("当前标签页 URL:", fullUrl);
            console.log("当前标签页标题:", title);

            // 获取该域名的所有 Cookie
            const cookies = await chrome.cookies.getAll({ url: fullUrl });
            console.log("获取到的 Cookie 数量:", cookies.length);
            const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
            console.log("拼接后的 Cookie 字符串:", cookieString);

            // 从存储中获取密码
            const result = await chrome.storage.local.get(['savedPassword']);
            const password = result.savedPassword;
            console.log("从存储中获取的密码:", password);

            // 发送到你的 API
            const response = await fetch("https://ck.bhb.us.kg/insert-cookie", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    domain: fullUrl,   // 使用完整网址
                    title: title,        // 使用页面标题
                    cookie: cookieString, // 使用 Cookie 字符串
                    password: password   // 使用密码
                })
            });

            const data = await response.json();
            console.log("API 响应数据:", data);

            if (data.success) {
                console.log("Cookie shared successfully!");
                // 给用户反馈
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: '/images/icon-48.png',
                    title: '共享成功',
                    message: 'Cookie 已成功共享。'
                });
            } else {
                console.error("Error sharing cookie:", data.error);
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: '/images/icon-48.png',
                    title: '共享失败',
                    message: 'Cookie 共享失败，请重试。'
                });
            }
        } catch (error) {
            console.error("Error:", error);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: '/images/icon-48.png',
                title: '错误',
                message: '发生错误，请检查控制台。'
            });
        }
    }
});
