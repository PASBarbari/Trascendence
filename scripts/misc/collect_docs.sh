#!/bin/bash

# Script to collect all .md files and organize them in a docs/ folder
# Usage: ./collect_docs.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
DOCS_DIR="$PROJECT_ROOT/docs"

print_status "Starting documentation collection..."
print_status "Project root: $PROJECT_ROOT"
print_status "Target docs directory: $DOCS_DIR"

# Create docs directory if it doesn't exist
if [ ! -d "$DOCS_DIR" ]; then
    print_status "Creating docs directory..."
    mkdir -p "$DOCS_DIR"
else
    print_status "Docs directory already exists"
fi

# Create subdirectories for organization
mkdir -p "$DOCS_DIR/architecture"
mkdir -p "$DOCS_DIR/api"
mkdir -p "$DOCS_DIR/setup"
mkdir -p "$DOCS_DIR/logic"
mkdir -p "$DOCS_DIR/misc"

# Counter for files
file_count=0

# Function to move file with duplicate handling
move_md_file() {
    local source_file="$1"
    local target_dir="$2"
    local filename=$(basename "$source_file")
    local target_file="$target_dir/$filename"
    
    # If file already exists, create a unique name
    if [ -f "$target_file" ]; then
        local base_name="${filename%.*}"
        local extension="${filename##*.}"
        local counter=1
        
        while [ -f "$target_dir/${base_name}_${counter}.${extension}" ]; do
            ((counter++))
        done
        
        target_file="$target_dir/${base_name}_${counter}.${extension}"
        print_warning "File $filename already exists, moving as $(basename "$target_file")"
    fi
    
    mv "$source_file" "$target_file"
    print_status "Moved: $(realpath --relative-to="$PROJECT_ROOT" "$source_file" 2>/dev/null || echo "$source_file") → docs/$(basename "$target_dir")/$(basename "$target_file")"
    ((file_count++))
}

# Function to categorize and move files
categorize_and_move() {
    local md_file="$1"
    local filename=$(basename "$md_file")
    local lowercase_filename=$(echo "$filename" | tr '[:upper:]' '[:lower:]')
    
    # Skip README files (case insensitive)
    if [[ "$lowercase_filename" =~ ^readme ]]; then
        print_status "Skipping README file: $filename"
        return
    fi
    
    # Categorize based on filename patterns
    if [[ "$lowercase_filename" =~ logic ]]; then
        move_md_file "$md_file" "$DOCS_DIR/logic"
    elif [[ "$lowercase_filename" =~ (getting.started|setup|install|quick.start|guide) ]]; then
        move_md_file "$md_file" "$DOCS_DIR/setup"
    elif [[ "$lowercase_filename" =~ (architecture|design|tournament.*architecture|system) ]]; then
        move_md_file "$md_file" "$DOCS_DIR/architecture"
    elif [[ "$lowercase_filename" =~ (api|endpoint|serializer|views|migration|swagger) ]]; then
        move_md_file "$md_file" "$DOCS_DIR/api"
    else
        move_md_file "$md_file" "$DOCS_DIR/misc"
    fi
}

print_status "Searching for .md files recursively..."

# Simple find approach - this should work reliably
print_status "Using simple recursive find..."
find "$PROJECT_ROOT" -name "*.md" -type f | while read -r md_file; do
    # Skip files in docs directory
    if [[ "$md_file" == "$DOCS_DIR"* ]]; then
        continue
    fi
    
    # Skip excluded directories
    if [[ "$md_file" == *"/node_modules/"* ]] || [[ "$md_file" == *"/.git/"* ]] || [[ "$md_file" == *"/.vscode/"* ]] || [[ "$md_file" == *"/venv/"* ]]; then
        continue
    fi
    
    print_status "Found: $(basename "$md_file") in $(dirname "$md_file")"
    categorize_and_move "$md_file"
done

