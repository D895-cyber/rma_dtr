// Script to create Excel template files for data import

import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const dataDir = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Helper function to create Excel file
function createExcelFile(filename: string, headers: string[], exampleRows: any[]) {
  const workbook = XLSX.utils.book_new();
  const worksheetData = [
    headers,
    ...exampleRows.map(row => headers.map(h => row[h] || ''))
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  const filePath = path.join(dataDir, filename);
  XLSX.writeFile(workbook, filePath);
  console.log(`✅ Created: ${filename}`);
}

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║           Creating Excel Template Files                          ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

// 1. Sites Template
createExcelFile('sites.xlsx', 
  ['siteName'],
  [
    {
      siteName: 'PVR Phoenix Mall Mumbai'
    },
    {
      siteName: 'INOX Garuda Mall Bangalore'
    }
  ]
);

// 2. Projector Models Template
createExcelFile('projector_models.xlsx',
  ['modelNo', 'manufacturer', 'specifications'],
  [
    {
      modelNo: 'CP2220',
      manufacturer: 'Christie',
      specifications: '4K DLP Cinema Projector, 22,000 lumens'
    },
    {
      modelNo: 'CP2230',
      manufacturer: 'Christie',
      specifications: '4K DLP Cinema Projector, 25,000 lumens'
    }
  ]
);

// 3. Projectors Template
createExcelFile('projectors.xlsx',
  ['serialNumber', 'modelNo', 'status', 'installationDate', 'notes'],
  [
    {
      serialNumber: '411034563',
      modelNo: 'CP2230',
      status: 'active',
      installationDate: '2023-01-15',
      notes: 'Installed in Audi 2'
    },
    {
      serialNumber: '411034564',
      modelNo: 'CP2230',
      status: 'active',
      installationDate: '2023-01-15',
      notes: 'Installed in Audi 3'
    }
  ]
);

// 4. Audis Template
createExcelFile('audis.xlsx',
  ['audiNo', 'siteName', 'serialNumber'],
  [
    {
      audiNo: 'Audi 1',
      siteName: 'PVR Phoenix Mall Mumbai',
      serialNumber: '411034563'
    },
    {
      audiNo: 'Audi 2',
      siteName: 'PVR Phoenix Mall Mumbai',
      serialNumber: '411034564'
    }
  ]
);

// 5. DTR Cases Template (Simplified with Serial Number Mapping)
createExcelFile('dtr_cases.xlsx',
  ['caseNumber', 'errorDate', 'serialNumber', 'natureOfProblem', 'actionTaken', 'remarks', 'callStatus', 'caseSeverity', 'createdBy', 'assignedTo'],
  [
    {
      caseNumber: 'DTR-001',
      errorDate: '2024-12-09',
      serialNumber: '411034563',
      natureOfProblem: 'HORIZONTAL BARS VISIBLE ON SCREEN',
      actionTaken: 'Checked connections and lamp hours',
      remarks: 'Under warranty',
      callStatus: 'open',
      caseSeverity: 'high',
      createdBy: 'admin@crm.com',
      assignedTo: ''
    }
  ]
);

// 6. RMA Cases Template (Simplified with Serial Number Mapping)
createExcelFile('rma_cases.xlsx',
  [
    'rmaType',
    'callLogNumber',
    'rmaNumber',
    'rmaOrderNumber',
    'rmaRaisedDate',
    'customerErrorDate',
    'serialNumber',
    'productPartNumber',
    'defectDetails',
    'defectivePartName',
    'defectivePartNumber',
    'defectivePartSerial',
    'isDefectivePartDNR',
    'defectivePartDNRReason',
    'replacedPartNumber',
    'replacedPartSerial',
    'symptoms',
    'shippingCarrier',
    'trackingNumberOut',
    'shippedDate',
    'returnTrackingNumber',
    'returnShippedDate',
    'returnShippedThrough',
    'status',
    'createdBy',
    'assignedTo',
    'notes'
  ],
  [
    {
      rmaType: 'RMA',
      callLogNumber: '694531',
      rmaNumber: '176141',
      rmaOrderNumber: '300061',
      rmaRaisedDate: '2024-12-09',
      customerErrorDate: '2024-12-09',
      serialNumber: '411034563',
      productPartNumber: '000-001195-01',
      defectDetails: 'HORIZONTAL BARS VISIBLE ON SCREEN',
      defectivePartName: 'Assy. Ballast',
      defectivePartNumber: '000-001195-01',
      defectivePartSerial: 'C283631016',
      isDefectivePartDNR: 'false',
      defectivePartDNRReason: '',
      replacedPartNumber: '000-001195-01',
      replacedPartSerial: 'C283631012',
      symptoms: 'HORIZONTAL BARS VISIBLE ON SCREEN',
      shippingCarrier: 'CDS',
      trackingNumberOut: 'CDS',
      shippedDate: '2024-12-09',
      returnTrackingNumber: '100010106807',
      returnShippedDate: '2024-12-10',
      returnShippedThrough: 'DTDC',
      status: 'open',
      createdBy: 'admin@crm.com',
      assignedTo: '',
      notes: 'By CDS'
    }
  ]
);

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║                    ✅ Templates Created!                          ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

console.log('📁 Files created in: backend/data/');
console.log('');
console.log('📋 Template files:');
console.log('   1. sites.xlsx');
console.log('   2. projector_models.xlsx');
console.log('   3. projectors.xlsx');
console.log('   4. audis.xlsx');
console.log('   5. dtr_cases.xlsx');
console.log('   6. rma_cases.xlsx');
console.log('');
console.log('💡 Instructions:');
console.log('   1. Open each Excel file');
console.log('   2. Delete example rows (keep headers)');
console.log('   3. Add your data');
console.log('   4. Save files');
console.log('   5. Run: npm run import:bulk');
console.log('');

