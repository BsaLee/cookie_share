document.addEventListener('DOMContentLoaded', function () {
    // 加载本地保存的账户数据
    loadSavedData();

    // 更新账户数据
    document.getElementById('updateButton').addEventListener('click', updateAccountData);

    // 加载历史记录
    loadHistory();

    // 上传历史记录
    document.getElementById('uploadButton').addEventListener('click', function () {
        const selectedOption = document.getElementById('historyDropdown').value;
        const editedTitle = document.getElementById('historyTitle').value;

        if (!selectedOption) {
            alert('请选择一个历史记录！');
            return;
        }

        if (!editedTitle) {
            alert('请输入标题！');
            return;
        }

        const passwordInput = document.getElementById('password');
        const enteredPassword = passwordInput.value;

        chrome.storage.local.get(['savedPassword'], function (result) {
            let passwordToUse = enteredPassword || result.savedPassword;
            uploadHistory(selectedOption, editedTitle, passwordToUse);
        });
    });
});

// 加载本地保存的账户数据
function loadSavedData() {
    chrome.storage.local.get(['savedData'], function (result) {
        if (result.savedData) {
            const accountsList = document.getElementById('accountsList');
            accountsList.innerHTML = "";
            result.savedData.forEach(account => displayAccountInfo(account, accountsList));
        }
    });
}

// 更新账户数据
async function updateAccountData() {
    const passwordInput = document.getElementById('password');
    const enteredPassword = passwordInput.value;

    const result = await chrome.storage.local.get(['savedPassword']);
    let passwordToUse = enteredPassword || result.savedPassword;

    if (!passwordToUse) {
        alert('请输入密码！');
        return;
    }

    if (enteredPassword) {
        await chrome.storage.local.set({ savedPassword: enteredPassword });
        console.log('Password saved.');
    }

    try {
        const apiUrl = "https://ck.bhb.us.kg/get-cookies";
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: passwordToUse })
        });
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        if (!Array.isArray(data.results)) {
            console.error('Expected results to be an array, but received:', data.results);
            alert('获取数据失败，请检查服务器返回的格式。');
            return;
        }

        await chrome.storage.local.set({ savedData: data.results });
        console.log('Multiple account data saved locally.');

        const accountsList = document.getElementById('accountsList');
        accountsList.innerHTML = "";
        data.results.forEach(account => displayAccountInfo(account, accountsList));
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('更新数据失败，请检查网络连接。');
    }
}

// 加载历史记录
function loadHistory() {
    chrome.history.search({ text: '', maxResults: 100 }, function (historyItems) {
        const historyDropdown = document.getElementById('historyDropdown');
        const uniqueDomains = new Set();

        historyItems.forEach(item => {
            const domain = new URL(item.url).hostname;
            if (!uniqueDomains.has(domain)) {
                uniqueDomains.add(domain);
                const option = document.createElement('option');
                option.value = item.url;
                option.textContent = domain;
                historyDropdown.appendChild(option);
            }
        });

        historyDropdown.addEventListener('change', function () {
            const selectedTitle = historyDropdown.options[historyDropdown.selectedIndex].text;
            document.getElementById('historyTitle').value = selectedTitle;
        });
    });
}

// 上传历史记录
async function uploadHistory(url, title, password) {
    try {
        const cookies = await chrome.cookies.getAll({ url });
        const cookiesString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

        const apiUrl = "https://ck.bhb.us.kg/insert-cookie";
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                domain: new URL(url).hostname,
                title: title,
                cookie: cookiesString,
                password: password
            })
        });
        const data = await response.json();

        if (data.success) {
            console.log("历史记录上传成功！");
            alert("历史记录上传成功！");
        } else {
            console.error("上传失败，请重试。", data.error);
            alert("上传失败，请重试。");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("上传失败，请检查网络连接。");
    }
}

