"""
Chat Application Backend API
Ứng dụng backend cho hệ thống chat với các tính năng:
- Upload file lên S3
- Gửi và nhận tin nhắn
- Quản lý cuộc trò chuyện
- Tích hợp với DynamoDB để lưu trữ dữ liệu
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import boto3
from botocore.exceptions import NoCredentialsError
from datetime import datetime
import uuid


# ==================== KHỞI TẠO APP ====================
app = FastAPI()

# Cấu hình CORS để cho phép frontend kết nối
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Cho phép tất cả domain (chỉ dùng trong development)
    allow_credentials=True,   # Cho phép gửi cookies
    allow_methods=["*"],      # Cho phép tất cả HTTP methods
    allow_headers=["*"],      # Cho phép tất cả headers
)

# ==================== CẤU HÌNH AWS ====================
AWS_REGION = "us-west-2"
S3_BUCKET = "chat-app-documents-dev-cloudkinetics"

# Khởi tạo AWS clients với các profile khác nhau
session = boto3.Session(profile_name="s3-dev")
s3 = session.client("s3", region_name=AWS_REGION)

dynamodb = boto3.Session(profile_name="dynamodb-dev").resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table("ChatAppConversations-dev-cloudkinetics")

bedrock = boto3.Session(profile_name="bedrock-dev").client(
    "bedrock-runtime", region_name=AWS_REGION
)


# ==================== API ENDPOINTS ====================

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),    # File được upload từ frontend
    email: str = Form(...),          # Email của user
    conv_id: str = Form(...)         # ID cuộc trò chuyện
):
    """
    Upload file lên S3 và lưu thông tin vào DynamoDB
    
    Args:
        file: File được upload
        email: Email của user
        conv_id: ID của cuộc trò chuyện
    
    Returns:
        JSON response với thông tin file đã upload
    """
    try:
        # 1. Upload file lên S3 với đường dẫn theo cấu trúc: {email}/CONV#{conv_id}/{filename}
        file_key = f"{email}/CONV#{conv_id}/{file.filename}"        
        s3.upload_fileobj(file.file, S3_BUCKET, file_key)

        # 2. Tạo ID duy nhất cho message
        message_id = f"MSG#{int(datetime.now().timestamp())}#{str(uuid.uuid4())[:8]}"
        
        # 3. Cập nhật thông tin file vào DynamoDB
        response = table.update_item(
            Key={
                "PK": f"USER#{email}",      # Partition Key: USER#{email}
                "SK": f"CONV#{conv_id}"     # Sort Key: CONV#{conv_id}
            },
            UpdateExpression="""
            SET messages = list_append(if_not_exists(messages, :empty_list), :new_message),
                updatedAt = :now
            ADD totalMessages :inc
            """,
            ExpressionAttributeValues={
                ":new_message": [{
                    "messageId": message_id,
                    "content": f"File: {file.filename}",
                    "fileKey": file_key,
                    "senderType": "user",
                    "timestamp": int(datetime.now().timestamp()),
                    "type": "file"
                }],
                ":empty_list": [],
                ":now": datetime.now().isoformat(),
                ":inc": 1
            },
            ReturnValues="UPDATED_NEW"
        )
        
        return {
            "status": "success",
            "file_key": file_key,
            "message_id": message_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/send_message")
async def send_message(
    email: str = Form(...),      # Email của user gửi tin nhắn
    conv_id: str = Form(...),    # ID cuộc trò chuyện
    content: str = Form(...),    # Nội dung tin nhắn
    is_bot: bool = Form(False)   # Có phải tin nhắn từ bot không
):
    """
    Gửi tin nhắn text và lưu vào DynamoDB
    
    Args:
        email: Email của user
        conv_id: ID cuộc trò chuyện
        content: Nội dung tin nhắn
        is_bot: True nếu là tin nhắn từ bot, False nếu từ user
    
    Returns:
        JSON response với thông tin tin nhắn đã gửi
    """
    try:
        # Tạo ID duy nhất cho message
        message_id = f"MSG#{int(datetime.now().timestamp())}#{str(uuid.uuid4())[:8]}"
        
        # Cập nhật tin nhắn vào DynamoDB
        response = table.update_item(
            Key={
                "PK": f"USER#{email}",
                "SK": f"CONV#{conv_id}"
            },
            UpdateExpression="""
            SET messages = list_append(if_not_exists(messages, :empty_list), :new_message),
                updatedAt = :now
            ADD totalMessages :inc
            """,
            ExpressionAttributeValues={
                ":new_message": [{
                    "messageId": message_id,
                    "content": content,
                    "senderType": "bot" if is_bot else "user",
                    "timestamp": int(datetime.now().timestamp()),
                    "type": "text"
                }],
                ":empty_list": [],
                ":now": datetime.now().isoformat(),
                ":inc": 1
            },
            ReturnValues="UPDATED_NEW"
        )
        
        return {
            "status": "success",
            "message_id": message_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/get_user_conversations")
async def get_user_conversations(email: str):
    """
    Lấy danh sách tất cả cuộc trò chuyện của một user
    
    Args:
        email: Email của user cần lấy danh sách cuộc trò chuyện
    
    Returns:
        List các cuộc trò chuyện của user
    """
    try:
        # Query tất cả các cuộc trò chuyện của user (SK bắt đầu bằng "CONV#")
        response = table.query(
            KeyConditionExpression="PK = :pk AND begins_with(SK, :prefix)",
            ExpressionAttributeValues={
                ":pk": f"USER#{email}",
                ":prefix": "CONV#"
            }
        )
        return response.get("Items", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/get_conversation/{email}/{conv_id}")
async def get_conversation(email: str, conv_id: str):
    """
    Lấy chi tiết một cuộc trò chuyện bao gồm tất cả tin nhắn
    
    Args:
        email: Email của user
        conv_id: ID của cuộc trò chuyện cần lấy
    
    Returns:
        Thông tin chi tiết cuộc trò chuyện và danh sách tin nhắn
    """
    try:
        # Đảm bảo conv_id có định dạng đúng (CONV#...)
        if not conv_id.startswith("CONV#"):
            conv_id = f"CONV#{conv_id}"
        
        # Log thông tin debug để theo dõi
        print(f"Attempting to fetch conversation for {email}, ID: {conv_id}")
        
        # Lấy thông tin cuộc trò chuyện từ DynamoDB
        response = table.get_item(
            Key={
                "PK": f"USER#{email}",
                "SK": conv_id
            }
        )
        
        # Kiểm tra nếu không tìm thấy cuộc trò chuyện
        if "Item" not in response:
            print(f"No conversation found for {email} with ID {conv_id}")
            return JSONResponse(
                status_code=404,
                content={"message": "Conversation not found"}
            )
        
        item = response["Item"]
        
        # Đảm bảo cấu trúc dữ liệu đúng - khởi tạo mảng messages nếu chưa có
        if "messages" not in item:
            item["messages"] = []
        
        # Kiểm tra kiểu dữ liệu của messages phải là list
        if not isinstance(item["messages"], list):
            item["messages"] = []
        
        print(f"Successfully retrieved conversation: {item}")
        return item
        
    except Exception as e:
        print(f"Error in get_conversation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.post("/create_conversation")
async def create_conversation(email: str = Form(...)):
    """
    Tạo một cuộc trò chuyện mới cho user
    
    Args:
        email: Email của user tạo cuộc trò chuyện
    
    Returns:
        JSON response với ID của cuộc trò chuyện mới
    """
    try:
        # Tạo ID duy nhất cho cuộc trò chuyện mới
        conv_id = str(uuid.uuid4())
        timestamp = int(datetime.now().timestamp())
        
        # Tạo item mới cho cuộc trò chuyện
        item = {
            "PK": f"USER#{email}",
            "SK": f"CONV#{conv_id}",
            "createdAt": timestamp,
            "updatedAt": timestamp,
            "title": f"Conversation {conv_id[:8]}",  # Tiêu đề mặc định
            "totalMessages": 0,
            "messages": []  # Mảng tin nhắn ban đầu rỗng
        }
        
        # Lưu cuộc trò chuyện mới vào DynamoDB
        table.put_item(Item=item)
        
        # Cập nhật tổng số cuộc trò chuyện của user trong metadata
        table.update_item(
            Key={
                "PK": f"USER#{email}",
                "SK": "METADATA"
            },
            UpdateExpression="SET totalConversations = if_not_exists(totalConversations, :zero) + :inc",
            ExpressionAttributeValues={
                ":zero": 0,
                ":inc": 1
            }
        )
        
        return {
            "status": "success",
            "conv_id": conv_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete_conversation/{email}/{conv_id}")
async def delete_conversation(email: str, conv_id: str):
    """
    Xóa một cuộc trò chuyện của user
    
    Args:
        email: Email của user
        conv_id: ID của cuộc trò chuyện cần xóa
    
    Returns:
        JSON response xác nhận xóa thành công
    """
    try:
        # Xóa cuộc trò chuyện từ DynamoDB
        response = table.delete_item(
            Key={
                "PK": f"USER#{email}",
                "SK": f"CONV#{conv_id}"
            }
        )
        
        # Giảm số lượng cuộc trò chuyện trong user metadata
        table.update_item(
            Key={
                "PK": f"USER#{email}",
                "SK": "METADATA"
            },
            UpdateExpression="SET totalConversations = totalConversations - :dec",
            ExpressionAttributeValues={":dec": 1}
        )
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CHẠY SERVER ====================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)