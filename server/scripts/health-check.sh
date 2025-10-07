#!/bin/bash

#############################################
# CampusFix Health Check Script
# Проверка работоспособности системы
#############################################

# Настройки
API_URL="http://localhost:5000"
FRONTEND_URL="http://localhost"
DB_NAME="campusfix"
DB_USER="campusfix_user"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Функции вывода
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}  CampusFix Health Check${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}Testing:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓ PASSED:${NC} $1"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}✗ FAILED:${NC} $1"
    ((FAILED++))
}

print_summary() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Начало проверки
print_header

# 1. Проверка Node.js
print_test "Node.js installation"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js is installed ($NODE_VERSION)"
else
    print_fail "Node.js is not installed"
fi

# 2. Проверка PostgreSQL
print_test "PostgreSQL service"
if systemctl is-active --quiet postgresql; then
    print_success "PostgreSQL service is running"
else
    print_fail "PostgreSQL service is not running"
fi

# 3. Проверка подключения к БД
print_test "Database connection"
if sudo -u postgres psql -d "$DB_NAME" -c "SELECT 1" &> /dev/null; then
    print_success "Database connection successful"
else
    print_fail "Cannot connect to database"
fi

# 4. Проверка PM2
print_test "PM2 processes"
if pm2 list | grep -q "campusfix-server"; then
    PM2_STATUS=$(pm2 jlist | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ "$PM2_STATUS" = "online" ]; then
        print_success "PM2 process is online"
    else
        print_fail "PM2 process is $PM2_STATUS"
    fi
else
    print_fail "PM2 process not found"
fi

# 5. Проверка Backend API
print_test "Backend API health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    print_success "Backend API is responding (HTTP $HTTP_CODE)"
else
    print_fail "Backend API check failed (HTTP $HTTP_CODE)"
fi

# 6. Проверка Nginx
print_test "Nginx service"
if systemctl is-active --quiet nginx; then
    print_success "Nginx service is running"
else
    print_fail "Nginx service is not running"
fi

# 7. Проверка Frontend
print_test "Frontend availability"
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null)
if [ "$FRONTEND_CODE" = "200" ] || [ "$FRONTEND_CODE" = "301" ] || [ "$FRONTEND_CODE" = "302" ]; then
    print_success "Frontend is accessible (HTTP $FRONTEND_CODE)"
else
    print_fail "Frontend check failed (HTTP $FRONTEND_CODE)"
fi

# 8. Проверка дискового пространства
print_test "Disk space"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    print_success "Disk usage is acceptable ($DISK_USAGE%)"
else
    print_fail "Disk usage is high ($DISK_USAGE%)"
fi

# 9. Проверка памяти
print_test "Memory usage"
MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -lt 90 ]; then
    print_success "Memory usage is acceptable ($MEM_USAGE%)"
else
    print_fail "Memory usage is high ($MEM_USAGE%)"
fi

# 10. Проверка логов на ошибки
print_test "Recent errors in logs"
ERROR_COUNT=$(pm2 logs campusfix-server --lines 100 --nostream 2>/dev/null | grep -i "error" | wc -l)
if [ "$ERROR_COUNT" -lt 5 ]; then
    print_success "No critical errors in recent logs"
else
    print_fail "Found $ERROR_COUNT errors in recent logs"
fi

# Итоговая статистика
print_summary

# Возвращаем код ошибки если есть проваленные тесты
if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
