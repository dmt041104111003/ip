// Config file để set SERVER_URL
// Thay đổi URL này sau khi deploy backend lên Render
module.exports = {
  // Local development
  // SERVER_URL: 'http://localhost:3000',
  
  // Production - Thay YOUR_APP_NAME bằng tên app trên Render
  SERVER_URL: process.env.SERVER_URL || 'https://your-app-name.onrender.com',
  
  // Hoặc uncomment và set URL trực tiếp:
  // SERVER_URL: 'https://wifi-check-backend.onrender.com',
};

