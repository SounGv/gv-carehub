/**
 * GV CareHub - Google Apps Script API
 *
 * Deploy as Web app and set Script Property:
 * SPREADSHEET_ID = Google Sheet ID
 *
 * Sheets used (base 10, per data-schema.md):
 * Config, Claim_Master, Claim_Items, Shipment_Log, Status_History,
 * CLSBS_Link, Products, Sales_Daily, Users, Sync_Log
 *
 * Claim_Items has extra trailing columns beyond the base schema (additive,
 * does not break existing data) to support the case-detail page:
 * inspection_result, warranty_type, resolution_method, repair_cost,
 * technician_note, product_image_urls, label_image_urls,
 * service_updated_at, service_updated_by
 *
 * "รอตรวจสอบ" (unmatched package) records and general audit-trail entries
 * both reuse Sync_Log (already part of the base schema) instead of adding
 * a new sheet.
 */

const SHEETS = {
  CONFIG: 'Config',
  CLAIMS: 'Claim_Master',
  ITEMS: 'Claim_Items',
  SHIPMENTS: 'Shipment_Log',
  HISTORY: 'Status_History',
  CLSBS: 'CLSBS_Link',
  PRODUCTS: 'Products',
  SALES: 'Sales_Daily',
  USERS: 'Users',
  SYNC_LOG: 'Sync_Log'
};

const HEADERS = {
  Config: ['key', 'value'],
  Claim_Master: [
    'claim_no', 'claim_id', 'submitted_at', 'channel', 'order_no',
    'customer_name', 'phone', 'email', 'address', 'status',
    'public_token_hash', 'received_at', 'completed_at', 'shipped_at',
    'product_value', 'owner', 'last_updated_at', 'last_updated_by', 'note'
  ],
  Claim_Items: [
    'claim_no', 'item_id', 'sku', 'product_name', 'model', 'serial_no',
    'issue_group', 'issue_detail', 'quantity', 'product_value', 'clsbs_id',
    'inspection_result', 'warranty_type', 'resolution_method', 'repair_cost',
    'technician_note', 'product_image_urls', 'label_image_urls',
    'service_updated_at', 'service_updated_by'
  ],
  Shipment_Log: [
    'shipment_id', 'claim_no', 'direction', 'carrier', 'tracking_no',
    'ship_date', 'received_date', 'scanned_by', 'label_image_url', 'note'
  ],
  Status_History: [
    'event_id', 'claim_no', 'from_status', 'to_status', 'changed_at',
    'changed_by', 'note'
  ],
  CLSBS_Link: [
    'claim_no', 'clsbs_id', 'bill_number', 'sku', 'serial_no',
    'linked_at', 'linked_by', 'note'
  ],
  Products: ['sku', 'product_name', 'brand', 'model', 'standard_value', 'active'],
  Sales_Daily: ['date', 'sku', 'qty_sold', 'sales_value'],
  Users: ['user_id', 'name', 'role', 'active'],
  Sync_Log: ['log_id', 'action', 'claim_no', 'result', 'message', 'created_at']
};

const OPEN_STATUSES = ['แจ้งเคลมแล้ว', 'รอรับสินค้า', 'รับเข้าคลังแล้ว', 'กำลังดำเนินการ', 'รออะไหล่', 'ดำเนินการเสร็จ', 'รอจัดส่งคืน'];
const CLOSED_STATUSES = ['จัดส่งแล้ว', 'ปิดเคส'];

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = p.action || 'health';
    let result;
    if (action === 'health') result = { ok: true, service: 'GV CareHub API', server_time: new Date().toISOString() };
    else if (action === 'status') result = publicStatus_(p);
    else if (action === 'search') result = searchClaims_(p.q || '');
    else if (action === 'report') result = reportSkuTable_(p);
    else if (action === 'dashboard') result = dashboardReport_(p);
    else if (action === 'meta') result = metaLists_();
    else if (action === 'claim_detail') result = claimDetail_(p.claim_no || '');
    else throw new Error('Unknown action: ' + action);
    return json_(result);
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = body.action;
    let result;
    if (action === 'setup') result = setupSheets_();
    else if (action === 'create_claim') result = createClaim_(body);
    else if (action === 'receive') result = updateStatus_(body, 'รับเข้าคลังแล้ว');
    else if (action === 'service') result = updateStatus_(body, body.to_status || 'กำลังดำเนินการ');
    else if (action === 'ship') result = shipClaim_(body);
    else if (action === 'link_clsbs') result = linkClsbs_(body);
    else if (action === 'update_service_detail') result = updateServiceDetail_(body);
    else if (action === 'create_pending') result = createPendingReview_(body);
    else if (action === 'upload_file') result = uploadFile_(body);
    else throw new Error('Unknown action: ' + action);
    return json_(result);
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

