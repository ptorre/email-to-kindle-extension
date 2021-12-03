"use strict";

const options = new Map();

function save_options() {
    Array.from(document.getElementsByTagName('input'))
        .forEach(element => {
            options.set(element.id, element?.value);
        });

    chrome.storage.sync.set(Object.fromEntries(options), () => {
        let status = document.getElementById('status');
        status.textContent = 'Options Saved';
        setTimeout(function () {
            status.textContent = '';
        }, 750);
    });
}


function restore_options() {
    chrome.storage.sync.get(null, (data) => {
        for (const [id, value] of Object.entries(data)) {
            if(typeof id == 'string' && typeof value == 'string') {
              // TODO make this a little more robust and consistent with
              // logic above in save_options
              document.getElementById(id).value = value;
            }
        }
    });
}

function clear_options() {
    if(confirm('Clear settings from ALL synced browsers. \nAre you sure?')) {
        chrome.storage.sync.clear(() => { console.log('Cleared') });
    }
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('clear').addEventListener('click', clear_options);
