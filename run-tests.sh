#!/bin/bash

# TechFlunky Platform Testing Script
# Comprehensive testing suite with setup and reporting

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV=${NODE_ENV:-development}
BASE_URL=${TEST_URL:-"http://localhost:4321"}
STRIPE_MODE=${STRIPE_MODE:-sandbox}
REPORT_DIR="test-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}🚀 TechFlunky Platform Testing Suite${NC}"
echo -e "${CYAN}Environment: $TEST_ENV${NC}"
echo -e "${CYAN}Base URL: $BASE_URL${NC}"
echo -e "${CYAN}Stripe Mode: $STRIPE_MODE${NC}"
echo -e "${CYAN}Timestamp: $TIMESTAMP${NC}"
echo

# Create reports directory
mkdir -p $REPORT_DIR

# Function to run a specific test suite
run_test_suite() {
    local suite_name=$1
    local description=$2

    echo -e "${YELLOW}🧪 Testing: $description${NC}"

    if node test-platform.js $suite_name > "$REPORT_DIR/${suite_name}_${TIMESTAMP}.log" 2>&1; then
        echo -e "${GREEN}✅ $description - PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $description - FAILED${NC}"
        echo -e "${YELLOW}   Check log: $REPORT_DIR/${suite_name}_${TIMESTAMP}.log${NC}"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking Prerequisites...${NC}"

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

    # Check if server is running (for local tests)
    if [[ $TEST_ENV == "development" ]]; then
        if ! curl -s $BASE_URL > /dev/null; then
            echo -e "${YELLOW}⚠️  Development server not running at $BASE_URL${NC}"
            echo -e "${CYAN}   Please start the server with: npm run dev${NC}"

            read -p "Do you want to start the server automatically? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo -e "${BLUE}🚀 Starting development server...${NC}"
                npm run dev &
                SERVER_PID=$!
                echo "Server PID: $SERVER_PID"

                # Wait for server to be ready
                echo -e "${YELLOW}⏳ Waiting for server to be ready...${NC}"
                for i in {1..30}; do
                    if curl -s $BASE_URL > /dev/null; then
                        echo -e "${GREEN}✅ Server is ready!${NC}"
                        break
                    fi
                    sleep 2
                    echo -n "."
                done
                echo
            else
                echo -e "${RED}❌ Cannot run tests without server${NC}"
                exit 1
            fi
        else
            echo -e "${GREEN}✅ Server is running at $BASE_URL${NC}"
        fi
    fi

    echo
}

# Function to setup test environment
setup_test_environment() {
    echo -e "${BLUE}⚙️  Setting up Test Environment...${NC}"

    # Set environment variables for testing
    export NODE_ENV=$TEST_ENV
    export TEST_URL=$BASE_URL
    export STRIPE_TESTING_MODE=$STRIPE_MODE

    # Create test data directory if needed
    mkdir -p test-data

    echo -e "${GREEN}✅ Test environment configured${NC}"
    echo
}

# Function to run quick smoke tests
run_smoke_tests() {
    echo -e "${PURPLE}💨 Running Smoke Tests (Quick Validation)...${NC}"

    local failed=0

    # Test basic connectivity
    if curl -s -f $BASE_URL > /dev/null; then
        echo -e "${GREEN}✅ Site is accessible${NC}"
    else
        echo -e "${RED}❌ Site is not accessible${NC}"
        ((failed++))
    fi

    # Test critical pages
    local pages=("/" "/browse" "/pricing" "/login" "/register")
    for page in "${pages[@]}"; do
        if curl -s -f "${BASE_URL}${page}" > /dev/null; then
            echo -e "${GREEN}✅ Page $page loads${NC}"
        else
            echo -e "${RED}❌ Page $page failed to load${NC}"
            ((failed++))
        fi
    done

    # Test API endpoints
    local apis=("/api/listings" "/api/services/validation")
    for api in "${apis[@]}"; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${api}")
        if [[ $status == "200" || $status == "401" ]]; then
            echo -e "${GREEN}✅ API $api responds (Status: $status)${NC}"
        else
            echo -e "${RED}❌ API $api failed (Status: $status)${NC}"
            ((failed++))
        fi
    done

    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}🎉 All smoke tests passed!${NC}"
        return 0
    else
        echo -e "${RED}💥 $failed smoke tests failed${NC}"
        return 1
    fi
}

