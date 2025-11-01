const { ipcRenderer } = require('electron');

let currentData = {
    ssid: null,
    bssid: null,
    linkLocalIPv6: null
};

function updateTime() {
    const timeElement = document.getElementById('timeDisplay');
    if (timeElement) {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timeElement.textContent = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    updateTime();
    setInterval(updateTime, 1000);
});

async function refreshInfo() {
    try {
        const data = await ipcRenderer.invoke('get-wifi-info');
        currentData = data;
        return data;
    } catch (error) {
        console.error('Error getting WiFi info:', error);
        currentData = {
            ssid: null,
            bssid: null,
            linkLocalIPv6: null
        };
        return currentData;
    }
}

async function checkIn() {
    const statusElement = document.getElementById('status');
    const btn = document.getElementById('checkinBtn');

    try {
        btn.disabled = true;
        btn.textContent = 'Đang xử lý...';
        
        statusElement.textContent = 'Đang kiểm tra WiFi và chấm công...';
        statusElement.className = 'status loading show';

        await refreshInfo();

        const result = await ipcRenderer.invoke('send-wifi-info', currentData);
        
        console.log('Backend response:', result);

        // Kiểm tra kết quả
        if (result.success && result.isValid !== undefined) {
            if (result.isValid) {
                statusElement.textContent = 'Chấm công thành công!';
                statusElement.className = 'status success show';
            } else {
                statusElement.textContent = 'Bạn đang dùng mạng khác';
                statusElement.className = 'status error show';
            }
        } else if (result.success) {
            statusElement.textContent = 'Chấm công thành công!';
            statusElement.className = 'status success show';
        } else {
            statusElement.textContent = 'Bạn đang dùng mạng khác';
            statusElement.className = 'status error show';
        }
    } catch (error) {
        statusElement.textContent = 'Bạn đang dùng mạng khác';
        statusElement.className = 'status error show';
        console.error('Error in checkIn():', error);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Chấm Công';
    }
}

// Expose function để gọi từ HTML
window.checkIn = checkIn;