function setupSheets_() {
  const ss = spreadsheet_();
  Object.keys(HEADERS).forEach(function(name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const header = HEADERS[name];
    const existing = sh.getRange(1, 1, 1, header.length).getValues()[0];
    if (existing.every(function(v) { return v === ''; })) {
      sh.getRange(1, 1, 1, header.length).setValues([header]);
      sh.setFrozenRows(1);
    } else {
      // Additive: extend existing header row if new trailing columns were added later.
      const currentWidth = sh.getLastColumn();
      if (currentWidth < header.length) {
        sh.getRange(1, currentWidth + 1, 1, header.length - currentWidth)
          .setValues([header.slice(currentWidth)]);
      }
    }
  });
  const config = ss.getSheetByName(SHEETS.CONFIG);
  const values = config.getDataRange().getValues();
  const keys = values.slice(1).map(function(r) { return r[0]; });
  const defaults = [
    ['claim_prefix', 'GV'],
    ['last_claim_number', '25082'],
    ['public_status_base_url', ''],
    ['sla_days', '5'],
    ['drive_folder_id', ''],
    ['channels', 'Shopee,Lazada,TikTok Shop,Facebook,LINE OA,หน้าร้าน,อื่นๆ'],
    ['statuses', OPEN_STATUSES.concat(CLOSED_STATUSES).join(',')],
    ['issue_groups', 'จอเสีย,แบตเตอรี่,เปิดไม่ติด,สาย/พอร์ตชำรุด,ซอฟต์แวร์,อื่นๆ'],
    ['carriers', 'Kerry Express,Flash Express,J&T Express,ไปรษณีย์ไทย,Ninja Van,DHL,อื่นๆ']
  ];
  defaults.forEach(function(pair) {
    if (keys.indexOf(pair[0]) < 0) config.appendRow(pair);
  });
  return { ok: true, message: 'Sheets are ready' };
}

/* ---------------- Claim creation ---------------- */

function createClaim_(p) {
  validateClaim_(p);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = spreadsheet_();
    const sh = ss.getSheetByName(SHEETS.CLAIMS);
    if (!sh) throw new Error('Run setup first');

    const inbound = p.inbound || {};
    if (inbound.tracking_no) assertTrackingAvailable_(inbound.carrier || '', inbound.tracking_no);

    const now = new Date();
    const claimNo = nextClaimNo_(ss);
    const claimId = Utilities.getUuid();
    const publicToken = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    const status = 'แจ้งเคลมแล้ว';
    const address = p.address || buildAddress_(p.address_detail || {});

    const row = [
      claimNo, claimId, now, p.channel || '', p.order_no || '',
      p.customer_name || '', normalizePhone_(p.phone), p.email || '', address,
      status, sha256_(publicToken), '', '', '', Number(p.product_value || 0),
      '', now, 'customer', p.note || ''
    ];
    sh.appendRow(row);

    const item = p.item || {};
    const itemHeaders = HEADERS.Claim_Items;
    const itemRow = itemHeaders.map(function(h) {
      switch (h) {
        case 'claim_no': return claimNo;
        case 'item_id': return Utilities.getUuid();
        case 'sku': return item.sku || '';
        case 'product_name': return item.product_name || '';
        case 'model': return item.model || '';
        case 'serial_no': return item.serial_no || '';
        case 'issue_group': return item.issue_group || '';
        case 'issue_detail': return item.issue_detail || '';
        case 'quantity': return Number(item.quantity || 1);
        case 'product_value': return Number(item.product_value || p.product_value || 0);
        case 'product_image_urls': return (item.product_image_urls || []).join(',');
        case 'label_image_urls': return (item.label_image_urls || []).join(',');
        default: return '';
      }
    });
    ss.getSheetByName(SHEETS.ITEMS).appendRow(itemRow);

    if (inbound.tracking_no) {
      ss.getSheetByName(SHEETS.SHIPMENTS).appendRow([
        Utilities.getUuid(), claimNo, 'inbound', inbound.carrier || '', inbound.tracking_no,
        inbound.ship_date ? new Date(inbound.ship_date) : now, '', 'customer', inbound.label_image_url || '', ''
      ]);
    }

    addHistory_(claimNo, '', status, 'customer', 'สร้างเคส');
    logSync_('create_claim', claimNo, 'ok', 'สร้างเคสใหม่ช่องทาง ' + (p.channel || ''));
    return { ok: true, claim_no: claimNo, claim_id: claimId, public_token: publicToken };
  } finally {
    lock.releaseLock();
  }
}

