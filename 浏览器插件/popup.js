document.addEventListener('DOMContentLoaded', function() {
    // 页面加载时，尝试从本地读取并显示保存的数据
    chrome.storage.local.get(['savedPassword', 'savedData'], function(result) {
        if (result.savedData) {
            const savedData = result.savedData;
            const accountsList = document.getElementById('accountsList');
            accountsList.innerHTML = ""; // 清空之前的内容

            // 遍历每个保存的账号并显示
            savedData.forEach(account => {
                displayAccountInfo(account, accountsList);
            });
        }
    });
});

// 点击更新按钮时，获取数据并保存到本地
document.getElementById('updateButton').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const enteredPassword = passwordInput.value;

    chrome.storage.local.get(['savedPassword'], function(result) {
        let passwordToUse = enteredPassword || result.savedPassword;

        if (!passwordToUse) {
            alert('请输入密码！');
            return;
        }

        if (enteredPassword) {
            chrome.storage.local.set({ savedPassword: enteredPassword }, function() {
                console.log('Password saved.');
            });
        }

        const apiUrl = "https://ck.bhb.us.kg/get-cookies";

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: passwordToUse })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Fetched data:', data); // 打印获取到的数据以便调试

            if (data.error) {
                alert(data.error);
                return;
            }

            // 确保 results 是数组
            const results = data.results;
            if (!Array.isArray(results)) {
                console.error('Expected results to be an array, but received:', results);
                alert('获取数据失败，请检查服务器返回的格式。');
                return;
            }

            // 保存数据到本地存储
            chrome.storage.local.set({ savedData: results }, function() {
                console.log('Multiple account data saved locally.');
            });

            // 清空之前显示的账号信息
            const accountsList = document.getElementById('accountsList');
            accountsList.innerHTML = "";

            // 遍历每个账号并显示
            results.forEach(account => {
                displayAccountInfo(account, accountsList);
            });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
    });
});

// 显示每个账号信息和操作按钮
function displayAccountInfo(account, accountsList) {
    const accountRow = document.createElement('div');
    accountRow.className = "account-toggle";

    const accountDetails = document.createElement('div');
    accountDetails.className = "account-details"; // 用于存放账号信息

    // 对标题进行截断处理，直接截断为最多9个字符
    let displayTitle = account.title.length > 9 ? account.title.substring(0, 9) : account.title;

    accountDetails.innerHTML = `
        <strong>域名：</strong>${account.domain} <br>
        <strong>标题：</strong>${displayTitle} 
    `;

    const importButton = document.createElement('button');
    importButton.textContent = "导入";
    importButton.className = "action-button";
    importButton.onclick = function() {
        const domain = account.domain;
        const cookiesArray = account.cookie.split('; ');
        console.log(`Clearing cookies for ${domain}`); // 调试输出

        // 先清除该域名下的所有 cookies
        chrome.cookies.getAll({ domain: domain }, function(cookies) {
            cookies.forEach(cookie => {
                chrome.cookies.remove({
                    url: `https://${domain}${cookie.path}`,
                    name: cookie.name
                }, function() {
                    if (chrome.runtime.lastError) {
                        console.error(`Error removing cookie: ${chrome.runtime.lastError.message}`);
                    } else {
                        console.log(`Cookie ${cookie.name} removed for domain ${domain}`);
                    }
                });
            });

            // 在清除完成后，再导入新的 cookies
            console.log(`Enabling cookies for ${domain}`); // 调试输出
            cookiesArray.forEach(cookie => {
                const [name, value] = cookie.split('=');
                console.log(`Setting cookie: ${name}=${value} for domain ${domain}`); // 调试输出
                chrome.cookies.set({
                    url: `https://${domain}`,
                    name: name,
                    value: value,
                    domain: domain,
                    path: "/",
                    secure: true,
                    sameSite: "no_restriction",
                    expirationDate: (Date.now() / 1000) + 3600 // 设置过期时间为1小时
                }, function() {
                    if (chrome.runtime.lastError) {
                        console.error(`Error setting cookie: ${chrome.runtime.lastError.message}`);
                    } else {
                        console.log(`Cookie ${name} set for domain ${domain}`);
                    }
                });
            });
        });
    };

    const openButton = document.createElement('button');
    openButton.textContent = "打开";
    openButton.className = "action-button";
    openButton.onclick = function() {
        window.open(`https://${account.domain}`); // 打开域名网站
    };

    const deleteButton = document.createElement('button');
    deleteButton.textContent = "删除";
    deleteButton.className = "action-button";
    deleteButton.onclick = function() {
        // 删除本地数据的逻辑
        chrome.storage.local.get(['savedData'], function(result) {
            const updatedData = result.savedData.filter(item => 
                !(item.title === account.title && item.domain === account.domain)
            );
            chrome.storage.local.set({ savedData: updatedData }, function() {
                console.log('Account data deleted.');
                accountRow.remove(); // 从界面上移除
            });
        });
    };

    accountRow.appendChild(accountDetails);
    accountRow.appendChild(importButton); // 添加导入按钮
    accountRow.appendChild(openButton); // 添加打开按钮
    accountRow.appendChild(deleteButton); // 添加删除按钮
    accountsList.appendChild(accountRow);
}
