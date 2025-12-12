import { useState, useEffect } from 'react';

// Master Data Interfaces
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'staff' | 'engineer' | 'manager' | 'admin';
  active: boolean;
  createdDate: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'assignment' | 'status-change' | 'escalation' | 'info';
  caseId: string;
  caseType: 'DTR' | 'RMA';
  read: boolean;
  timestamp: string;
}

export interface Projector {
  id: string;
  modelNo: string; // Product Name
  serialNumber: string;
}

export interface Audi {
  id: string;
  audiNo: string;
  siteId: string;
  projector: Projector;
}

export interface Site {
  id: string;
  siteName: string;
  audis: Audi[];
}

export interface DTRCase {
  id: string;
  errorDate: string;
  caseNumber: string;
  site: string;
  audiNo: string;
  unitModel: string;
  unitSerial: string;
  natureOfProblem: string;
  actionTaken: string;
  remarks: string;
  callStatus: 'open' | 'in-progress' | 'closed' | 'escalated';
  caseSeverity: 'low' | 'medium' | 'high' | 'critical';
  createdBy: string;
  createdDate: string;
  assignedTo?: string;
  closedBy?: string;
  closedDate?: string;
  finalRemarks?: string;
  auditLog: AuditEntry[];
}

export interface RMACase {
  id: string;
  rmaType: 'RMA' | 'SRMA' | 'RMA_CL' | 'Lamps';  // Updated: 4 types
  callLogNumber?: string;  // NOT linked to DTR
  rmaNumber?: string;  // Now optional (PO number)
  rmaOrderNumber?: string;  // Now optional
  rmaRaisedDate: string; // Internal creation date
  customerErrorDate: string; // Date issue actually occurred
  siteName: string;
  audiNo: string;
  productName: string; // Changed from productDetails
  productPartNumber: string; // New field
  serialNumber: string;
  defectDetails?: string;  // NEW: Dedicated defect details field
  defectivePartNumber?: string;
  defectivePartName?: string; // New field
  defectivePartSerial?: string;
  isDefectivePartDNR?: boolean;  // NEW: Do Not Return flag
  defectivePartDNRReason?: string;  // NEW: DNR reason
  replacedPartNumber?: string;
  replacedPartSerial?: string;
  symptoms: string;
  // Replacement Part Tracking
  shippingCarrier?: string;
  trackingNumberOut?: string;
  shippedDate?: string;
  // Defective Part Return Tracking
  returnShippedDate?: string; // New field
  returnTrackingNumber?: string; // New field
  returnShippedThrough?: string; // New field
  status: 'open' | 'rma_raised_yet_to_deliver' | 'faulty_in_transit_to_cds' | 'closed' | 'cancelled';  // Updated statuses
  createdBy: string;
  assignedTo?: string;
  notes?: string;
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

// Initialize Users from localStorage or create new
const getInitialUsers = (): User[] => {
  const stored = localStorage.getItem('users');
  if (stored) {
    return JSON.parse(stored);
  }
  
  return [
    {
      id: 'u1',
      name: 'John Staff',
      email: 'staff@company.com',
      role: 'staff',
      active: true,
      createdDate: '2024-01-01T00:00:00Z',
    },
    {
      id: 'u2',
      name: 'Sarah Engineer',
      email: 'engineer@company.com',
      role: 'engineer',
      active: true,
      createdDate: '2024-01-01T00:00:00Z',
    },
    {
      id: 'u3',
      name: 'Mike Manager',
      email: 'manager@company.com',
      role: 'manager',
      active: true,
      createdDate: '2024-01-01T00:00:00Z',
    },
    {
      id: 'u4',
      name: 'Admin User',
      email: 'admin@company.com',
      role: 'admin',
      active: true,
      createdDate: '2024-01-01T00:00:00Z',
    },
    {
      id: 'u5',
      name: 'Tom Engineer',
      email: 'tom.engineer@company.com',
      role: 'engineer',
      active: true,
      createdDate: '2024-02-15T00:00:00Z',
    },
    {
      id: 'u6',
      name: 'Lisa Senior Engineer',
      email: 'lisa.engineer@company.com',
      role: 'engineer',
      active: true,
      createdDate: '2024-03-20T00:00:00Z',
    },
  ];
};

// Initialize Notifications from localStorage or create new
const getInitialNotifications = (): Notification[] => {
  const stored = localStorage.getItem('notifications');
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
};

// Initialize Master Data from localStorage or create new
const getInitialSites = (): Site[] => {
  const stored = localStorage.getItem('master_sites');
  if (stored) {
    return JSON.parse(stored);
  }
  
  return [
    // PVR Cinemas - Mumbai
    {
      id: 's1',
      siteName: 'PVR Phoenix Mall Mumbai',
      audis: [
        {
          id: 'a1',
          audiNo: 'Audi 1',
          siteId: 's1',
          projector: {
            id: 'p1',
            modelNo: 'Christie CP2220',
            serialNumber: 'CP2220-MUM-A1-001',
          },
        },
        {
          id: 'a2',
          audiNo: 'Audi 2',
          siteId: 's1',
          projector: {
            id: 'p2',
            modelNo: 'Christie CP2220',
            serialNumber: 'CP2220-MUM-A2-002',
          },
        },
        {
          id: 'a3',
          audiNo: 'Audi 3',
          siteId: 's1',
          projector: {
            id: 'p3',
            modelNo: 'Barco DP2K-20C',
            serialNumber: 'BARCO-MUM-A3-001',
          },
        },
      ],
    },
    // PVR Cinemas - Delhi
    {
      id: 's2',
      siteName: 'PVR Select CityWalk Delhi',
      audis: [
        {
          id: 'a4',
          audiNo: 'Audi 1',
          siteId: 's2',
          projector: {
            id: 'p4',
            modelNo: 'Christie CP2220',
            serialNumber: 'CP2220-DEL-A1-003',
          },
        },
        {
          id: 'a5',
          audiNo: 'Audi 2',
          siteId: 's2',
          projector: {
            id: 'p5',
            modelNo: 'NEC NC1200C',
            serialNumber: 'NEC-DEL-A2-001',
          },
        },
        {
          id: 'a6',
          audiNo: 'Audi 3 IMAX',
          siteId: 's2',
          projector: {
            id: 'p6',
            modelNo: 'Barco DP4K-32B',
            serialNumber: 'BARCO-DEL-IMAX-001',
          },
        },
      ],
    },
    // INOX - Bangalore
    {
      id: 's3',
      siteName: 'INOX Garuda Mall Bangalore',
      audis: [
        {
          id: 'a7',
          audiNo: 'Screen 1',
          siteId: 's3',
          projector: {
            id: 'p7',
            modelNo: 'Christie CP2220',
            serialNumber: 'CP2220-BLR-S1-004',
          },
        },
        {
          id: 'a8',
          audiNo: 'Screen 2',
          siteId: 's3',
          projector: {
            id: 'p8',
            modelNo: 'Sony SRX-R515P',
            serialNumber: 'SONY-BLR-S2-001',
          },
        },
      ],
    },
    // Cinepolis - Pune
    {
      id: 's4',
      siteName: 'Cinepolis Seasons Mall Pune',
      audis: [
        {
          id: 'a9',
          audiNo: 'Audi 1',
          siteId: 's4',
          projector: {
            id: 'p9',
            modelNo: 'NEC NC1200C',
            serialNumber: 'NEC-PUN-A1-002',
          },
        },
        {
          id: 'a10',
          audiNo: 'Audi 2',
          siteId: 's4',
          projector: {
            id: 'p10',
            modelNo: 'Christie CP2220',
            serialNumber: 'CP2220-PUN-A2-005',
          },
        },
      ],
    },
    // Carnival Cinemas - Hyderabad
    {
      id: 's5',
      siteName: 'Carnival Cinemas Forum Sujana Mall Hyderabad',
      audis: [
        {
          id: 'a11',
          audiNo: 'Screen 1',
          siteId: 's5',
          projector: {
            id: 'p11',
            modelNo: 'Barco DP2K-15C',
            serialNumber: 'BARCO-HYD-S1-001',
          },
        },
        {
          id: 'a12',
          audiNo: 'Screen 2',
          siteId: 's5',
          projector: {
            id: 'p12',
            modelNo: 'Christie CP2220',
            serialNumber: 'CP2220-HYD-S2-006',
          },
        },
        {
          id: 'a13',
          audiNo: 'Screen 3',
          siteId: 's5',
          projector: {
            id: 'p13',
            modelNo: 'NEC NC1200C',
            serialNumber: 'NEC-HYD-S3-003',
          },
        },
      ],
    },
  ];
};

// Initialize mock data from localStorage or create new
const getInitialDTRCases = (): DTRCase[] => {
  const stored = localStorage.getItem('dtr_cases');
  if (stored) {
    return JSON.parse(stored);
  }
  
  return [
    {
      id: '1',
      errorDate: '2024-12-01',
      caseNumber: '241201',
      site: 'ABC Conference Center',
      audiNo: 'Audi 1',
      unitModel: 'Epson EB-L1500U',
      unitSerial: 'EPL1500-2023-001',
      natureOfProblem: 'No display output, power LED blinking red',
      actionTaken: 'Checked power supply and cables. Lamp hour exceeded limit. Recommended lamp replacement.',
      remarks: 'Customer reported issue started after 3000 hours of usage',
      callStatus: 'in-progress',
      caseSeverity: 'high',
      createdBy: 'staff@company.com',
      createdDate: '2024-12-01T09:30:00Z',
      assignedTo: 'engineer@company.com',
      auditLog: [
        {
          id: 'a1',
          timestamp: '2024-12-01T09:30:00Z',
          user: 'staff@company.com',
          action: 'Created',
          details: 'DTR case created',
        },
        {
          id: 'a2',
          timestamp: '2024-12-01T10:15:00Z',
          user: 'manager@company.com',
          action: 'Assigned',
          details: 'Assigned to engineer@company.com',
        },
      ],
    },
    {
      id: '2',
      errorDate: '2024-12-03',
      caseNumber: '241202',
      site: 'XYZ Corporate HQ',
      audiNo: 'Audi 1',
      unitModel: 'Sony VPL-FHZ75',
      unitSerial: 'SONY-FHZ-2022-045',
      natureOfProblem: 'Image distortion and color banding',
      actionTaken: 'Performed firmware update and lens calibration. Issue resolved.',
      remarks: 'Firmware was 2 versions behind',
      callStatus: 'closed',
      caseSeverity: 'medium',
      createdBy: 'engineer@company.com',
      createdDate: '2024-12-03T11:00:00Z',
      assignedTo: 'engineer@company.com',
      closedBy: 'engineer@company.com',
      closedDate: '2024-12-03T14:30:00Z',
      finalRemarks: 'Firmware updated to v2.45. Customer satisfied with results.',
      auditLog: [
        {
          id: 'a3',
          timestamp: '2024-12-03T11:00:00Z',
          user: 'engineer@company.com',
          action: 'Created',
          details: 'DTR case created',
        },
        {
          id: 'a4',
          timestamp: '2024-12-03T14:30:00Z',
          user: 'engineer@company.com',
          action: 'Closed',
          details: 'Case resolved and closed',
        },
      ],
    },
    {
      id: '3',
      errorDate: '2024-12-05',
      caseNumber: '241203',
      site: 'Tech University Auditorium',
      audiNo: 'Main Hall',
      unitModel: 'Panasonic PT-RZ990',
      unitSerial: 'PANA-RZ990-2023-078',
      natureOfProblem: 'Complete system failure, won&apos;t power on',
      actionTaken: 'Power supply unit diagnosed as faulty. Requires replacement part.',
      remarks: 'Unit still under warranty',
      callStatus: 'escalated',
      caseSeverity: 'critical',
      createdBy: 'staff@company.com',
      createdDate: '2024-12-05T08:00:00Z',
      assignedTo: 'engineer@company.com',
      auditLog: [
        {
          id: 'a5',
          timestamp: '2024-12-05T08:00:00Z',
          user: 'staff@company.com',
          action: 'Created',
          details: 'DTR case created',
        },
        {
          id: 'a6',
          timestamp: '2024-12-05T12:00:00Z',
          user: 'engineer@company.com',
          action: 'Escalated',
          details: 'Escalated to RMA - faulty PSU requires replacement',
        },
      ],
    },
    {
      id: '4',
      errorDate: '2024-12-06',
      caseNumber: '241204',
      site: 'Downtown Cinema Complex',
      audiNo: 'Theater 1',
      unitModel: 'Barco UDX-4K32',
      unitSerial: 'BARCO-UDX-2024-012',
      natureOfProblem: 'Intermittent shutdown during operation',
      actionTaken: 'Monitoring temperature and investigating cooling system',
      remarks: 'Issue occurs after 2-3 hours of continuous operation',
      callStatus: 'open',
      caseSeverity: 'high',
      createdBy: 'engineer@company.com',
      createdDate: '2024-12-06T16:20:00Z',
      assignedTo: 'engineer@company.com',
      auditLog: [
        {
          id: 'a7',
          timestamp: '2024-12-06T16:20:00Z',
          user: 'engineer@company.com',
          action: 'Created',
          details: 'DTR case created',
        },
      ],
    },
    {
      id: '5',
      errorDate: '2024-12-07',
      caseNumber: '241205',
      site: 'City Hall Meeting Room',
      audiNo: 'Conference Room A',
      unitModel: 'Epson EB-2250U',
      unitSerial: 'EPL2250-2023-156',
      natureOfProblem: 'Network connectivity issues with control system',
      actionTaken: 'Reset network settings and updated control software',
      remarks: 'Customer network had IP conflicts',
      callStatus: 'closed',
      caseSeverity: 'low',
      createdBy: 'staff@company.com',
      createdDate: '2024-12-07T10:00:00Z',
      assignedTo: 'engineer@company.com',
      closedBy: 'engineer@company.com',
      closedDate: '2024-12-07T11:30:00Z',
      finalRemarks: 'Network reconfigured. System working properly.',
      auditLog: [
        {
          id: 'a8',
          timestamp: '2024-12-07T10:00:00Z',
          user: 'staff@company.com',
          action: 'Created',
          details: 'DTR case created',
        },
        {
          id: 'a9',
          timestamp: '2024-12-07T11:30:00Z',
          user: 'engineer@company.com',
          action: 'Closed',
          details: 'Network issue resolved',
        },
      ],
    },
  ];
};

const getInitialRMACases = (): RMACase[] => {
  const stored = localStorage.getItem('rma_cases');
  if (stored) {
    return JSON.parse(stored);
  }
  
  return [
    {
      id: 'r1',
      rmaType: 'RMA',
      callLogNumber: '241203',
      rmaNumber: 'RMA-2024-001',
      rmaOrderNumber: 'SX-2024-001',
      rmaRaisedDate: '2024-12-05',
      customerErrorDate: '2024-12-03',
      siteName: 'Tech University Auditorium',
      audiNo: 'Main Hall',
      productName: 'Panasonic PT-RZ990 Projector',
      productPartNumber: 'PT-RZ990-BLK',
      serialNumber: 'PANA-RZ990-2023-078',
      defectivePartNumber: 'PSU-RZ990-01',
      defectivePartName: 'Power Supply Unit',
      defectivePartSerial: 'PSU-2023-078-A',
      replacedPartNumber: 'PSU-RZ990-01',
      replacedPartSerial: 'PSU-2024-234-B',
      symptoms: 'Complete power failure, unit won&apos;t turn on. Diagnosed as faulty PSU.',
      shippingCarrier: 'FedEx',
      trackingNumberOut: 'FDX123456789',
      shippedDate: '2024-12-06',
      returnShippedDate: '2024-12-15',
      returnTrackingNumber: 'FDX987654321',
      returnShippedThrough: 'FedEx',
      status: 'faulty_in_transit_to_cds',
      createdBy: 'engineer@company.com',
      assignedTo: 'engineer@company.com',
      notes: 'Expedited shipping requested due to critical severity',
      auditLog: [
        {
          id: 'ar1',
          timestamp: '2024-12-05T12:30:00Z',
          user: 'engineer@company.com',
          action: 'Created',
          details: 'RMA case created from DTR escalation',
        },
        {
          id: 'ar2',
          timestamp: '2024-12-05T14:00:00Z',
          user: 'manager@company.com',
          action: 'Approved',
          details: 'RMA approved under warranty',
        },
        {
          id: 'ar3',
          timestamp: '2024-12-06T09:00:00Z',
          user: 'staff@company.com',
          action: 'Shipped',
          details: 'Replacement part shipped via FedEx - FDX123456789',
        },
      ],
    },
    {
      id: 'r2',
      rmaType: 'RMA',
      rmaNumber: 'RMA-2024-002',
      rmaOrderNumber: 'S4-2024-002',
      rmaRaisedDate: '2024-11-28',
      customerErrorDate: '2024-11-26',
      siteName: 'Medical Center Auditorium',
      audiNo: 'Audi 1',
      productName: 'Sony VPL-GTZ380 Projector',
      productPartNumber: 'VPL-GTZ380',
      serialNumber: 'SONY-GTZ-2022-099',
      defectivePartNumber: 'LENS-GTZ380-A1',
      defectivePartName: 'Optical Lens Assembly',
      defectivePartSerial: 'LENS-2022-099-C',
      replacedPartNumber: 'LENS-GTZ380-A1',
      replacedPartSerial: 'LENS-2024-445-D',
      symptoms: 'Focus issue, unable to achieve sharp image. Lens assembly damaged.',
      shippingCarrier: 'UPS',
      trackingNumberOut: 'UPS987654321',
      shippedDate: '2024-11-29',
      returnShippedDate: '2024-12-02',
      returnTrackingNumber: 'UPS123789456',
      returnShippedThrough: 'UPS',
      status: 'closed',
      createdBy: 'staff@company.com',
      assignedTo: 'engineer@company.com',
      notes: 'Lens replaced and calibrated. Unit tested and working properly.',
      auditLog: [
        {
          id: 'ar4',
          timestamp: '2024-11-28T10:00:00Z',
          user: 'staff@company.com',
          action: 'Created',
          details: 'RMA case created',
        },
        {
          id: 'ar5',
          timestamp: '2024-11-28T11:30:00Z',
          user: 'manager@company.com',
          action: 'Approved',
          details: 'RMA approved for repair',
        },
        {
          id: 'ar6',
          timestamp: '2024-11-29T08:00:00Z',
          user: 'staff@company.com',
          action: 'Shipped',
          details: 'Replacement part shipped - UPS987654321',
        },
        {
          id: 'ar7',
          timestamp: '2024-12-02T14:00:00Z',
          user: 'engineer@company.com',
          action: 'Received',
          details: 'Part received and installed',
        },
        {
          id: 'ar8',
          timestamp: '2024-12-02T16:00:00Z',
          user: 'engineer@company.com',
          action: 'Completed',
          details: 'Repair completed and tested',
        },
      ],
    },
    {
      id: 'r3',
      rmaType: 'Lamps',
      rmaNumber: 'RMA-2024-003',
      rmaOrderNumber: 'SX-2024-003',
      rmaRaisedDate: '2024-12-04',
      customerErrorDate: '2024-12-02',
      siteName: 'Corporate Training Center',
      audiNo: 'Training Room 1',
      productName: 'Epson EB-L1755U Projector',
      productPartNumber: 'EB-L1755U',
      serialNumber: 'EPL1755-2023-234',
      defectivePartNumber: 'LAMP-L1755-V2',
      defectivePartName: 'Projection Lamp',
      defectivePartSerial: 'LAMP-2023-234-E',
      symptoms: 'Lamp failure after 2500 hours. No output.',
      status: 'open',
      createdBy: 'engineer@company.com',
      assignedTo: 'manager@company.com',
      notes: 'Awaiting warranty approval from manufacturer',
      auditLog: [
        {
          id: 'ar9',
          timestamp: '2024-12-04T13:00:00Z',
          user: 'engineer@company.com',
          action: 'Created',
          details: 'RMA case created',
        },
        {
          id: 'ar10',
          timestamp: '2024-12-04T13:30:00Z',
          user: 'manager@company.com',
          action: 'Under Review',
          details: 'Submitted to manufacturer for warranty approval',
        },
      ],
    },
    {
      id: 'r4',
      rmaType: 'RMA_CL',
      rmaNumber: 'RMA-2024-004',
      rmaOrderNumber: 'S4-2024-004',
      rmaRaisedDate: '2024-10-15',
      customerErrorDate: '2024-10-10',
      siteName: 'Downtown Convention Center',
      audiNo: 'Main Hall',
      productName: 'Barco UDX-4K32 Projector',
      productPartNumber: 'UDX-4K32',
      serialNumber: 'BARCO-UDX-2023-055',
      defectivePartNumber: 'DMD-CHIP-4K32',
      defectivePartName: 'DMD Chip Assembly',
      defectivePartSerial: 'DMD-2023-055-X',
      replacedPartNumber: 'DMD-CHIP-4K32',
      replacedPartSerial: 'DMD-2024-888-Y',
      symptoms: 'Image artifacts and pixel failures on DMD chip.',
      shippingCarrier: 'DHL',
      trackingNumberOut: 'DHL456789123',
      shippedDate: '2024-10-18',
      status: 'faulty_in_transit_to_cds',
      createdBy: 'engineer@company.com',
      assignedTo: 'engineer@company.com',
      notes: 'High-value part, expedited shipping used. Awaiting defective return.',
      auditLog: [
        {
          id: 'ar11',
          timestamp: '2024-10-15T10:00:00Z',
          user: 'engineer@company.com',
          action: 'Created',
          details: 'CI RMA case created',
        },
        {
          id: 'ar12',
          timestamp: '2024-10-16T09:00:00Z',
          user: 'manager@company.com',
          action: 'Approved',
          details: 'CI RMA approved',
        },
        {
          id: 'ar13',
          timestamp: '2024-10-18T08:00:00Z',
          user: 'staff@company.com',
          action: 'Shipped',
          details: 'Replacement shipped via DHL - DHL456789123',
        },
      ],
    },
  ];
};

export function useMockData() {
  const [dtrCases, setDTRCases] = useState<DTRCase[]>(getInitialDTRCases);
  const [rmaCases, setRMACases] = useState<RMACase[]>(getInitialRMACases);

  // Persist to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('dtr_cases', JSON.stringify(dtrCases));
  }, [dtrCases]);

  useEffect(() => {
    localStorage.setItem('rma_cases', JSON.stringify(rmaCases));
  }, [rmaCases]);

  const addDTRCase = (newCase: Omit<DTRCase, 'id' | 'auditLog'>) => {
    const dtrCase: DTRCase = {
      ...newCase,
      id: `dtr-${Date.now()}`,
      auditLog: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: newCase.createdBy,
          action: 'Created',
          details: 'DTR case created',
        },
      ],
    };
    setDTRCases(prev => [dtrCase, ...prev]);
    return dtrCase;
  };

  const updateDTRCase = (id: string, updates: Partial<DTRCase>, user: string, action: string, details: string) => {
    setDTRCases(prev => prev.map(dtr => {
      if (dtr.id === id) {
        return {
          ...dtr,
          ...updates,
          auditLog: [
            ...dtr.auditLog,
            {
              id: `audit-${Date.now()}`,
              timestamp: new Date().toISOString(),
              user,
              action,
              details,
            },
          ],
        };
      }
      return dtr;
    }));
  };

  const addRMACase = (newCase: Omit<RMACase, 'id' | 'auditLog'>) => {
    const rmaCase: RMACase = {
      ...newCase,
      id: `rma-${Date.now()}`,
      auditLog: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: newCase.createdBy,
          action: 'Created',
          details: 'RMA case created',
        },
      ],
    };
    setRMACases(prev => [rmaCase, ...prev]);
    return rmaCase;
  };

  const updateRMACase = (id: string, updates: Partial<RMACase>, user: string, action: string, details: string) => {
    setRMACases(prev => prev.map(rma => {
      if (rma.id === id) {
        return {
          ...rma,
          ...updates,
          auditLog: [
            ...rma.auditLog,
            {
              id: `audit-${Date.now()}`,
              timestamp: new Date().toISOString(),
              user,
              action,
              details,
            },
          ],
        };
      }
      return rma;
    }));
  };

  return {
    dtrCases,
    rmaCases,
    addDTRCase,
    updateDTRCase,
    addRMACase,
    updateRMACase,
  };
}

