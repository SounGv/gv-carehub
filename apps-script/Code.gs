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
    else if (action === 'claim_report') result = claimReport_(p);
    else if (action === 'legacy_report') result = legacyReport_();
    else if (action === 'legacy_service_log_rows') result = legacyServiceLogRows_(p);
    else if (action === 'legacy_clsbs_rows') result = legacyClsbsRows_(p);
    else if (action === 'legacy_meta') result = legacyMeta_();
    else if (action === 'sheet_inspect') result = sheetInspect_(p.sheet || '');
    else if (action === 'claim_no_status') result = claimNoStatus_();
    else if (action === 'supplier_rma_candidates') result = supplierRmaCandidates_(p);
    else if (action === 'supplier_rma_batches') result = supplierRmaBatches_(p);
    else if (action === 'supplier_rma_batch_detail') result = supplierRmaBatchDetail_(p.batch_no || '');
    else if (action === 'supplier_rma_analytics') result = supplierRmaAnalytics_();
    else if (action === 'legacy_defect_codes') result = legacyDefectCodeDump_();
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
    else if (action === 'reserve_claim_no') result = reserveClaimNo_(body);
    else if (action === 'receive') result = updateStatus_(body, 'รับเข้าคลังแล้ว');
    else if (action === 'service') result = updateStatus_(body, body.to_status || 'กำลังดำเนินการ');
    else if (action === 'ship') result = shipClaim_(body);
    else if (action === 'link_clsbs') result = linkClsbs_(body);
    else if (action === 'update_service_detail') result = updateServiceDetail_(body);
    else if (action === 'create_pending') result = createPendingReview_(body);
    else if (action === 'upload_file') result = uploadFile_(body);
    else if (action === 'supplier_rma_create_batch') result = supplierRmaCreateBatch_(body);
    else if (action === 'supplier_rma_update_item') result = supplierRmaUpdateItem_(body);
    else if (action === 'supplier_rma_update_batch_status') result = supplierRmaUpdateBatchStatus_(body);
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