function buildAddress_(a) {
  const parts = [
    a.house_no ? 'บ้านเลขที่ ' + a.house_no : '',
    a.moo ? 'หมู่ ' + a.moo : '',
    a.soi ? 'ซอย' + a.soi : '',
    a.road ? 'ถนน' + a.road : '',
    a.tambon ? 'ตำบล/แขวง' + a.tambon : '',
    a.amphoe ? 'อำเภอ/เขต' + a.amphoe : '',
    a.province ? 'จังหวัด' + a.province : '',
    a.zipcode || ''
  ];
  return parts.filter(function(s) { return s; }).join(' ');
}

/* ---------------- Public tracking ---------------- */

function publicStatus_(p) {
  if (!p.token) throw new Error('token is required');
  const claim = findClaimByToken_(p.token);
  if (!claim) throw new Error('ไม่พบเคส หรือ ลิงก์หมดอายุ');
  return { ok: true, claim: sanitizePublicClaim_(claim) };
}

/* ---------------- Staff search ---------------- */

function searchClaims_(q) {
  if (!q || String(q).trim().length < 3) throw new Error('กรุณาระบุคำค้นอย่างน้อย 3 ตัวอักษร');
  const needle = String(q).trim().toLowerCase();
  const claims = readObjects_(SHEETS.CLAIMS);
  const items = readObjects_(SHEETS.ITEMS);
  const shipments = readObjects_(SHEETS.SHIPMENTS);

  const result = claims.filter(function(c) {
    const claimItems = items.filter(function(i) { return i.claim_no === c.claim_no; });
    const claimShipments = shipments.filter(function(s) { return s.claim_no === c.claim_no; });
    return matchedFields_(c, claimItems, claimShipments, needle).length > 0;
  }).map(function(c) {
    const claimItems = items.filter(function(i) { return i.claim_no === c.claim_no; });
    const claimShipments = shipments.filter(function(s) { return s.claim_no === c.claim_no; });
    const matched = matchedFields_(c, claimItems, claimShipments, needle);
    const staff = staffClaim_(c, claimItems, claimShipments);
    staff.matched_fields = matched;
    return staff;
  });
  return { ok: true, count: result.length, claims: result };
}

function matchedFields_(claim, items, shipments, needle) {
  const fields = [];
  if (String(claim.claim_no || '').toLowerCase().indexOf(needle) >= 0) fields.push('claim_no');
  if (String(claim.order_no || '').toLowerCase().indexOf(needle) >= 0) fields.push('order_no');
  if (String(claim.phone || '').toLowerCase().indexOf(needle) >= 0) fields.push('phone');
  if (items.some(function(i) { return String(i.serial_no || '').toLowerCase().indexOf(needle) >= 0; })) fields.push('serial_no');
  if (items.some(function(i) { return String(i.sku || '').toLowerCase().indexOf(needle) >= 0; })) fields.push('sku');
  if (items.some(function(i) { return String(i.product_name || '').toLowerCase().indexOf(needle) >= 0; })) fields.push('product_name');
  if (shipments.some(function(s) { return String(s.tracking_no || '').toLowerCase().indexOf(needle) >= 0; })) fields.push('tracking_no');
  if (String(claim.customer_name || '').toLowerCase().indexOf(needle) >= 0) fields.push('customer_name');
  return fields;
}

/* ---------------- Status changes ---------------- */

