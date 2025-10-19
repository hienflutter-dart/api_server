1️⃣ Cài **VS Build Tools 2022** (chọn *Desktop development with C++*), mở *x64 Native Tools Command Prompt* → chạy `where cl` và thêm thư mục chứa `cl.exe` vào **System PATH**.  
2️⃣ Cài **Node.js v22.20.0**.  
3️⃣ Thêm thư viện TensorFlow vào PATH và kiểm tra:
```bash
set PATH=%PATH%;E:\api_server\node_modules\@tensorflow\tfjs-node\deps\lib
```  