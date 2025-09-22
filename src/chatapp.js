import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Plus, MessageSquare, User, Bot, X } from 'lucide-react';

const ChatApp = ({ signOut, user }) => {
  // ==================== KHAI BÁO STATE ====================
  const [messages, setMessages] = useState([]);            // Danh sách tin nhắn trong cuộc trò chuyện hiện tại
  const [inputMessage, setInputMessage] = useState('');    // Nội dung tin nhắn đang nhập
  const [uploadedFiles, setUploadedFiles] = useState([]);  // Danh sách file đã chọn để upload  
  const [conversations, setConversations] = useState([]);  // Danh sách tất cả cuộc trò chuyện của user
  const [isLoading, setIsLoading] = useState(false);       // Trạng thái loading khi gửi/nhận tin nhắn

  // ==================== KHAI BÁO REF ====================
  const fileInputRef = useRef(null);   // Tham chiếu đến input file ẩn để mở dialog chọn file
  const messagesEndRef = useRef(null); // Tham chiếu đến phần tử cuối danh sách tin nhắn để tự động cuộn xuống
  
  // ==================== BIẾN CẤU HÌNH ====================
  const userEmail = user?.signInDetails?.loginId || 'No email'; // Lấy email của user từ thông tin đăng nhập
  const API_BASE_URL = "http://127.0.0.1:8000";                // URL của backend API

  // ==================== EFFECT HOOKS ====================
  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Tải danh sách cuộc trò chuyện khi component được mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/get_user_conversations?email=${encodeURIComponent(userEmail)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.length > 0) {
          // Chuyển đổi dữ liệu từ server thành format phù hợp cho frontend
          const formattedConvs = data.map(conv => ({
            id: conv.SK,  // Giữ nguyên SK (CONV#...)
            title: conv.title || `Cuộc trò chuyện ${conv.SK.replace('CONV#', '').substring(0, 8)}`,
            active: false
          }));
          
          setConversations(formattedConvs);
          await selectConversation(formattedConvs[0].id); // Tự động chọn cuộc trò chuyện đầu tiên
        }
      } catch (error) {
        console.error("Error loading conversations:", error);
        // Nếu không có cuộc trò chuyện nào, tạo mới
        if (error.message.includes("404")) {
          await createNewConversation();
        }
      }
    };
    
    loadInitialData();
  }, [userEmail]);

  // ==================== XỬ LÝ CUỘC TRÒ CHUYỆN ====================
  
  /**
   * Tạo cuộc trò chuyện mới
   * @returns {string} ID của cuộc trò chuyện mới được tạo
   */
  const createNewConversation = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/create_conversation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `email=${encodeURIComponent(userEmail)}`,
    });
    
    if (!response.ok) throw new Error('Create conversation failed');
    
    const data = await response.json();
    
    const newConv = {
      id: `CONV#${data.conv_id}`, // Đảm bảo có prefix CONV#
      title: `Cuộc trò chuyện mới`,
      active: true
    };
    
    // Đặt tất cả cuộc trò chuyện khác thành inactive
    setConversations(prev => [
      ...prev.map(c => ({ ...c, active: false })),
      newConv
    ]);
    setMessages([]);
    setUploadedFiles([]);
    
    return data.conv_id;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
};


  /**
   * Tải tin nhắn của một cuộc trò chuyện từ server
   * @param {string} convId - ID của cuộc trò chuyện cần tải
   */
  const loadConversation = async (convId) => {
  try {
    // Đảm bảo convId có định dạng đúng (CONV#...)
    const fullConvId = convId.startsWith('CONV#') ? convId : `CONV#${convId}`;
    
    console.log(`Loading conversation ${fullConvId} for ${userEmail}`);
    
    const response = await fetch(`${API_BASE_URL}/get_conversation/${encodeURIComponent(userEmail)}/${encodeURIComponent(fullConvId)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log("Conversation not found");
        setMessages([]);
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Received conversation data:", data);
    
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid response data format");
    }
    
    // Đảm bảo có mảng messages
    const messages = Array.isArray(data.messages) ? data.messages : [];
    
    // Chuyển đổi tin nhắn từ format server sang format frontend
    const formattedMessages = messages.map(msg => ({
      id: msg.messageId || `${msg.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      type: msg.senderType === "bot" ? "assistant" : "user",
      content: msg.content || "[No content]",
      timestamp: new Date((msg.timestamp || Math.floor(Date.now()/1000)) * 1000),
      files: msg.type === "file" ? [{ 
        name: msg.content?.replace("File: ", "") || "unnamed_file", 
        key: msg.fileKey || "",
        id: msg.messageId
      }] : []
    }));
    
    setMessages(formattedMessages);
  } catch (error) {
    console.error("Error loading conversation:", error);
    setMessages([{
      id: Date.now(),
      type: 'assistant',
      content: 'Không thể tải cuộc trò chuyện. Vui lòng thử lại hoặc tạo cuộc trò chuyện mới.',
      timestamp: new Date()
    }]);
  }
};

  /**
   * Chọn và hiển thị một cuộc trò chuyện
   * @param {string} convId - ID của cuộc trò chuyện cần chọn
   */
  const selectConversation = async (convId) => {
    // Đặt chỉ một cuộc trò chuyện là active
    setConversations(prev => prev.map(c => ({
      ...c,
      active: c.id === convId
    })));
    
    // Tải tin nhắn của cuộc trò chuyện được chọn
    await loadConversation(convId);
  };

  /**
   * Xóa một cuộc trò chuyện
   * @param {string} convId - ID của cuộc trò chuyện cần xóa
   */
  const deleteConversation = async (convId) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa cuộc trò chuyện này?")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/delete_conversation/${encodeURIComponent(userEmail)}/${convId}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Xóa không thành công");
      
      // Cập nhật UI: xóa cuộc trò chuyện khỏi danh sách
      setConversations(prev => prev.filter(conv => conv.id !== convId));
      
      // Nếu đang xem cuộc trò chuyện bị xóa thì xóa tin nhắn hiện tại
      if (conversations.find(c => c.active)?.id === convId) {
        setMessages([]);
      }
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      alert("Xóa thất bại: " + error.message);
    }
  };

  // ==================== XỬ LÝ TIN NHẮN ====================

  /**
   * Gửi tin nhắn và file đã upload
   */
  const handleSendMessage = async () => {
  if (!inputMessage.trim() && uploadedFiles.length === 0) return;

  const activeConv = conversations.find(c => c.active);
  if (!activeConv) return;

  setIsLoading(true);

  try {
    // Xử lý upload file nếu có
    if (uploadedFiles.length > 0) {
      const uploadPromises = uploadedFiles.map(file => 
        fetch(`${API_BASE_URL}/upload`, {
          method: "POST",
          body: (() => {
            const formData = new FormData();
            formData.append("file", file.file);
            formData.append("email", userEmail);
            formData.append("conv_id", activeConv.id.replace('CONV#', '')); // Loại bỏ prefix CONV#
            return formData;
          })()
        }).then(res => {
          if (!res.ok) throw new Error('Upload failed');
          return res.json();
        })
      );

      await Promise.all(uploadPromises);
    }

    // Gửi tin nhắn text nếu có
    if (inputMessage.trim()) {
      const response = await fetch(`${API_BASE_URL}/send_message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: userEmail,
          conv_id: activeConv.id.replace('CONV#', ''), // Loại bỏ prefix CONV#
          content: inputMessage,
          is_bot: false
        })
      });

      if (!response.ok) throw new Error('Send message failed');
    }

    // Reset form trước khi tải lại
    setInputMessage("");
    setUploadedFiles([]);
    
    // Tải lại cuộc trò chuyện để hiển thị tin nhắn mới nhất
    await loadConversation(activeConv.id);
    
  } catch (error) {
    console.error("Error sending message:", error);
    alert("Gửi tin nhắn thất bại: " + error.message);
  } finally {
    setIsLoading(false);
  }
};

  // ==================== XỬ LÝ FILE ====================

  /**
   * Xử lý khi user chọn file để upload
   * @param {Event} event - Event từ input file
   */
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);

    // Tạo object file cho mỗi file được chọn
    const newFiles = files.map((file) => ({
      id: Date.now() + Math.random(), // Tạo ID duy nhất
      name: file.name,
      size: file.size,
      type: file.type,
      file, // Lưu file gốc để upload sau
    }));

    // Thêm vào danh sách file đã chọn
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  /**
   * Xóa file khỏi danh sách upload
   * @param {number} fileId - ID của file cần xóa
   */
  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // ==================== XỬ LÝ KEYBOARD ====================

  /**
   * Xử lý phím Enter để gửi tin nhắn
   * @param {KeyboardEvent} e - Keyboard event
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ==================== RENDER UI ====================
  return (
    <div className="flex h-screen bg-gray-50">
      {/* ========== SIDEBAR - DANH SÁCH CUỘC TRÒ CHUYỆN ========== */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        
        {/* Nút tạo cuộc trò chuyện mới */}
        <div className="p-4">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span>Cuộc trò chuyện mới</span>
          </button>
        </div>

        {/* Danh sách cuộc trò chuyện */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-2">
            {conversations.map(conv => (
              <div key={conv.id} className="flex items-center group">
                {/* Nút chọn cuộc trò chuyện */}
                <button
                  onClick={() => selectConversation(conv.id)}
                  className={`flex-1 text-left px-4 py-3 rounded-lg transition-colors ${
                    conv.active ? 'bg-gray-700 text-white' : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare size={16} />
                    <span className="truncate">{conv.title}</span>
                  </div>
                </button>
                
                {/* Nút xóa cuộc trò chuyện (hiện khi hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 invisible group-hover:visible"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Thông tin user và nút đăng xuất */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <User size={16} />
            </div>
            <span className="text-sm truncate" title={userEmail}>
              {userEmail || 'Loading...'}
            </span>
            <button
              onClick={signOut}
              className="ml-auto text-sm text-blue-400 hover:text-blue-200"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* ========== MAIN CHAT AREA - VÙNG CHAT CHÍNH ========== */}
      <div className="flex-1 flex flex-col">
        
        {/* Vùng hiển thị tin nhắn */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : ''}`}
              >
                {/* Avatar bot (hiển thị bên trái cho tin nhắn của bot) */}
                {message.type === 'assistant' && (
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                
                {/* Nội dung tin nhắn */}
                <div className={`max-w-3xl ${message.type === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white ml-12'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    {/* Nội dung text của tin nhắn */}
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {/* Hiển thị file đính kèm nếu có */}
                    {message.files && message.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.files.map(file => (
                          <div
                            key={file.id}
                            className="flex items-center gap-2 p-2 bg-gray-400 rounded border"
                          >
                            <Paperclip size={14} />
                            <span className="text-sm">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Thời gian gửi tin nhắn */}
                  <div className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                {/* Avatar user (hiển thị bên phải cho tin nhắn của user) */}
                {message.type === 'user' && (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Hiệu ứng loading khi đang gửi tin nhắn */}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Phần tử ẩn để tự động cuộn xuống */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ========== INPUT AREA - VÙNG NHẬP TIN NHẮN ========== */}
        <div className="border-t border-gray-200 p-6">
          <div className="max-w-4xl mx-auto">
            
            {/* Preview file đã chọn để upload */}
            {uploadedFiles.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border"
                  >
                    <Paperclip size={14} />
                    <span className="text-sm">{file.name}</span>
                    {/* Nút xóa file */}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Vùng nhập tin nhắn và các nút */}
            <div className="flex gap-3 items-end">
              
              {/* Textarea nhập tin nhắn */}
              <div className="flex-1 relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập tin nhắn của bạn..."
                  className="w-full p-4 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="1"
                  style={{
                    minHeight: '52px',
                    maxHeight: '200px',
                    height: 'auto'
                  }}
                />
                
                {/* Nút chọn file (trong textarea) */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <Paperclip size={20} />
                </button>
                
                {/* Input file ẩn */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="*/*"
                />
              </div>
              
              {/* Nút gửi tin nhắn */}
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() && uploadedFiles.length === 0}
                className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;