function updateStatus_(p, toStatus) {
  if (!p.claim_no) throw new Error('claim_no is required');
  const sh = spreadsheet_().getSheetByName(SHEETS.CLAIMS);
  const found = findRowBy_(sh, 'claim_no', p.claim_no);
  if (!found) throw new Error('ไม่พบเลขเคส ' + p.claim_no);
  const now = new Date();
  found.obj.status = toStatus;
  found.obj.last_updated_at = now;
  found.obj.last_updated_by = p.actor || 'staff';
  if (toStatus === 'รับเข้าคลังแล้ว') found.obj.received_at = now;
  if (toStatus === 'ดำเนินการเสร็จ') found.obj.completed_at = now;
  if (toStatus === 'จัดส่งแล้ว') found.obj.shipped_at = now;
  writeObject_(sh, found.row, found.obj);
  addHistory_(p.claim_no, found.old.status || '', toStatus, p.actor || 'staff', p.note || '');
  logSync_('status_change', p.claim_no, toStatus, p.note || '');
  return { ok: true, claim_no: p.claim_no, status: toStatus, updated_at: now };
}

function shipClaim_(p) {
  if (!p.claim_no || !p.carrier || !p.tracking_no) throw new Error('claim_no, carrier และ tracking_no จำเป็น');
  assertTrackingAvailable_(p.carrier, p.tracking_no);
  spreadsheet_().getSheetByName(SHEETS.SHIPMENTS).appendRow([
    Utilities.getUuid(), p.claim_no, 'outbound', p.carrier, p.tracking_no,
    p.ship_date ? new Date(p.ship_date) : new Date(), '', p.actor || 'staff', p.label_image_url || '', p.note || ''
  ]);
  logSync_('ship', p.claim_no, 'ok', p.carrier + ' ' + p.tracking_no);
  return updateStatus_(p, 'จัดส่งแล้ว');
}

function assertTrackingAvailable_(carrier, trackingNo) {
  const duplicate = readObjects_(SHEETS.SHIPMENTS).some(function(s) {
    return String(s.carrier || '').toLowerCase() === String(carrier || '').toLowerCase() &&
      String(s.tracking_no).toLowerCase() === String(trackingNo).toLowerCase();
  });
  if (duplicate) throw new Error('Tracking นี้ถูกใช้แล้ว');
}

function linkClsbs_(p) {
  if (!p.claim_no || !p.clsbs_id) throw new Error('claim_no และ clsbs_id จำเป็น');
  spreadsheet_().getSheetByName(SHEETS.CLSBS).appendRow([
    p.claim_no, p.clsbs_id, p.bill_number || '', p.sku || '', p.serial_no || '',
    new Date(), p.actor || 'staff', p.note || ''
  ]);
  logSync_('link_clsbs', p.claim_no, 'ok', p.clsbs_id);
  return { ok: true, claim_no: p.claim_no, clsbs_id: p.clsbs_id };
}

function updateServiceDetail_(p) {
  if (!p.claim_no) throw new Error('claim_no is required');
  const sh = spreadsheet_().getSheetByName(SHEETS.ITEMS);
  const found = findRowBy_(sh, 'claim_no', p.claim_no);
  if (!found) throw new Error('ไม่พบเลขเคส ' + p.claim_no);
  const now = new Date();
  ['inspection_result', 'warranty_type', 'resolution_method', 'technician_note'].forEach(function(f) {
    if (p[f] !== undefined) found.obj[f] = p[f];
  });
  if (p.repair_cost !== undefined) found.obj.repair_cost = Number(p.repair_cost || 0);
  found.obj.service_updated_at = now;
  found.obj.service_updated_by = p.actor || 'staff';
  writeObject_(sh, found.row, found.obj);
  logSync_('update_service_detail', p.claim_no, 'ok', p.actor || 'staff');
  return { ok: true, claim_no: p.claim_no, updated_at: now };
}

function createPendingReview_(p) {
  const now = new Date();
  const message = JSON.stringify({
    tracking_no: p.tracking_no || '', order_no: p.order_no || '',
    phone: normalizePhone_(p.phone || ''), note: p.note || '', actor: p.actor || 'staff'
  });
  spreadsheet_().getSheetByName(SHEETS.SYNC_LOG).appendRow([
    Utilities.getUuid(), 'pending_review', '', 'รอตรวจสอบ', message, now
  ]);
  return { ok: true, message: 'บันทึกรายการรอตรวจสอบแล้ว' };
}

