'use strict';

function get_body() {

  // TODO get the root element here before any other actions
  if (document.URL.match(/learning.oreilly.com|learning-oreilly-com/) != null) {
    let div = body.querySelector('#sbo-rt-content');
    let ov = div.querySelector('#ov');
    if (ov) {
      ov.parentNode.removeChild(ov);
    }
    Array.from(div.querySelectorAll('.codelink')).forEach(e => e.parentNode.removeChild(e));
    let body = document.createElement('body');
    body.appendChild(div);
    return body;
  }

  if (document.URL.match(/read.overdrive.com/) != null) {
    let content = document.querySelectorAll('.article-sheet iframe')[0].contentDocument;
    let body = document.createElement('body');
    body.appendChild(content.body.firstElementChild);
    return body;
  }

  // By default return copy of document body
  return document.body.cloneNode(true);
}

function clean_body(body) {

  Array.from(body.getElementsByTagName('img')).forEach(x => x.src = getBase64Image(x));
  Array.from(body.getElementsByTagName('canvas')).forEach(canvasToImage);

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
  stripCommentsAndHiddenElements(body);
  return body.innerHTML;
}

function stripCommentsAndHiddenElements(node) {
  if (node.nodeType == 8 /* comment */ ) node.parentNode.removeChild(node);
  else if (node.nodeType == 1 /* element */ ) {
    if (node?.style?.display == 'none' || node?.style?.visibility == 'hidden') {
      node.parentNode.removeChild(node);
    } else {
      Array.from(node.childNodes).forEach(stripCommentsAndHiddenElements);
    }
  }
}

function getBase64Image(img) {
  let canvas = document.createElement('canvas');
  canvas.width = img.getAttribute('width');
  canvas.height = img.getAttribute('height');
  let ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  let dataURL;
  try {
    dataURL = canvas.toDataURL('image/png');
  } catch (e) {
    // The dreaded tainted canvas exception occurs when the src
    // is at a different origin.
    // TODO move this logic to the service worker
    console.log(e);
    dataURL = img.src;
  }
  return dataURL;
}

// WIP
// Attempt to support rendered canvas elements
function canvasToImage(canvas) {
  let parentNode = canvas.parentNode
  let img = new Image(canvas.width, canvas.height);
  try {
    img.src = canvas.toDataURL('image/png');
    parentNode.removeChild(canvas);
    parentNode.appendChild(img);
  } catch (e) {
    console.log(e);
    parentNode.removeChild(canvas);
  }
}

chrome.runtime.onMessage.addListener(
  (request, _sender, _sendResponse) => {
    if (request.message == 'get-page') {
      let url = document.URL;
      let title = document.title;
      let body = clean_body(get_body());

      let doc = document.implementation.createHTMLDocument(title);
      let meta = doc.createElement('meta');
      meta.setAttribute('charset', 'utf-8');
      meta.setAttribute('http-equiv', 'content-type');
      meta.setAttribute('content', 'text/html; charset=utf-8');
      doc.head.appendChild(meta)
      doc.body.innerHTML = body.replace(/\n/g, "");
      doc.body.style.cssText = 'text-align: left;';
      let html = '<!doctype html>' + doc.documentElement.outerHTML;

      chrome.runtime.sendMessage({
        message: 'send-page',
        title,
        url,
        html
      })
    }
  }
);

