#!/usr/bin/env bash

# ==============================================================================
# OpenChamber RDS Mission Control - Universal Linux Lifecycle & Installer Script
#
# Provides robust, human- and AI-friendly installation, update, removal, and
# health diagnostics for current workstations and raw Linux servers.
# Always executes a clean-from-scratch install to eliminate stale states.
# ==============================================================================

set -euo pipefail

# ANSI Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_step() {
    echo -e "\n${BOLD}${BLUE}==>${NC} ${BOLD}$1${NC}"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1" >&2
}

print_banner() {
    cat << "EOF"
  ___  ____  ____    __  __ _           _              ____            _             _ 
 |  _ \|  _ \/ ___|  |  \/  (_)___ ___ (_) ___  _ __   / ___|___  _ __ | |_ _ __ ___ | |
 | |_) | | | \___ \  | |\/| | / __/ __|| |/ _ \| '_ \ | |   / _ \| '_ \| __| '__/ _ \| |
 |  _ <| |_| |___) | | |  | | \__ \__ \| | (_) | | | || |__| (_) | | | | |_| | | (_) | |
 |_| \_\____/|____/  |_|  |_|_|___/___/|_|\___/|_| |_| \____\___/|_| |_|\__|_|  \___/|_|
EOF
    echo -e "   OpenChamber Desktop Extension Lifecycle & Installation System\n"
}

# ------------------------------------------------------------------------------
# Prerequisite Checks & Provisioning for Raw Linux Servers
# ------------------------------------------------------------------------------
ensure_prerequisites() {
    log_step "Checking System Prerequisites (Node.js >= 20, npm, git)..."

    local need_node=false
    local need_git=false

    if ! command -v git &>/dev/null; then
        need_git=true
    fi

    if ! command -v node &>/dev/null; then
        need_node=true
    else
        NODE_MAJOR=$(node -v | sed 's/v//' | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -lt 20 ]; then
            log_warn "Installed Node.js version $(node -v) is below v20.0.0."
            need_node=true
        fi
    fi

    if [ "$need_git" = true ] || [ "$need_node" = true ]; then
        log_info "Raw Linux server detected missing core requirements. Attempting provisioning..."

        if [ -f /etc/os-release ]; then
            . /etc/os-release
            DISTRO_ID="${ID:-unknown}"
        else
            DISTRO_ID="unknown"
        fi

        log_info "Detected Linux distribution: ${DISTRO_ID}"

        if [ "$need_git" = true ]; then
            if command -v apt-get &>/dev/null; then
                sudo apt-get update && sudo apt-get install -y git curl
            elif command -v dnf &>/dev/null; then
                sudo dnf install -y git curl
            elif command -v pacman &>/dev/null; then
                sudo pacman -Sy --noconfirm git curl
            else
                log_fail "Cannot auto-install git. Please install git and retry."
                exit 1
            fi
        fi

        if [ "$need_node" = true ]; then
            log_info "Installing Node.js 20 LTS..."
            if command -v apt-get &>/dev/null; then
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                sudo apt-get install -y nodejs
            elif command -v dnf &>/dev/null; then
                curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
                sudo dnf install -y nodejs
            elif command -v pacman &>/dev/null; then
                sudo pacman -Sy --noconfirm nodejs npm
            else
                log_fail "Automatic Node.js 20 installation not supported for ${DISTRO_ID}. Please install Node.js >= 20 manually."
                exit 1
            fi
        fi
    fi

    log_pass "Node.js $(node -v) and npm $(npm -v) are available."

    # Check for OpenChamber CLI
    if ! command -v openchamber &>/dev/null; then
        log_warn "OpenChamber CLI not found in PATH."
        log_info "Installing OpenChamber globally via npm (npm install -g openchamber)..."
        npm install -g openchamber || {
            log_warn "Global npm install requires elevated permissions or user prefix; installing for current user..."
            npm install --prefix "${HOME}/.npm-global" -g openchamber || true
            export PATH="${HOME}/.npm-global/bin:${PATH}"
        }
    fi

    if command -v openchamber &>/dev/null; then
        log_pass "OpenChamber CLI available at $(command -v openchamber)"
    else
        log_warn "OpenChamber CLI could not be installed globally. Continuing extension build..."
    fi
}

# ------------------------------------------------------------------------------
# Dispatcher
# ------------------------------------------------------------------------------
main() {
    print_banner

    local COMMAND="${1:-install}"
    shift || true

    case "$COMMAND" in
        install)
            ensure_prerequisites
            log_step "Executing Clean Installation from Scratch..."
            node "${REPO_DIR}/scripts/installer.mjs" install --clean "$@"
            ;;
        update)
            ensure_prerequisites
            log_step "Executing Clean Update from Scratch..."
            node "${REPO_DIR}/scripts/installer.mjs" update "$@"
            ;;
        remove|uninstall)
            log_step "Executing Extension Removal..."
            node "${REPO_DIR}/scripts/installer.mjs" remove "$@"
            ;;
        doctor|status)
            log_step "Running Diagnostic Health Checks..."
            node "${REPO_DIR}/scripts/installer.mjs" doctor "$@"
            ;;
        run|enable)
            log_step "Enabling and Starting OpenChamber Daemon..."
            node "${REPO_DIR}/scripts/installer.mjs" run "$@"
            ;;
        verify-release)
            ensure_prerequisites
            log_step "Executing Strict Release Verification Gate..."
            node "${REPO_DIR}/scripts/installer.mjs" verify-release "$@"
            ;;
        help|--help|-h)
            cat << "EOF"
USAGE:
  ./scripts/install.sh [command] [options]

COMMANDS:
  install           Perform a clean install from scratch, build bundle, register with OpenChamber
  update            Perform a clean update (pull git + clean build + re-register)
  remove            Unregister and remove extension from OpenChamber
  doctor            Run complete environment, registration, and health diagnostics
  run               Start or restart OpenChamber daemon with Mission Control
  verify-release    Run full clean build, tests, and RDS documentation release gate
  help              Display this help message

OPTIONS (passed to installer engine):
  --clean           Enforce removing stale node_modules and previous bundle
  --target <dir>    Specify target extension directory
  --no-restart      Skip restarting running OpenChamber daemon
  --purge           Purge telemetry data upon removal
  --quiet           Minimal console output

EXAMPLES:
  ./scripts/install.sh install
  ./scripts/install.sh doctor
  ./scripts/install.sh verify-release
EOF
            ;;
        *)
            log_fail "Unknown command: ${COMMAND}"
            echo "Run './scripts/install.sh help' for usage instructions."
            exit 1
            ;;
    esac
}

main "$@"