function reserveClaimNo_(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const claimNo = nextClaimNo_(spreadsheet_());
    logSync_('reserve_claim_no', claimNo, 'ok', 'พนักงานขอเลขเคสถัดไป (' + (p && p.actor || 'staff') + ')');
    return { ok: true, claim_no: claimNo };
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

  const ALL_STATUSES = OPEN_STATUSES.concat(CLOSED_STATUSES);
  const emptyStatusCounts_ = function() {
    return ALL_STATUSES.reduce(function(o, s) { o[s] = 0; return o; }, {});
  };
  const overallStatusCounts = emptyStatusCounts_();

  const groups = {};
  items.forEach(function(i) {
    const key = i.sku || 'ไม่ระบุ SKU';
    if (!groups[key]) {
      const prod = productBySku[i.sku] || {};
      groups[key] = {
        sku: i.sku || '', product_name: i.product_name || prod.product_name || '',
        model: i.model || prod.model || '', brand: prod.brand || '',
        qty_claimed: 0, damage_value: 0, claim_nos: {}, status_counts: emptyStatusCounts_()
      };
    }
    const g = groups[key];
    g.qty_claimed += Number(i.quantity || 1);
    g.damage_value += Number(i.repair_cost || 0);
    g.claim_nos[i.claim_no] = true;
    const status = claimNos[i.claim_no] && claimNos[i.claim_no].status;
    if (status && g.status_counts.hasOwnProperty(status)) {
      g.status_counts[status] += 1;
      overallStatusCounts[status] += 1;
    }
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
    const inProgressCount = (g.status_counts['กำลังดำเนินการ'] || 0) + (g.status_counts['รออะไหล่'] || 0);
    const shippedCount = (g.status_counts['จัดส่งแล้ว'] || 0) + (g.status_counts['ปิดเคส'] || 0);
    return {
      sku: g.sku, product_name: g.product_name, model: g.model, brand: g.brand,
      qty_sold: qtySold, qty_claimed: g.qty_claimed,
      defect_rate: qtySold > 0 ? Number((g.qty_claimed / qtySold * 100).toFixed(2)) : null,
      in_progress_count: inProgressCount, shipped_count: shippedCount,
      status_counts: g.status_counts,
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
      total_damage_value: Number(rows.reduce(function(s, r) { return s + r.damage_value; }, 0).toFixed(2)),
      by_status: overallStatusCounts
    }
  };
}

/* ---------------- Claim report (detailed, one row per case) ---------------- */

function claimReport_(p) {
  const range = dateRange_(p.from, p.to);
  const claims = readObjects_(SHEETS.CLAIMS).filter(function(c) {
    const d = new Date(c.submitted_at);
    if (isNaN(d) || d < range.from || d > range.to) return false;
    if (p.status && c.status !== p.status) return false;
    if (p.channel && c.channel !== p.channel) return false;
    return true;
  });
  const claimNos = {};
  claims.forEach(function(c) { claimNos[c.claim_no] = c; });

  const products = readObjects_(SHEETS.PRODUCTS);
  const productBySku = {};
  products.forEach(function(pr) { productBySku[pr.sku] = pr; });

  const inboundByClaimNo = {};
  const outboundByClaimNo = {};
  readObjects_(SHEETS.SHIPMENTS).forEach(function(s) {
    if (!claimNos[s.claim_no]) return;
    if (s.direction === 'inbound') inboundByClaimNo[s.claim_no] = s;
    else if (s.direction === 'outbound') outboundByClaimNo[s.claim_no] = s;
  });

  const items = readObjects_(SHEETS.ITEMS).filter(function(i) {
    if (!claimNos[i.claim_no]) return false;
    if (p.sku && i.sku !== p.sku) return false;
    if (p.model && i.model !== p.model) return false;
    if (p.resolution_method && i.resolution_method !== p.resolution_method) return false;
    if (p.brand) {
      const prod = productBySku[i.sku];
      if (!prod || prod.brand !== p.brand) return false;
    }
    return true;
  });

  const rows = items.map(function(i) {
    const c = claimNos[i.claim_no];
    const inbound = inboundByClaimNo[i.claim_no];
    const outbound = outboundByClaimNo[i.claim_no];
    const prod = productBySku[i.sku] || {};
    return {
      claim_no: i.claim_no,
      customer_name: c.customer_name || '', phone: c.phone || '', channel: c.channel || '', order_no: c.order_no || '',
      sku: i.sku || '', product_name: i.product_name || prod.product_name || '', model: i.model || prod.model || '', brand: prod.brand || '',
      serial_no: i.serial_no || '',
      issue_group: i.issue_group || '', issue_detail: i.issue_detail || '',
      submitted_at: c.submitted_at || '', received_at: c.received_at || '',
      inbound_carrier: inbound ? (inbound.carrier || '') : '', inbound_tracking_no: inbound ? (inbound.tracking_no || '') : '',
      warranty_type: i.warranty_type || '', resolution_method: i.resolution_method || '', inspection_result: i.inspection_result || '',
      repair_cost: Number(i.repair_cost || 0), technician_note: i.technician_note || '',
      outbound_carrier: outbound ? (outbound.carrier || '') : '', outbound_tracking_no: outbound ? (outbound.tracking_no || '') : '',
      shipped_at: c.shipped_at || '',
      status: c.status || ''
    };
  }).sort(function(a, b) { return new Date(b.submitted_at) - new Date(a.submitted_at); });

  const byResolutionMethod = {};
  const byStatus = {};
  rows.forEach(function(r) {
    const rKey = r.resolution_method || 'ยังไม่ระบุ';
    byResolutionMethod[rKey] = (byResolutionMethod[rKey] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  });

  return {
    ok: true,
    filters: {
      from: p.from || '', to: p.to || '', sku: p.sku || '', model: p.model || '', brand: p.brand || '',
      status: p.status || '', channel: p.channel || '', resolution_method: p.resolution_method || ''
    },
    rows: rows,
    summary: {
      total_cases: rows.length,
      total_repair_cost: Number(rows.reduce(function(s, r) { return s + r.repair_cost; }, 0).toFixed(2)),
      by_status: byStatus,
      by_resolution_method: byResolutionMethod
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

  const legacyKpi = legacyDashboardKpi_(range, slaDays, today, p);

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
      claims_today: claimsToday.length + legacyKpi.claims_today,
      waiting_receive: (statusCounts['รอรับสินค้า'] || 0) + legacyKpi.waiting_receive,
      received: (statusCounts['รับเข้าคลังแล้ว'] || 0) + legacyKpi.received,
      in_progress: (statusCounts['กำลังดำเนินการ'] || 0) + (statusCounts['รออะไหล่'] || 0) + legacyKpi.in_progress,
      waiting_ship: statusCounts['รอจัดส่งคืน'] || 0,
      shipped: (statusCounts['จัดส่งแล้ว'] || 0) + legacyKpi.shipped,
      closed: statusCounts['ปิดเคส'] || 0,
      overdue_sla: overdue.length + legacyKpi.overdue_sla,
      // The legacy sheet has no price/value columns at all (checked all 43 headers),
      // so these two stay Claim_Master-only — there is nothing to merge in.
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

/**
 * Folds the legacy "บริการหลังการขาย" sheet's counts into the dashboard's
 * KPI tiles, so the tiles reflect the whole business (25,000+ historical
 * cases) instead of just the handful of claims that have gone through the
 * new Claim_Master flow so far. The legacy sheet only tracks 3 milestone
 * checkboxes (received from customer / entered into system / returned to
 * customer) — coarser than the new system's multi-step status — so it maps
 * onto 4 of the 8 KPI buckets (waiting_receive/received/in_progress/shipped);
 * there's no legacy equivalent of "waiting_ship" or "closed" as distinct
 * steps, and no price data at all, so those stay Claim_Master-only.
 * When a status or SKU filter is active we can't reliably attribute a
 * legacy row to it (legacy has no SKU codes and a different status
 * vocabulary), so only claims_today — which the Claim_Master side also
 * computes independent of those filters — is contributed in that case.
 */
function legacyDashboardKpi_(range, slaDays, today, p) {
  const cols = legacySheetColumns_(LEGACY_SERVICE_LOG_SHEET, [
    'วันที่', 'ร้าน', 'ได้รับของเสียจากลูกค้า', 'ฝ่ายเคลมรับสินค้าเข้าระบบ', 'ส่งสินค้าคืนลูกค้า'
  ]);
  const n = cols['วันที่'].length;
  const now = new Date();
  const result = { claims_today: 0, waiting_receive: 0, received: 0, in_progress: 0, shipped: 0, overdue_sla: 0 };
  const skipBuckets = !!(p.status || p.sku);

  for (let i = 0; i < n; i++) {
    const dateVal = cols['วันที่'][i];
    const d = new Date(dateVal);
    if (isNaN(d)) continue;
    if (dateKey_(dateVal) === today) result.claims_today++;
    if (skipBuckets) continue;
    if (d < range.from || d > range.to) continue;
    if (p.channel && String(cols['ร้าน'][i] || '').trim() !== p.channel) continue;

    const receivedFromCustomer = !!cols['ได้รับของเสียจากลูกค้า'][i];
    const receivedIntoSystem = !!cols['ฝ่ายเคลมรับสินค้าเข้าระบบ'][i];
    const returnedToCustomer = !!cols['ส่งสินค้าคืนลูกค้า'][i];
    const overdue = (now - d) / (1000 * 60 * 60 * 24) > slaDays;

    if (returnedToCustomer) {
      result.shipped++;
    } else if (receivedIntoSystem) {
      result.in_progress++;
      if (overdue) result.overdue_sla++;
    } else if (receivedFromCustomer) {
      result.received++;
      if (overdue) result.overdue_sla++;
    } else {
      result.waiting_receive++;
      if (overdue) result.overdue_sla++;
    }
  }
  return result;
}

/* ---------------- Legacy report (บริการหลังการขาย + CLSBS sheets) ----------------
 * These are the pre-existing operational sheets (not part of the Base 10
 * schema above) that already hold years of real claim/repair records. They
 * have no workflow "status" column to speak of, so this only aggregates
 * counts/values — no open/closed breakdown. Read live off the sheets (no
 * import), cached briefly so a busy dashboard doesn't re-scan tens of
 * thousands of rows on every request.
 */

const LEGACY_SERVICE_LOG_SHEET = 'บริการหลังการขาย';
const LEGACY_CLSBS_SHEET = 'CLSBS';
const LEGACY_CACHE_KEY = 'legacy_report_v1';
const LEGACY_CACHE_SECONDS = 180;

function legacyReport_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(LEGACY_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const result = {
    ok: true,
    generated_at: new Date().toISOString(),
    service_log: legacyServiceLogStats_(),
    clsbs: legacyClsbsStats_()
  };
  try {
    cache.put(LEGACY_CACHE_KEY, JSON.stringify(result), LEGACY_CACHE_SECONDS);
  } catch (e) {
    // Aggregate is normally well under the 100KB cache value limit; if it
    // ever isn't, just skip caching rather than fail the request.
  }
  return result;
}

/**
 * Reads several named columns from a sheet in a single Range read (one
 * header lookup + one data block spanning the min..max column needed)
 * instead of one round-trip per column — the row counts here run into the
 * tens of thousands, so cutting round-trips is what keeps this fast.
 */
function legacySheetColumns_(sheetName, headerNames) {
  const empty = function() { return headerNames.reduce(function(o, h) { o[h] = []; return o; }, {}); };
  const sh = spreadsheet_().getSheetByName(sheetName);
  if (!sh) return empty();
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return empty();
  const header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const indices = headerNames.map(function(h) { return header.indexOf(h); });
  const validIndices = indices.filter(function(i) { return i >= 0; });
  if (!validIndices.length) return empty();
  const minCol = Math.min.apply(null, validIndices);
  const maxCol = Math.max.apply(null, validIndices);
  const block = sh.getRange(2, minCol + 1, lastRow - 1, maxCol - minCol + 1).getValues();
  const out = {};
  headerNames.forEach(function(h, hi) {
    const idx = indices[hi];
    if (idx < 0) { out[h] = []; return; }
    const offset = idx - minCol;
    out[h] = block.map(function(row) { return row[offset]; });
  });
  return out;
}

function legacyTopCounts_(values, limit) {
  const counts = {};
  values.forEach(function(v) {
    const key = String(v || '').trim() || 'ไม่ระบุ';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts)
    .map(function(k) { return { label: k, count: counts[k] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, limit || 10);
}

function legacyNumber_(v) {
  if (typeof v === 'number') return v;
  const n = Number(String(v || '').replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}

function legacySum_(values) {
  return Number(values.reduce(function(s, v) { return s + legacyNumber_(v); }, 0).toFixed(2));
}

function legacyServiceLogStats_() {
  const cols = legacySheetColumns_(LEGACY_SERVICE_LOG_SHEET, ['วันที่', 'ร้าน', 'สินค้า', LEGACY_ISSUE_GROUP_HEADER]);
  const dates = cols['วันที่'];
  const channels = cols['ร้าน'];
  const products = cols['สินค้า'];
  const issueGroups = cols[LEGACY_ISSUE_GROUP_HEADER];

  // A handful of rows carry corrupted date cells (e.g. a stray numeric value
  // read as a Date) that parse into implausible years like 1965 or 20025 —
  // bounding to a real business-data range keeps those out of the monthly
  // trend chart instead of stretching/garbling its axis. total_cases above
  // is unaffected since it counts raw rows, not these buckets.
  const byMonth = {};
  const minYear = 2015;
  const maxYear = new Date().getFullYear() + 1;
  dates.forEach(function(d) {
    const parsed = new Date(d);
    if (isNaN(parsed)) return;
    const y = parsed.getFullYear();
    if (y < minYear || y > maxYear) return;
    const key = dateKey_(d).slice(0, 7); // yyyy-MM
    if (key) byMonth[key] = (byMonth[key] || 0) + 1;
  });

  return {
    total_cases: dates.length,
    by_channel: legacyTopCounts_(channels, 10),
    by_issue_group: legacyTopCounts_(issueGroups, 10),
    top_products: legacyTopCounts_(products, 15),
    by_month: Object.keys(byMonth).sort().map(function(m) { return { month: m, count: byMonth[m] }; })
  };
}

function legacyClsbsStats_() {
  const cols = legacySheetColumns_(LEGACY_CLSBS_SHEET, [
    'อาการเสีย', 'ยี่ห้อสินค้าที่รับเคลม', 'กลุ่มสินค้าที่รับเคลม',
    'เงินที่ชำระให้ผู้จำหน่าย', 'เงินที่ได้รับจากผู้จำหน่าย',
    'เงินที่เรียกเก็บจากลูกค้า', 'เงินที่คืนให้ลูกค้า'
  ]);
  const symptoms = cols['อาการเสีย'];

  return {
    total_records: symptoms.length,
    top_symptoms: legacyTopCounts_(symptoms, 15),
    by_brand: legacyTopCounts_(cols['ยี่ห้อสินค้าที่รับเคลม'], 10),
    by_product_group: legacyTopCounts_(cols['กลุ่มสินค้าที่รับเคลม'], 10),
    money: {
      paid_to_vendor: legacySum_(cols['เงินที่ชำระให้ผู้จำหน่าย']),
      received_from_vendor: legacySum_(cols['เงินที่ได้รับจากผู้จำหน่าย']),
      charged_to_customer: legacySum_(cols['เงินที่เรียกเก็บจากลูกค้า']),
      refunded_to_customer: legacySum_(cols['เงินที่คืนให้ลูกค้า'])
    }
  };
}

/**
 * Diagnostic/one-off: every distinct defect code already embedded in CLSBS's
 * 'อาการเสีย' free-text column, for building a Thai-defect-code -> English
 * translation dictionary. Staff already write this column as
 * "{CODE} {English phrase}//{Thai note}" (e.g. "FM01 Film Bend//"), so this
 * parses that existing convention instead of asking anyone to translate from
 * scratch. Grouping happens on the extracted code, not the raw string —
 * legacyTopCounts_ elsewhere counts raw strings, which undercounts a code
 * whenever its Thai note varies row to row. Read-only; changes nothing.
 */
function legacyDefectCodeDump_() {
  const cols = legacySheetColumns_(LEGACY_CLSBS_SHEET, ['อาการเสีย']);
  const raws = cols['อาการเสีย'];

  const byCode = {};
  let otherCount = 0;
  let noCodeCount = 0;

  raws.forEach(function(v) {
    const text = String(v || '').trim();
    if (!text) return;

    const slashIdx = text.indexOf('//');
    const beforeSlash = (slashIdx >= 0 ? text.slice(0, slashIdx) : text).trim();
    const thaiNote = (slashIdx >= 0 ? text.slice(slashIdx + 2) : '').trim();

    if (/^other\b/i.test(beforeSlash)) {
      otherCount++;
      return;
    }

    const m = /^([A-Za-z]+[0-9]+)\s+(.+)$/.exec(beforeSlash);
    if (!m) {
      noCodeCount++;
      return;
    }
    const code = m[1].toUpperCase();
    const english = m[2].trim();
    if (!byCode[code]) byCode[code] = { englishCounts: {}, thaiSamples: [], total: 0 };
    const bucket = byCode[code];
    bucket.total++;
    bucket.englishCounts[english] = (bucket.englishCounts[english] || 0) + 1;
    if (thaiNote && bucket.thaiSamples.indexOf(thaiNote) < 0 && bucket.thaiSamples.length < 5) {
      bucket.thaiSamples.push(thaiNote);
    }
  });

  const codes = Object.keys(byCode).map(function(code) {
    const bucket = byCode[code];
    let bestEnglish = '';
    let bestCount = -1;
    Object.keys(bucket.englishCounts).forEach(function(e) {
      if (bucket.englishCounts[e] > bestCount) { bestCount = bucket.englishCounts[e]; bestEnglish = e; }
    });
    const variants = Object.keys(bucket.englishCounts).filter(function(e) { return e !== bestEnglish; });
    return { code: code, english: bestEnglish, count: bucket.total, english_variants: variants, thai_samples: bucket.thaiSamples };
  }).sort(function(a, b) { return b.count - a.count; });

  return {
    ok: true,
    total_records: raws.length,
    distinct_codes: codes.length,
    other_count: otherCount,
    no_code_count: noCodeCount,
    codes: codes
  };
}

/**
 * Real-record (not aggregated) reads of the two legacy sheets, filtered and
 * paginated in memory after one bounded column read via legacySheetColumns_.
 * Distinct from legacyReport_ above, which only ever returns counts/sums.
 */

const LEGACY_ISSUE_GROUP_HEADER = 'กลุ่มของปัญหา (เคลม, แจ้งปัญหาสินค้าการใช้งาน, รีวิว, เปลี่ยนคินสินค้า)';

function legacyDistinctValues_(values) {
  const seen = {};
  const out = [];
  values.forEach(function(v) {
    const s = String(v || '').trim();
    if (s && !seen[s]) { seen[s] = true; out.push(s); }
  });
  return out.sort();
}

function legacyMeta_() {
  const serviceCols = legacySheetColumns_(LEGACY_SERVICE_LOG_SHEET, ['ร้าน', LEGACY_ISSUE_GROUP_HEADER]);
  const clsbsCols = legacySheetColumns_(LEGACY_CLSBS_SHEET, [
    'ยี่ห้อสินค้าที่รับเคลม', 'กลุ่มสินค้าที่รับเคลม', 'สถานะการเคลมสินค้า'
  ]);
  return {
    ok: true,
    channels: legacyDistinctValues_(serviceCols['ร้าน']),
    issue_groups: legacyDistinctValues_(serviceCols[LEGACY_ISSUE_GROUP_HEADER]),
    brands: legacyDistinctValues_(clsbsCols['ยี่ห้อสินค้าที่รับเคลม']),
    product_groups: legacyDistinctValues_(clsbsCols['กลุ่มสินค้าที่รับเคลม']),
    statuses: legacyDistinctValues_(clsbsCols['สถานะการเคลมสินค้า'])
  };
}

function legacyPaginate_(rows, p) {
  const pageSize = Math.max(1, Number(p.page_size) || 50);
  const page = Math.max(1, Number(p.page) || 1);
  const start = (page - 1) * pageSize;
  return {
    ok: true,
    rows: rows.slice(start, start + pageSize),
    total_count: rows.length,
    page: page,
    page_size: pageSize
  };
}

/** Sheet stores phone numbers as bare numbers, dropping the leading 0 (e.g. 891333557). */
function legacyFormatPhone_(v) {
  const s = String(v || '').trim();
  if (/^\d+$/.test(s) && s.length === 9) return '0' + s;
  return s;
}

function legacyServiceStatus_(receivedFromCustomer, receivedIntoSystem, returnedToCustomer) {
  if (returnedToCustomer === true) return 'ส่งคืนลูกค้าแล้ว';
  if (receivedIntoSystem === true) return 'รับเข้าระบบแล้ว';
  if (receivedFromCustomer === true) return 'รับสินค้าจากลูกค้าแล้ว';
  return 'รอดำเนินการ';
}

function legacyServiceLogRows_(p) {
  const cols = legacySheetColumns_(LEGACY_SERVICE_LOG_SHEET, [
    '', 'วันที่', 'ร้าน', 'ชื่อลูกค้า', 'เบอร์โทร', 'เลขที่ ออเดอร์',
    'สินค้า', 'Serial', LEGACY_ISSUE_GROUP_HEADER, 'ปัญหา', 'วิธีแก้ไข',
    'วันที่ได้รับสินค้าเสีย', 'วันที่ส่งสินค้าเคลมคืนลูกค้า',
    'Tracking ส่งคืน', 'ค่าขนส่ง',
    'ได้รับของเสียจากลูกค้า', 'ฝ่ายเคลมรับสินค้าเข้าระบบ', 'ส่งสินค้าคืนลูกค้า'
  ]);
  const range = dateRange_(p.from, p.to);
  const n = cols['วันที่'].length;
  const q = p.q ? String(p.q).trim().toLowerCase() : '';
  const rows = [];
  for (let idx = 0; idx < n; idx++) {
    const d = new Date(cols['วันที่'][idx]);
    if (isNaN(d) || d < range.from || d > range.to) continue;
    const row = {
      case_no: String(cols[''][idx] || ''),
      date: cols['วันที่'][idx] || '',
      channel: String(cols['ร้าน'][idx] || ''),
      customer_name: String(cols['ชื่อลูกค้า'][idx] || ''),
      phone: legacyFormatPhone_(cols['เบอร์โทร'][idx]),
      order_no: String(cols['เลขที่ ออเดอร์'][idx] || ''),
      product: String(cols['สินค้า'][idx] || ''),
      serial_no: String(cols['Serial'][idx] || ''),
      issue_group: String(cols[LEGACY_ISSUE_GROUP_HEADER][idx] || ''),
      issue_detail: String(cols['ปัญหา'][idx] || ''),
      resolution_method: String(cols['วิธีแก้ไข'][idx] || ''),
      received_date: cols['วันที่ได้รับสินค้าเสีย'][idx] || '',
      returned_date: cols['วันที่ส่งสินค้าเคลมคืนลูกค้า'][idx] || '',
      return_tracking_no: String(cols['Tracking ส่งคืน'][idx] || ''),
      shipping_cost: legacyNumber_(cols['ค่าขนส่ง'][idx]),
      status: legacyServiceStatus_(
        cols['ได้รับของเสียจากลูกค้า'][idx], cols['ฝ่ายเคลมรับสินค้าเข้าระบบ'][idx], cols['ส่งสินค้าคืนลูกค้า'][idx]
      )
    };
    if (p.channel && row.channel !== p.channel) continue;
    if (p.issue_group && row.issue_group !== p.issue_group) continue;
    if (q) {
      const haystack = [row.case_no, row.customer_name, row.phone, row.order_no, row.product, row.serial_no].join(' ').toLowerCase();
      if (haystack.indexOf(q) < 0) continue;
    }
    rows.push(row);
  }
  rows.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  return legacyPaginate_(rows, p);
}

function legacyClsbsRows_(p) {
  const cols = legacySheetColumns_(LEGACY_CLSBS_SHEET, [
    'ID', 'Bill Number', 'วันที่รับซ่อม', 'ชื่อลูกค้า', 'เบอร์โทรลูกค้า', 'เบอร์มือถือลูกค้า',
    'ชื่อสินค้าที่รับเคลม', 'SN ที่รับเคลม', 'กลุ่มสินค้าที่รับเคลม', 'ยี่ห้อสินค้าที่รับเคลม', 'รุ่นสินค้าที่รับเคลม', 'อาการเสีย',
    'ชื่อผู้จำหน่าย', 'วันที่ส่งสินค้าให้ผู้จำหน่าย', 'วันที่รับของคืนจากผู้จำหน่าย', 'วันที่คืนของให้ลูกค้า',
    'เงินที่ชำระให้ผู้จำหน่าย', 'เงินที่ได้รับจากผู้จำหน่าย', 'เงินที่เรียกเก็บจากลูกค้า', 'เงินที่คืนให้ลูกค้า',
    'สถานะการเคลมสินค้า'
  ]);
  const range = dateRange_(p.from, p.to);
  const n = cols['ID'].length;
  const q = p.q ? String(p.q).trim().toLowerCase() : '';
  const rows = [];
  for (let idx = 0; idx < n; idx++) {
    const repairDateRaw = cols['วันที่รับซ่อม'][idx];
    if (p.from || p.to) {
      const repairDate = legacyParseAnyDate_(repairDateRaw);
      if (!repairDate || repairDate < range.from || repairDate > range.to) continue;
    }
    const row = {
      id: String(cols['ID'][idx] || ''),
      bill_number: String(cols['Bill Number'][idx] || ''),
      repair_date: String(repairDateRaw || ''),
      customer_name: String(cols['ชื่อลูกค้า'][idx] || ''),
      phone: String(cols['เบอร์โทรลูกค้า'][idx] || cols['เบอร์มือถือลูกค้า'][idx] || ''),
      product_name: String(cols['ชื่อสินค้าที่รับเคลม'][idx] || ''),
      serial_no: String(cols['SN ที่รับเคลม'][idx] || ''),
      product_group: String(cols['กลุ่มสินค้าที่รับเคลม'][idx] || ''),
      brand: String(cols['ยี่ห้อสินค้าที่รับเคลม'][idx] || ''),
      model: String(cols['รุ่นสินค้าที่รับเคลม'][idx] || ''),
      symptom: String(cols['อาการเสีย'][idx] || ''),
      vendor_name: String(cols['ชื่อผู้จำหน่าย'][idx] || ''),
      sent_to_vendor_date: String(cols['วันที่ส่งสินค้าให้ผู้จำหน่าย'][idx] || ''),
      received_from_vendor_date: String(cols['วันที่รับของคืนจากผู้จำหน่าย'][idx] || ''),
      returned_to_customer_date: String(cols['วันที่คืนของให้ลูกค้า'][idx] || ''),
      paid_to_vendor: legacyNumber_(cols['เงินที่ชำระให้ผู้จำหน่าย'][idx]),
      received_from_vendor: legacyNumber_(cols['เงินที่ได้รับจากผู้จำหน่าย'][idx]),
      charged_to_customer: legacyNumber_(cols['เงินที่เรียกเก็บจากลูกค้า'][idx]),
      refunded_to_customer: legacyNumber_(cols['เงินที่คืนให้ลูกค้า'][idx]),
      status: String(cols['สถานะการเคลมสินค้า'][idx] || '')
    };
    if (p.brand && row.brand !== p.brand) continue;
    if (p.product_group && row.product_group !== p.product_group) continue;
    if (p.status && row.status !== p.status) continue;
    if (q) {
      const haystack = [row.id, row.bill_number, row.customer_name, row.serial_no, row.product_name].join(' ').toLowerCase();
      if (haystack.indexOf(q) < 0) continue;
    }
    rows.push(row);
  }
  rows.sort(function(a, b) {
    const da = legacyParseAnyDate_(a.repair_date) || new Date(0);
    const db = legacyParseAnyDate_(b.repair_date) || new Date(0);
    return db - da;
  });
  return legacyPaginate_(rows, p);
}

/* ---------------- Supplier RMA (ส่งเคลมผู้ผลิต) ----------------
 * Sits entirely on top of the existing legacy CLSBS sheet — it already has
 * a "เลขที่บิลกลุ่ม" (batch number) column, so a batch is just: write a
 * generated RMA-{vendor}-{yyyyMM}-{seq} value into that column plus
 * "วันที่ส่งสินค้าให้ผู้จำหน่าย" + "ชื่อผู้จำหน่าย" on every selected row.
 * No new sheet. Explicit status overrides (e.g. "ปฏิเสธ", which can't be
 * derived from which date columns are filled) live in Sync_Log, matched by
 * batch_no, the same way pending_review/audit entries already do.
 */

const CLSBS_ID_HEADER = 'ID';
const CLSBS_BATCH_HEADER = 'เลขที่บิลกลุ่ม';
const CLSBS_VENDOR_HEADER = 'ชื่อผู้จำหน่าย';
const CLSBS_SENT_DATE_HEADER = 'วันที่ส่งสินค้าให้ผู้จำหน่าย';
const CLSBS_RETURNED_DATE_HEADER = 'วันที่รับของคืนจากผู้จำหน่าย';
const CLSBS_RECEIVED_MONEY_HEADER = 'เงินที่ได้รับจากผู้จำหน่าย';
const CLSBS_RETURNED_SN_HEADER = 'SN ที่รับคืนจากผู้จำหน่าย';
const CLSBS_PAID_MONEY_HEADER = 'เงินที่ชำระให้ผู้จำหน่าย';
const RMA_BATCH_PREFIX = 'RMA-';
const RMA_OVERDUE_DAYS = 30;

const THAI_MONTHS_ = {
  'มกราคม': 0, 'กุมภาพันธ์': 1, 'มีนาคม': 2, 'เมษายน': 3, 'พฤษภาคม': 4, 'มิถุนายน': 5,
  'กรกฎาคม': 6, 'สิงหาคม': 7, 'กันยายน': 8, 'ตุลาคม': 9, 'พฤศจิกายน': 10, 'ธันวาคม': 11
};
const ENGLISH_MONTHS_ = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
};

/**
 * The legacy sheet mixes at least 3 date shapes in the very same column:
 * "05 January 2026 (09:35:22)", "23 มิถุนายน 2568" (Thai month, Buddhist
 * year), and " 08-12-2568" (DD-MM-YYYY, Buddhist year). Sheets can also just
 * hand back a real Date object for date-formatted cells. Handle all of them
 * rather than assuming one.
 */
function legacyParseAnyDate_(v) {
  if (v instanceof Date) return isNaN(v) ? null : v;
  const s = String(v || '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m && ENGLISH_MONTHS_.hasOwnProperty(m[2])) {
    return new Date(Number(m[3]), ENGLISH_MONTHS_[m[2]], Number(m[1]));
  }
  m = s.match(/^(\d{1,2})\s+([ก-๙]+)\s+(\d{4})/);
  if (m && THAI_MONTHS_.hasOwnProperty(m[2])) {
    return new Date(Number(m[3]) - 543, THAI_MONTHS_[m[2]], Number(m[1]));
  }
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const year = Number(m[3]);
    return new Date(year > 2400 ? year - 543 : year, Number(m[2]) - 1, Number(m[1]));
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

/** Finds a row in a legacy sheet by an arbitrary "ID-like" column, reading the header
 * fresh each time — these sheets are not in HEADERS/readObjects_'s fixed-schema world. */
function legacyFindRowById_(sheetName, idHeader, idValue) {
  const sh = spreadsheet_().getSheetByName(sheetName);
  if (!sh) throw new Error('ไม่พบชีต ' + sheetName);
  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const idCol = headers.indexOf(idHeader);
  if (idCol < 0) throw new Error('ไม่พบคอลัมน์ ' + idHeader + ' ในชีต ' + sheetName);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return null;
  const idValues = sh.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(idValue)) {
      return { sheet: sh, headers: headers, row: i + 2 };
    }
  }
  return null;
}

function legacyWriteFields_(found, fields) {
  Object.keys(fields).forEach(function(h) {
    const col = found.headers.indexOf(h);
    if (col >= 0) found.sheet.getRange(found.row, col + 1).setValue(fields[h]);
  });
}

/** Candidates = CLSBS rows not yet sent to a vendor (sent-date column empty). Staff pick
 * which of these actually need a vendor RMA via checkboxes on the frontend — this list is
 * not itself a claim that every row must be sent out. */
function supplierRmaCandidates_(p) {
  const cols = legacySheetColumns_(LEGACY_CLSBS_SHEET, [
    CLSBS_ID_HEADER, 'Bill Number', 'วันที่รับซ่อม', 'ชื่อลูกค้า', 'ชื่อสินค้าที่รับเคลม', 'SN ที่รับเคลม',
    'กลุ่มสินค้าที่รับเคลม', 'ยี่ห้อสินค้าที่รับเคลม', 'รุ่นสินค้าที่รับเคลม', 'อาการเสีย', CLSBS_SENT_DATE_HEADER
  ]);
  const range = dateRange_(p.from, p.to);
  const n = cols[CLSBS_ID_HEADER].length;
  const q = p.q ? String(p.q).trim().toLowerCase() : '';
  const rows = [];
  for (let idx = 0; idx < n; idx++) {
    if (String(cols[CLSBS_SENT_DATE_HEADER][idx] || '').trim()) continue; // already sent
    const repairDate = legacyParseAnyDate_(cols['วันที่รับซ่อม'][idx]);
    if ((p.from || p.to) && (!repairDate || repairDate < range.from || repairDate > range.to)) continue;
    const row = {
      id: String(cols[CLSBS_ID_HEADER][idx] || ''),
      bill_number: String(cols['Bill Number'][idx] || ''),
      repair_date: repairDate ? repairDate.toISOString() : '',
      customer_name: String(cols['ชื่อลูกค้า'][idx] || ''),
      product_name: String(cols['ชื่อสินค้าที่รับเคลม'][idx] || ''),
      serial_no: String(cols['SN ที่รับเคลม'][idx] || ''),
      product_group: String(cols['กลุ่มสินค้าที่รับเคลม'][idx] || ''),
      brand: String(cols['ยี่ห้อสินค้าที่รับเคลม'][idx] || ''),
      model: String(cols['รุ่นสินค้าที่รับเคลม'][idx] || ''),
      symptom: String(cols['อาการเสีย'][idx] || '')
    };
    if (p.brand && row.brand !== p.brand) continue;
    if (p.product_group && row.product_group !== p.product_group) continue;
    if (q) {
      const haystack = [row.id, row.bill_number, row.customer_name, row.serial_no, row.product_name].join(' ').toLowerCase();
      if (haystack.indexOf(q) < 0) continue;
    }
    rows.push(row);
  }
  rows.sort(function(a, b) { return new Date(b.repair_date || 0) - new Date(a.repair_date || 0); });
  return legacyPaginate_(rows, p);
}

function supplierRmaNextBatchSeq_(vendorKey, monthKey) {
  const prefix = RMA_BATCH_PREFIX + vendorKey + '-' + monthKey + '-';
  const used = readObjects_(SHEETS.SYNC_LOG)
    .filter(function(r) { return r.action === 'supplier_rma_batch_create' && String(r.claim_no || '').indexOf(prefix) === 0; })
    .map(function(r) { return Number(String(r.claim_no).slice(prefix.length)) || 0; });
  return (used.length ? Math.max.apply(null, used) : 0) + 1;
}

/**
 * Batches the CLSBS read/write instead of one full-column scan + 3 setValue
 * calls PER selected item (legacyFindRowById_/legacyWriteFields_'s normal
 * single-row path). At 74 selected items that was ~74 full-column reads of
 * 9,500+ rows each plus 222 individual cell writes — slow enough to blow
 * past Apps Script's execution time limit partway through and leave a
 * batch with fewer items than were actually selected. This does exactly
 * one column read and one range write regardless of how many items are
 * selected.
 */
function supplierRmaCreateBatch_(p) {
  const ids = Array.isArray(p.ids) ? p.ids.filter(function(id) { return id; }) : [];
  if (!ids.length) throw new Error('กรุณาเลือกอย่างน้อย 1 รายการ');
  if (!p.vendor) throw new Error('กรุณาระบุผู้จำหน่าย');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const vendorKey = String(p.vendor).replace(/[^a-zA-Z0-9ก-๙]+/g, '');
    const monthKey = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMM');
    const seq = supplierRmaNextBatchSeq_(vendorKey, monthKey);
    const batchNo = RMA_BATCH_PREFIX + vendorKey + '-' + monthKey + '-' + seq;
    const now = new Date();

    const sh = spreadsheet_().getSheetByName(LEGACY_CLSBS_SHEET);
    if (!sh) throw new Error('ไม่พบชีต ' + LEGACY_CLSBS_SHEET);
    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    const idCol = headers.indexOf(CLSBS_ID_HEADER);
    const batchCol = headers.indexOf(CLSBS_BATCH_HEADER);
    const vendorCol = headers.indexOf(CLSBS_VENDOR_HEADER);
    const sentCol = headers.indexOf(CLSBS_SENT_DATE_HEADER);
    if (idCol < 0 || batchCol < 0 || vendorCol < 0 || sentCol < 0) {
      throw new Error('ไม่พบคอลัมน์ที่จำเป็นในชีต ' + LEGACY_CLSBS_SHEET);
    }

    const idValues = sh.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
    const idToRowOffset = {};
    idValues.forEach(function(r, i) { idToRowOffset[String(r[0])] = i; });

    const missing = [];
    const matchedOffsets = [];
    ids.forEach(function(id) {
      const offset = idToRowOffset[String(id)];
      if (offset === undefined) { missing.push(id); return; }
      matchedOffsets.push(offset);
    });
    if (!matchedOffsets.length) throw new Error('ไม่พบรายการที่เลือกเลย (ID: ' + missing.join(', ') + ')');

    const minCol = Math.min(batchCol, vendorCol, sentCol);
    const maxCol = Math.max(batchCol, vendorCol, sentCol);
    const range = sh.getRange(2, minCol + 1, lastRow - 1, maxCol - minCol + 1);
    const block = range.getValues();
    matchedOffsets.forEach(function(offset) {
      block[offset][batchCol - minCol] = batchNo;
      block[offset][vendorCol - minCol] = p.vendor;
      block[offset][sentCol - minCol] = now;
    });
    range.setValues(block);

    logSync_('supplier_rma_batch_create', batchNo, 'ok', JSON.stringify({
      vendor: p.vendor, item_ids: ids, missing_ids: missing, actor: p.actor || 'staff'
    }));
    return { ok: true, batch_no: batchNo, item_count: matchedOffsets.length, missing_ids: missing };
  } finally {
    lock.releaseLock();
  }
}

function supplierRmaBatchStatusOverride_(batchNo) {
  const entries = readObjects_(SHEETS.SYNC_LOG).filter(function(r) {
    return r.action === 'supplier_rma_batch_status' && r.claim_no === batchNo;
  });
  if (!entries.length) return null;
  entries.sort(function(a, b) { return new Date(a.created_at) - new Date(b.created_at); });
  return entries[entries.length - 1].result || null;
}

function supplierRmaDeriveStatus_(items, override) {
  if (override) return override;
  if (items.length && items.every(function(i) { return i.returned_from_vendor_date; })) return 'ได้รับคืนครบแล้ว';
  if (items.some(function(i) { return i.returned_from_vendor_date; })) return 'ได้รับคืนบางส่วน';
  return 'รอผลจากผู้จำหน่าย';
}

function supplierRmaBatches_(p) {
  const cols = legacySheetColumns_(LEGACY_CLSBS_SHEET, [
    CLSBS_ID_HEADER, CLSBS_BATCH_HEADER, CLSBS_VENDOR_HEADER, CLSBS_SENT_DATE_HEADER,
    CLSBS_RETURNED_DATE_HEADER, CLSBS_RECEIVED_MONEY_HEADER, CLSBS_PAID_MONEY_HEADER
  ]);
  const n = cols[CLSBS_ID_HEADER].length;
  const groups = {};
  for (let idx = 0; idx < n; idx++) {
    const batchNo = String(cols[CLSBS_BATCH_HEADER][idx] || '').trim();
    if (batchNo.indexOf(RMA_BATCH_PREFIX) !== 0) continue;
    if (!groups[batchNo]) {
      groups[batchNo] = { batch_no: batchNo, vendor: String(cols[CLSBS_VENDOR_HEADER][idx] || ''), sent_date: null, items: [] };
    }
    const sentDate = legacyParseAnyDate_(cols[CLSBS_SENT_DATE_HEADER][idx]);
    if (sentDate && (!groups[batchNo].sent_date || sentDate < groups[batchNo].sent_date)) groups[batchNo].sent_date = sentDate;
    groups[batchNo].items.push({
      returned_from_vendor_date: legacyParseAnyDate_(cols[CLSBS_RETURNED_DATE_HEADER][idx]),
      received_from_vendor: legacyNumber_(cols[CLSBS_RECEIVED_MONEY_HEADER][idx]),
      paid_to_vendor: legacyNumber_(cols[CLSBS_PAID_MONEY_HEADER][idx])
    });
  }
  const now = new Date();
  const rows = Object.keys(groups).map(function(batchNo) {
    const g = groups[batchNo];
    const override = supplierRmaBatchStatusOverride_(batchNo);
    const daysSinceSent = g.sent_date ? Math.floor((now - g.sent_date) / (1000 * 60 * 60 * 24)) : null;
    return {
      batch_no: g.batch_no,
      vendor: g.vendor,
      item_count: g.items.length,
      sent_date: g.sent_date ? g.sent_date.toISOString() : '',
      days_since_sent: daysSinceSent,
      overdue: daysSinceSent !== null && daysSinceSent > RMA_OVERDUE_DAYS && supplierRmaDeriveStatus_(g.items, override) !== 'ได้รับคืนครบแล้ว',
      status: supplierRmaDeriveStatus_(g.items, override),
      total_paid_to_vendor: Number(g.items.reduce(function(s, i) { return s + i.paid_to_vendor; }, 0).toFixed(2)),
      total_received_from_vendor: Number(g.items.reduce(function(s, i) { return s + i.received_from_vendor; }, 0).toFixed(2))
    };
  }).sort(function(a, b) { return new Date(b.sent_date || 0) - new Date(a.sent_date || 0); });

  const filtered = rows.filter(function(r) {
    if (p.vendor && r.vendor !== p.vendor) return false;
    if (p.status && r.status !== p.status) return false;
    return true;
  });
  return { ok: true, batches: filtered };
}

function supplierRmaBatchDetail_(batchNo) {
  if (!batchNo) throw new Error('batch_no is required');
  const cols = legacySheetColumns_(LEGACY_CLSBS_SHEET, [
    CLSBS_ID_HEADER, CLSBS_BATCH_HEADER, 'Bill Number', CLSBS_VENDOR_HEADER, 'ชื่อสินค้าที่รับเคลม', 'SN ที่รับเคลม',
    'ยี่ห้อสินค้าที่รับเคลม', 'รุ่นสินค้าที่รับเคลม', 'อาการเสีย', 'วันที่รับซ่อม', CLSBS_SENT_DATE_HEADER, CLSBS_RETURNED_DATE_HEADER,
    CLSBS_RETURNED_SN_HEADER, CLSBS_PAID_MONEY_HEADER, CLSBS_RECEIVED_MONEY_HEADER
  ]);
  const n = cols[CLSBS_ID_HEADER].length;
  const items = [];
  for (let idx = 0; idx < n; idx++) {
    if (String(cols[CLSBS_BATCH_HEADER][idx] || '').trim() !== batchNo) continue;
    items.push({
      id: String(cols[CLSBS_ID_HEADER][idx] || ''),
      bill_number: String(cols['Bill Number'][idx] || ''),
      product_name: String(cols['ชื่อสินค้าที่รับเคลม'][idx] || ''),
      serial_no: String(cols['SN ที่รับเคลม'][idx] || ''),
      brand: String(cols['ยี่ห้อสินค้าที่รับเคลม'][idx] || ''),
      model: String(cols['รุ่นสินค้าที่รับเคลม'][idx] || ''),
      symptom: String(cols['อาการเสีย'][idx] || ''),
      repair_date: (function() { const d = legacyParseAnyDate_(cols['วันที่รับซ่อม'][idx]); return d ? d.toISOString() : ''; })(),
      sent_date: (legacyParseAnyDate_(cols[CLSBS_SENT_DATE_HEADER][idx]) || '') && legacyParseAnyDate_(cols[CLSBS_SENT_DATE_HEADER][idx]).toISOString(),
      returned_from_vendor_date: (function() { const d = legacyParseAnyDate_(cols[CLSBS_RETURNED_DATE_HEADER][idx]); return d ? d.toISOString() : ''; })(),
      returned_sn: String(cols[CLSBS_RETURNED_SN_HEADER][idx] || ''),
      paid_to_vendor: legacyNumber_(cols[CLSBS_PAID_MONEY_HEADER][idx]),
      received_from_vendor: legacyNumber_(cols[CLSBS_RECEIVED_MONEY_HEADER][idx])
    });
  }
  if (!items.length) throw new Error('ไม่พบชุดเคลม ' + batchNo);
  const vendor = String(cols[CLSBS_VENDOR_HEADER][cols[CLSBS_BATCH_HEADER].findIndex(function(v) { return String(v || '').trim() === batchNo; })] || '');
  const rejectReasons = readObjects_(SHEETS.SYNC_LOG).filter(function(r) {
    return r.action === 'supplier_rma_item_reject' && items.some(function(i) { return i.id === r.claim_no; });
  }).reduce(function(map, r) { map[r.claim_no] = r.message; return map; }, {});
  items.forEach(function(i) { i.reject_reason = rejectReasons[i.id] || ''; });
  return { ok: true, batch_no: batchNo, vendor: vendor, status: supplierRmaBatchStatusOverride_(batchNo) || supplierRmaDeriveStatus_(items.map(function(i) {
    return { returned_from_vendor_date: i.returned_from_vendor_date };
  }), null), items: items };
}

function supplierRmaUpdateItem_(p) {
  if (!p.id) throw new Error('id is required');
  const found = legacyFindRowById_(LEGACY_CLSBS_SHEET, CLSBS_ID_HEADER, p.id);
  if (!found) throw new Error('ไม่พบรายการ ID ' + p.id);
  const fields = {};
  if (p.returned_from_vendor_date !== undefined) fields[CLSBS_RETURNED_DATE_HEADER] = p.returned_from_vendor_date ? new Date(p.returned_from_vendor_date) : '';
  if (p.received_from_vendor !== undefined) fields[CLSBS_RECEIVED_MONEY_HEADER] = Number(p.received_from_vendor || 0);
  if (p.returned_sn !== undefined) fields[CLSBS_RETURNED_SN_HEADER] = p.returned_sn;
  legacyWriteFields_(found, fields);
  if (p.reject_reason) logSync_('supplier_rma_item_reject', p.id, 'rejected', p.reject_reason);
  logSync_('supplier_rma_update_item', p.id, 'ok', p.actor || 'staff');
  return { ok: true, id: p.id };
}

function supplierRmaUpdateBatchStatus_(p) {
  if (!p.batch_no || !p.status) throw new Error('batch_no และ status จำเป็น');
  logSync_('supplier_rma_batch_status', p.batch_no, p.status, p.note || (p.actor || 'staff'));
  return { ok: true, batch_no: p.batch_no, status: p.status };
}

/** Vendor approval rate, unreturned money, and average turnaround — computed from real
 * RMA-batched rows only (rows never batched through this feature are out of scope). */
function supplierRmaAnalytics_() {
  const cols = legacySheetColumns_(LEGACY_CLSBS_SHEET, [
    CLSBS_ID_HEADER, CLSBS_BATCH_HEADER, CLSBS_VENDOR_HEADER, CLSBS_SENT_DATE_HEADER,
    CLSBS_RETURNED_DATE_HEADER, CLSBS_RECEIVED_MONEY_HEADER, CLSBS_PAID_MONEY_HEADER, 'ยี่ห้อสินค้าที่รับเคลม'
  ]);
  const n = cols[CLSBS_ID_HEADER].length;
  const byVendor = {};
  for (let idx = 0; idx < n; idx++) {
    const batchNo = String(cols[CLSBS_BATCH_HEADER][idx] || '').trim();
    if (batchNo.indexOf(RMA_BATCH_PREFIX) !== 0) continue;
    const vendor = String(cols[CLSBS_VENDOR_HEADER][idx] || 'ไม่ระบุ');
    if (!byVendor[vendor]) byVendor[vendor] = { vendor: vendor, sent: 0, returned: 0, unreturned_value: 0, turnaround_days: [] };
    const v = byVendor[vendor];
    v.sent += 1;
    const sentDate = legacyParseAnyDate_(cols[CLSBS_SENT_DATE_HEADER][idx]);
    const returnedDate = legacyParseAnyDate_(cols[CLSBS_RETURNED_DATE_HEADER][idx]);
    const receivedMoney = legacyNumber_(cols[CLSBS_RECEIVED_MONEY_HEADER][idx]);
    if (returnedDate) {
      v.returned += 1;
      if (sentDate) v.turnaround_days.push(Math.max(0, (returnedDate - sentDate) / (1000 * 60 * 60 * 24)));
    } else {
      v.unreturned_value += legacyNumber_(cols[CLSBS_PAID_MONEY_HEADER][idx]);
    }
  }
  const rows = Object.keys(byVendor).map(function(vendor) {
    const v = byVendor[vendor];
    return {
      vendor: vendor,
      sent: v.sent,
      returned: v.returned,
      approval_rate: v.sent > 0 ? Number((v.returned / v.sent * 100).toFixed(1)) : null,
      unreturned_value: Number(v.unreturned_value.toFixed(2)),
      avg_turnaround_days: v.turnaround_days.length ? Number((v.turnaround_days.reduce(function(s, d) { return s + d; }, 0) / v.turnaround_days.length).toFixed(1)) : null
    };
  }).sort(function(a, b) { return b.sent - a.sent; });
  return {
    ok: true,
    by_vendor: rows,
    total_unreturned_value: Number(rows.reduce(function(s, r) { return s + r.unreturned_value; }, 0).toFixed(2))
  };
}

/**
 * Diagnostic helper (temporary): returns a sheet's real header row + a few
 * sample rows, so the exact real-world column names/shape can be inspected
 * without guessing. Not used by any frontend page.
 */
function sheetInspect_(sheetName) {
  if (!sheetName) throw new Error('sheet is required');
  const sh = spreadsheet_().getSheetByName(sheetName);
  if (!sh) throw new Error('ไม่พบชีตชื่อ ' + sheetName);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  const headers = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  const sampleCount = Math.min(3, Math.max(0, lastRow - 1));
  const sample = sampleCount > 0 ? sh.getRange(2, 1, sampleCount, lastCol).getValues() : [];
  return { ok: true, sheet: sheetName, last_row: lastRow, last_col: lastCol, headers: headers, sample: sample };
}

/** Diagnostic: shows the raw inputs behind the next claim number, to verify the fix without side effects. */
function claimNoStatus_() {
  const cfg = configMap_();
  return {
    ok: true,
    config_last_claim_number: Number(cfg.last_claim_number || 0),
    legacy_max_claim_number: legacyMaxClaimNumber_(),
    next_would_be: 'GV' + (Math.max(Number(cfg.last_claim_number || 0), legacyMaxClaimNumber_()) + 1)
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

/**
 * Staff sometimes hand-type a new GV number straight into the legacy
 * "บริการหลังการขาย" sheet's (unlabeled) first column without going through
 * reserveClaimNo_ first — that already happened once for GV25083. If this
 * counter only trusted Config.last_claim_number it could hand that same
 * number out again. So every call also checks the real highest number
 * already used in the legacy sheet (cached briefly — it's tens of
 * thousands of rows) and never returns below that, no matter which side
 * issued the higher number.
 */
const LEGACY_MAX_CLAIM_NO_CACHE_KEY = 'legacy_max_claim_no_v1';
const LEGACY_MAX_CLAIM_NO_CACHE_SECONDS = 600;

function legacyMaxClaimNumber_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(LEGACY_MAX_CLAIM_NO_CACHE_KEY);
  if (cached !== null) return Number(cached);
  const cols = legacySheetColumns_(LEGACY_SERVICE_LOG_SHEET, ['']);
  let max = 0;
  (cols[''] || []).forEach(function(v) {
    const m = /(\d+)\s*$/.exec(String(v || '').trim());
    if (m) {
      const n = Number(m[1]);
      if (n > max) max = n;
    }
  });
  try {
    cache.put(LEGACY_MAX_CLAIM_NO_CACHE_KEY, String(max), LEGACY_MAX_CLAIM_NO_CACHE_SECONDS);
  } catch (e) {
    // Non-fatal — just means the next call recomputes it.
  }
  return max;
}

function nextClaimNo_(ss) {
  const sh = ss.getSheetByName(SHEETS.CONFIG);
  const rows = sh.getDataRange().getValues();
  let prefix = 'GV';
  let last = 25082;
  rows.slice(1).forEach(function(r) {
    if (r[0] === 'claim_prefix') prefix = String(r[1] || 'GV');
    if (r[0] === 'last_claim_number') last = Number(r[1] || 25082);
  });
  const legacyMax = legacyMaxClaimNumber_();
  if (legacyMax > last) last = legacyMax;
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

// Reused across every readObjects_()/writeObject_() call within one request. Opening a
// Spreadsheet by ID is one of the slowest calls in Apps Script (network round-trip); actions
// like claim_report/dashboard/claim_detail read several sheets each, and were previously
// re-opening the spreadsheet on every single read. Caching the handle here is safe — it's just
// a handle, not a data snapshot, so getRange()/getValues() still always return live data.
let SPREADSHEET_CACHE_ = null;

function spreadsheet_() {
  if (SPREADSHEET_CACHE_) return SPREADSHEET_CACHE_;
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('ตั้งค่า Script Property: SPREADSHEET_ID ก่อนใช้งาน');
  SPREADSHEET_CACHE_ = SpreadsheetApp.openById(id);
  return SPREADSHEET_CACHE_;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data, function(key, value) {
    return value instanceof Date ? value.toISOString() : value;
  })).setMimeType(ContentService.MimeType.JSON);
}
