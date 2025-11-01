const { app, BrowserWindow, ipcMain } = require('electron');

const { exec } = require('child_process');

const util = require('util');

const execPromise = util.promisify(exec);

const https = require('https');

const http = require('http');

const path = require('path');



const config = require('./config');
const SERVER_URL = config.SERVER_URL || 'http://localhost:3000';



let mainWindow;



function createWindow() {

  mainWindow = new BrowserWindow({

    width: 800,

    height: 600,

    webPreferences: {

      nodeIntegration: true,

      contextIsolation: false

    }

  });



  mainWindow.loadFile(path.join(__dirname, 'index.html'));

}



app.whenReady().then(createWindow);



app.on('window-all-closed', () => {

  if (process.platform !== 'darwin') {

    app.quit();

  }

});



app.on('activate', () => {

  if (BrowserWindow.getAllWindows().length === 0) {

    createWindow();

  }

});



async function getWifiInfo() {

  const result = {

    ssid: null,

    bssid: null,

    linkLocalIPv6: null

  };



  try {

    if (process.platform === 'win32') {

      try {

        const { stdout: interfacesOutput } = await execPromise('netsh wlan show interfaces');

        const lines = interfacesOutput.split('\n');

        

        for (const line of lines) {

          const trimmedLine = line.trim();

          

          if (trimmedLine.toLowerCase().startsWith('ssid') && !result.ssid) {

            const parts = trimmedLine.split(':');

            if (parts.length > 1) {

              result.ssid = parts.slice(1).join(':').trim();

            }

          }

          

          if (trimmedLine.toLowerCase().startsWith('bssid') && !result.bssid) {

            const parts = trimmedLine.split(':');

            if (parts.length > 1) {

              const bssid = parts.slice(1).join(':').trim();

              if (/^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/i.test(bssid)) {

                result.bssid = bssid;

              }

            }

          }

        }

      } catch (e) {

        console.error('Error getting SSID/BSSID:', e.message);

      }



      if (!result.bssid && result.ssid) {

        try {

          const { stdout: networksOutput } = await execPromise('netsh wlan show networks mode=Bssid');

          const lines = networksOutput.split('\n');

          let foundSsid = false;

          

          for (let i = 0; i < lines.length; i++) {

            const line = lines[i];

            

            if (line.includes('SSID') && line.includes(result.ssid)) {

              foundSsid = true;

              continue;

            }

            

            if (foundSsid) {

              if (line.trim().startsWith('SSID') && !line.includes(result.ssid)) {

                break;

              }

              

              if (line.includes('BSSID')) {

                const macPattern = /([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/i;

                const match = line.match(macPattern);

                if (match) {

                  result.bssid = match[0];

                  break;

                }

              }

            }

          }

        } catch (e) {

          // Ignore

        }

      }



      try {

        const { stdout: ipconfigOutput } = await execPromise('ipconfig');

        const lines = ipconfigOutput.split('\n');

        let foundWifiSection = false;

        

        for (let i = 0; i < lines.length; i++) {

          const line = lines[i];

          

          if (line.includes('Wireless LAN adapter Wi-Fi') || line.includes('adapter Wi-Fi:')) {

            foundWifiSection = true;

            continue;

          }

          

          if (foundWifiSection) {

            if (line.includes('adapter') && !line.includes('Wi-Fi')) {

              break;

            }

            

            if (line.includes('Link-local IPv6 Address')) {

              const ipv6Match = line.match(/fe80:[0-9a-fA-F:]+(?:%\d+)?/i);

              if (ipv6Match && ipv6Match[0]) {

                result.linkLocalIPv6 = ipv6Match[0];

              } else {

                const colonIndex = line.lastIndexOf(':');

                if (colonIndex !== -1) {

                  const ipv6Part = line.substring(colonIndex + 1).trim();

                  const match = ipv6Part.match(/(fe80:[0-9a-fA-F:]+(?:%\d+)?)/i);

                  if (match && match[1]) {

                    result.linkLocalIPv6 = match[1];

                  }

                }

              }

            }

          }

        }

      } catch (e) {

        console.error('Error getting Link-local IPv6:', e.message);

      }

    } else {

      try {

        const { stdout: iwOutput } = await execPromise('iwgetid -r');

        result.ssid = iwOutput.trim();

      } catch (e) {

        // Ignore

      }



      try {

        const { stdout: ipv6Output } = await execPromise('ip addr show | grep "inet6 fe80"');

        const match = ipv6Output.match(/fe80:[0-9a-fA-F:]+(?:%\d+)?/i);

        if (match) {

          result.linkLocalIPv6 = match[0];

        }

      } catch (e) {

        // Ignore

      }

    }

  } catch (error) {

    console.error('Error getting WiFi info:', error.message);

  }



  return result;

}



async function sendToServer(wifiInfo) {

  return new Promise((resolve) => {

    const timeout = 10000; // 10 giây

    

    try {

      const url = new URL(`${SERVER_URL}/api/wifi-ip`);

      const postData = JSON.stringify(wifiInfo);

      

      const options = {

        hostname: url.hostname,

        port: url.port || (url.protocol === 'https:' ? 443 : 80),

        path: url.pathname,

        method: 'POST',

        timeout: timeout,

        headers: {

          'Content-Type': 'application/json',

          'Content-Length': Buffer.byteLength(postData)

        }

      };



      let timeoutId;



      const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {

        let data = '';

        

        res.on('data', (chunk) => {

          data += chunk;

        });

        

        res.on('end', () => {

          clearTimeout(timeoutId);

          try {

            const result = JSON.parse(data);

            resolve(result);

          } catch (e) {

            resolve({ success: false, error: 'Lỗi parse response: ' + e.message });

          }

        });

      });



      req.on('error', (error) => {

        clearTimeout(timeoutId);

        resolve({ success: false, error: 'Lỗi kết nối: ' + error.message });

      });



      timeoutId = setTimeout(() => {

        req.destroy();

        resolve({ success: false, error: 'Timeout: Không nhận được phản hồi từ server sau 10 giây' });

      }, timeout);



      req.write(postData);

      req.end();

    } catch (error) {

      resolve({ success: false, error: 'Lỗi: ' + error.message });

    }

  });

}



ipcMain.handle('get-wifi-info', async () => {

  return await getWifiInfo();

});



ipcMain.handle('send-wifi-info', async (event, wifiInfo) => {

  return await sendToServer(wifiInfo);

});
