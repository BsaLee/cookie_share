document.addEventListener('DOMContentLoaded', function () {
    chrome.storage.local.get(['savedPassword', 'savedData'], function (result) {
        if (result.savedData) {
            const savedData = result.savedData;
            const accountsList = document.getElementById('accountsList');
            accountsList.innerHTML = "";

            savedData.forEach(account => {
                displayAccountInfo(account, accountsList);
            });
        }
    });

    document.getElementById('updateButton').addEventListener('click', function () {
        const passwordInput = document.getElementById('password');
        const enteredPassword = passwordInput.value;

        chrome.storage.local.get(['savedPassword'], function (result) {
            let passwordToUse = enteredPassword || result.savedPassword;

            if (!passwordToUse) {
                alert('请输入密码！');
                return;
            }

            if (enteredPassword) {
                chrome.storage.local.set({ savedPassword: enteredPassword }, function () {
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
                console.log('Fetched data:', data);

                if (data.error) {
                    alert(data.error);
                    return;
                }

                const results = data.results;
                if (!Array.isArray(results)) {
                    console.error('Expected results to be an array, but received:', results);
                    alert('获取数据失败，请检查服务器返回的格式。');
                    return;
                }

                chrome.storage.local.set({ savedData: results }, function () {
                    console.log('Multiple account data saved locally.');
                });

                const accountsList = document.getElementById('accountsList');
                accountsList.innerHTML = "";

                results.forEach(account => {
                    displayAccountInfo(account, accountsList);
                });
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
        });
    });

    loadHistory();

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

function uploadHistory(url, title, password) {
    const apiUrl = "https://ck.bhb.us.kg/insert-cookie";

    chrome.cookies.getAll({ url: url }, function (cookies) {
        const cookiesString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                domain: new URL(url).hostname,
                title: title,
                cookie: cookiesString,
                password: password
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("历史记录上传成功！");
            } else {
                console.error("上传失败，请重试。", data.error);
            }
        })
        .catch(error => {
            console.error("Error:", error);
        });
    });
}

function displayAccountInfo(account, accountsList) {
    const accountRow = document.createElement('div');
    accountRow.className = "account-toggle";

    const accountDetails = document.createElement('div');
    accountDetails.className = "account-details";

    let displayTitle = account.title.length > 15 ? account.title.substring(0, 15) : account.title;

    accountDetails.innerHTML = `
        <strong>域名：</strong>${account.domain} <br>
        <strong>标题：</strong>${displayTitle}
    `;

    const importButton = document.createElement('button');
    importButton.textContent = "导入";
    importButton.className = "action-button";
    importButton.onclick = function () {
        const domain = account.domain;
        const cookiesArray = account.cookie.split('; ');

        chrome.cookies.getAll({ domain: domain }, function (cookies) {
            cookies.forEach(cookie => {
                chrome.cookies.remove({
                    url: `https://${domain}${cookie.path}`,
                    name: cookie.name
                }, function () {
                    if (chrome.runtime.lastError) {
                        console.error(`Error removing cookie: ${chrome.runtime.lastError.message}`);
                    } else {
                        console.log(`Cookie ${cookie.name} removed for domain ${domain}`);
                    }
                });
            });

            cookiesArray.forEach(cookie => {
                const [name, value] = cookie.split('=');
                const isHostCookie = name.startsWith('__Host-');

                chrome.cookies.set({
                    url: `https://${domain}`,
                    name: name,
                    value: value,
                    domain: isHostCookie ? undefined : domain,
                    path: "/",
                    secure: true,
                    sameSite: "no_restriction",
                    expirationDate: (Date.now() / 1000) + 3600
                }, function (cookie) {
                    if (chrome.runtime.lastError) {
                        console.error(`Error setting cookie: ${chrome.runtime.lastError.message}`);
                    } else {
                        console.log(`Cookie ${name} set successfully.`);
                    }
                });
            });
        });
    };

    const openButton = document.createElement('button');
    openButton.textContent = "打开";
    openButton.className = "action-button";
    openButton.onclick = function () {
        window.open(`https://${account.domain}`);
    };

    const deleteButton = document.createElement('button');
    deleteButton.textContent = "删除";
    deleteButton.className = "action-button";
    deleteButton.onclick = function () {
        chrome.storage.local.get(['savedData'], function (result) {
            const updatedData = result.savedData.filter(item => 
                !(item.title === account.title && item.domain === account.domain)
            );
            chrome.storage.local.set({ savedData: updatedData }, function () {
                console.log('Account data deleted.');
                accountRow.remove();
            });
        });
    };

    accountRow.appendChild(accountDetails);
    accountRow.appendChild(importButton);
    accountRow.appendChild(openButton);
    accountRow.appendChild(deleteButton);
    accountsList.appendChild(accountRow);
}