// Master Data Management Hook
export function useMasterData() {
  const [sites, setSites] = useState<Site[]>(getInitialSites);

  // Persist to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('master_sites', JSON.stringify(sites));
  }, [sites]);

  const addSite = (siteName: string) => {
    const newSite: Site = {
      id: `site-${Date.now()}`,
      siteName,
      audis: [],
    };
    setSites(prev => [...prev, newSite]);
    return newSite;
  };

  const updateSite = (siteId: string, siteName: string) => {
    setSites(prev => prev.map(site => 
      site.id === siteId ? { ...site, siteName } : site
    ));
  };

  const deleteSite = (siteId: string) => {
    setSites(prev => prev.filter(site => site.id !== siteId));
  };

  const addAudi = (siteId: string, audiNo: string, projector: Projector) => {
    setSites(prev => prev.map(site => {
      if (site.id === siteId) {
        const newAudi: Audi = {
          id: `audi-${Date.now()}`,
          audiNo,
          siteId,
          projector,
        };
        return {
          ...site,
          audis: [...site.audis, newAudi],
        };
      }
      return site;
    }));
  };

  const updateAudi = (siteId: string, audiId: string, audiNo: string, projector: Projector) => {
    setSites(prev => prev.map(site => {
      if (site.id === siteId) {
        return {
          ...site,
          audis: site.audis.map(audi =>
            audi.id === audiId ? { ...audi, audiNo, projector } : audi
          ),
        };
      }
      return site;
    }));
  };

  const deleteAudi = (siteId: string, audiId: string) => {
    setSites(prev => prev.map(site => {
      if (site.id === siteId) {
        return {
          ...site,
          audis: site.audis.filter(audi => audi.id !== audiId),
        };
      }
      return site;
    }));
  };

  const getSiteById = (siteId: string) => {
    return sites.find(site => site.id === siteId);
  };

  const getAudisBySite = (siteName: string) => {
    const site = sites.find(s => s.siteName === siteName);
    return site?.audis || [];
  };

  const getProjectorByAudi = (siteName: string, audiNo: string) => {
    const site = sites.find(s => s.siteName === siteName);
    const audi = site?.audis.find(a => a.audiNo === audiNo);
    return audi?.projector;
  };

  return {
    sites,
    addSite,
    updateSite,
    deleteSite,
    addAudi,
    updateAudi,
    deleteAudi,
    getSiteById,
    getAudisBySite,
    getProjectorByAudi,
  };
}

