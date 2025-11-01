const { ipcRenderer } = require('electron');

let currentData = {
    ssid: null,
    bssid: null,
    linkLocalIPv6: null
};

window.addEventListener('DOMContentLoaded', () => {
    refreshInfo();
});

async function refreshInfo() {
    try {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);

        const data = await ipcRenderer.invoke('get-wifi-info');
        currentData = data;

        updateDisplay(data);

        buttons.forEach(btn => btn.disabled = false);

        updateJsonDisplay();
    } catch (error) {
        console.error('Error getting WiFi info:', error);
        updateDisplay({
            ssid: null,
            bssid: null,
            linkLocalIPv6: null
        });
    }
}

function updateDisplay(data) {
    const ssidElement = document.getElementById('ssid');
    const bssidElement = document.getElementById('bssid');
    const linkLocalIPv6Element = document.getElementById('linkLocalIPv6');

    ssidElement.textContent = data.ssid || 'null';
    ssidElement.className = 'info-value' + (data.ssid ? '' : ' null');

    bssidElement.textContent = data.bssid || 'null';
    bssidElement.className = 'info-value' + (data.bssid ? '' : ' null');

    linkLocalIPv6Element.textContent = data.linkLocalIPv6 || 'null';
    linkLocalIPv6Element.className = 'info-value' + (data.linkLocalIPv6 ? '' : ' null');
}

function updateJsonDisplay() {
    const jsonDisplay = document.getElementById('jsonDisplay');
    jsonDisplay.textContent = JSON.stringify(currentData, null, 2);
}

async function sendToBackend() {
    const statusElement = document.getElementById('status');

    try {
        statusElement.textContent = 'Đang gửi và kiểm tra...';
        statusElement.className = 'status show';

        const result = await ipcRenderer.invoke('send-wifi-info', currentData);

        if (result.success) {
            // Hiển thị kết quả validation từ backend
            if (result.isValid !== undefined) {
                if (result.isValid) {
                    statusElement.textContent = `✅ ${result.message}`;
                    statusElement.className = 'status success show';
                } else {
                    statusElement.textContent = `❌ ${result.message}`;
                    statusElement.className = 'status error show';
                }
                
                // Hiển thị chi tiết trong console
                console.log('Validation Result:', result);
            } else {
                statusElement.textContent = 'Thành công! Đã gửi thông tin lên server.';
                statusElement.className = 'status success show';
            }
        } else {
            statusElement.textContent = `Lỗi: ${result.error}`;
            statusElement.className = 'status error show';
        }
    } catch (error) {
        statusElement.textContent = `Lỗi: ${error.message}`;
        statusElement.className = 'status error show';
    }
}

async function copyToClipboard() {
    const jsonString = JSON.stringify(currentData, null, 2);
    
    try {
        await navigator.clipboard.writeText(jsonString);
        
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = 'Đã copy!';
        btn.style.background = '#28a745';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        alert('Không thể copy vào clipboard');
    }
}