function uploadFile_(p) {
  if (!p.data_base64 || !p.filename) throw new Error('data_base64 และ filename จำเป็น');
  const folderId = configMap_().drive_folder_id;
  if (!folderId) throw new Error('ยังไม่ได้ตั้งค่าโฟลเดอร์ Google Drive สำหรับอัปโหลดรูป (Config: drive_folder_id)');
  const folder = DriveApp.getFolderById(folderId);
  const blob = Utilities.newBlob(Utilities.base64Decode(p.data_base64), p.mime_type || 'image/jpeg', p.filename);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = 'https://drive.google.com/uc?id=' + file.getId();
  logSync_('upload_file', p.claim_no || '', 'ok', p.filename);
  return { ok: true, url: url, file_id: file.getId() };
}

/* ---------------- Meta / filters ---------------- */

function metaLists_() {
  const cfg = configMap_();
  const products = readObjects_(SHEETS.PRODUCTS);
  return {
    ok: true,
    channels: parseList_(cfg.channels),
    statuses: parseList_(cfg.statuses),
    issue_groups: parseList_(cfg.issue_groups),
    carriers: parseList_(cfg.carriers),
    skus: distinctBy_(products, 'sku'),
    brands: distinctBy_(products, 'brand'),
    models: distinctBy_(products, 'model'),
    products: products
  };
}

/* ---------------- Reports (SKU table) ---------------- */

function reportSkuTable_(p) {
  const range = dateRange_(p.from, p.to);
  const claims = readObjects_(SHEETS.CLAIMS).filter(function(c) {
    const d = new Date(c.submitted_at);
    if (isNaN(d) || d < range.from || d > range.to) return false;
    if (p.status && c.status !== p.status) return false;
    return true;
  });
  const claimNos = {};
  claims.forEach(function(c) { claimNos[c.claim_no] = c; });

  const shipments = readObjects_(SHEETS.SHIPMENTS);
  if (p.carrier) {
    const carrierClaimNos = {};
    shipments.forEach(function(s) {
      if (String(s.carrier || '').toLowerCase() === String(p.carrier).toLowerCase()) carrierClaimNos[s.claim_no] = true;
    });
    Object.keys(claimNos).forEach(function(cn) { if (!carrierClaimNos[cn]) delete claimNos[cn]; });
  }

  const products = readObjects_(SHEETS.PRODUCTS);
  const productBySku = {};
  products.forEach(function(pr) { productBySku[pr.sku] = pr; });

  const items = readObjects_(SHEETS.ITEMS).filter(function(i) {
    if (!claimNos[i.claim_no]) return false;
    if (p.sku && i.sku !== p.sku) return false;
    if (p.model && i.model !== p.model) return false;
    if (p.brand) {
      const prod = productBySku[i.sku];
      if (!prod || prod.brand !== p.brand) return false;
    }
    return true;
  });

  const groups = {};
  items.forEach(function(i) {
    const key = i.sku || 'ไม่ระบุ SKU';
    if (!groups[key]) {
      const prod = productBySku[i.sku] || {};
      groups[key] = {
        sku: i.sku || '', product_name: i.product_name || prod.product_name || '',
        model: i.model || prod.model || '', brand: prod.brand || '',
        qty_claimed: 0, in_progress_count: 0, shipped_count: 0, damage_value: 0, claim_nos: {}
      };
    }
    const g = groups[key];
    g.qty_claimed += Number(i.quantity || 1);
    g.damage_value += Number(i.repair_cost || 0);
    g.claim_nos[i.claim_no] = true;
    const status = claimNos[i.claim_no] && claimNos[i.claim_no].status;
    if (status === 'กำลังดำเนินการ' || status === 'รออะไหล่') g.in_progress_count += 1;
    if (status === 'จัดส่งแล้ว' || status === 'ปิดเคส') g.shipped_count += 1;
  });

  const salesBySku = {};
  readObjects_(SHEETS.SALES).forEach(function(s) {
    const d = new Date(s.date);
    if (isNaN(d) || d < range.from || d > range.to) return;
    salesBySku[s.sku] = (salesBySku[s.sku] || 0) + Number(s.qty_sold || 0);
  });

  const rows = Object.keys(groups).map(function(key) {
    const g = groups[key];
    const qtySold = salesBySku[g.sku] || 0;
    return {
      sku: g.sku, product_name: g.product_name, model: g.model, brand: g.brand,
      qty_sold: qtySold, qty_claimed: g.qty_claimed,
      defect_rate: qtySold > 0 ? Number((g.qty_claimed / qtySold * 100).toFixed(2)) : null,
      in_progress_count: g.in_progress_count, shipped_count: g.shipped_count,
      damage_value: Number(g.damage_value.toFixed(2))
    };
  }).sort(function(a, b) { return b.qty_claimed - a.qty_claimed; });

  return {
    ok: true,
    filters: { from: p.from || '', to: p.to || '', sku: p.sku || '', model: p.model || '', brand: p.brand || '', status: p.status || '', carrier: p.carrier || '' },
    rows: rows,
    summary: {
      total_sku: rows.length,
      total_qty_claimed: rows.reduce(function(s, r) { return s + r.qty_claimed; }, 0),
      total_damage_value: Number(rows.reduce(function(s, r) { return s + r.damage_value; }, 0).toFixed(2))
    }
  };
}

