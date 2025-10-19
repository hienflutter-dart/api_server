1️⃣ Cài **VS Build Tools 2022** (chọn *Desktop development with C++*), mở *x64 Native Tools Command Prompt* → chạy `where cl` và thêm thư mục chứa `cl.exe` vào **System PATH**.  

2️⃣ Cài **Node.js v22.20.0**.  

3️⃣ Thêm thư viện TensorFlow vào **System PATH** và kiểm tra:  
```cmd
thêm vào PATH sau: "D:\api_server\node_modules\@tensorflow\tfjs-node\deps\lib"
node -e "require('@tensorflow/tfjs-node'); console.log('✅ TensorFlow OK');"
```
