"use strict";

const options = new Map();

function save_options() {
    Array.from(document.getElementsByTagName('input'))
        .forEach(element => {
            options.set(element.id, element?.value);
        });

    chrome.storage.local.set(Object.fromEntries(options), () => {
        // Update status to let user know options were saved.
        let status = document.getElementById('status');
        status.textContent = 'Options Saved';
        setTimeout(function () {
            status.textContent = '';
        }, 750);
    });
}


function restore_options() {
    chrome.storage.local.get(null, (data) => {
        for (const [id, value] of Object.entries(data)) {
            // TODO robustify
            document.getElementById(id).value = value;
        }
    });
}

function clear_options() {
    chrome.storage.local.clear(() => { console.log("Cleared") });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('clear').addEventListener('click', clear_options);
