#!/bin/bash

# Script to collect all .sh files and organize them in a scripts/ folder
# Usage: ./collect_scripts.sh

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
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

print_status "Starting script collection..."
print_status "Project root: $PROJECT_ROOT"
print_status "Target scripts directory: $SCRIPTS_DIR"

# Create scripts directory if it doesn't exist
if [ ! -d "$SCRIPTS_DIR" ]; then
    print_status "Creating scripts directory..."
    mkdir -p "$SCRIPTS_DIR"
else
    print_status "Scripts directory already exists"
fi

# Create subdirectories for organization
mkdir -p "$SCRIPTS_DIR/deployment"
mkdir -p "$SCRIPTS_DIR/build"
mkdir -p "$SCRIPTS_DIR/setup"
mkdir -p "$SCRIPTS_DIR/monitoring"
mkdir -p "$SCRIPTS_DIR/utility"
mkdir -p "$SCRIPTS_DIR/misc"

# Counter for files
file_count=0

# Function to move file with duplicate handling
move_sh_file() {
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
    print_status "Moved: $(realpath --relative-to="$PROJECT_ROOT" "$source_file" 2>/dev/null || echo "$source_file") → scripts/$(basename "$target_dir")/$(basename "$target_file")"
    ((file_count++))
}

# Function to categorize and move files
categorize_and_move() {
    local sh_file="$1"
    local filename=$(basename "$sh_file")
    local lowercase_filename=$(echo "$filename" | tr '[:upper:]' '[:lower:]')
    
    # Skip this collection script itself
    if [[ "$filename" == "collect_scripts.sh" ]]; then
        print_status "Skipping this collection script: $filename"
        return
    fi
    
    # Categorize based on filename patterns
    if [[ "$lowercase_filename" =~ (deploy|apply|install|start|stop|restart|helm|kubectl|k8s|kube|skaffold) ]]; then
        move_sh_file "$sh_file" "$SCRIPTS_DIR/deployment"
    elif [[ "$lowercase_filename" =~ (build|compile|push|docker|image|container) ]]; then
        move_sh_file "$sh_file" "$SCRIPTS_DIR/build"
    elif [[ "$lowercase_filename" =~ (setup|config|configure|init|bootstrap|easy_install) ]]; then
        move_sh_file "$sh_file" "$SCRIPTS_DIR/setup"
    elif [[ "$lowercase_filename" =~ (monitor|health|check|log|dashboard|elk|kibana|elastic) ]]; then
        move_sh_file "$sh_file" "$SCRIPTS_DIR/monitoring"
    elif [[ "$lowercase_filename" =~ (update|clean|copy|convert|smart|requirements|uniform) ]]; then
        move_sh_file "$sh_file" "$SCRIPTS_DIR/utility"
    else
        move_sh_file "$sh_file" "$SCRIPTS_DIR/misc"
    fi
}

print_status "Searching for .sh files recursively..."

# Simple find approach - this should work reliably
print_status "Using simple recursive find..."
find "$PROJECT_ROOT" -name "*.sh" -type f | while read -r sh_file; do
    # Skip files in scripts directory
    if [[ "$sh_file" == "$SCRIPTS_DIR"* ]]; then
        continue
    fi
    
    # Skip excluded directories
    if [[ "$sh_file" == *"/node_modules/"* ]] || [[ "$sh_file" == *"/.git/"* ]] || [[ "$sh_file" == *"/.vscode/"* ]] || [[ "$sh_file" == *"/venv/"* ]]; then
        continue
    fi
    
    print_status "Found: $(basename "$sh_file") in $(dirname "$sh_file")"
    categorize_and_move "$sh_file"
done

