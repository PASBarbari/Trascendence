#!/bin/bash
# Smart script to update package versions in service requirements.txt files
# This script ONLY updates versions of existing packages, never removes packages

MAIN_REQ="Back-End/requirements.txt"

echo "🔄 Smart update: Only updating versions of existing packages..."

# Function to get version from main requirements.txt
get_version_from_main() {
    local package=$1
    # Remove any extras like [tls] for matching
    local base_package=$(echo "$package" | sed 's/\[.*\]//')
    
    # Try exact match first
    local result=$(grep "^${package}==" "$MAIN_REQ" | head -1)
    if [[ -z "$result" ]]; then
        # Try with [tls] suffix for twisted
        result=$(grep "^${base_package}\[tls\]==" "$MAIN_REQ" | head -1)
    fi
    if [[ -z "$result" ]]; then
        # Try base package name
        result=$(grep "^${base_package}==" "$MAIN_REQ" | head -1)
    fi
    echo "$result"
}

# Function to extract package name from line like "django==5.1.3"
extract_package_name() {
    echo "$1" | cut -d'=' -f1
}

# Function to update a single requirements file
update_requirements_file() {
    local req_file=$1
    echo "📦 Updating $req_file"
    
    if [[ ! -f "$req_file" ]]; then
        echo "❌ File $req_file not found"
        return
    fi
    
    # Create backup
    cp "$req_file" "$req_file.backup"
    
    # Create new file
    > "$req_file.new"
    
    # Process each line
    while IFS= read -r line; do
        # Skip empty lines and comments
        if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
            echo "$line" >> "$req_file.new"
            continue
        fi
        
        # Check if it's a package line (contains ==)
        if [[ "$line" =~ ^[^#]*== ]]; then
            package_name=$(extract_package_name "$line")
            new_version_line=$(get_version_from_main "$package_name")
            
            if [[ -n "$new_version_line" ]]; then
                echo "  ✅ $package_name: updated to $(echo "$new_version_line" | cut -d'=' -f3)"
                echo "$new_version_line" >> "$req_file.new"
            else
                echo "  ➡️  $package_name: keeping existing version (not found in main)"
                echo "$line" >> "$req_file.new"
            fi
        else
            # Non-package line, keep as is
            echo "$line" >> "$req_file.new"
        fi
    done < "$req_file"
    
    # Replace original file
    mv "$req_file.new" "$req_file"
    echo "✅ Updated $req_file"
}

# Find and update all requirements.txt files (excluding main and venv)
find Back-End -name "requirements.txt" -not -path "*/venv/*" -not -path "Back-End/requirements.txt" | while read -r req_file; do
    update_requirements_file "$req_file"
done

echo ""
echo "🎉 Smart update completed!"
echo ""
echo "💡 What was done:"
echo "  - Only updated versions of existing packages"
echo "  - Never removed any packages"
echo "  - Kept all comments and formatting"
echo "  - Created .backup files for safety"
echo ""
echo "📋 Check the updated files and remove .backup files when satisfied"
