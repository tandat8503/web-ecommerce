/**
 * Script test tích hợp GHN
 * 
 * Chạy script này để kiểm tra các API endpoints GHN có hoạt động đúng không
 * 
 * Usage:
 *   node scripts/test-ghn-integration.js
 * 
 * Hoặc với environment variables:
 *   API_URL=http://localhost:5000/api node scripts/test-ghn-integration.js
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
const TEST_TOKEN = process.env.TEST_TOKEN || ''; // Token để test các API cần auth

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
};

/**
 * Print colored message
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Test helper function
 */
async function test(name, testFn) {
  try {
    log(`\n[TEST] ${name}`, 'cyan');
    await testFn();
    results.passed++;
    log(`✓ PASSED: ${name}`, 'green');
  } catch (error) {
    results.failed++;
    results.errors.push({ name, error: error.message });
    log(`✗ FAILED: ${name}`, 'red');
    log(`  Error: ${error.message}`, 'red');
    if (error.response) {
      log(`  Status: ${error.response.status}`, 'red');
      log(`  Data: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
  }
}

/**
 * Test 1: Get Provinces
 */
async function testGetProvinces() {
  const response = await axios.get(`${API_URL}/shipping/provinces`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error(`Expected success: true, got ${response.data.success}`);
  }
  
  if (!Array.isArray(response.data.data)) {
    throw new Error(`Expected data to be array, got ${typeof response.data.data}`);
  }
  
  if (response.data.data.length === 0) {
    throw new Error('Expected at least 1 province, got 0');
  }
  
  // Check format
  const province = response.data.data[0];
  if (!province.code || !province.name) {
    throw new Error(`Expected province to have code and name, got ${JSON.stringify(province)}`);
  }
  
  log(`  Found ${response.data.data.length} provinces`, 'blue');
  log(`  Sample: ${province.name} (code: ${province.code})`, 'blue');
}

/**
 * Test 2: Get Districts
 */
async function testGetDistricts() {
  // Test với Hồ Chí Minh (provinceId = 202)
  const response = await axios.post(`${API_URL}/shipping/districts`, {
    provinceId: 202
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error(`Expected success: true, got ${response.data.success}`);
  }
  
  if (!Array.isArray(response.data.data)) {
    throw new Error(`Expected data to be array, got ${typeof response.data.data}`);
  }
  
  if (response.data.data.length === 0) {
    throw new Error('Expected at least 1 district, got 0');
  }
  
  // Check format
  const district = response.data.data[0];
  if (!district.code || !district.name || !district.districtId) {
    throw new Error(`Expected district to have code, name, and districtId, got ${JSON.stringify(district)}`);
  }
  
  log(`  Found ${response.data.data.length} districts`, 'blue');
  log(`  Sample: ${district.name} (code: ${district.code}, districtId: ${district.districtId})`, 'blue');
  
  return district.districtId; // Return để dùng cho test tiếp theo
}

/**
 * Test 3: Get Wards
 */
async function testGetWards(districtId) {
  if (!districtId) {
    // Nếu không có districtId từ test trước, dùng Quận 1 (1451)
    districtId = 1451;
  }
  
  const response = await axios.post(`${API_URL}/shipping/wards`, {
    districtId: districtId
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error(`Expected success: true, got ${response.data.success}`);
  }
  
  if (!Array.isArray(response.data.data)) {
    throw new Error(`Expected data to be array, got ${typeof response.data.data}`);
  }
  
  if (response.data.data.length === 0) {
    throw new Error('Expected at least 1 ward, got 0');
  }
  
  // Check format
  const ward = response.data.data[0];
  if (!ward.code || !ward.name || !ward.wardCode) {
    throw new Error(`Expected ward to have code, name, and wardCode, got ${JSON.stringify(ward)}`);
  }
  
  log(`  Found ${response.data.data.length} wards`, 'blue');
  log(`  Sample: ${ward.name} (code: ${ward.code}, wardCode: ${ward.wardCode})`, 'blue');
  
  return { districtId, wardCode: ward.wardCode }; // Return để dùng cho test tính phí
}

/**
 * Test 4: Calculate Shipping Fee
 */
async function testCalculateShippingFee(districtId, wardCode) {
  if (!districtId || !wardCode) {
    // Dùng giá trị mặc định nếu không có
    districtId = 1451; // Quận 1, HCM
    wardCode = '1A0401'; // Phường Bến Nghé
  }
  
  const response = await axios.post(`${API_URL}/shipping/calculate-fee`, {
    toDistrictId: districtId,
    toWardCode: wardCode,
    weight: 1000, // 1kg
    length: 20,
    width: 20,
    height: 20,
    serviceTypeId: 2, // Standard
    insuranceValue: 500000 // 500k
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error(`Expected success: true, got ${response.data.success}`);
  }
  
  if (!response.data.data || typeof response.data.data.totalFee !== 'number') {
    throw new Error(`Expected data.totalFee to be number, got ${JSON.stringify(response.data.data)}`);
  }
  
  log(`  Shipping fee: ${response.data.data.totalFee.toLocaleString('vi-VN')} VNĐ`, 'blue');
  log(`  Service fee: ${response.data.data.serviceFee?.toLocaleString('vi-VN') || 'N/A'} VNĐ`, 'blue');
}

/**
 * Test 5: Get Available Services
 */
async function testGetAvailableServices(districtId, wardCode) {
  if (!districtId || !wardCode) {
    districtId = 1451;
    wardCode = '1A0401';
  }
  
  const response = await axios.post(`${API_URL}/shipping/available-services`, {
    toDistrictId: districtId,
    toWardCode: wardCode
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error(`Expected success: true, got ${response.data.success}`);
  }
  
  if (!Array.isArray(response.data.data)) {
    throw new Error(`Expected data to be array, got ${typeof response.data.data}`);
  }
  
  if (response.data.data.length === 0) {
    log(`  Warning: No available services found`, 'yellow');
    results.skipped++;
    return;
  }
  
  log(`  Found ${response.data.data.length} available services`, 'blue');
  response.data.data.forEach((service, index) => {
    log(`  ${index + 1}. ${service.service_type_name || service.short_name} (ID: ${service.service_id})`, 'blue');
  });
}

/**
 * Test 6: Get Lead Time
 */
async function testGetLeadTime(districtId, wardCode) {
  if (!districtId || !wardCode) {
    districtId = 1451;
    wardCode = '1A0401';
  }
  
  // Lấy service_id từ available services trước
  try {
    const servicesRes = await axios.post(`${API_URL}/shipping/available-services`, {
      toDistrictId: districtId,
      toWardCode: wardCode
    });
    
    if (!servicesRes.data.data || servicesRes.data.data.length === 0) {
      log(`  Skipping: No available services to test leadtime`, 'yellow');
      results.skipped++;
      return;
    }
    
    const serviceId = servicesRes.data.data[0].service_id;
    
    const response = await axios.post(`${API_URL}/shipping/leadtime`, {
      toDistrictId: districtId,
      toWardCode: wardCode,
      serviceId: serviceId
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error(`Expected success: true, got ${response.data.success}`);
    }
    
    if (!response.data.data) {
      throw new Error(`Expected data object, got ${JSON.stringify(response.data.data)}`);
    }
    
    log(`  Lead time timestamp: ${response.data.data.leadtime}`, 'blue');
    log(`  Order date: ${response.data.data.order_date || 'N/A'}`, 'blue');
  } catch (error) {
    if (error.response?.status === 400) {
      log(`  Skipping: ${error.response.data?.message || error.message}`, 'yellow');
      results.skipped++;
    } else {
      throw error;
    }
  }
}

/**
 * Test 7: Get Tracking (requires auth)
 */
async function testGetTracking() {
  if (!TEST_TOKEN) {
    log(`  Skipping: No TEST_TOKEN provided`, 'yellow');
    results.skipped++;
    return;
  }
  
  // Cần có ghnOrderCode thật để test, nên skip nếu không có
  const testOrderCode = process.env.TEST_GHN_ORDER_CODE;
  if (!testOrderCode) {
    log(`  Skipping: No TEST_GHN_ORDER_CODE provided`, 'yellow');
    results.skipped++;
    return;
  }
  
  try {
    const response = await axios.get(`${API_URL}/shipping/tracking/${testOrderCode}`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error(`Expected success: true, got ${response.data.success}`);
    }
    
    log(`  Order code: ${response.data.data?.order_code || 'N/A'}`, 'blue');
    log(`  Status: ${response.data.data?.status || 'N/A'}`, 'blue');
  } catch (error) {
    if (error.response?.status === 401) {
      log(`  Skipping: Unauthorized (invalid token)`, 'yellow');
      results.skipped++;
    } else {
      throw error;
    }
  }
}

/**
 * Test 8: Error handling - Missing parameters
 */
async function testErrorHandling() {
  // Test districts without provinceId
  try {
    await axios.post(`${API_URL}/shipping/districts`, {});
    throw new Error('Expected error for missing provinceId');
  } catch (error) {
    if (error.response?.status === 400) {
      log(`  ✓ Correctly returns 400 for missing provinceId`, 'green');
    } else {
      throw new Error(`Expected 400, got ${error.response?.status || 'no response'}`);
    }
  }
  
  // Test wards without districtId
  try {
    await axios.post(`${API_URL}/shipping/wards`, {});
    throw new Error('Expected error for missing districtId');
  } catch (error) {
    if (error.response?.status === 400) {
      log(`  ✓ Correctly returns 400 for missing districtId`, 'green');
    } else {
      throw new Error(`Expected 400, got ${error.response?.status || 'no response'}`);
    }
  }
  
  // Test calculate fee without required params
  try {
    await axios.post(`${API_URL}/shipping/calculate-fee`, {});
    throw new Error('Expected error for missing required params');
  } catch (error) {
    if (error.response?.status === 400) {
      log(`  ✓ Correctly returns 400 for missing required params`, 'green');
    } else {
      throw new Error(`Expected 400, got ${error.response?.status || 'no response'}`);
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n========================================', 'cyan');
  log('GHN Integration Test Suite', 'cyan');
  log('========================================', 'cyan');
  log(`API URL: ${API_URL}`, 'blue');
  log(`Test Token: ${TEST_TOKEN ? 'Provided' : 'Not provided'}`, 'blue');
  log('========================================\n', 'cyan');
  
  let districtId, wardCode;
  
  // Run tests sequentially (some depend on previous results)
  await test('1. Get Provinces', testGetProvinces);
  
  districtId = await test('2. Get Districts', testGetDistricts);
  
  const wardData = await test('3. Get Wards', async () => {
    const data = await testGetWards(districtId);
    wardCode = data.wardCode;
    districtId = data.districtId;
  });
  
  await test('4. Calculate Shipping Fee', async () => {
    await testCalculateShippingFee(districtId, wardCode);
  });
  
  await test('5. Get Available Services', async () => {
    await testGetAvailableServices(districtId, wardCode);
  });
  
  await test('6. Get Lead Time', async () => {
    await testGetLeadTime(districtId, wardCode);
  });
  
  await test('7. Get Tracking (requires auth)', testGetTracking);
  
  await test('8. Error Handling', testErrorHandling);
  
  // Print summary
  log('\n========================================', 'cyan');
  log('Test Summary', 'cyan');
  log('========================================', 'cyan');
  log(`✓ Passed: ${results.passed}`, 'green');
  log(`✗ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`⊘ Skipped: ${results.skipped}`, 'yellow');
  log('========================================\n', 'cyan');
  
  if (results.errors.length > 0) {
    log('Errors:', 'red');
    results.errors.forEach(({ name, error }) => {
      log(`  - ${name}: ${error}`, 'red');
    });
    log('');
  }
  
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

