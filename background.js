document.addEventListener('DOMContentLoaded', () => {
    // --- 暫存和預設值設定 ---
    const STORAGE_KEY = 'regexToolState';
    const DEFAULTS = {
        regex: '\\bworld\\b',
        flags: 'gi',
        replacement: '<span style="color: blue; font-weight: bold;">PLANET</span>',
        depth: 2,
        sources: [
            "This is the 1st reply about the world.",
            "This is the 2nd reply about the world.",
            "This is the 3rd reply about the world.",
            "4th reply: Let's not touch this one.",
            "5th reply: Or this one."
        ]
    };

    // --- 狀態管理 ---
    let sourceTexts = [...DEFAULTS.sources];

    // --- 獲取 DOM 元素 ---
    const regexInput = document.getElementById('regex-input');
    const flagsInput = document.getElementById('flags-input');
    const replacementInput = document.getElementById('replacement-input');
    const depthInput = document.getElementById('depth-input');
    const sourceListContainer = document.getElementById('source-list-container');
    const addSourceBtn = document.getElementById('add-source-btn');
    const matchPreview = document.getElementById('match-preview');
    const replacementPreview = document.getElementById('replacement-preview');
    const errorMessage = document.getElementById('error-message');
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeBtn = document.getElementById('close-btn');
    const stWarningMessage = document.getElementById('st-warning-message'); 

    // --- 儲存/讀取狀態 ---
    function saveState() {
        const currentState = {
            regex: regexInput.value,
            flags: flagsInput.value,
            replacement: replacementInput.value,
            depth: parseInt(depthInput.value, 10),
            sources: sourceTexts
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    }

    function loadState() {
        const savedStateJSON = localStorage.getItem(STORAGE_KEY);
        let state = DEFAULTS;
        if (savedStateJSON) {
            try {
                state = JSON.parse(savedStateJSON);
            } catch (e) {
                console.error("Failed to parse saved state, using defaults.", e);
                state = DEFAULTS;
            }
        }
        
        regexInput.value = state.regex;
        flagsInput.value = state.flags;
        replacementInput.value = state.replacement;
        depthInput.value = state.depth;
        sourceTexts = [...state.sources];
    }

    // --- 說明視窗 Modal 的邏輯 ---
    helpBtn.addEventListener('click', () => { helpModal.style.display = 'flex'; });
    closeBtn.addEventListener('click', () => { helpModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target == helpModal) { helpModal.style.display = 'none'; } });

    // --- 監聽來自 help.html 的指令 ---
    window.addEventListener('message', (event) => {
        if (event.data === 'clearCache') {
            localStorage.removeItem(STORAGE_KEY);
            alert('暫存已清除！頁面將保持目前狀態，刷新後將恢復預設值。');
        } else if (event.data === 'resetToDefault') {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        }
    });
    
    // --- 核心函數 ---
    function updatePreviews() {
        const regexPattern = regexInput.value;
        const regexFlags = flagsInput.value;
        const replacementString = replacementInput.value;
        const finalReplacementString = replacementString.replace(/\{\{match\}\}/gi, '$$&');
        const depth = parseInt(depthInput.value, 10) || 0;
        let regex;
        try {
            regex = new RegExp(regexPattern, regexFlags);
            errorMessage.textContent = '';
        } catch (e) {
            errorMessage.textContent = '無效的正規表示式: ' + e.message;
            return;
        }
        
        const totalSources = sourceTexts.length;
        const processEndIndex = totalSources - depth;
        const matchPreviewParts = [];
        const replacementPreviewParts = [];

        sourceTexts.forEach((source, index) => {
            const shouldProcess = index < processEndIndex;
            if (shouldProcess) {
                const escapedSource = escapeHTML(source);
                const highlighted = regex.source === '(?:)' ? escapedSource : escapedSource.replace(regex, match => `<span class="highlight">${escapeHTML(match)}</span>`);
                matchPreviewParts.push(highlighted);
                const replaced = source.replace(regex, finalReplacementString);
                replacementPreviewParts.push(replaced);
            } else {
                matchPreviewParts.push(escapeHTML(source));
                replacementPreviewParts.push(escapeHTML(source));
            }
        });

        matchPreview.innerHTML = matchPreviewParts.join('<hr style="border:0; border-top: 1px dashed #ccc; margin: 5px 0;">');
        const finalReplacementHTML = replacementPreviewParts.join('<hr style="border:0; border-top: 1px solid #eee; margin: 5px 0;">');
        replacementPreview.innerHTML = sanitizeHtml(finalReplacementHTML);
    }
    
    // --- 輔助函數 ---
    function escapeHTML(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    function sanitizeHtml(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const forbiddenTags = ['script', 'iframe', 'object', 'embed', 'form'];
        doc.querySelectorAll(forbiddenTags.join(',')).forEach(el => el.remove());
        doc.querySelectorAll('*').forEach(el => {
            for (const attr of [...el.attributes]) {
                if (attr.name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
            }
        });
        return doc.head.innerHTML + doc.body.innerHTML;
    }
    
    function renderSourceList() {
        sourceListContainer.innerHTML = ''; // 清空現有列表
        const depth = parseInt(depthInput.value, 10) || 0;
        const totalSources = sourceTexts.length;
        const unaffectedStartIndex = totalSources - depth;

        sourceTexts.forEach((text, index) => {
            // 1. 創建新的 wrapper 容器
            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'source-item-wrapper';

            // 2. 創建可編輯的文字區域
            const itemDiv = document.createElement('div');
            itemDiv.className = 'source-item';
            itemDiv.contentEditable = true;
            itemDiv.innerText = text; // 使用 innerText 以保留換行

            // 3. 創建刪除按鈕
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×'; // 使用乘號作為 "X"
            deleteBtn.title = '刪除此範本';

            // 4. 為 wrapper 添加 'unaffected' 樣式（如果需要）
            if (index >= unaffectedStartIndex) {
                wrapperDiv.classList.add('unaffected');
            }

            // --- 事件綁定 ---
            // 編輯事件
            itemDiv.addEventListener('input', () => {
                sourceTexts[index] = itemDiv.innerText;
                handleInputChange();
            });

            // 刪除事件
            deleteBtn.addEventListener('click', () => {
                // 為了安全，給出一個確認提示
                const confirmationText = sourceTexts[index].length > 20 
                    ? `"${sourceTexts[index].substring(0, 20)}..."` 
                    : `"${sourceTexts[index]}"`;
                
                if (confirm(`確定要刪除範本 ${confirmationText} 嗎？`)) {
                    sourceTexts.splice(index, 1); // 從陣列中移除該項
                    renderSourceList(); // 重新渲染整個列表
                    updatePreviews();   // 更新預覽
                    saveState();        // 保存變更
                }
            });

            // 5. 將元素組裝起來
            wrapperDiv.appendChild(itemDiv);
            wrapperDiv.appendChild(deleteBtn);
            sourceListContainer.appendChild(wrapperDiv);
        });
    }

    // --- 新增：偵測不支援標籤的函數 ---
    function checkForbiddenTags() {
        const replacementText = replacementInput.value;
        
        // 使用 global (g) 和 case-insensitive (i) 旗標來找出所有符合的標籤
        // 捕獲組 (html|body|head|script) 會抓取到標籤的名稱
        const forbiddenTagRegex = /<\/?(html|body|head|script)\b/gi;
        
        // 使用 matchAll 獲取所有匹配項的詳細資訊
        const matches = replacementText.matchAll(forbiddenTagRegex);
        
        // 使用 Set 來自動處理重複的標籤名稱（例如 <script> 和 </script> 都算 "script"）
        const foundTags = new Set();
        for (const match of matches) {
            // match[1] 是我們捕獲的標籤名稱
            foundTags.add(match[1].toLowerCase());
        }

        if (foundTags.size > 0) {
            // 如果找到了標籤
            // 1. 將 Set 轉換為陣列
            // 2. 為每個標籤名稱加上尖括號，例如 "script" -> "<script>"
            // 3. 用逗號和空格將它們連接起來
            const formattedTags = [...foundTags].map(tag => `&lt;${tag}&gt;`).join(', ');

            // 4. 建立並設定動態的警告訊息
            stWarningMessage.innerHTML = `SillyTavern可能不支援以下元素：【${formattedTags}】`;
            stWarningMessage.style.display = 'inline'; // 顯示警告
        } else {
            // 如果沒有找到任何禁用標籤，就隱藏警告
            stWarningMessage.style.display = 'none';
        }
    }

    // --- 事件處理 ---
    function handleInputChange() {
        checkForbiddenTags(); // <-- 新增這一行，在處理任何事情前先檢查
        updatePreviews();
        saveState();
    }

    function handleDepthChange() {
        renderSourceList();
        updatePreviews();
        saveState();
    }
    
    // --- 事件監聽 ---
    [regexInput, flagsInput, replacementInput].forEach(element => element.addEventListener('input', handleInputChange));
    depthInput.addEventListener('input', handleDepthChange);

    addSourceBtn.addEventListener('click', () => {
        sourceTexts.push("點此編輯新範本...");
        renderSourceList();
        updatePreviews();
        saveState();
        sourceListContainer.lastChild.focus();
    });

    // --- 初始化 ---
    loadState();
    renderSourceList();
    updatePreviews();
    checkForbiddenTags(); // <-- 新增這一行，檢查初始載入的內容
});