# Manual search in specific directories to make sure we get everything
print_status "Manual search in root directory..."
for md_file in "$PROJECT_ROOT"/*.md; do
    if [ -f "$md_file" ]; then
        print_status "Root file: $(basename "$md_file")"
        categorize_and_move "$md_file"
    fi
done

print_status "Manual search in Back-End directory..."
if [ -d "$PROJECT_ROOT/Back-End" ]; then
    find "$PROJECT_ROOT/Back-End" -name "*.md" -type f | while read -r md_file; do
        # Skip venv directories
        if [[ "$md_file" == *"/venv/"* ]] || [[ "$md_file" == *"/.git/"* ]]; then
            continue
        fi
        print_status "Back-End file: $(basename "$md_file")"
        categorize_and_move "$md_file"
    done
fi

print_status "Manual search in Front-End directory..."
if [ -d "$PROJECT_ROOT/Front-End" ]; then
    find "$PROJECT_ROOT/Front-End" -name "*.md" -type f | while read -r md_file; do
        # Skip node_modules directories
        if [[ "$md_file" == *"/node_modules/"* ]] || [[ "$md_file" == *"/.git/"* ]]; then
            continue
        fi
        print_status "Front-End file: $(basename "$md_file")"
        categorize_and_move "$md_file"
    done
fi

print_status "Manual search in other directories..."
for dir in helm-charts k8s-manifests Manifests; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        find "$PROJECT_ROOT/$dir" -name "*.md" -type f | while read -r md_file; do
            if [[ "$md_file" != *"/.git/"* ]]; then
                print_status "$dir file: $(basename "$md_file")"
                categorize_and_move "$md_file"
            fi
        done
    fi
done

# Create a master index file
INDEX_FILE="$DOCS_DIR/README.md"
print_status "Creating documentation index..."

# Simple file listing for index
setup_files=""
arch_files=""
api_files=""
logic_files=""
misc_files=""

for f in "$DOCS_DIR/setup"/*.md; do
    if [ -f "$f" ]; then
        setup_files="$setup_files- [$(basename "$f")](setup/$(basename "$f"))"$'\n'
    fi
done

for f in "$DOCS_DIR/architecture"/*.md; do
    if [ -f "$f" ]; then
        arch_files="$arch_files- [$(basename "$f")](architecture/$(basename "$f"))"$'\n'
    fi
done

for f in "$DOCS_DIR/api"/*.md; do
    if [ -f "$f" ]; then
        api_files="$api_files- [$(basename "$f")](api/$(basename "$f"))"$'\n'
    fi
done

for f in "$DOCS_DIR/logic"/*.md; do
    if [ -f "$f" ]; then
        logic_files="$logic_files- [$(basename "$f")](logic/$(basename "$f"))"$'\n'
    fi
done

for f in "$DOCS_DIR/misc"/*.md; do
    if [ -f "$f" ]; then
        misc_files="$misc_files- [$(basename "$f")](misc/$(basename "$f"))"$'\n'
    fi
done

cat > "$INDEX_FILE" << EOF
# Trascendence Documentation

This directory contains all documentation files moved from the project (excluding README files).

## 📁 Directory Structure

- **setup/**: Setup guides, installation instructions, and getting started documentation
- **architecture/**: System architecture, design documents, and technical specifications  
- **api/**: API documentation, endpoints, and serializers
- **logic/**: Business logic, algorithms, and implementation details
- **misc/**: Other documentation files

## 📄 Documentation Files

### Setup & Installation
$setup_files

### Architecture & Design  
$arch_files

### API Documentation
$api_files

### Logic & Implementation
$logic_files

### Miscellaneous
$misc_files

---

*Documentation moved on: $(date)*  
*Total files moved: $file_count*

## 🔍 Source Locations

Files were moved from the entire project directory, excluding:
- README files (case insensitive)
- Files already in docs/ directory  
- node_modules/ directories
- venv/ directories
- .git/ directories
- .vscode/ directories

## 📂 Categorization Rules

- **logic/**: Files containing "logic" in filename
- **setup/**: Files with setup, install, guide, quick.start keywords
- **architecture/**: Files with architecture, design, system keywords
- **api/**: Files with api, endpoint, serializer, views, migration, swagger keywords
- **misc/**: All other documentation files

EOF

print_success "Documentation collection complete!"
print_success "Files moved: $file_count"
print_success "Documentation index created: docs/README.md"

# Summary
echo
echo "📊 Collection Summary:"
setup_count=$(ls "$DOCS_DIR/setup"/*.md 2>/dev/null | wc -l)
arch_count=$(ls "$DOCS_DIR/architecture"/*.md 2>/dev/null | wc -l)
api_count=$(ls "$DOCS_DIR/api"/*.md 2>/dev/null | wc -l)
logic_count=$(ls "$DOCS_DIR/logic"/*.md 2>/dev/null | wc -l)
misc_count=$(ls "$DOCS_DIR/misc"/*.md 2>/dev/null | wc -l)

echo "   Setup docs:        $setup_count"
echo "   Architecture docs: $arch_count"  
echo "   API docs:          $api_count"
echo "   Logic docs:        $logic_count"
echo "   Misc docs:         $misc_count"
echo "   Total:             $file_count"
echo

print_success "All documentation is now organized in the docs/ directory!"
print_status "You can view the documentation index at: docs/README.md"

# Debug: Show what files remain in project (should be very few now)
echo
echo "🔍 Remaining .md files in project (should be mostly READMEs):"
remaining_files=$(find "$PROJECT_ROOT" -name "*.md" -type f | grep -v "^$DOCS_DIR" | wc -l)
echo "   Remaining files: $remaining_files"
if [ $remaining_files -lt 10 ]; then
    find "$PROJECT_ROOT" -name "*.md" -type f | grep -v "^$DOCS_DIR"
else
    find "$PROJECT_ROOT" -name "*.md" -type f | grep -v "^$DOCS_DIR" | head -5
    echo "   ... and $(($remaining_files - 5)) more"
fi