// User Management Hook
export function useUsers() {
  const [users, setUsers] = useState<User[]>(getInitialUsers);

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);

  const addUser = (name: string, email: string, role: User['role']) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      active: true,
      createdDate: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (userId: string, name: string, email: string, role: User['role'], active: boolean) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, name, email, role, active } : user
    ));
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
  };

  const getEngineersList = () => {
    return users.filter(user => user.role === 'engineer' && user.active);
  };

  const getUserByEmail = (email: string) => {
    return users.find(user => user.email === email);
  };

  return {
    users,
    addUser,
    updateUser,
    deleteUser,
    getEngineersList,
    getUserByEmail,
  };
}

// Notifications Hook
export function useNotifications(currentUserEmail: string) {
  const [notifications, setNotifications] = useState<Notification[]>(getInitialNotifications);

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (
    userId: string,
    title: string,
    message: string,
    type: Notification['type'],
    caseId: string,
    caseType: 'DTR' | 'RMA'
  ) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      userId,
      title,
      message,
      type,
      caseId,
      caseType,
      read: false,
      timestamp: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev]);
    return newNotification;
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(notif =>
      notif.id === notificationId ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const getUserNotifications = () => {
    return notifications.filter(notif => notif.userId === currentUserEmail);
  };

  const getUnreadCount = () => {
    return notifications.filter(notif => notif.userId === currentUserEmail && !notif.read).length;
  };

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUserNotifications,
    getUnreadCount,
  };
}