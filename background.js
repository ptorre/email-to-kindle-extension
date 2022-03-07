"use strict";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function showBadgeTextTimeout(ms, text="") {
  chrome.action.setBadgeText({ text });
  await sleep(ms);
  chrome.action.setBadgeText({ text: '' });
}

chrome.runtime.onInstalled.addListener(() => {
  showBadgeTextTimeout(5000, "⚡");
});

chrome.action.onClicked.addListener(function(tab) {
    chrome.tabs.sendMessage(tab.id, { 'message': 'get-page' });
});

function getStoredConfig() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, (data) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(data);
    });
  });
}

async function postMail(url = '', title = '', html) {
    const config = await getStoredConfig();
    const { username, password, fromEmail, fromName, toEmail, toName } = config;
    const authorization = `Basic ${btoa(username + ":" + password)}`
    const template = {
        "Messages": [{
            "From": { Email: fromEmail, Name: fromName },
            "To": [{ Email: toEmail, Name: toName }],
            "Subject": title,
            "TextPart": title,
            "Attachments": [{
                "Filename": title + ".html",
                "ContentType": "text/html",
                "Base64Content": b64EncodeUnicode(html)

            }]
        }]
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authorization
        },
        redirect: 'follow',
        body: JSON.stringify(template)
    });
    if (!response.ok) {
      let body = await response.text();
      throw new FetchError(response, `${response.status} ${response.statusText}, ${body}`);
    }
    return response;
}

chrome.runtime.onMessage.addListener(
  ({message, url, title, html}, _sender, sendResponse) => {
    if (!chrome.runtime.lastError) {
      switch(message) {
      case 'send-page':
        console.info(`message: ${message}, url: ${url}, title: ${title}`);
        postMail('https://api.mailjet.com/v3.1/send', title, html)
            .then(response => {
                showBadgeTextTimeout(4000, "OK");
                chrome.action.setBadgeBackgroundColor({color: '#0F0'});
                chrome.action.setTitle({title: 'OK: ' + response.statusText});
            })
            .catch(err => {
                console.error(`Error: ${err.message}`);
                let response = err.response;
                if (response?.status === 403 || response?.status === 401) {
                    chrome.action.setBadgeText({text: 'AUTH'});
                } else {
                    chrome.action.setBadgeText({text: 'ERR'});
                    console.log(html);
                }
                chrome.action.setBadgeBackgroundColor({color: '#F00'});
                chrome.action.setTitle({title: String(err.message)});
            });
        break;
      default:
        console.log("received unknown message");
      }
    } else {
      console.log(`"lastError: ${chrome.runtime.lastError.message}`)
    }
    sendResponse({
      "response": "page-sent"
    })
  }
);

function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      (_match, p1) => String.fromCharCode('0x' + p1)));
}

class FetchError extends Error {
  constructor(response, message) {
    super(message);
    this.response = response;
  }
}