# Manual search in specific directories to make sure we get everything
print_status "Manual search in root directory..."
for sh_file in "$PROJECT_ROOT"/*.sh; do
    if [ -f "$sh_file" ]; then
        print_status "Root file: $(basename "$sh_file")"
        categorize_and_move "$sh_file"
    fi
done

print_status "Manual search in Back-End directory..."
if [ -d "$PROJECT_ROOT/Back-End" ]; then
    find "$PROJECT_ROOT/Back-End" -name "*.sh" -type f | while read -r sh_file; do
        # Skip venv directories
        if [[ "$sh_file" == *"/venv/"* ]] || [[ "$sh_file" == *"/.git/"* ]]; then
            continue
        fi
        print_status "Back-End file: $(basename "$sh_file")"
        categorize_and_move "$sh_file"
    done
fi

print_status "Manual search in Front-End directory..."
if [ -d "$PROJECT_ROOT/Front-End" ]; then
    find "$PROJECT_ROOT/Front-End" -name "*.sh" -type f | while read -r sh_file; do
        # Skip node_modules directories
        if [[ "$sh_file" == *"/node_modules/"* ]] || [[ "$sh_file" == *"/.git/"* ]]; then
            continue
        fi
        print_status "Front-End file: $(basename "$sh_file")"
        categorize_and_move "$sh_file"
    done
fi

print_status "Manual search in other directories..."
for dir in helm-charts k8s-manifests Manifests; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        find "$PROJECT_ROOT/$dir" -name "*.sh" -type f | while read -r sh_file; do
            if [[ "$sh_file" != *"/.git/"* ]]; then
                print_status "$dir file: $(basename "$sh_file")"
                categorize_and_move "$sh_file"
            fi
        done
    fi
done

# Create a master index file
INDEX_FILE="$SCRIPTS_DIR/README.md"
print_status "Creating scripts index..."

# Simple file listing for index
deployment_files=""
build_files=""
setup_files=""
monitoring_files=""
utility_files=""
misc_files=""

for f in "$SCRIPTS_DIR/deployment"/*.sh; do
    if [ -f "$f" ]; then
        deployment_files="$deployment_files- [$(basename "$f")](deployment/$(basename "$f"))"$'\n'
    fi
done

for f in "$SCRIPTS_DIR/build"/*.sh; do
    if [ -f "$f" ]; then
        build_files="$build_files- [$(basename "$f")](build/$(basename "$f"))"$'\n'
    fi
done

for f in "$SCRIPTS_DIR/setup"/*.sh; do
    if [ -f "$f" ]; then
        setup_files="$setup_files- [$(basename "$f")](setup/$(basename "$f"))"$'\n'
    fi
done

for f in "$SCRIPTS_DIR/monitoring"/*.sh; do
    if [ -f "$f" ]; then
        monitoring_files="$monitoring_files- [$(basename "$f")](monitoring/$(basename "$f"))"$'\n'
    fi
done

for f in "$SCRIPTS_DIR/utility"/*.sh; do
    if [ -f "$f" ]; then
        utility_files="$utility_files- [$(basename "$f")](utility/$(basename "$f"))"$'\n'
    fi
done

for f in "$SCRIPTS_DIR/misc"/*.sh; do
    if [ -f "$f" ]; then
        misc_files="$misc_files- [$(basename "$f")](misc/$(basename "$f"))"$'\n'
    fi
done

cat > "$INDEX_FILE" << EOF
# Trascendence Scripts

This directory contains all script files moved from the project.

## 📁 Directory Structure

- **deployment/**: Deployment, orchestration, and infrastructure scripts
- **build/**: Build, compilation, and container scripts
- **setup/**: Setup, configuration, and initialization scripts  
- **monitoring/**: Monitoring, health checks, and logging scripts
- **utility/**: Utility scripts for maintenance and automation
- **misc/**: Other script files

## 📄 Script Files

### Deployment & Infrastructure
$deployment_files

### Build & Compilation
$build_files

### Setup & Configuration
$setup_files

### Monitoring & Health
$monitoring_files

### Utilities & Automation
$utility_files

### Miscellaneous
$misc_files

---

*Scripts moved on: $(date)*  
*Total files moved: $file_count*

## 🔍 Source Locations

Files were moved from the entire project directory, excluding:
- This collection script itself
- Files already in scripts/ directory  
- node_modules/ directories
- venv/ directories
- .git/ directories
- .vscode/ directories

## 📂 Categorization Rules

- **deployment/**: deploy, apply, install, start, stop, restart, helm, kubectl, k8s, kube, skaffold
- **build/**: build, compile, push, docker, image, container
- **setup/**: setup, config, configure, init, bootstrap, easy_install
- **monitoring/**: monitor, health, check, log, dashboard, elk, kibana, elastic
- **utility/**: update, clean, copy, convert, smart, requirements, uniform
- **misc/**: All other script files

## 🛠️ Usage Notes

### Making Scripts Executable
After moving, you may need to make scripts executable:
\`\`\`bash
# Make all scripts executable
find scripts/ -name "*.sh" -type f -exec chmod +x {} \;

# Or make specific categories executable
chmod +x scripts/deployment/*.sh
chmod +x scripts/setup/*.sh
\`\`\`

### Running Scripts
Remember to update any relative paths in scripts that may have changed after moving.

EOF

print_success "Script collection complete!"
print_success "Files moved: $file_count"
print_success "Script index created: scripts/README.md"

# Summary
echo
echo "📊 Collection Summary:"
deployment_count=$(ls "$SCRIPTS_DIR/deployment"/*.sh 2>/dev/null | wc -l)
build_count=$(ls "$SCRIPTS_DIR/build"/*.sh 2>/dev/null | wc -l)
setup_count=$(ls "$SCRIPTS_DIR/setup"/*.sh 2>/dev/null | wc -l)
monitoring_count=$(ls "$SCRIPTS_DIR/monitoring"/*.sh 2>/dev/null | wc -l)
utility_count=$(ls "$SCRIPTS_DIR/utility"/*.sh 2>/dev/null | wc -l)
misc_count=$(ls "$SCRIPTS_DIR/misc"/*.sh 2>/dev/null | wc -l)

echo "   Deployment scripts: $deployment_count"
echo "   Build scripts:      $build_count"  
echo "   Setup scripts:      $setup_count"
echo "   Monitoring scripts: $monitoring_count"
echo "   Utility scripts:    $utility_count"
echo "   Misc scripts:       $misc_count"
echo "   Total:              $file_count"
echo

print_success "All scripts are now organized in the scripts/ directory!"
print_status "You can view the script index at: scripts/README.md"

# Make moved scripts executable
print_status "Making moved scripts executable..."
find "$SCRIPTS_DIR" -name "*.sh" -type f -exec chmod +x {} \;
print_success "All moved scripts are now executable!"

# Debug: Show what files remain in project
echo
echo "🔍 Remaining .sh files in project:"
remaining_files=$(find "$PROJECT_ROOT" -name "*.sh" -type f | grep -v "^$SCRIPTS_DIR" | wc -l)
echo "   Remaining files: $remaining_files"
if [ $remaining_files -lt 10 ]; then
    find "$PROJECT_ROOT" -name "*.sh" -type f | grep -v "^$SCRIPTS_DIR"
else
    find "$PROJECT_ROOT" -name "*.sh" -type f | grep -v "^$SCRIPTS_DIR" | head -5
    echo "   ... and $(($remaining_files - 5)) more"
fi