# Function to run full test suite
run_full_tests() {
    echo -e "${PURPLE}🧪 Running Full Test Suite...${NC}"

    local total_failed=0

    # Run individual test suites
    run_test_suite "auth" "Authentication & Registration" || ((total_failed++))
    run_test_suite "marketplace" "Marketplace Functionality" || ((total_failed++))
    run_test_suite "payments" "Payment Systems (Stripe)" || ((total_failed++))
    run_test_suite "investor" "Investor Portal Features" || ((total_failed++))
    run_test_suite "api" "Core API Endpoints" || ((total_failed++))
    run_test_suite "email" "Email & Notification Systems" || ((total_failed++))
    run_test_suite "forms" "Form Validations" || ((total_failed++))
    run_test_suite "ai" "AI Integrations" || ((total_failed++))
    run_test_suite "performance" "Performance & Load Testing" || ((total_failed++))
    run_test_suite "security" "Security & Validation" || ((total_failed++))

    return $total_failed
}

# Function to generate test report
generate_report() {
    local test_result=$1

    echo -e "${BLUE}📊 Generating Test Report...${NC}"

    # Combine all log files
    cat $REPORT_DIR/*_${TIMESTAMP}.log > $REPORT_DIR/full_report_${TIMESTAMP}.log

    # Generate summary
    local total_tests=$(grep -c "PASS\|FAIL" $REPORT_DIR/full_report_${TIMESTAMP}.log || echo "0")
    local passed_tests=$(grep -c "PASS" $REPORT_DIR/full_report_${TIMESTAMP}.log || echo "0")
    local failed_tests=$(grep -c "FAIL" $REPORT_DIR/full_report_${TIMESTAMP}.log || echo "0")

    local pass_rate=0
    if [ $total_tests -gt 0 ]; then
        pass_rate=$(( (passed_tests * 100) / total_tests ))
    fi

    echo -e "${CYAN}📈 TEST SUMMARY${NC}"
    echo -e "${CYAN}════════════════${NC}"
    echo -e "Total Tests: $total_tests"
    echo -e "Passed: ${GREEN}$passed_tests${NC}"
    echo -e "Failed: ${RED}$failed_tests${NC}"
    echo -e "Pass Rate: ${YELLOW}$pass_rate%${NC}"
    echo -e "Environment: $TEST_ENV"
    echo -e "Timestamp: $TIMESTAMP"
    echo

    # Create HTML report
    create_html_report $total_tests $passed_tests $failed_tests $pass_rate

    echo -e "${GREEN}📄 Reports saved to:${NC}"
    echo -e "  • Full log: $REPORT_DIR/full_report_${TIMESTAMP}.log"
    echo -e "  • HTML report: $REPORT_DIR/test_report_${TIMESTAMP}.html"
    echo -e "  • JSON results: test-results.json"
}

# Function to create HTML report
create_html_report() {
    local total=$1 passed=$2 failed=$3 pass_rate=$4

    cat > $REPORT_DIR/test_report_${TIMESTAMP}.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TechFlunky Test Report - $TIMESTAMP</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: white; text-align: center; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .header h1 { color: #fbbf24; margin: 0; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; border-left: 4px solid; }
        .stat-card.total { border-color: #3b82f6; }
        .stat-card.passed { border-color: #10b981; }
        .stat-card.failed { border-color: #ef4444; }
        .stat-card.rate { border-color: #f59e0b; }
        .stat-number { font-size: 2rem; font-weight: bold; margin-bottom: 8px; }
        .stat-label { color: #6b7280; font-size: 0.9rem; }
        .pass-rate { font-size: 3rem; }
        .logs { background: #1f2937; color: #e5e7eb; padding: 20px; border-radius: 8px; overflow-x: auto; }
        .logs pre { margin: 0; white-space: pre-wrap; }
        .pass { color: #10b981; }
        .fail { color: #ef4444; }
        .info { color: #3b82f6; }
        .warn { color: #f59e0b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 TechFlunky Test Report</h1>
            <p>Generated: $TIMESTAMP</p>
            <p>Environment: $TEST_ENV</p>
        </div>

        <div class="stats">
            <div class="stat-card total">
                <div class="stat-number">$total</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card passed">
                <div class="stat-number">$passed</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-number">$failed</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card rate">
                <div class="stat-number pass-rate">$pass_rate%</div>
                <div class="stat-label">Pass Rate</div>
            </div>
        </div>

        <h3>📋 Detailed Results</h3>
        <div class="logs">
            <pre>$(cat $REPORT_DIR/full_report_${TIMESTAMP}.log | sed 's/\x1b\[[0-9;]*m//g')</pre>
        </div>
    </div>
</body>
</html>
EOF
}

# Function to cleanup
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        echo -e "${YELLOW}🧹 Stopping development server (PID: $SERVER_PID)...${NC}"
        kill $SERVER_PID 2>/dev/null || true
    fi
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    local test_type=${1:-full}

    case $test_type in
        "smoke")
            check_prerequisites
            setup_test_environment
            if run_smoke_tests; then
                echo -e "${GREEN}🎉 All smoke tests passed!${NC}"
                exit 0
            else
                echo -e "${RED}💥 Smoke tests failed${NC}"
                exit 1
            fi
            ;;
        "full")
            check_prerequisites
            setup_test_environment

            echo -e "${BLUE}Choose testing approach:${NC}"
            echo -e "1) Quick smoke tests only"
            echo -e "2) Full comprehensive testing"
            echo -e "3) Smoke tests + Full testing"

            read -p "Enter your choice (1-3): " -n 1 -r
            echo

            case $REPLY in
                1)
                    run_smoke_tests
                    ;;
                2)
                    if run_full_tests; then
                        echo -e "${GREEN}🎉 All tests completed successfully!${NC}"
                    else
                        echo -e "${YELLOW}⚠️  Some tests failed - check reports for details${NC}"
                    fi
                    generate_report
                    ;;
                3)
                    if run_smoke_tests; then
                        echo -e "${GREEN}✅ Smoke tests passed, proceeding with full testing...${NC}"
                        echo

                        if run_full_tests; then
                            echo -e "${GREEN}🎉 All tests completed successfully!${NC}"
                        else
                            echo -e "${YELLOW}⚠️  Some tests failed - check reports for details${NC}"
                        fi
                        generate_report
                    else
                        echo -e "${RED}💥 Smoke tests failed - aborting full testing${NC}"
                        exit 1
                    fi
                    ;;
                *)
                    echo -e "${RED}Invalid choice${NC}"
                    exit 1
                    ;;
            esac
            ;;
        "help"|"-h"|"--help")
            echo -e "${BLUE}TechFlunky Platform Testing Script${NC}"
            echo
            echo -e "${YELLOW}Usage:${NC}"
            echo -e "  ./run-tests.sh [test-type]"
            echo
            echo -e "${YELLOW}Test Types:${NC}"
            echo -e "  smoke    - Quick validation tests (5-10 seconds)"
            echo -e "  full     - Comprehensive testing suite (2-5 minutes)"
            echo
            echo -e "${YELLOW}Environment Variables:${NC}"
            echo -e "  NODE_ENV      - Environment (development|production)"
            echo -e "  TEST_URL      - Base URL for testing"
            echo -e "  STRIPE_MODE   - Stripe mode (sandbox|live)"
            echo
            echo -e "${YELLOW}Examples:${NC}"
            echo -e "  ./run-tests.sh smoke"
            echo -e "  NODE_ENV=production TEST_URL=https://techflunky.com ./run-tests.sh full"
            echo -e "  STRIPE_MODE=live ./run-tests.sh full"
            ;;
        *)
            echo -e "${RED}Unknown test type: $test_type${NC}"
            echo -e "${CYAN}Use './run-tests.sh help' for usage information${NC}"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"