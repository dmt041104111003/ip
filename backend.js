const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_WIFI = {
  ssid: 'Wifi12',
  bssid: 'fc:57:03:ce:55:64'
};

app.use(cors());
app.use(express.json());

app.post('/api/wifi-ip', (req, res) => {
  try {
    const { ssid, bssid, linkLocalIPv6 } = req.body;

    if (!ssid && !bssid) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin SSID hoặc BSSID'
      });
    }

    const normalizeBSSID = (bssid) => {
      if (!bssid) return null;
      return bssid.toLowerCase().replace(/-/g, ':').trim();
    };

    const normalizedReceivedBSSID = normalizeBSSID(bssid);
    const normalizedAllowedBSSID = normalizeBSSID(ALLOWED_WIFI.bssid);
    const normalizedReceivedSSID = ssid ? ssid.trim() : null;
    const normalizedAllowedSSID = ALLOWED_WIFI.ssid.trim();

    const ssidMatch = normalizedReceivedSSID === normalizedAllowedSSID;
    const bssidMatch = normalizedReceivedBSSID === normalizedAllowedBSSID;

    let isValid = false;
    let message = '';

    if (ssidMatch && bssidMatch) {
      isValid = true;
      message = 'WiFi hợp lệ! SSID và BSSID khớp với cấu hình.';
    } else if (ssidMatch && !bssidMatch) {
      isValid = false;
      message = `SSID khớp nhưng BSSID không khớp. Nhận được: ${bssid || 'null'}, mong đợi: ${ALLOWED_WIFI.bssid}`;
    } else if (!ssidMatch && bssidMatch) {
      isValid = false;
      message = `BSSID khớp nhưng SSID không khớp. Nhận được: ${ssid || 'null'}, mong đợi: ${ALLOWED_WIFI.ssid}`;
    } else {
      isValid = false;
      message = `WiFi không hợp lệ. SSID nhận được: ${ssid || 'null'}, BSSID nhận được: ${bssid || 'null'}`;
    }

    console.log('=== WiFi Check ===');
    console.log('Received:', { ssid, bssid, linkLocalIPv6 });
    console.log('Expected:', ALLOWED_WIFI);
    console.log('SSID Match:', ssidMatch);
    console.log('BSSID Match:', bssidMatch);
    console.log('Result:', isValid ? 'VALID' : 'INVALID');
    console.log('==================\n');

    res.json({
      success: true,
      isValid: isValid,
      message: message,
      received: {
        ssid: ssid || null,
        bssid: bssid || null,
        linkLocalIPv6: linkLocalIPv6 || null
      },
      expected: ALLOWED_WIFI,
      matches: {
        ssid: ssidMatch,
        bssid: bssidMatch
      }
    });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Backend server đang chạy tại http://localhost:${PORT}`);
  console.log(`Endpoint: POST http://localhost:${PORT}/api/wifi-ip`);
  console.log(`Đang check WiFi với SSID: "${ALLOWED_WIFI.ssid}" và BSSID: "${ALLOWED_WIFI.bssid}"`);
});

