#!/bin/bash

# Mobile Use Platform Docker Deployment Script
# 移动使用平台 Docker 部署脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 和 Docker Compose
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 检查环境变量文件
check_env_file() {
    log_info "检查环境变量文件..."
    
    if [ ! -f ".env" ]; then
        if [ -f "docker.env.example" ]; then
            log_warning ".env 文件不存在，从 docker.env.example 复制..."
            cp docker.env.example .env
            log_warning "请编辑 .env 文件并填入正确的配置值"
            log_warning "配置完成后重新运行此脚本"
            exit 1
        else
            log_error ".env 文件和 docker.env.example 文件都不存在"
            exit 1
        fi
    fi
    
    log_success "环境变量文件检查通过"
}

# 构建镜像
build_images() {
    log_info "构建 Docker 镜像..."
    
    # 构建 Mobile Agent
    log_info "构建 Mobile Agent 镜像..."
    docker-compose build mobile-agent
    
    # 构建 Mobile Use MCP
    log_info "构建 Mobile Use MCP 镜像..."
    docker-compose build mobile-use-mcp
    
    # 构建 Web
    log_info "构建 Web 镜像..."
    docker-compose build web
    
    log_success "所有镜像构建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 启动所有服务
    docker-compose up -d
    
    log_success "服务启动完成"
    
    # 显示服务状态
    log_info "服务状态："
    docker-compose ps
}

# 检查服务健康状态
check_health() {
    log_info "检查服务健康状态..."
    
    # 等待服务启动
    sleep 10
    
    # 检查 Mobile Use MCP
    if curl -f http://localhost:8080/health &> /dev/null; then
        log_success "Mobile Use MCP 服务健康"
    else
        log_warning "Mobile Use MCP 服务可能未就绪"
    fi
    
    # 检查 Mobile Agent
    if curl -f http://localhost:8000/health &> /dev/null; then
        log_success "Mobile Agent 服务健康"
    else
        log_warning "Mobile Agent 服务可能未就绪"
    fi
    
    # 检查 Web
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        log_success "Web 服务健康"
    else
        log_warning "Web 服务可能未就绪"
    fi
}

# 显示访问信息
show_access_info() {
    log_success "部署完成！"
    echo ""
    echo "服务访问地址："
    echo "  Web 前端:        http://localhost:3000"
    echo "  Mobile Agent:    http://localhost:8000"
    echo "  Mobile Use MCP:  http://localhost:8080"
    echo ""
    echo "常用命令："
    echo "  查看日志:        docker-compose logs -f"
    echo "  停止服务:        docker-compose down"
    echo "  重启服务:        docker-compose restart"
    echo "  查看状态:        docker-compose ps"
    echo ""
}

# 清理函数
cleanup() {
    log_info "停止并清理服务..."
    docker-compose down
    docker-compose down --volumes --remove-orphans
    log_success "清理完成"
}

# 主函数
main() {
    case "${1:-deploy}" in
        "deploy")
            log_info "开始部署 Mobile Use Platform..."
            check_dependencies
            check_env_file
            build_images
            start_services
            check_health
            show_access_info
            ;;
        "start")
            log_info "启动服务..."
            docker-compose up -d
            check_health
            show_access_info
            ;;
        "stop")
            log_info "停止服务..."
            docker-compose down
            log_success "服务已停止"
            ;;
        "restart")
            log_info "重启服务..."
            docker-compose restart
            check_health
            show_access_info
            ;;
        "logs")
            docker-compose logs -f
            ;;
        "status")
            docker-compose ps
            ;;
        "cleanup")
            cleanup
            ;;
        "help")
            echo "用法: $0 [command]"
            echo ""
            echo "命令:"
            echo "  deploy   - 完整部署 (默认)"
            echo "  start    - 启动服务"
            echo "  stop     - 停止服务"
            echo "  restart  - 重启服务"
            echo "  logs     - 查看日志"
            echo "  status   - 查看状态"
            echo "  cleanup  - 清理服务和数据"
            echo "  help     - 显示帮助"
            ;;
        *)
            log_error "未知命令: $1"
            echo "使用 '$0 help' 查看可用命令"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
