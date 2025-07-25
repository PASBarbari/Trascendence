#!/bin/bash

# Script to copy values.yaml files from source helm-charts to current workspace
# Usage: ./copy_values.sh

SOURCE_DIR="/home/sgarigli/Downloads/helm-charts"
DEST_DIR="/home/sgarigli/Desktop/TrascendenceNew/helm-charts"

echo "🔄 Copying values.yaml files from $SOURCE_DIR to $DEST_DIR"
echo "=================================================="

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Error: Source directory $SOURCE_DIR does not exist"
    exit 1
fi

# Check if destination directory exists
if [ ! -d "$DEST_DIR" ]; then
    echo "❌ Error: Destination directory $DEST_DIR does not exist"
    exit 1
fi

# Function to copy values.yaml files recursively
copy_values_files() {
    local src="$1"
    local dst="$2"
    
    # Find all values.yaml files in source directory
    find "$src" -name "values.yaml" -type f | while read -r values_file; do
        # Get the relative path from source directory
        rel_path="${values_file#$src/}"
        
        # Construct destination path
        dest_file="$dst/$rel_path"
        dest_dir="$(dirname "$dest_file")"
        
        # Create destination directory if it doesn't exist
        if [ ! -d "$dest_dir" ]; then
            echo "📁 Creating directory: $dest_dir"
            mkdir -p "$dest_dir"
        fi
        
        # Copy the file
        if [ -f "$values_file" ]; then
            echo "📋 Copying: $rel_path"
            cp "$values_file" "$dest_file"
            
            # Verify the copy was successful
            if [ $? -eq 0 ]; then
                echo "✅ Successfully copied: $rel_path"
            else
                echo "❌ Failed to copy: $rel_path"
            fi
        fi
    done
}

# Start copying
echo "🚀 Starting copy process..."
copy_values_files "$SOURCE_DIR" "$DEST_DIR"

echo ""
echo "📊 Summary of copied files:"
echo "=========================="

# List all values.yaml files in destination to confirm
find "$DEST_DIR" -name "values.yaml" -type f | while read -r file; do
    rel_path="${file#$DEST_DIR/}"
    echo "✓ $rel_path"
done

echo ""
echo "🎉 Copy process completed!"
echo ""
echo "💡 Next steps:"
echo "1. Review the copied values.yaml files for any sensitive information"
echo "2. Test your Helm installation with: helm install trascendence $DEST_DIR/my-umbrella"
echo "3. Check for any validation errors with: helm lint $DEST_DIR/my-umbrella"