// 显示账户信息
function displayAccountInfo(account, accountsList) {
    const accountRow = document.createElement('div');
    accountRow.className = "account-toggle";

    const accountDetails = document.createElement('div');
    accountDetails.className = "account-details";

    // 限制标题和域名的显示长度
    const displayTitle = truncateText(account.title, 20);
    const displayDomain = truncateText(account.domain, 20);

    accountDetails.innerHTML = `
        <strong>域名：</strong>${displayDomain} <br>
        <strong>标题：</strong>${displayTitle}
    `;

    const importButton = createActionButton("导入", () => importCookies(account.domain, account.cookie));
    const openButton = createActionButton("打开", () => openAccountUrl(account.domain));
    const deleteButton = createActionButton("删除", () => deleteAccountData(account, accountRow));

    accountRow.appendChild(accountDetails);
    accountRow.appendChild(importButton);
    accountRow.appendChild(openButton);
    accountRow.appendChild(deleteButton);
    accountsList.appendChild(accountRow);
}

// 创建操作按钮
function createActionButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = "action-button";
    button.onclick = onClick;
    return button;
}

// 规范化域名
function normalizeDomain(domain) {
    if (!domain.startsWith('.')) {
        domain = '.' + domain;
    }
    return domain;
}

async function importCookies(fullUrl, cookieString) {
    try {
        // 检查 fullUrl 是否有效
        if (!fullUrl || typeof fullUrl !== 'string') {
            throw new Error("Invalid URL: URL must be a non-empty string.");
        }

        // 构造 URL 对象
        let urlObj;
        try {
            urlObj = new URL(fullUrl);
        } catch (error) {
            throw new Error(`Invalid URL: ${fullUrl}. Error: ${error.message}`);
        }

        // 从完整网址中提取域名
        const domain = urlObj.hostname; // 例如 "github.com"
        const normalizedDomain = normalizeDomain(domain); // 例如 ".github.com"
        const url = `https://${normalizedDomain.substring(1)}`; // 例如 "https://github.com"

        // 打印 URL 和域名
        console.log("Setting cookies for domain:", normalizedDomain);
        console.log("Using URL:", url);

        const existingCookies = await chrome.cookies.getAll({ domain: normalizedDomain });

        // 删除现有 Cookie
        for (const cookie of existingCookies) {
            await chrome.cookies.remove({
                url: `https://${normalizedDomain.substring(1)}${cookie.path}`,
                name: cookie.name
            });
        }

        // 设置新 Cookie
        const cookiesArray = cookieString.split('; ');
        for (const cookie of cookiesArray) {
            const [name, value] = cookie.split('=');
            if (!name || !value) {
                console.error("Invalid cookie format:", cookie);
                continue;
            }

            // 检查 Cookie 大小
            if (value.length > 4096) {
                console.error("Cookie value too large:", name);
                continue;
            }

            await chrome.cookies.set({
                url: url,
                name: name.trim(),
                value: value.trim(),
                domain: normalizedDomain,
                path: "/",
                secure: true,
                sameSite: "no_restriction",
                expirationDate: (Date.now() / 1000) + 3600
            }, function() {
                if (chrome.runtime.lastError) {
                    console.error("Error setting cookie:", name, chrome.runtime.lastError);
                } else {
                    console.log("Successfully set cookie:", name);
                }
            });
        }

        console.log("Cookie 导入成功！");
    } catch (error) {
        console.error("导入 Cookie 失败：", error);
        alert("导入 Cookie 失败，请重试。");
    }
}

// 规范化域名
function normalizeDomain(domain) {
    if (!domain.startsWith('.')) {
        domain = '.' + domain;
    }
    return domain;
}



// 打开账户 URL
function openAccountUrl(domain) {
    let url = domain;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }
    window.open(url);
}

// 删除账户数据
async function deleteAccountData(account, accountRow) {
    if (!confirm("确定要删除该账户数据吗？")) return;

    const result = await chrome.storage.local.get(['savedData']);
    const updatedData = result.savedData.filter(item => 
        !(item.title === account.title && item.domain === account.domain)
    );
    await chrome.storage.local.set({ savedData: updatedData });
    accountRow.remove();
    console.log('Account data deleted.');
}

// 限制文本长度
function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}
