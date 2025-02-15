// ==UserScript==
// @name         ChatGPT API By Browser Script
// @namespace    http://tampermonkey.net/
// @version      2
// @match        https://chatgpt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        GM_webRequest
// @license      MIT
// ==/UserScript==

const log = (...args) => {
  console.log('chatgpt-api-by-browser-script', ...args);
};
log('starting');

const WS_URL = `ws://localhost:8765`;

function cleanText(inputText) {
  return inputText.replace(/[​‌‍﻿]|[\u0000-\u001F\u007F-\u009F]/g, '');
}

function getTextFromNode(node) {
  let result = '';
  if (!node) return result;
  if (node.classList.contains('text-token-text-secondary') && node.classList.contains('bg-token-main-surface-secondary')) return result;
  
  node.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      result += getTextFromNode(child);
    }
  });
  return cleanText(result);
}

function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

class App {
  constructor() {
    this.socket = null;
    this.observer = null;
    this.stop = false;
    this.dom = null;
    this.lastText = null;
  }

  async start({ text }) {
    this.stop = false;
    log('Updating or sending a new message');

    // Select the editable div inside the form
    let inputField = document.querySelector('.ProseMirror');

    // Simulate typing into the field
    inputField.focus();
    inputField.innerHTML = text;  // Directly set the innerHTML

    // Trigger input event to notify React/JS framework
    inputField.dispatchEvent(new Event('input', { bubbles: true }));


    await sleep(500);
    
    // Simulate pressing Enter key to submit
    inputField.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
    }));

    this.observeMutations();
  }

  async observeMutations() {
    let isStart = false;
    this.observer = new MutationObserver(async () => {
      const stopButton = document.querySelector('button.bg-black .icon-lg');
      if (stopButton) isStart = true;
      if (!isStart) return;
      
      const messages = [...document.querySelectorAll('div.agent-turn')];
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) return;
      
      let lastText = getTextFromNode(lastMessage.querySelector('div[data-message-author-role="assistant"]'));
      if (!lastText || lastText === this.lastText) return;
      
      this.lastText = lastText;
      log('Sending response:', { text: lastText });
      this.socket.send(JSON.stringify({ type: 'answer', text: lastText }));
      
      if (!stopButton) {
        this.observer.disconnect();
        if (this.stop) return;
        this.stop = true;
        log('Sending stop signal');
        this.socket.send(JSON.stringify({ type: 'stop' }));
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  sendHeartbeat() {
    if (this.socket.readyState === WebSocket.OPEN) {
      log('Sending heartbeat');
      this.socket.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }

  connect() {
    this.socket = new WebSocket(WS_URL);
    this.socket.onopen = () => {
      log('Server connected');
      this.dom.innerHTML = '<div style="color: green;">API Connected!</div>';
    };
    this.socket.onclose = () => {
      log('Server disconnected, attempting to reconnect...');
      this.dom.innerHTML = '<div style="color: red;">API Disconnected!</div>';
      setTimeout(() => this.connect(), 2000);
    };
    this.socket.onerror = (error) => {
      log('Server connection error:', error);
      this.dom.innerHTML = '<div style="color: red;">API Error!</div>';
    };
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        log('Received data:', data);
        this.start(data);
      } catch (error) {
        log('Error parsing server message:', error);
      }
    };
  }

  init() {
    window.addEventListener('load', () => {
      this.dom = document.createElement('div');
      this.dom.style = 'position: fixed; top: 10px; right: 10px; z-index: 9999;';
      document.body.appendChild(this.dom);
      this.connect();
      setInterval(() => this.sendHeartbeat(), 30000);
    });
  }
}

(function () {
  'use strict';
  const app = new App();
  app.init();
})();