/* ---------------- Dashboard ---------------- */

function dashboardReport_(p) {
  const range = dateRange_(p.from, p.to);
  const today = todayStr_();
  const claims = readObjects_(SHEETS.CLAIMS);
  const items = readObjects_(SHEETS.ITEMS);
  const products = readObjects_(SHEETS.PRODUCTS);
  const productBySku = {};
  products.forEach(function(pr) { productBySku[pr.sku] = pr; });

  const claimsToday = claims.filter(function(c) { return dateKey_(c.submitted_at) === today; });

  const filtered = claims.filter(function(c) {
    const d = new Date(c.submitted_at);
    if (isNaN(d) || d < range.from || d > range.to) return false;
    if (p.status && c.status !== p.status) return false;
    if (p.channel && c.channel !== p.channel) return false;
    if (p.sku && !items.some(function(i) { return i.claim_no === c.claim_no && i.sku === p.sku; })) return false;
    return true;
  });

  const slaDays = Number(configMap_().sla_days || 5);
  const now = new Date();
  const overdue = filtered.filter(function(c) {
    if (CLOSED_STATUSES.indexOf(c.status) >= 0) return false;
    const submitted = new Date(c.submitted_at);
    if (isNaN(submitted)) return false;
    const days = (now - submitted) / (1000 * 60 * 60 * 24);
    return days > slaDays;
  });

  const statusCounts = {};
  filtered.forEach(function(c) { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

  const filteredClaimNos = {};
  filtered.forEach(function(c) { filteredClaimNos[c.claim_no] = c; });
  const filteredItems = items.filter(function(i) { return filteredClaimNos[i.claim_no]; });

  const damageBySku = {};
  const issueCounts = {};
  const damageByBrand = {};
  filteredItems.forEach(function(i) {
    const skuKey = i.sku || 'ไม่ระบุ SKU';
    damageBySku[skuKey] = damageBySku[skuKey] || { sku: skuKey, product_name: i.product_name || '', value: 0, qty: 0 };
    damageBySku[skuKey].value += Number(i.repair_cost || 0);
    damageBySku[skuKey].qty += Number(i.quantity || 1);

    const issueKey = i.issue_group || 'ไม่ระบุอาการ';
    issueCounts[issueKey] = (issueCounts[issueKey] || 0) + 1;

    const brand = (productBySku[i.sku] && productBySku[i.sku].brand) || 'ไม่ระบุแบรนด์';
    damageByBrand[brand] = (damageByBrand[brand] || 0) + Number(i.repair_cost || 0);
  });

  const dailyMap = {};
  filtered.forEach(function(c) {
    const key = dateKey_(c.submitted_at);
    if (key) dailyMap[key] = (dailyMap[key] || 0) + 1;
  });
  const dailyClaims = Object.keys(dailyMap).sort().map(function(date) { return { date: date, count: dailyMap[date] }; });

  const salesTotal = readObjects_(SHEETS.SALES).reduce(function(sum, s) {
    const d = new Date(s.date);
    if (isNaN(d) || d < range.from || d > range.to) return sum;
    if (p.sku && s.sku !== p.sku) return sum;
    return sum + Number(s.qty_sold || 0);
  }, 0);
  const claimedQty = filteredItems.reduce(function(sum, i) { return sum + Number(i.quantity || 1); }, 0);

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    filters: { from: p.from || '', to: p.to || '', sku: p.sku || '', status: p.status || '', channel: p.channel || '' },
    kpi: {
      claims_today: claimsToday.length,
      waiting_receive: statusCounts['รอรับสินค้า'] || 0,
      received: statusCounts['รับเข้าคลังแล้ว'] || 0,
      in_progress: (statusCounts['กำลังดำเนินการ'] || 0) + (statusCounts['รออะไหล่'] || 0),
      waiting_ship: statusCounts['รอจัดส่งคืน'] || 0,
      shipped: statusCounts['จัดส่งแล้ว'] || 0,
      closed: statusCounts['ปิดเคส'] || 0,
      overdue_sla: overdue.length,
      product_value: Number(filtered.reduce(function(s, c) { return s + Number(c.product_value || 0); }, 0).toFixed(2)),
      damage_value: Number(filteredItems.reduce(function(s, i) { return s + Number(i.repair_cost || 0); }, 0).toFixed(2))
    },
    charts: {
      daily_claims: dailyClaims,
      by_status: statusCounts,
      top_skus_damage: Object.values(damageBySku).sort(function(a, b) { return b.value - a.value; }).slice(0, 10),
      top_issues: Object.keys(issueCounts).map(function(k) { return { issue: k, count: issueCounts[k] }; }).sort(function(a, b) { return b.count - a.count; }).slice(0, 10),
      damage_by_brand: Object.keys(damageByBrand).map(function(k) { return { brand: k, value: Number(damageByBrand[k].toFixed(2)) }; }).sort(function(a, b) { return b.value - a.value; }),
      defect_rate_vs_sales: salesTotal > 0 ? Number((claimedQty / salesTotal * 100).toFixed(2)) : null
    }
  };
}

/* ---------------- Claim detail (staff) ---------------- */

function claimDetail_(claimNo) {
  if (!claimNo) throw new Error('claim_no is required');
  const claim = readObjects_(SHEETS.CLAIMS).find(function(c) { return c.claim_no === claimNo; });
  if (!claim) throw new Error('ไม่พบเลขเคส ' + claimNo);
  const items = readObjects_(SHEETS.ITEMS).filter(function(i) { return i.claim_no === claimNo; });
  const shipments = readObjects_(SHEETS.SHIPMENTS).filter(function(s) { return s.claim_no === claimNo; });
  const history = readObjects_(SHEETS.HISTORY).filter(function(h) { return h.claim_no === claimNo; })
    .sort(function(a, b) { return new Date(a.changed_at) - new Date(b.changed_at); });
  const clsbs = readObjects_(SHEETS.CLSBS).filter(function(l) { return l.claim_no === claimNo; });
  return {
    ok: true,
    claim: {
      claim_no: claim.claim_no, order_no: claim.order_no, channel: claim.channel,
      customer_name: claim.customer_name, phone: claim.phone, email: claim.email, address: claim.address,
      status: claim.status, submitted_at: claim.submitted_at, received_at: claim.received_at,
      completed_at: claim.completed_at, shipped_at: claim.shipped_at, product_value: claim.product_value,
      owner: claim.owner, note: claim.note, last_updated_at: claim.last_updated_at, last_updated_by: claim.last_updated_by
    },
    items: items,
    shipments: shipments,
    history: history,
    clsbs: clsbs
  };
}

/* ---------------- Validation ---------------- */

function validateClaim_(p) {
  if (!p.customer_name) throw new Error('กรุณาระบุชื่อลูกค้า');
  if (!p.phone || normalizePhone_(p.phone).length < 9) throw new Error('กรุณาระบุเบอร์โทรให้ถูกต้อง');
  if (!p.order_no) throw new Error('กรุณาระบุเลขคำสั่งซื้อ');
  if (!p.item || (!p.item.sku && !p.item.product_name)) throw new Error('กรุณาระบุสินค้า');
  if (!p.item.issue_detail) throw new Error('กรุณาระบุอาการเสีย');
}

/* ---------------- Helpers ---------------- */

function nextClaimNo_(ss) {
  const sh = ss.getSheetByName(SHEETS.CONFIG);
  const rows = sh.getDataRange().getValues();
  let prefix = 'GV';
  let last = 25082;
  rows.slice(1).forEach(function(r) {
    if (r[0] === 'claim_prefix') prefix = String(r[1] || 'GV');
    if (r[0] === 'last_claim_number') last = Number(r[1] || 25082);
  });
  const next = last + 1;
  const row = rows.findIndex(function(r) { return r[0] === 'last_claim_number'; }) + 1;
  sh.getRange(row, 2).setValue(next);
  return prefix + next;
}

function addHistory_(claimNo, from, to, actor, note) {
  spreadsheet_().getSheetByName(SHEETS.HISTORY).appendRow([
    Utilities.getUuid(), claimNo, from, to, new Date(), actor, note || ''
  ]);
}

function logSync_(action, claimNo, result, message) {
  spreadsheet_().getSheetByName(SHEETS.SYNC_LOG).appendRow([
    Utilities.getUuid(), action, claimNo || '', result || '', message || '', new Date()
  ]);
}

function findClaimByToken_(token) {
  const hash = sha256_(token);
  return readObjects_(SHEETS.CLAIMS).find(function(c) { return c.public_token_hash === hash; });
}

function findRowBy_(sh, key, value) {
  const headers = HEADERS[sh.getName()];
  const col = headers.indexOf(key);
  if (col < 0) throw new Error('Unknown field: ' + key);
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][col]) === String(value)) {
      const obj = {}; headers.forEach(function(h, j) { obj[h] = values[i][j]; });
      return { row: i + 1, obj: obj, old: Object.assign({}, obj) };
    }
  }
  return null;
}

