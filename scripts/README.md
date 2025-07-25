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
- [applyTutto.sh](deployment/applyTutto.sh)
- [apply_uniform_logging.sh](deployment/apply_uniform_logging.sh)
- [easy_install.sh](deployment/easy_install.sh)
- [install.sh](deployment/install.sh)
- [start_backend.sh](deployment/start_backend.sh)
- [start-k3s.sh](deployment/start-k3s.sh)


### Build & Compilation
- [build_push.sh](build/build_push.sh)


### Setup & Configuration
- [configure-k3s-https.sh](setup/configure-k3s-https.sh)
- [setup_elk_logging.sh](setup/setup_elk_logging.sh)


### Monitoring & Health
- [cleanup_old_logging.sh](monitoring/cleanup_old_logging.sh)
- [dashboard.sh](monitoring/dashboard.sh)
- [health_check.sh](monitoring/health_check.sh)
- [pod_logs.sh](monitoring/pod_logs.sh)


### Utilities & Automation
- [convert_to_ingressroute.sh](utility/convert_to_ingressroute.sh)
- [copy_values.sh](utility/copy_values.sh)
- [smart_update_requirements.sh](utility/smart_update_requirements.sh)
- [update_service_requirements.sh](utility/update_service_requirements.sh)


### Miscellaneous
- [add_swagger_to_all.sh](misc/add_swagger_to_all.sh)
- [collect_docs.sh](misc/collect_docs.sh)
- [control_panel.sh](misc/control_panel.sh)
- [entrypoint_1.sh](misc/entrypoint_1.sh)
- [entrypoint_2.sh](misc/entrypoint_2.sh)
- [entrypoint_3.sh](misc/entrypoint_3.sh)
- [entrypoint_4.sh](misc/entrypoint_4.sh)
- [entrypoint_5.sh](misc/entrypoint_5.sh)
- [entrypoint.sh](misc/entrypoint.sh)
- [move_sh.sh](misc/move_sh.sh)


---

*Scripts moved on: ven 25 lug 2025, 11:04:32, CEST*  
*Total files moved: 0*

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
```bash
# Make all scripts executable
find scripts/ -name "*.sh" -type f -exec chmod +x {} \;

# Or make specific categories executable
chmod +x scripts/deployment/*.sh
chmod +x scripts/setup/*.sh
```

### Running Scripts
Remember to update any relative paths in scripts that may have changed after moving.

