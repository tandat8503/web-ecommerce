/**
 * Script test GHN Endpoints - Phân tích Input/Output
 * 
 * Script này sẽ:
 * 1. Test tất cả endpoints GHN
 * 2. Phân tích input params cần thiết
 * 3. Phân tích output params và xác định params nào useful
 * 4. Liệt kê cách sử dụng hợp lý
 * 
 * Usage:
 *   node scripts/test-ghn-endpoints.js
 * 
 * Hoặc với environment variables:
 *   API_URL=http://localhost:5000/api node scripts/test-ghn-endpoints.js
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  endpoints: []
};

/**
 * Print colored message
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Test endpoint và phân tích input/output
 */
async function testEndpoint(name, method, url, params = {}, expectedInput = [], expectedOutput = []) {
  const endpointInfo = {
    name,
    method,
    url,
    params,
    input: {},
    output: {},
    usefulParams: [],
    status: 'pending'
  };

  try {
    log(`\n${'='.repeat(80)}`, 'cyan');
    log(`[TEST] ${name}`, 'cyan');
    log(`${'='.repeat(80)}`, 'cyan');
    log(`Method: ${method}`, 'blue');
    log(`URL: ${url}`, 'blue');
    
    let response;
    if (method === 'GET') {
      const queryString = new URLSearchParams(params).toString();
      const fullUrl = `${url}?${queryString}`;
      log(`Full URL: ${fullUrl}`, 'yellow');
      response = await axios.get(fullUrl);
    } else {
      log(`Body: ${JSON.stringify(params, null, 2)}`, 'yellow');
      response = await axios.post(url, params);
    }

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error(`Expected success: true, got ${response.data.success}`);
    }

    // Phân tích Input
    log(`\n📥 INPUT PARAMS:`, 'magenta');
    log(`Required:`, 'yellow');
    expectedInput.forEach(param => {
      const value = params[param.name];
      const status = value !== undefined && value !== null ? '✅' : '❌';
      log(`  ${status} ${param.name} (${param.type}): ${value || 'MISSING'} - ${param.description}`, 
          value !== undefined && value !== null ? 'green' : 'red');
      endpointInfo.input[param.name] = {
        type: param.type,
        required: param.required,
        value: value,
        description: param.description
      };
    });

    // Phân tích Output
    log(`\n📤 OUTPUT PARAMS:`, 'magenta');
    const outputData = response.data.data;
    
    if (Array.isArray(outputData)) {
      log(`Type: Array (${outputData.length} items)`, 'blue');
      if (outputData.length > 0) {
        const firstItem = outputData[0];
        log(`Sample item structure:`, 'blue');
        log(JSON.stringify(firstItem, null, 2), 'cyan');
        
        // Phân tích từng field
        Object.keys(firstItem).forEach(key => {
          const value = firstItem[key];
          const type = typeof value;
          const useful = expectedOutput.find(p => p.name === key);
          const isUseful = useful ? '⭐' : '  ';
          log(`  ${isUseful} ${key} (${type}): ${JSON.stringify(value)}${useful ? ` - ${useful.description}` : ''}`, 
              useful ? 'green' : 'blue');
          
          endpointInfo.output[key] = {
            type,
            value: value,
            useful: !!useful,
            description: useful?.description || 'Not specified'
          };
          
          if (useful) {
            endpointInfo.usefulParams.push(key);
          }
        });
      }
    } else if (typeof outputData === 'object' && outputData !== null) {
      log(`Type: Object`, 'blue');
      log(`Structure:`, 'blue');
      log(JSON.stringify(outputData, null, 2), 'cyan');
      
      Object.keys(outputData).forEach(key => {
        const value = outputData[key];
        const type = typeof value;
        const useful = expectedOutput.find(p => p.name === key);
        const isUseful = useful ? '⭐' : '  ';
        log(`  ${isUseful} ${key} (${type}): ${JSON.stringify(value)}${useful ? ` - ${useful.description}` : ''}`, 
            useful ? 'green' : 'blue');
        
        endpointInfo.output[key] = {
          type,
          value: value,
          useful: !!useful,
          description: useful?.description || 'Not specified'
        };
        
        if (useful) {
          endpointInfo.usefulParams.push(key);
        }
      });
    } else {
      log(`Type: ${typeof outputData}`, 'blue');
      log(`Value: ${JSON.stringify(outputData)}`, 'cyan');
    }

    // Tóm tắt
    log(`\n📋 SUMMARY:`, 'magenta');
    log(`✅ Status: PASSED`, 'green');
    log(`📥 Required Input: ${expectedInput.filter(p => p.required).map(p => p.name).join(', ')}`, 'yellow');
    log(`⭐ Useful Output: ${endpointInfo.usefulParams.join(', ')}`, 'green');
    
    endpointInfo.status = 'passed';
    results.passed++;
    results.endpoints.push(endpointInfo);
    
  } catch (error) {
    log(`\n❌ Status: FAILED`, 'red');
    log(`Error: ${error.message}`, 'red');
    
    // Hiển thị chi tiết lỗi
    if (error.code === 'ECONNREFUSED') {
      log(`⚠️  Backend server chưa chạy hoặc không thể kết nối!`, 'yellow');
      log(`   Hãy chạy: cd backend && npm run dev`, 'yellow');
    } else if (error.response) {
      log(`Response Status: ${error.response.status}`, 'red');
      log(`Response Headers: ${JSON.stringify(error.response.headers, null, 2)}`, 'red');
      log(`Response Data: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else if (error.request) {
      log(`Request was made but no response received`, 'red');
      log(`Request URL: ${error.config?.url}`, 'red');
      log(`Request Method: ${error.config?.method}`, 'red');
    } else {
      log(`Error Details: ${JSON.stringify(error, null, 2)}`, 'red');
    }
    
    endpointInfo.status = 'failed';
    endpointInfo.error = error.message;
    endpointInfo.errorDetails = {
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    };
    results.failed++;
    results.endpoints.push(endpointInfo);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n' + '='.repeat(80), 'cyan');
  log('GHN Endpoints Test & Analysis', 'cyan');
  log('='.repeat(80), 'cyan');
  log(`API URL: ${API_URL}`, 'blue');
  log('='.repeat(80) + '\n', 'cyan');

  // Test 1: Get Provinces - Lấy danh sách tỉnh/thành phố
  await testEndpoint(
    '1. Get Provinces - Lấy danh sách tỉnh/thành phố',
    'GET',
    `${API_URL}/shipping/provinces`,
    {},
    [], // Không cần input
    [
      { name: 'code', description: 'Mã tỉnh/thành phố (string) - Dùng cho dropdown frontend' },
      { name: 'name', description: 'Tên tỉnh/thành phố - Hiển thị cho user' }
    ]
  );

  // Test 2: Calculate Shipping Fee - Tính phí vận chuyển
  await testEndpoint(
    '2. Calculate Shipping Fee - Tính phí vận chuyển',
    'GET',
    `${API_URL}/shipping/calculate-fee`,
    {
      toDistrictId: 1451,
      toWardCode: '1A0401',
      weight: 1000,
      length: 20,
      width: 20,
      height: 20,
      serviceTypeId: 2,
      insuranceValue: 500000
    },
    [
      { name: 'toDistrictId', type: 'number', required: true, description: 'ID quận/huyện nhận hàng (lấy từ Get Districts)' },
      { name: 'toWardCode', type: 'string', required: true, description: 'Mã phường/xã nhận hàng (lấy từ Get Wards)' },
      { name: 'weight', type: 'number', required: false, description: 'Trọng lượng (gram), mặc định 1000' },
      { name: 'length', type: 'number', required: false, description: 'Chiều dài (cm), mặc định 20' },
      { name: 'width', type: 'number', required: false, description: 'Chiều rộng (cm), mặc định 20' },
      { name: 'height', type: 'number', required: false, description: 'Chiều cao (cm), mặc định 20' },
      { name: 'serviceTypeId', type: 'number', required: false, description: 'Loại dịch vụ (2: Standard, 5: Express), mặc định 2' },
      { name: 'insuranceValue', type: 'number', required: false, description: 'Giá trị đơn hàng (để tính bảo hiểm), mặc định 0' }
    ],
    [
      { name: 'totalFee', description: 'Tổng phí vận chuyển (VNĐ) - QUAN TRỌNG: Hiển thị cho user và tính vào tổng đơn hàng' },
      { name: 'serviceFee', description: 'Phí dịch vụ cơ bản (VNĐ) - Thông tin chi tiết' },
      { name: 'insuranceFee', description: 'Phí bảo hiểm (VNĐ) - Nếu có insuranceValue' },
      { name: 'total', description: 'Tổng phí (alias của totalFee) - Dùng để hiển thị' }
    ]
  );

  // Print final summary
  log('\n' + '='.repeat(80), 'cyan');
  log('FINAL SUMMARY', 'cyan');
  log('='.repeat(80), 'cyan');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`⊘ Skipped: ${results.skipped}`, 'yellow');
  log('='.repeat(80), 'cyan');

  // Generate usage guide
  log('\n' + '='.repeat(80), 'cyan');
  log('📚 USAGE GUIDE - Cách sử dụng Input/Output hợp lý', 'cyan');
  log('='.repeat(80), 'cyan');

  results.endpoints.forEach((endpoint, index) => {
    if (endpoint.status === 'passed') {
      log(`\n${index + 1}. ${endpoint.name}`, 'magenta');
      log(`   Method: ${endpoint.method}`, 'blue');
      log(`   URL: ${endpoint.url}`, 'blue');
      
      // Input guide
      if (Object.keys(endpoint.input).length > 0) {
        log(`   📥 INPUT:`, 'yellow');
        Object.keys(endpoint.input).forEach(key => {
          const input = endpoint.input[key];
          const required = input.required ? '(REQUIRED)' : '(OPTIONAL)';
          log(`      - ${key} ${required}: ${input.type} - ${input.description}`, 'cyan');
        });
      }
      
      // Output guide
      if (endpoint.usefulParams.length > 0) {
        log(`   ⭐ USEFUL OUTPUT:`, 'green');
        endpoint.usefulParams.forEach(key => {
          const output = endpoint.output[key];
          log(`      - ${key} (${output.type}): ${output.description}`, 'green');
        });
      }
      
      // Usage example
      log(`   💡 USAGE:`, 'blue');
      if (endpoint.method === 'GET') {
        const queryString = new URLSearchParams(endpoint.params).toString();
        log(`      GET ${endpoint.url}?${queryString}`, 'cyan');
      } else {
        log(`      POST ${endpoint.url}`, 'cyan');
        log(`      Body: ${JSON.stringify(endpoint.params, null, 2)}`, 'cyan');
      }
    }
  });

  log('\n' + '='.repeat(80), 'cyan');
  log('✅ Test hoàn tất!', 'green');
  log('='.repeat(80) + '\n', 'cyan');

  // Exit with error code if any tests failed
  if (results.failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  log(`\nFatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