function writeObject_(sh, row, obj) {
  const headers = HEADERS[sh.getName()];
  sh.getRange(row, 1, 1, headers.length).setValues([headers.map(function(h) { return obj[h] === undefined ? '' : obj[h]; })]);
}

function readObjects_(sheetName) {
  const sh = spreadsheet_().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  const headers = HEADERS[sheetName] || sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
  return values.map(function(row) { const obj = {}; headers.forEach(function(h, i) { obj[h] = row[i]; }); return obj; });
}

function staffClaim_(claim, items, shipments) {
  return {
    claim_no: claim.claim_no, order_no: claim.order_no, channel: claim.channel,
    customer_name: claim.customer_name, phone: claim.phone, address: claim.address,
    status: claim.status, submitted_at: claim.submitted_at,
    received_at: claim.received_at, completed_at: claim.completed_at, shipped_at: claim.shipped_at,
    product_value: claim.product_value, items: items || [], shipments: shipments || []
  };
}

function sanitizePublicClaim_(claim) {
  const items = readObjects_(SHEETS.ITEMS).filter(function(i) { return i.claim_no === claim.claim_no; });
  return {
    claim_no: claim.claim_no, status: claim.status, submitted_at: claim.submitted_at,
    received_at: claim.received_at, completed_at: claim.completed_at, shipped_at: claim.shipped_at,
    items: items.map(function(i) { return { product_name: i.product_name, sku: i.sku, issue_group: i.issue_group }; })
  };
}

