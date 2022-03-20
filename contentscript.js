'use strict';

let configuredActions = [
    {
        matcher: /learning.oreilly.com|learning-oreilly-com/,
        contentSelector: '#sbo-rt-content',
        filterSelectors: ['.codelink', '#ov'],
        styleSheetMatchers: ['epub-book']
    },
    {
        matcher: /read.overdrive.com/,
        contentSelector: '.article-sheet iframe',
        filterSelectors: [],
        styleSheetMatchers: []
    },
    {
        matcher: /oreilly.com\/radar/,
        contentSelector: '.post-radar',
        filterSelectors: [],
        styleSheetMatchers: []
    },
    {
        matcher: /www.premierguitar.com\/diy/,
        contentSelector: 'article',
        filterSelectors: [],
        styleSheetMatchers: []
    },
    {
        matcher: /./,
        contentSelector: 'body',
        filterSelectors: [],
        styleSheetMatchers: []
    }
];

chrome.runtime.onMessage.addListener(
    (request, _sender, _sendResponse) =>
    {
        if (request.message === 'get-page')
        {
            const {
                contentSelector,
                filterSelectors,
                styleSheetMatchers
            } = configuredActions.find(a => document.URL.match(a.matcher) != null);
            let {
                body,
                url,
                title
            } = getBody(contentSelector);
            if (!body)
            {
                console.error(`Bailing out! ${{body: body, url: url, title: title}}`);
                return;
            }
            filterSelectors.forEach(filter =>
            {
                Array.from(body.querySelectorAll(filter)).forEach(e => e.parentNode.removeChild(e));
            });
            stripUselessElements(body);
            stripCommentsAndHiddenElements(body);
            stripUselessAttributes(body);
            fixWhiteSpace(body);

            let doc = document.implementation.createHTMLDocument(title);
            let meta = doc.createElement('meta');
            meta.setAttribute('charset', 'utf-8');
            meta.setAttribute('http-equiv', 'content-type');
            meta.setAttribute('content', 'text/html; charset=utf-8');
            doc.head.appendChild(meta)
            embedStyleSheets(doc, styleSheetMatchers);
            doc.body.innerHTML = body.innerHTML;
            doc.body.style.cssText = 'text-align: left;';
            doc.body.id = 'book-content';

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

function embedStyleSheets(doc, styleSheetMatchers) {
    if (!styleSheetMatchers.length) {
        return;
    }
    Array.from(document.styleSheets)
        .filter(styleSheet =>
        {
            return styleSheet.href
                && styleSheetMatchers.findIndex(m => styleSheet.href.match(m) !== null) !== -1;
        })
        .forEach((styleSheet) =>
        {
            let cssText =
                Array.from(styleSheet.cssRules)
                    .reduce((prev, cssRule) =>
                    {
                        return prev + '\n' + cssRule.cssText
                    }, '');
            let style = document.createElement('style');
            style.innerHTML = cssText;
            doc.head.appendChild(style);
        });
}

function getBody(contentSelector)
{
    let url = document.URL;
    let title = document.title || 'Title Unknown';
    let content = document.body;

    if (contentSelector)
    {
        content = document.querySelector(contentSelector);
        if (!content) {
            throw (`Content not found with selector: ${contentSelector}`);
        }
        if (content.tagName === 'IFRAME')
        {
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

function stripUselessAttributes(body)
{
    for (let a of body.querySelectorAll('a'))
    {
        Array.from(a.getAttributeNames())
            .forEach(name =>
            {
                if (!name.match(/href|id/))
                {
                    a.removeAttribute(name);
                }
            });
    }
}

function stripUselessElements(body) {

    let stripElements = [
        'iframe', 'script', 'style', 'noscript', 'head',
        'input', 'textarea', 'select', 'button'
    ];
    for (let i in stripElements)
    {
        let els = [];
        let ns = body.getElementsByTagName(stripElements[i]);
        for (let j = 0; j < ns.length; j++) els[els.length] = ns[j];
        for (let j = 0; j < els.length; j++) {
            els[j].parentNode.removeChild(els[j]);
        }
    }
}

function fixWhiteSpace(body) {
    Array.from(body.querySelectorAll('pre')).forEach(pre =>
    {
        pre.innerHTML = pre.innerHTML.replace(/\n/g, "<br>");
    })
    body.innerHTML = body.innerHTML.replace(/\n|\t/g, "");
}

function stripCommentsAndHiddenElements(node) {
    if (node.nodeType === node.COMMENT_NODE)
    {
        node.parentNode.removeChild(node);
    }
    else if (node.nodeType === node.ELEMENT_NODE)
    {
        if (node?.style?.display === 'none' || node?.style?.visibility === 'hidden')
        {
            node.parentNode.removeChild(node);
        } else
        {
            Array.from(node.childNodes).forEach(stripCommentsAndHiddenElements);
        }
    }
}

function renderOnCanvas(img, width, height)
{
    let canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas;
}

function getBase64Image(img)
{
    let width = img.naturalWidth || img.getAttribute('width');
    let height = img.naturalHeight || img.getAttribute('height');
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

function inlineImages(content)
{
    let images = content.getElementsByTagName('img') || content.ownerDocument.images;
    Array.from(images).forEach(x => x.src = getBase64Image(x));
}

function cloneBody(content)
{
    let body = document.createElement('body');
    body.appendChild(content.cloneNode(true));
    return body;
}
