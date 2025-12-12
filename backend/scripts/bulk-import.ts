// Enhanced Bulk Import Script for CRM Data

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface ImportStats {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

// Helper function to convert Excel serial date to JavaScript Date
function excelDateToJSDate(serial: number | string | Date): Date {
  // If it's already a Date object, return it
  if (serial instanceof Date) {
    return serial;
  }
  
  // If it's a string, try to parse it
  if (typeof serial === 'string') {
    const parsed = new Date(serial);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    // If string parsing failed, try to convert to number
    const num = parseFloat(serial);
    if (!isNaN(num)) {
      serial = num;
    } else {
      throw new Error(`Invalid date: ${serial}`);
    }
  }
  
  // If it's a number, convert Excel serial date to JS Date
  if (typeof serial === 'number') {
    // Excel dates are stored as days since 1900-01-01
    // JavaScript dates use milliseconds since 1970-01-01
    const utc_days = Math.floor(serial - 25569); // 25569 is the offset between Excel epoch and Unix epoch
    const utc_value = utc_days * 86400; // Convert days to seconds
    const date_info = new Date(utc_value * 1000); // Convert to milliseconds
    return date_info;
  }
  
  throw new Error(`Cannot convert date: ${serial}`);
}

// Helper function to read Excel file
function readExcelFile(filename: string): any[] {
  const filePath = path.join(__dirname, '../data', filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return [];
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

// Import Sites
async function importSites(): Promise<ImportStats> {
  console.log('\n📍 Importing Sites...');
  const data = readExcelFile('sites.xlsx');
  const stats: ImportStats = { total: data.length, success: 0, failed: 0, errors: [] };

  for (const row of data) {
    try {
      if (!row.siteName) {
        throw new Error('Site name is required');
      }
      
      // Check if site already exists
      const existingSite = await prisma.site.findFirst({
        where: { siteName: row.siteName },
      });
      
      if (existingSite) {
        stats.success++;
        console.log(`⏭️  Skipped (already exists): ${row.siteName}`);
        continue;
      }
      
      await prisma.site.create({
        data: {
          siteName: row.siteName,
        },
      });
      stats.success++;
      console.log(`✅ Created site: ${row.siteName}`);
    } catch (error: any) {
      stats.failed++;
      stats.errors.push(`Site "${row.siteName || 'Unknown'}": ${error.message}`);
      console.log(`❌ Failed: ${row.siteName || 'Unknown'} - ${error.message}`);
    }
  }

  return stats;
}

// Import Projector Models
async function importProjectorModels(): Promise<ImportStats> {
  console.log('\n🎬 Importing Projector Models...');
  const data = readExcelFile('projector_models.xlsx');
  const stats: ImportStats = { total: data.length, success: 0, failed: 0, errors: [] };

  for (const row of data) {
    try {
      if (!row.modelNo) {
        throw new Error('Model number is required');
      }
      
      // Check if model already exists
      const existingModel = await prisma.projectorModel.findUnique({
        where: { modelNo: row.modelNo },
      });
      
      if (existingModel) {
        stats.success++;
        console.log(`⏭️  Skipped (already exists): ${row.modelNo}`);
        continue;
      }
      
      await prisma.projectorModel.create({
        data: {
          modelNo: row.modelNo,
          manufacturer: row.manufacturer || null,
          specifications: row.specifications || null,
        },
      });
      stats.success++;
      console.log(`✅ Created model: ${row.modelNo}`);
    } catch (error: any) {
      stats.failed++;
      stats.errors.push(`Model "${row.modelNo}": ${error.message}`);
      console.log(`❌ Failed: ${row.modelNo} - ${error.message}`);
    }
  }

  return stats;
}

// Import Projectors
async function importProjectors(): Promise<ImportStats> {
  console.log('\n📽️ Importing Projectors...');
  const data = readExcelFile('projectors.xlsx');
  const stats: ImportStats = { total: data.length, success: 0, failed: 0, errors: [] };

  for (const row of data) {
    try {
      // Convert serialNumber to string (Excel may read it as number)
      const serialNumber = String(row.serialNumber || '').trim();
      
      if (!serialNumber) {
        throw new Error('Serial number is required');
      }
      
      // Check if projector already exists
      const existingProjector = await prisma.projector.findUnique({
        where: { serialNumber: serialNumber },
      });
      
      if (existingProjector) {
        stats.success++;
        console.log(`⏭️  Skipped (already exists): ${serialNumber}`);
        continue;
      }
      
      // Find the projector model
      const model = await prisma.projectorModel.findUnique({
        where: { modelNo: row.modelNo },
      });

      if (!model) {
        throw new Error(`Projector model "${row.modelNo}" not found. Import models first.`);
      }

      await prisma.projector.create({
        data: {
          serialNumber: serialNumber,
          projectorModelId: model.id,
          status: row.status || 'active',
          installationDate: row.installationDate ? excelDateToJSDate(row.installationDate) : null,
          notes: row.notes || null,
        },
      });
      stats.success++;
      console.log(`✅ Created projector: ${serialNumber}`);
    } catch (error: any) {
      stats.failed++;
      const serialNumberStr = String(row.serialNumber || 'Unknown').trim();
      stats.errors.push(`Projector "${serialNumberStr}": ${error.message}`);
      console.log(`❌ Failed: ${serialNumberStr} - ${error.message}`);
    }
  }

  return stats;
}

// Import Audis
async function importAudis(): Promise<ImportStats> {
  console.log('\n🎭 Importing Audis...');
  const data = readExcelFile('audis.xlsx');
  const stats: ImportStats = { total: data.length, success: 0, failed: 0, errors: [] };

  for (const row of data) {
    try {
      // Convert audiNo to string (Excel may read it as number)
      const audiNo = String(row.audiNo || '').trim();
      
      if (!audiNo) {
        throw new Error('Audi number is required');
      }
      
      if (!row.siteName) {
        throw new Error('Site name is required');
      }
      
      // Find the site
      const site = await prisma.site.findFirst({
        where: { siteName: row.siteName },
      });

      if (!site) {
        throw new Error(`Site "${row.siteName}" not found. Import sites first.`);
      }

      // Check if audi already exists at this site
      const existingAudi = await prisma.audi.findFirst({
        where: {
          audiNo: audiNo,
          siteId: site.id,
        },
      });
      
      if (existingAudi) {
        stats.success++;
        console.log(`⏭️  Skipped (already exists): ${audiNo} at ${row.siteName}`);
        continue;
      }

      // Find the projector (optional)
      let projectorId: string | undefined = undefined;
      if (row.serialNumber) {
        const projector = await prisma.projector.findUnique({
          where: { serialNumber: String(row.serialNumber) },
        });
        if (projector) {
          projectorId = projector.id;
        }
      }

      await prisma.audi.create({
        data: {
          audiNo: audiNo,
          siteId: site.id,
          projectorId: projectorId,
        },
      });
      stats.success++;
      console.log(`✅ Created audi: ${audiNo} at ${row.siteName}`);
    } catch (error: any) {
      stats.failed++;
      const audiNoStr = String(row.audiNo || 'Unknown').trim();
      stats.errors.push(`Audi "${audiNoStr}" at "${row.siteName || 'Unknown'}": ${error.message}`);
      console.log(`❌ Failed: ${audiNoStr} at ${row.siteName || 'Unknown'} - ${error.message}`);
    }
  }

  return stats;
}

// Import DTR Cases
async function importDTRCases(): Promise<ImportStats> {
  console.log('\n📋 Importing DTR Cases...');
  const data = readExcelFile('dtr_cases.xlsx');
  const stats: ImportStats = { total: data.length, success: 0, failed: 0, errors: [] };

  for (const row of data) {
    try {
      // Convert serial number to string
      const serialNumber = String(row.serialNumber || row.unitSerial || '').trim();
      
      if (!serialNumber) {
        throw new Error('Serial number is required');
      }

      // Look up projector by serial number, or create it if it doesn't exist
      let projector = await prisma.projector.findUnique({
        where: { serialNumber: serialNumber },
        include: {
          projectorModel: true,
        },
      });

      if (!projector) {
        // Auto-create projector with a default model if it doesn't exist
        // Try to infer model from unitModel if available
        let modelId: string | undefined;
        
        if (row.unitModel) {
          const model = await prisma.projectorModel.findFirst({
            where: { modelNo: row.unitModel },
          });
          if (model) {
            modelId = model.id;
          }
        }
        
        // If no model found, create a generic one or use first available
        if (!modelId) {
          let defaultModel = await prisma.projectorModel.findFirst();
          if (!defaultModel) {
            defaultModel = await prisma.projectorModel.create({
              data: {
                modelNo: 'UNKNOWN',
                manufacturer: 'Unknown',
                specifications: 'Auto-created default model',
              },
            });
          }
          modelId = defaultModel.id;
        }
        
        projector = await prisma.projector.create({
          data: {
            serialNumber: serialNumber,
            projectorModelId: modelId,
            status: 'active',
            notes: 'Auto-created during DTR import',
          },
          include: {
            projectorModel: true,
          },
        });
        console.log(`   ℹ️  Auto-created projector: ${serialNumber}`);
      }

      // Find the audi that has this projector
      let audi = await prisma.audi.findFirst({
        where: { projectorId: projector.id },
        include: { site: true },
      });

      if (!audi) {
        // Auto-create audi if it doesn't exist - DTR needs an audi
        // Try to find site from row data or use first available site
        let siteId: string | undefined;
        
        if (row.siteName) {
          const site = await prisma.site.findFirst({
            where: { siteName: row.siteName },
          });
          if (site) {
            siteId = site.id;
          }
        }
        
        if (!siteId) {
          const defaultSite = await prisma.site.findFirst();
          if (!defaultSite) {
            throw new Error(`No sites available in database. Please import sites first.`);
          }
          siteId = defaultSite.id;
        }
        
        // Generate a unique audiNo
        const audiCount = await prisma.audi.count();
        const audiNo = `AUTO-${audiCount + 1}`;
        
        audi = await prisma.audi.create({
          data: {
            siteId: siteId,
            audiNo: audiNo,
            projectorId: projector.id,
          },
          include: { site: true },
        });
        console.log(`   ℹ️  Auto-created audi: ${audiNo} for projector ${serialNumber}`);
      }

      // Find creator user
      const creator = await prisma.user.findUnique({
        where: { email: row.createdBy || 'admin@crm.com' },
      });

      if (!creator) {
        throw new Error(`User "${row.createdBy || 'admin@crm.com'}" not found`);
      }

      // Find assignee (optional)
      let assigneeId: string | undefined = undefined;
      if (row.assignedTo) {
        const assignee = await prisma.user.findUnique({
          where: { email: row.assignedTo },
        });
        if (assignee) {
          assigneeId = assignee.id;
        }
      }

      // Handle duplicate case numbers by appending suffix
      let caseNumber = String(row.caseNumber).trim();
      let suffix = 0;
      let uniqueCaseNumber = caseNumber;
      
      while (await prisma.dtrCase.findFirst({ where: { caseNumber: uniqueCaseNumber } })) {
        suffix++;
        uniqueCaseNumber = `${caseNumber}-${suffix}`;
      }
      
      if (suffix > 0) {
        console.log(`   ℹ️  Case #${caseNumber} already exists, using ${uniqueCaseNumber}`);
      }
      
      // Map invalid callStatus to valid values
      let callStatus = (row.callStatus || 'open').toLowerCase().replace(/\s+/g, '_');
      const statusMapping: { [key: string]: string } = {
        'observation': 'open',
        'waiting_cust_responses': 'in_progress',
        'rma_part_return_to_cds': 'closed'
      };
      callStatus = statusMapping[callStatus] || callStatus;
      
      // Map invalid caseSeverity to valid values
      let caseSeverity = (row.caseSeverity || 'medium').toLowerCase();
      const severityMapping: { [key: string]: string } = {
        'major': 'high',
        'minor': 'medium'
      };
      caseSeverity = severityMapping[caseSeverity] || caseSeverity;
      
      // Validate required fields
      if (!row.natureOfProblem) {
        throw new Error('natureOfProblem is required');
      }

      const dtrData: any = {
        caseNumber: uniqueCaseNumber,
        errorDate: excelDateToJSDate(row.errorDate),
        siteId: audi.siteId,
        audiId: audi.id,
        unitModel: projector.projectorModel?.modelNo || 'Unknown',
        unitSerial: serialNumber,
        natureOfProblem: row.natureOfProblem,
        actionTaken: row.actionTaken || '',
        remarks: row.remarks || null,
        callStatus: callStatus,
        caseSeverity: caseSeverity,
        createdBy: creator.id,
      };
      
      if (assigneeId) {
        dtrData.assignedTo = assigneeId;
      }

      await prisma.dtrCase.create({
        data: dtrData,
      });
      stats.success++;
      console.log(`✅ Created DTR: ${row.caseNumber} (Serial: ${serialNumber}, Site: ${audi.site.siteName})`);
    } catch (error: any) {
      stats.failed++;
      const serialNumber = String(row.serialNumber || row.unitSerial || 'Unknown').trim();
      stats.errors.push(`DTR "${row.caseNumber}" (Serial: ${serialNumber}): ${error.message}`);
      console.log(`❌ Failed: ${row.caseNumber} - ${error.message}`);
    }
  }

  return stats;
}

// Import RMA Cases
async function importRMACases(): Promise<ImportStats> {
  console.log('\n📦 Importing RMA Cases...');
  const data = readExcelFile('rma_cases.xlsx');
  const stats: ImportStats = { total: data.length, success: 0, failed: 0, errors: [] };

  for (const row of data) {
    try {
      // Convert serial number to string
      const serialNumber = String(row.serialNumber || '').trim();
      
      if (!serialNumber) {
        throw new Error('Serial number is required');
      }

      // Look up projector by serial number, or create it if it doesn't exist
      let projector = await prisma.projector.findUnique({
        where: { serialNumber: serialNumber },
        include: {
          projectorModel: true,
        },
      });

      if (!projector) {
        // Auto-create projector with a default model if it doesn't exist
        // Try to infer model from productName if available
        let modelId: string | undefined;
        
        if (row.productName) {
          const model = await prisma.projectorModel.findFirst({
            where: { modelNo: row.productName },
          });
          if (model) {
            modelId = model.id;
          }
        }
        
        // If no model found, create a generic one or use first available
        if (!modelId) {
          let defaultModel = await prisma.projectorModel.findFirst();
          if (!defaultModel) {
            defaultModel = await prisma.projectorModel.create({
              data: {
                modelNo: 'UNKNOWN',
                manufacturer: 'Unknown',
                specifications: 'Auto-created default model',
              },
            });
          }
          modelId = defaultModel.id;
        }
        
        projector = await prisma.projector.create({
          data: {
            serialNumber: serialNumber,
            projectorModelId: modelId,
            status: 'active',
            notes: 'Auto-created during RMA import',
          },
          include: {
            projectorModel: true,
          },
        });
        console.log(`   ℹ️  Auto-created projector: ${serialNumber}`);
      }

      // Find the audi that has this projector
      const audi = await prisma.audi.findFirst({
        where: { projectorId: projector.id },
        include: { site: true },
      });

      // Audi is optional for RMA, but if the projector is assigned to an audi, we use it
      let audiId: string | undefined = undefined;
      let siteId: string;

      if (audi) {
        audiId = audi.id;
        siteId = audi.siteId;
      } else {
        // If no audi found, try to get site from siteName if provided
        if (row.siteName) {
          const site = await prisma.site.findFirst({
            where: { siteName: row.siteName },
          });
          if (!site) {
            throw new Error(`Site "${row.siteName}" not found`);
          }
          siteId = site.id;
        } else {
          throw new Error(`No audi found for projector "${serialNumber}" and no site name provided`);
        }
      }

      // Find creator user
      const creator = await prisma.user.findUnique({
        where: { email: row.createdBy || 'admin@crm.com' },
      });

      if (!creator) {
        throw new Error(`User "${row.createdBy || 'admin@crm.com'}" not found`);
      }

      // Find assignee (optional)
      let assigneeId: string | undefined = undefined;
      if (row.assignedTo) {
        const assignee = await prisma.user.findUnique({
          where: { email: row.assignedTo },
        });
        if (assignee) {
          assigneeId = assignee.id;
        }
      }

      // Handle duplicate RMA numbers by appending suffix
      let rmaNumber = row.rmaNumber ? String(row.rmaNumber).trim() : null;
      if (rmaNumber) {
        let suffix = 0;
        let uniqueRmaNumber = rmaNumber;
        
        // Check if RMA number already exists
        while (await prisma.rmaCase.findFirst({ where: { rmaNumber: uniqueRmaNumber } })) {
          suffix++;
          uniqueRmaNumber = `${rmaNumber}-${suffix}`;
        }
        
        if (suffix > 0) {
          console.log(`   ℹ️  RMA #${rmaNumber} already exists, using ${uniqueRmaNumber}`);
        }
        rmaNumber = uniqueRmaNumber;
      }

      const rmaData: any = {
        rmaType: (row.rmaType || 'RMA').trim().replace('RMA CI', 'RMA CL'), // Fix typo: CI → CL
        callLogNumber: row.callLogNumber ? String(row.callLogNumber).trim() : null,
        rmaNumber: rmaNumber,
        rmaOrderNumber: row.rmaOrderNumber ? String(row.rmaOrderNumber).trim() : null,
        rmaRaisedDate: excelDateToJSDate(row.rmaRaisedDate),
        customerErrorDate: excelDateToJSDate(row.customerErrorDate),
        siteId: siteId,
        productName: projector.projectorModel?.modelNo || row.productName || 'Unknown',
        productPartNumber: row.productPartNumber || null,
        serialNumber: serialNumber,
        defectDetails: row.defectDetails || null,
        defectivePartName: row.defectivePartName || null,
        defectivePartNumber: row.defectivePartNumber || null,
        defectivePartSerial: row.defectivePartSerial || null,
        isDefectivePartDNR: row.isDefectivePartDNR === true || row.isDefectivePartDNR === 'true' || false,
        defectivePartDNRReason: row.defectivePartDNRReason || null,
        replacedPartNumber: row.replacedPartNumber || null,
        replacedPartSerial: row.replacedPartSerial || null,
        symptoms: row.symptoms || null,
        shippingCarrier: row.shippingCarrier || null,
        trackingNumberOut: row.trackingNumberOut ? String(row.trackingNumberOut).trim() : null,
        returnTrackingNumber: row.returnTrackingNumber ? String(row.returnTrackingNumber).trim() : null,
        returnShippedThrough: row.returnShippedThrough || null,
        status: (row.status || 'open').toLowerCase().replace(/\s+/g, '_'),
        createdBy: creator.id,
        notes: row.notes || null,
      };
      
      // Optional fields - only include if they exist
      if (audiId) {
        rmaData.audiId = audiId;
      }
      
      if (assigneeId) {
        rmaData.assignedTo = assigneeId;
      }
      
      // Handle optional date fields - only add if valid
      if (row.shippedDate) {
        try {
          const shippedDate = excelDateToJSDate(row.shippedDate);
          if (!isNaN(shippedDate.getTime())) {
            rmaData.shippedDate = shippedDate;
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
      
      if (row.returnShippedDate) {
        try {
          // Skip if it's "DNR" text or other non-date values
          const returnDate = excelDateToJSDate(row.returnShippedDate);
          if (!isNaN(returnDate.getTime())) {
            rmaData.returnShippedDate = returnDate;
          }
        } catch (e) {
          // Skip invalid dates
        }
      }

      await prisma.rmaCase.create({
        data: rmaData,
      });
      stats.success++;
      const siteName = audi?.site?.siteName || 'Unknown';
      console.log(`✅ Created RMA: ${row.rmaNumber || row.callLogNumber || 'N/A'} (Serial: ${serialNumber}, Site: ${siteName})`);
    } catch (error: any) {
      stats.failed++;
      const serialNumber = String(row.serialNumber || 'Unknown').trim();
      stats.errors.push(`RMA "${row.rmaNumber || row.callLogNumber || 'N/A'}" (Serial: ${serialNumber}): ${error.message}`);
      console.log(`❌ Failed: ${row.rmaNumber || 'N/A'} - ${error.message}`);
    }
  }

  return stats;
}

// Main import function
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              📊 CRM Bulk Data Import Script                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const allStats: { [key: string]: ImportStats } = {};

  try {
    // Import in correct order
    allStats['Sites'] = await importSites();
    allStats['Projector Models'] = await importProjectorModels();
    allStats['Projectors'] = await importProjectors();
    allStats['Audis'] = await importAudis();
    
    // Import RMA and DTR cases
    allStats['RMA Cases'] = await importRMACases();
    allStats['DTR Cases'] = await importDTRCases();

    // Print summary
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 Import Summary                             ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    let totalSuccess = 0;
    let totalFailed = 0;

    for (const [category, stats] of Object.entries(allStats)) {
      console.log(`${category}:`);
      console.log(`  Total: ${stats.total} | ✅ Success: ${stats.success} | ❌ Failed: ${stats.failed}`);
      if (stats.errors.length > 0) {
        console.log(`  Errors:`);
        stats.errors.slice(0, 5).forEach(err => console.log(`    - ${err}`));
        if (stats.errors.length > 5) {
          console.log(`    ... and ${stats.errors.length - 5} more errors`);
        }
      }
      console.log('');
      totalSuccess += stats.success;
      totalFailed += stats.failed;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Total Success: ${totalSuccess}`);
    console.log(`❌ Total Failed: ${totalFailed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (totalFailed === 0) {
      console.log('🎉 All data imported successfully!');
    } else {
      console.log('⚠️  Some records failed to import. Check errors above.');
    }

  } catch (error) {
    console.error('💥 Fatal error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

