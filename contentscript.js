'use strict';

chrome.runtime.onMessage.addListener(
    (request, _sender, _sendResponse) => {
        if (request.message === 'get-page') {
            let {body, url, title} = getBody();
            if (!body || !url || !title) {
                console.error(`Bailing out! ${{body: body, url: url, title: title}}`);
                return;
            }
            stripUselessElements(body);
            stripCommentsAndHiddenElements(body);

            let doc = document.implementation.createHTMLDocument(title);
            let meta = doc.createElement('meta');
            meta.setAttribute('charset', 'utf-8');
            meta.setAttribute('http-equiv', 'content-type');
            meta.setAttribute('content', 'text/html; charset=utf-8');
            doc.head.appendChild(meta)
            doc.body.innerHTML = body.innerHTML.replace(/\n/g, "");
            doc.body.style.cssText = 'text-align: left;';
            let html = '<!doctype html>' + doc.documentElement.outerHTML;

            chrome.runtime.sendMessage({
                message: 'send-page',
                title,
                url,
                html
            });
        }
    }
);

function getBody() {
    let actions = [
        {
            matcher: /learning.oreilly.com|learning-oreilly-com/,
            contentSelector: '#sbo-rt-content',
            filterSelectors: ['.codelink', '#ov']
        },
        {
            matcher: /read.overdrive.com/,
            contentSelector: '.article-sheet iframe',
            filterSelectors: []
        },
        {
            matcher: /oreilly.com\/radar/,
            contentSelector: '.post-radar',
            filterSelectors: []
        },
        {
            matcher: /www.premierguitar.com\/diy/,
            contentSelector: 'article',
            filterSelectors: []
        },
    ];
    let url = document.URL;
    let title = document.title
    let content = document.body;

    let action = actions.find(a => document.URL.match(a.matcher) != null);
    if (action) {
        content = document.querySelector(action.contentSelector);
        if (!content) {
            throw(`Content not found with selector: ${action.contentSelector}`);
        }
        action.filterSelectors.forEach(filter => {
            Array.from(content.querySelectorAll(filter)).forEach(e => e.parentNode.removeChild(e));
        })
        if (content && content.tagName === 'IFRAME') {
            title = `${content.ownerDocument.title} : ${content.contentDocument.title}`;
            content = content.contentDocument.body;
        }
    }
    inlineImages(content);
    return {
        body: cloneBody(content),
        url: url,
        title: title
    };
}

function stripUselessElements(body) {

    let stripElements = [
        'iframe', 'script', 'style', 'noscript', 'head',
        'input', 'textarea', 'select', 'button'
    ];
    for (let i in stripElements) {
        let els = [];
        let ns = body.getElementsByTagName(stripElements[i]);
        for (let j = 0; j < ns.length; j++) els[els.length] = ns[j];
        for (let j = 0; j < els.length; j++) {
            els[j].parentNode.removeChild(els[j]);
        }
    }
}

function stripCommentsAndHiddenElements(node) {
    if (node.nodeType === 8 /* comment */) node.parentNode.removeChild(node);
    else if (node.nodeType === 1 /* element */) {
        if (node?.style?.display === 'none' || node?.style?.visibility === 'hidden') {
            node.parentNode.removeChild(node);
        } else {
            Array.from(node.childNodes).forEach(stripCommentsAndHiddenElements);
        }
    }
}

function renderOnCanvas(img, width, height) {
    let canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas;
}

function getBase64Image(img) {
    let width = img.getAttribute('width') || img.naturalWidth;
    let height = img.getAttribute('height') || img.naturalHeight;
    try {
        let canvas = renderOnCanvas(img, width, height);
        return canvas.toDataURL('image/png');
    } catch (e) {
        console.log(e);
        console.log("trying again!");
        img.crossOrigin = "Anonymous";
        try {
            let canvas = renderOnCanvas(img, width, height);
            return canvas.toDataURL('image/png');
        } catch (e) {
            console.log(e);
            console.log("giving up!");
        }
    }
    return img.src;
}

function inlineImages(content) {
    let images = content.images || content.ownerDocument.images;
    Array.from(images).forEach(x => x.src = getBase64Image(x));
}

function cloneBody(content) {
    let body = document.createElement('body');
    body.appendChild(content.cloneNode(true));
    return body;
}