function configMap_() {
  const map = {};
  readObjects_(SHEETS.CONFIG).forEach(function(row) { map[row.key] = row.value; });
  return map;
}

function parseList_(str) {
  return String(str || '').split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
}

function distinctBy_(rows, field) {
  const seen = {};
  const out = [];
  rows.forEach(function(r) {
    const v = r[field];
    if (v && !seen[v]) { seen[v] = true; out.push(v); }
  });
  return out;
}

function dateRange_(from, to) {
  return {
    from: from ? new Date(from + 'T00:00:00') : new Date('2000-01-01T00:00:00'),
    to: to ? new Date(to + 'T23:59:59') : new Date('2999-12-31T23:59:59')
  };
}

function dateKey_(value) {
  const d = new Date(value);
  if (isNaN(d)) return '';
  return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
}

function todayStr_() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
}

function normalizePhone_(value) { return String(value || '').replace(/[^0-9]/g, ''); }

function sha256_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return bytes.map(function(b) { return (b + 256) % 256; }).map(function(b) { return ('0' + b.toString(16)).slice(-2); }).join('');
}

function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('ตั้งค่า Script Property: SPREADSHEET_ID ก่อนใช้งาน');
  return SpreadsheetApp.openById(id);
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data, function(key, value) {
    return value instanceof Date ? value.toISOString() : value;
  })).setMimeType(ContentService.MimeType.JSON);
}
