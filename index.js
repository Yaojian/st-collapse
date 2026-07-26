import { chat, eventSource, event_types, updateMessageBlock } from '../../../../script.js';

const processedMessages = new Set();

function processMessage(messageId) {
    console.debug('Continuity: processMessage called for', messageId);
    const message = chat[messageId];
    if (!message || message.is_user) {
        console.debug('Continuity: skip - no message or is_user', messageId);
        return false;
    }
    if (processedMessages.has(messageId)) {
        console.debug('Continuity: skip - already processed', messageId);
        return false;
    }

    const regex = /<continuity>([\s\S]*?)<\/continuity>/;
    const match = message.mes.match(regex);
    if (!match) {
        console.debug('Continuity: no regex match in mes for', messageId, message.mes?.slice(0, 100));
        return false;
    }

    console.debug('Continuity: matched for', messageId, 'content length:', match[1].length);

    if (typeof message.extra !== 'object') message.extra = {};
    message.extra.continuity_text = match[1].trim();
    message.mes = message.mes.replace(regex, '').trim();

    processedMessages.add(messageId);

    updateMessageBlock(messageId, message);
    injectContinuityElement(messageId);
    return true;
}

function injectContinuityElement(messageId) {
    const message = chat[messageId];
    if (!message?.extra?.continuity_text) {
        console.debug('Continuity: inject skip - no continuity_text', messageId);
        return;
    }

    const block = document.querySelector(`#chat .mes[mesid="${messageId}"]`);
    if (!block) {
        console.debug('Continuity: inject skip - no DOM block for', messageId);
        return;
    }
    if (block.querySelector('.mes_continuity_details')) {
        console.debug('Continuity: inject skip - already injected', messageId);
        return;
    }

    const textEl = block.querySelector('.mes_text');
    if (!textEl) {
        console.debug('Continuity: inject skip - no .mes_text', messageId);
        return;
    }

    console.debug('Continuity: injecting for', messageId);

    const details = document.createElement('details');
    details.className = 'mes_continuity_details';
    details.open = false;

    const summary = document.createElement('summary');
    summary.className = 'mes_continuity_summary flex-container';
    summary.innerHTML = (
        '<div class="mes_continuity_header flex-container">' +
            '<span>Continuity</span>' +
            '<div class="mes_continuity_arrow fa-solid fa-chevron-up"></div>' +
        '</div>'
    );

    const content = document.createElement('div');
    content.className = 'mes_continuity';
    content.textContent = message.extra.continuity_text;

    details.appendChild(summary);
    details.appendChild(content);

    textEl.parentNode.insertBefore(details, textEl.nextSibling);
}

function processExistingMessages() {
    console.debug('Continuity: processExistingMessages, chat length:', chat?.length);
    if (!chat || chat.length === 0) return;
    chat.forEach((msg, idx) => {
        const hasContinuity = msg.mes?.includes('<continuity>');
        if (hasContinuity) {
            console.debug('Continuity: found continuity in mes', idx);
        }
        if (!msg.is_user && hasContinuity) {
            processMessage(idx);
        }
    });
}

export function init() {
    console.debug('Continuity: init called');
    eventSource.on(event_types.MESSAGE_RECEIVED, processMessage);
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, injectContinuityElement);
    eventSource.on(event_types.MESSAGE_SWIPED, (messageId) => {
        processedMessages.delete(messageId);
    });
    eventSource.on(event_types.CHAT_CHANGED, processExistingMessages);
    eventSource.on(event_types.APP_READY, processExistingMessages);

    processExistingMessages();
}
