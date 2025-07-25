# Local Storage Implementation for Avatar Management

This document describes the implementation of local file storage for avatar management, replacing the previous MinIO implementation.

## Changes Made

### 1. Django Settings (`task_user/settings.py`)
- Removed MinIO storage configurations
- Removed `minio_storage` from `INSTALLED_APPS`
- Added local media storage configuration:
  ```python
  MEDIA_URL = '/media/'
  MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
  ```

### 2. URL Configuration (`task_user/urls.py`)
- Added media file serving for development:
  ```python
  if settings.DEBUG:
      urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
  ```

### 3. Models (`user_app/models.py`)
- **Avatars Model Changes:**
  - Changed `image` field from `URLField` to `ImageField`
  - Added `avatar_upload_path` function for organized file storage
  - Added automatic file deletion when avatar is deleted
  - Added `get_image_url()` method to get full image URL
  - Updated `save()` method to handle local file URLs

### 4. Serializers (`user_app/serializer.py`)
- Updated `AvatarsSerializer` to include `image_url` field
- Added `SerializerMethodField` for proper image URL handling

### 5. Views (`user_app/views.py`)
- **AvatarManager Class:**
  - Removed MinIO client dependency
  - Updated POST method to use Django's ImageField for file handling
  - Added GET method to retrieve avatars (single or all for user)
  - Added DELETE method to remove avatars with file cleanup
  - Maintained all validation (file type, size limits)

### 6. Requirements (`requirements.txt`)
- Added `pillow==11.1.0` for image processing support
- Removed MinIO-related dependencies (done manually)

## API Response Examples

### Get User Profile Response (NEW)
```json
{
  "user_id": 6,
  "staff": false,
  "email": "user@example.com",
  "username": "marco",
  "first_name": "Marco",
  "last_name": "Ruggiero",
  "birth_date": "1990-01-01",
  "bio": "User bio",
  "exp": 75,
  "level": 5,
  "current_avatar_url": "/media/avatars/avatar_6_filename.png",
  "current_avatar": {
    "id": 4,
    "name": "Profile Picture",
    "image": "avatars/avatar_6_filename.png",
    "image_url": "/media/avatars/avatar_6_filename.png",
    "user": 6,
    "is_current": true,
    "last_modified": "2024-06-16T14:12:47.858585Z"
  },
  "last_modified": "2024-06-16T14:12:47.858585Z",
  "has_two_factor_auth": false,
  "friends": [7],
  "blocked_users": []
}
```

### Frontend Usage
The frontend can now access avatar information in two ways:

1. **Legacy support**: `data.current_avatar_url` (string)
2. **New structure**: `data.current_avatar.image_url` (from avatar object)

The frontend will automatically handle both structures for backward compatibility.
```http
POST /user/avatar
Content-Type: multipart/form-data

{
  "image": <file>,
  "name": "optional_avatar_name"
}
```

**Response:**
```json
{
  "message": "Avatar uploaded successfully",
  "avatar": "/media/avatars/avatar_123_Avatar_for_username.jpg",
  "avatar_id": 1
}
```

### Get Avatar(s)
```http
GET /user/avatar?avatar_id=1  # Get specific avatar
GET /user/avatar              # Get all user avatars
```

### Delete Avatar
```http
DELETE /user/avatar
Content-Type: application/json

{
  "avatar_id": 1
}
```

## File Storage Structure

```
media/
└── avatars/
    ├── avatar_123_Avatar_for_user1.jpg
    ├── avatar_124_Avatar_for_user1.png
    └── avatar_125_Avatar_for_user2.gif
```

## Features

### File Management
- **Automatic file organization**: Files stored in `media/avatars/` directory
- **Unique filenames**: Format: `avatar_{user_id}_{custom_name}.{ext}`
- **File cleanup**: Physical files deleted when avatar records are removed
- **Current avatar tracking**: Automatically updates user's `current_avatar_url`

### Validation
- **File type validation**: Only JPEG, PNG, and GIF supported
- **Size limit**: Maximum 10MB per file
- **User authentication**: Only authenticated users can manage avatars
- **Ownership validation**: Users can only manage their own avatars

### Error Handling
- Graceful error handling with descriptive messages
- Proper HTTP status codes
- File system error handling

## Migration Notes

1. **Database Migration**: New migration created for ImageField changes
2. **Existing Data**: Previous URL-based avatars remain in `current_avatar_url` field
3. **Backward Compatibility**: System handles both old URL references and new local files

## Development Setup

1. Ensure Pillow is installed: `pip install pillow==11.1.0`
2. Run migrations: `python manage.py migrate`
3. Media directory is created automatically
4. In development, media files served by Django
5. In production, configure web server to serve media files

## Security Considerations

- File type validation prevents malicious uploads
- Size limits prevent storage abuse
- User authentication required for all operations
- Files stored outside web root in production
- Proper file permissions should be set in production

## Testing

To test the implementation:

1. **Upload Test**: 
   ```bash
   curl -X POST http://localhost:8002/user/avatar \
        -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        -F "image=@test_image.jpg" \
        -F "name=TestAvatar"
   ```

2. **Retrieve Test**:
   ```bash
   curl -X GET http://localhost:8002/user/avatar \
        -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Delete Test**:
   ```bash
   curl -X DELETE http://localhost:8002/user/avatar \
        -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"avatar_id": 1}'
   ```
